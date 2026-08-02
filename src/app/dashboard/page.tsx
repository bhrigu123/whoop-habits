import Image from "next/image";

import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { getSyncStatus } from "@/lib/sync/engine";
import { getUserSports, getWeekBoard } from "@/lib/habits/data";
import { SyncStatusCard } from "@/components/sync-status-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { WeekBoard } from "@/components/habits/week-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const { week } = await searchParams;

  const [status, board, sports] = await Promise.all([
    getSyncStatus(user.id),
    getWeekBoard(user, week),
    getUserSports(user.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-semibold">
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="rounded-lg"
          />
          Whoop Habits
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {user.firstName ?? "Connected"}
          </Badge>
          <ThemeToggle />
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <WeekBoard data={board} sports={sports} />

      <SyncStatusCard initial={status} />
    </main>
  );
}
