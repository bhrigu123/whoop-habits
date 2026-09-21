import { NavigationLink as Link } from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getOwnedHabit, getHabitPeriod, yearDates } from "@/lib/habits/detail-data";
import { getUserSports } from "@/lib/habits/data";
import { colorClasses } from "@/lib/habits/colors";
import {
  addMonths,
  formatMonthLabel,
  isValidMonthString,
  isValidYearString,
  monthDates,
  monthOf,
} from "@/lib/habits/dates";
import { todayInTimezone } from "@/lib/whoop/dates";
import { GridLegend, MonthGrid, YearGrid } from "@/components/habits/period-grids";
import { HabitRowMenu } from "@/components/habits/habit-row-menu";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export default async function HabitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; m?: string; y?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;

  const habit = await getOwnedHabit(user, id);
  if (!habit) redirect("/dashboard");

  const today = todayInTimezone(user.timezone);
  const view = query.view === "year" ? "year" : "month";
  const month = isValidMonthString(query.m) ? query.m : monthOf(today);
  const year = isValidYearString(query.y) ? query.y : today.slice(0, 4);

  const dates = view === "month" ? monthDates(month) : yearDates(year);
  const [period, sports] = await Promise.all([
    getHabitPeriod(user, habit, dates),
    getUserSports(user.id),
  ]);

  const colors = colorClasses(habit.color);
  const baseUrl = `/habits/${habit.id}`;
  const prevHref =
    view === "month"
      ? `${baseUrl}?view=month&m=${addMonths(month, -1)}`
      : `${baseUrl}?view=year&y=${Number(year) - 1}`;
  const nextHref =
    view === "month"
      ? `${baseUrl}?view=month&m=${addMonths(month, 1)}`
      : `${baseUrl}?view=year&y=${Number(year) + 1}`;

  return (
    <main className="mx-auto flex w-full max-w-[968px] flex-1 flex-col gap-8 px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" nativeButton={false}
          render={<Link href="/dashboard" />}>
          <ArrowLeft className="size-4" /> Board
        </Button>
      </header>

      <div className="flex items-center gap-3">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-md text-2xl ${colors.iconBg}`}
        >
          {habit.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate app-title">{habit.name}</h1>
            <HabitRowMenu
              habit={{
                id: habit.id,
                name: habit.name,
                emoji: habit.emoji,
                color: habit.color,
                type: habit.type,
                config: habit.config,
              }}
              sports={sports}
              redirectOnArchive
              alwaysVisible
            />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {period.stats.map((stat) => (
              <span key={stat.label}>
                <span className="font-medium tabular-nums text-foreground">
                  {stat.value}
                </span>{" "}
                {stat.label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border p-0.5">
          <Button
            variant={view === "month" ? "secondary" : "ghost"}
            size="sm"
            className="h-7"
            nativeButton={false}
            render={<Link href={`${baseUrl}?view=month&m=${month}`} />}
          >
            Month
          </Button>
          <Button
            variant={view === "year" ? "secondary" : "ghost"}
            size="sm"
            className="h-7"
            nativeButton={false}
            render={<Link href={`${baseUrl}?view=year&y=${year}`} />}
          >
            Year
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" nativeButton={false}
            aria-label="Previous period"
            render={<Link href={prevHref} />}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {view === "month" ? formatMonthLabel(month) : year}
          </span>
          <Button variant="ghost" size="icon" className="size-8" nativeButton={false}
            aria-label="Next period"
            render={<Link href={nextHref} />}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3 sm:p-6">
        {view === "month" ? (
          <MonthGrid cells={period.cells} today={period.today} />
        ) : (
          <YearGrid cells={period.cells} today={period.today} />
        )}
      </div>

      <GridLegend showRest={habit.type === "workout_frequency"} />

      <SiteFooter showDelete />
    </main>
  );
}
