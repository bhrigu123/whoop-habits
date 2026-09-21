import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getSyncStatus } from "@/lib/sync/engine";
import { getUserSports, getWeekBoard } from "@/lib/habits/data";
import type { User } from "@/lib/db";
import { SiteFooter } from "@/components/site-footer";
import { SyncStatusCard } from "@/components/sync-status-card";
import { WeekBoard } from "@/components/habits/week-board";
import { BoardSkeleton } from "./loading";

async function Board({ user, week }: { user: User; week?: string }) {
  const [board, sports] = await Promise.all([getWeekBoard(user, week), getUserSports(user.id)]);
  return <WeekBoard data={board} sports={sports} />;
}

async function SyncStatus({ userId }: { userId: string }) {
  return <SyncStatusCard initial={await getSyncStatus(userId)} />;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const user = await requireUser();
  const { week } = await searchParams;
  return (
    <main className="app-main flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Overview</p>
          <h1 className="app-title">Your habits</h1>
          <p className="mt-3 text-sm text-muted-foreground">Great oaks from little acorns grow.</p>
        </div>
      </div>
      <Suspense key={week ?? "current"} fallback={<BoardSkeleton />}><Board user={user} week={week} /></Suspense>
      <Suspense fallback={null}><SyncStatus userId={user.id} /></Suspense>
      <SiteFooter showDelete />
    </main>
  );
}
