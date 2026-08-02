"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import type { SyncStatusPayload } from "@/lib/sync/engine";

const POLL_INTERVAL_MS = 4_000;
const MAX_POLLS = 90; // ~6 minutes of polling, far beyond a normal backfill

function backfillProgress(status: SyncStatusPayload): number {
  if (!status.oldestSyncedDate) return 0;
  if (status.backfillStatus === "done") return 100;
  const target = new Date(status.backfillTargetDate).getTime();
  const oldest = new Date(status.oldestSyncedDate).getTime();
  const total = Date.now() - target;
  const covered = Date.now() - oldest;
  return Math.min(100, Math.max(0, Math.round((covered / total) * 100)));
}

export function SyncStatusCard({ initial }: { initial: SyncStatusPayload }) {
  const [status, setStatus] = useState<SyncStatusPayload>(initial);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const countsRef = useRef(initial.counts);
  const pollsRef = useRef(0);

  const syncing =
    !failed && (status.lastSyncedAt === null || status.backfillStatus !== "done");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      if (cancelled) return;
      pollsRef.current += 1;
      try {
        const res = await fetch("/api/sync", { method: "POST" });
        if (res.status === 401) {
          // Session ended server-side (expired, or the WHOOP grant is gone
          // and /api/sync signed us out). Full navigation, not router.push:
          // the client route cache still holds the dashboard.
          let reconnect = false;
          try {
            const body = (await res.json()) as { error?: string };
            reconnect = body.error === "reconnect_required";
          } catch {
            // no body - treat as a plain expired session
          }
          window.location.assign(reconnect ? "/?error=reconnect" : "/");
          return;
        }
        if (res.ok) {
          const next = (await res.json()) as SyncStatusPayload;
          if (cancelled) return;
          setStatus(next);
          setFailed(false);

          const prev = countsRef.current;
          if (
            prev.sleeps !== next.counts.sleeps ||
            prev.workouts !== next.counts.workouts
          ) {
            countsRef.current = next.counts;
            router.refresh(); // re-render the server-side data preview
          }
          if (next.lastSyncedAt !== null && next.backfillStatus === "done") {
            return; // fully synced - stop polling
          }
        } else {
          setFailed(true);
        }
      } catch {
        setFailed(true);
      }
      if (!cancelled && pollsRef.current < MAX_POLLS) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  const progress = backfillProgress(status);

  // Fully synced and healthy: stay invisible. (The poll effect above still
  // fires once on mount to trigger the incremental background sync.)
  if (!failed && status.lastSyncedAt !== null && status.backfillStatus === "done") {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card/60 px-4 py-3 text-sm">
      {failed ? (
        <>
          <TriangleAlert className="size-4 shrink-0 text-amber-500" />
          <span className="text-muted-foreground">
            Sync hit a snag - retrying automatically…
          </span>
        </>
      ) : status.lastSyncedAt === null ? (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin text-emerald-500" />
          <span>
            Pulling your last two weeks from WHOOP…{" "}
            <span className="text-muted-foreground">this takes a few seconds</span>
          </span>
        </>
      ) : syncing ? (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin text-emerald-500" />
          <div className="flex flex-1 flex-col gap-1.5">
            <span>
              Backfilling your history - {status.counts.sleeps} sleeps ·{" "}
              {status.counts.workouts} workouts so far
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
          <span className="text-muted-foreground">
            Synced · {status.counts.sleeps} sleeps · {status.counts.workouts}{" "}
            workouts · 13 months of history
          </span>
        </>
      )}
    </div>
  );
}
