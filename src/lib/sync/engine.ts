import "server-only";

import { count, eq, sql } from "drizzle-orm";

import {
  db,
  syncStates,
  users,
  whoopSleeps,
  whoopWorkouts,
  type SyncState,
  type User,
} from "@/lib/db";
import { getSleeps, getWorkouts } from "@/lib/whoop/client";
import { daysAgo, isoDate, localDateAtOffset } from "@/lib/whoop/dates";
import type { WhoopSleepRecord, WhoopWorkoutRecord } from "@/lib/whoop/types";

/** Phase 1: how much history the blocking connect-time sync pulls. */
const INITIAL_SYNC_DAYS = 14;
/** Phase 2: how far back the background backfill walks (~13 months). */
export const BACKFILL_TARGET_DAYS = 395;
/** Phase 2: window size per backfill chunk. */
const BACKFILL_CHUNK_DAYS = 45;
/** Phase 3: re-sync overlap to catch late-arriving scores. */
const INCREMENTAL_OVERLAP_MS = 48 * 60 * 60 * 1000;
/** Phase 3: skip incremental sync if we synced this recently. */
const STALE_AFTER_MS = 15 * 60 * 1000;
/** Treat a 'running' backfill chunk as abandoned after this long. */
const RUNNING_LOCK_MS = 30 * 1000;
/** After a failed chunk, wait this long before the next retry. */
const ERROR_RETRY_COOLDOWN_MS = 30 * 1000;

export interface SyncStatusPayload {
  lastSyncedAt: string | null;
  oldestSyncedDate: string | null;
  backfillStatus: SyncState["backfillStatus"];
  backfillTargetDate: string;
  lastError: string | null;
  counts: { sleeps: number; workouts: number };
}

// ---------------------------------------------------------------------------
// Record mapping & upserts
// ---------------------------------------------------------------------------

function sleepRow(user: User, r: WhoopSleepRecord) {
  const stages = r.score?.stage_summary;
  const asleepMilli =
    stages != null
      ? (stages.total_light_sleep_time_milli ?? 0) +
        (stages.total_slow_wave_sleep_time_milli ?? 0) +
        (stages.total_rem_sleep_time_milli ?? 0)
      : null;
  return {
    id: r.id,
    userId: user.id,
    // A sleep belongs to the day you woke up from it.
    localDate: localDateAtOffset(r.end, r.timezone_offset),
    start: new Date(r.start),
    end: new Date(r.end),
    sleepMinutes: asleepMilli != null ? asleepMilli / 60_000 : null,
    performancePct: r.score?.sleep_performance_percentage ?? null,
    isNap: r.nap,
    scoreState: r.score_state,
    raw: r,
    syncedAt: new Date(),
  };
}

function workoutRow(user: User, r: WhoopWorkoutRecord) {
  return {
    id: r.id,
    userId: user.id,
    localDate: localDateAtOffset(r.start, r.timezone_offset),
    start: new Date(r.start),
    end: new Date(r.end),
    sportId: r.sport_id ?? null,
    sportName: r.sport_name ?? null,
    strain: r.score?.strain ?? null,
    scoreState: r.score_state,
    raw: r,
    syncedAt: new Date(),
  };
}

const UPSERT_BATCH = 50;

/**
 * Dedupe by id (defends against pagination boundary repeats - a duplicate id
 * inside one INSERT batch makes ON CONFLICT DO UPDATE fail), then batch.
 */
function batches<T extends { id: string }>(rows: T[]): T[][] {
  const seen = new Set<string>();
  const unique = rows.filter((row) =>
    seen.has(row.id) ? false : (seen.add(row.id), true),
  );
  const out: T[][] = [];
  for (let i = 0; i < unique.length; i += UPSERT_BATCH) {
    out.push(unique.slice(i, i + UPSERT_BATCH));
  }
  return out;
}

/**
 * Fetch and upsert everything in [start, end]. Idempotent: records update in
 * place (scores often arrive minutes after the activity), so overlapping or
 * racing syncs are harmless.
 */
async function syncRange(user: User, start: Date, end: Date): Promise<void> {
  const subject = user.connectSubjectId;
  const [sleeps, workouts] = await Promise.all([
    getSleeps(subject, start, end),
    getWorkouts(subject, start, end),
  ]);

  for (const batch of batches(sleeps.map((r) => sleepRow(user, r)))) {
    await db
      .insert(whoopSleeps)
      .values(batch)
      .onConflictDoUpdate({
        target: whoopSleeps.id,
        set: {
          localDate: sql`excluded.local_date`,
          start: sql`excluded.start`,
          end: sql`excluded.end`,
          sleepMinutes: sql`excluded.sleep_minutes`,
          performancePct: sql`excluded.performance_pct`,
          isNap: sql`excluded.is_nap`,
          scoreState: sql`excluded.score_state`,
          raw: sql`excluded.raw`,
          syncedAt: sql`excluded.synced_at`,
        },
      });
  }

  for (const batch of batches(workouts.map((r) => workoutRow(user, r)))) {
    await db
      .insert(whoopWorkouts)
      .values(batch)
      .onConflictDoUpdate({
        target: whoopWorkouts.id,
        set: {
          localDate: sql`excluded.local_date`,
          start: sql`excluded.start`,
          end: sql`excluded.end`,
          sportId: sql`excluded.sport_id`,
          sportName: sql`excluded.sport_name`,
          strain: sql`excluded.strain`,
          scoreState: sql`excluded.score_state`,
          raw: sql`excluded.raw`,
          syncedAt: sql`excluded.synced_at`,
        },
      });
  }
}

// ---------------------------------------------------------------------------
// Sync state
// ---------------------------------------------------------------------------

async function getOrCreateSyncState(userId: string): Promise<SyncState> {
  const existing = await db.query.syncStates.findFirst({
    where: eq(syncStates.userId, userId),
  });
  if (existing) return existing;
  await db.insert(syncStates).values({ userId }).onConflictDoNothing();
  return (await db.query.syncStates.findFirst({
    where: eq(syncStates.userId, userId),
  }))!;
}

export async function getSyncStatus(userId: string): Promise<SyncStatusPayload> {
  const state = await getOrCreateSyncState(userId);
  const [sleepCount] = await db
    .select({ value: count() })
    .from(whoopSleeps)
    .where(eq(whoopSleeps.userId, userId));
  const [workoutCount] = await db
    .select({ value: count() })
    .from(whoopWorkouts)
    .where(eq(whoopWorkouts.userId, userId));

  return {
    lastSyncedAt: state.lastSyncedAt?.toISOString() ?? null,
    oldestSyncedDate: state.oldestSyncedDate,
    backfillStatus: state.backfillStatus,
    backfillTargetDate: isoDate(daysAgo(BACKFILL_TARGET_DAYS)),
    lastError: state.lastError,
    counts: { sleeps: sleepCount.value, workouts: workoutCount.value },
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Blocking, fast sync used on page loads.
 * First ever call: phase 1 (last 14 days). After that: phase 3 incremental,
 * skipped entirely when fresh enough.
 */
export async function runForegroundSync(
  user: User,
  { force = false }: { force?: boolean } = {},
): Promise<SyncStatusPayload> {
  const state = await getOrCreateSyncState(user.id);
  const now = new Date();

  if (!state.lastSyncedAt) {
    const start = daysAgo(INITIAL_SYNC_DAYS, now);
    await syncRange(user, start, now);
    await db
      .update(syncStates)
      .set({
        lastSyncedAt: now,
        oldestSyncedDate: isoDate(start),
        lastError: null,
        updatedAt: now,
      })
      .where(eq(syncStates.userId, user.id));
  } else if (force || now.getTime() - state.lastSyncedAt.getTime() > STALE_AFTER_MS) {
    const start = new Date(state.lastSyncedAt.getTime() - INCREMENTAL_OVERLAP_MS);
    await syncRange(user, start, now);
    await db
      .update(syncStates)
      .set({ lastSyncedAt: now, lastError: null, updatedAt: now })
      .where(eq(syncStates.userId, user.id));
  }

  return getSyncStatus(user.id);
}

export function needsBackfill(status: SyncStatusPayload): boolean {
  return (
    status.oldestSyncedDate !== null &&
    status.backfillStatus !== "done" &&
    status.oldestSyncedDate > status.backfillTargetDate
  );
}

/**
 * Phase 2: advance the historical backfill by one chunk (~45 days).
 * Designed to run post-response via after(); each dashboard poll advances it
 * until the 13-month target is reached. Idempotent upserts make racing chunks
 * harmless; the freshness check keeps them rare.
 */
export async function runBackfillChunk(user: User): Promise<void> {
  const state = await getOrCreateSyncState(user.id);
  const now = new Date();

  if (state.backfillStatus === "done" || !state.oldestSyncedDate) return;
  if (
    state.backfillStatus === "running" &&
    now.getTime() - state.updatedAt.getTime() < RUNNING_LOCK_MS
  ) {
    return; // another chunk is (very likely) in flight
  }
  if (
    state.backfillStatus === "error" &&
    now.getTime() - state.updatedAt.getTime() < ERROR_RETRY_COOLDOWN_MS
  ) {
    return; // cool off instead of hammering a failing window every poll
  }

  const target = daysAgo(BACKFILL_TARGET_DAYS, now);
  const oldest = new Date(`${state.oldestSyncedDate}T00:00:00Z`);

  if (oldest.getTime() <= target.getTime()) {
    await db
      .update(syncStates)
      .set({ backfillStatus: "done", lastError: null, updatedAt: now })
      .where(eq(syncStates.userId, user.id));
    return;
  }

  await db
    .update(syncStates)
    .set({ backfillStatus: "running", updatedAt: now })
    .where(eq(syncStates.userId, user.id));

  try {
    // Overlap the boundary by a day so nothing falls between chunks.
    const end = new Date(oldest.getTime() + 24 * 60 * 60 * 1000);
    const start = new Date(
      Math.max(target.getTime(), oldest.getTime() - BACKFILL_CHUNK_DAYS * 24 * 60 * 60 * 1000),
    );
    await syncRange(user, start, end);

    const reachedTarget = start.getTime() <= target.getTime();
    await db
      .update(syncStates)
      .set({
        oldestSyncedDate: isoDate(start),
        backfillStatus: reachedTarget ? "done" : "pending",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(syncStates.userId, user.id));
  } catch (error) {
    console.error("Backfill chunk failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(syncStates)
      .set({
        backfillStatus: "error",
        lastError: message.slice(0, 300),
        updatedAt: new Date(),
      })
      .where(eq(syncStates.userId, user.id));
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  return (
    (await db.query.users.findFirst({ where: eq(users.id, userId) })) ?? null
  );
}
