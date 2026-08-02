import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Users & sessions
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  // WHOOP's numeric user id - the identity key we match returning users on.
  whoopUserId: bigint("whoop_user_id", { mode: "number" }).notNull().unique(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  // IANA timezone captured from the browser at connect time; drives "today".
  timezone: text("timezone").notNull().default("UTC"),
  // The Vercel Connect subject id that currently holds the live WHOOP grant.
  // Updated whenever the user re-consents (e.g. from a new device).
  connectSubjectId: text("connect_subject_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    // SHA-256 of the cookie token; the raw token never touches the DB.
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export const habitType = pgEnum("habit_type", [
  "sleep_duration",
  "workout_frequency",
  "manual",
]);

export type SleepDurationConfig = { minHours: number };
export type WorkoutFrequencyConfig = {
  // WHOOP sport_name values that count toward this habit (empty = any workout).
  // Names, not ids: v2 records don't reliably carry sport_id.
  sports: string[];
  timesPerWeek: number;
};
export type ManualConfig = Record<string, never>;
export type HabitConfig =
  | SleepDurationConfig
  | WorkoutFrequencyConfig
  | ManualConfig;

export const habits = pgTable(
  "habits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    emoji: text("emoji").notNull().default("✅"),
    color: text("color").notNull().default("emerald"),
    type: habitType("type").notNull(),
    config: jsonb("config").$type<HabitConfig>().notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("habits_user_idx").on(t.userId)],
);

export const manualChecks = pgTable(
  "manual_checks",
  {
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    localDate: date("local_date").notNull(),
    checked: boolean("checked").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.habitId, t.localDate] })],
);

// ---------------------------------------------------------------------------
// Synced WHOOP data (normalized; habits are evaluated from these at read time)
// ---------------------------------------------------------------------------

export const whoopSleeps = pgTable(
  "whoop_sleeps",
  {
    // WHOOP v2 sleep id (UUID string).
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The wake-up day in the user's local time - "last night's sleep".
    localDate: date("local_date").notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
    end: timestamp("end", { withTimezone: true }).notNull(),
    // Actual time asleep (light + SWS + REM), in minutes.
    sleepMinutes: real("sleep_minutes"),
    performancePct: real("performance_pct"),
    isNap: boolean("is_nap").notNull().default(false),
    scoreState: text("score_state").notNull(),
    raw: jsonb("raw").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("whoop_sleeps_user_date_idx").on(t.userId, t.localDate)],
);

export const whoopWorkouts = pgTable(
  "whoop_workouts",
  {
    // WHOOP v2 workout id (UUID string).
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Day the workout started, in the user's local time.
    localDate: date("local_date").notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
    end: timestamp("end", { withTimezone: true }).notNull(),
    // WHOOP v2 doesn't guarantee sport_id (e.g. some records carry only
    // sport_name) - habit matching keys on sportName instead.
    sportId: integer("sport_id"),
    sportName: text("sport_name"),
    strain: real("strain"),
    scoreState: text("score_state").notNull(),
    raw: jsonb("raw").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("whoop_workouts_user_date_idx").on(t.userId, t.localDate),
    index("whoop_workouts_user_sport_idx").on(t.userId, t.sportId),
  ],
);

// ---------------------------------------------------------------------------
// Sync state (three phases: initial 14d pull → historical backfill → incremental)
// ---------------------------------------------------------------------------

export const backfillStatus = pgEnum("backfill_status", [
  "pending",
  "running",
  "done",
  "error",
]);

export const syncStates = pgTable("sync_states", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // Upper watermark: everything up to this instant has been synced.
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  // Lower watermark: history is complete back to this date.
  oldestSyncedDate: date("oldest_synced_date"),
  backfillStatus: backfillStatus("backfill_status").notNull().default("pending"),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type WhoopSleep = typeof whoopSleeps.$inferSelect;
export type WhoopWorkout = typeof whoopWorkouts.$inferSelect;
export type SyncState = typeof syncStates.$inferSelect;
