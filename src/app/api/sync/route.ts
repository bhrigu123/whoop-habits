import { NextResponse } from "next/server";
import { after } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  needsBackfill,
  runBackfillChunk,
  runForegroundSync,
} from "@/lib/sync/engine";

/**
 * The single sync entry point, called by the dashboard on load and polled
 * while a backfill is in progress. Each call:
 *  1. runs the fast foreground sync inline (initial 14d or incremental),
 *  2. schedules one background backfill chunk via after() if history is
 *     still incomplete,
 *  3. returns the current status snapshot.
 */
export async function POST(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let status;
  try {
    status = await runForegroundSync(user);
  } catch (error) {
    console.error("Foreground sync failed:", error);
    return NextResponse.json({ error: "sync_failed" }, { status: 502 });
  }

  if (needsBackfill(status)) {
    // Errored backfills are retried here too - runBackfillChunk enforces a
    // cooldown so a failing window can't be hammered on every poll.
    after(() => runBackfillChunk(user).catch(console.error));
  }

  return NextResponse.json(status);
}
