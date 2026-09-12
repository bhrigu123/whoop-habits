import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { WeekBoardData } from "@/lib/habits/data";
import type { HabitDayCell } from "@/lib/habits/engine";
import type { SleepDurationConfig, WorkoutFrequencyConfig } from "@/lib/db/schema";
import { colorClasses } from "@/lib/habits/colors";
import { addDays, dayOfMonth, formatWeekLabel, mondayOf } from "@/lib/habits/dates";
import { formatSportName } from "@/lib/whoop/sports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ManualCell } from "./manual-cell";
import { HabitRowMenu } from "./habit-row-menu";
import { NewHabitButton } from "./new-habit-button";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Shared by the header row and every habit row so columns stay aligned. */
const GRID_COLS =
  "grid-cols-[minmax(11rem,1fr)_repeat(7,2.75rem)_4rem_5.5rem]";

function configSummary(row: WeekBoardData["rows"][number]): string {
  const { habit } = row;
  switch (habit.type) {
    case "sleep_duration":
      return `≥ ${(habit.config as SleepDurationConfig).minHours}h sleep`;
    case "workout_frequency": {
      const config = habit.config as WorkoutFrequencyConfig;
      const sports =
        config.sports.length === 0
          ? "any workout"
          : config.sports.map(formatSportName).join(", ");
      return `${config.timesPerWeek}×/week · ${sports}`;
    }
    case "manual":
      return "daily check-in";
  }
}

function StaticCell({ cell }: { cell: HabitDayCell }) {
  const base =
    "mx-auto flex size-8 items-center justify-center rounded-lg text-sm transition-colors";
  switch (cell.status) {
    case "met":
      return (
        <span className={`${base} bg-emerald-500/20 text-emerald-400`} title={cell.detail}>
          ✓
        </span>
      );
    case "missed":
      return (
        <span className={`${base} bg-red-500/10 text-red-400/80`} title={cell.detail}>
          ✕
        </span>
      );
    case "rest":
      return <span className={`${base} bg-muted/70`} title="Rest day" />;
    case "none":
      return (
        <span className={`${base} text-muted-foreground/40`} title="No data">
          –
        </span>
      );
    case "future":
      return <span className={`${base} border border-muted/40 opacity-30`} />;
  }
}

export function WeekBoard({
  data,
  sports,
}: {
  data: WeekBoardData;
  sports: string[];
}) {
  const currentWeek = mondayOf(data.today);
  const isCurrentWeek = data.weekStart === currentWeek;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" nativeButton={false}
            render={<Link href={`/dashboard?week=${addDays(data.weekStart, -7)}`} />}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {formatWeekLabel(data.weekStart)}
          </span>
          <Button variant="ghost" size="icon" className="size-8" nativeButton={false}
            render={<Link href={`/dashboard?week=${addDays(data.weekStart, 7)}`} />}>
            <ChevronRight className="size-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" className="ml-1 h-8" nativeButton={false}
              render={<Link href="/dashboard" />}>
              This week
            </Button>
          )}
        </div>
        <NewHabitButton sports={sports} />
      </div>

      {data.rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <span className="text-3xl">🌱</span>
          <p className="font-medium">No habits yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create your first habit - try{" "}
            <span className="text-foreground">😴 Sleep 8h+</span> and watch WHOOP
            fill in your week automatically.
          </p>
          <NewHabitButton sports={sports} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card/60 p-4 shadow-sm">
          <div className="flex min-w-[720px] flex-col gap-1">
            <div className={`grid ${GRID_COLS} items-center gap-x-1 px-2 pb-2`}>
              <span className="text-xs text-muted-foreground">Habit</span>
              {data.days.map((date, i) => {
                const isToday = date === data.today;
                return (
                  <span
                    key={date}
                    className={`flex flex-col items-center text-xs ${
                      isToday ? "font-semibold text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {DOW_LABELS[i]}
                    <span
                      className={`mt-0.5 flex size-5 items-center justify-center rounded-full text-[11px] ${
                        isToday ? "bg-emerald-500/20" : ""
                      }`}
                    >
                      {dayOfMonth(date)}
                    </span>
                  </span>
                );
              })}
              <span className="text-center text-xs text-muted-foreground">Week<br />progress</span>
              <span className="text-center text-xs text-muted-foreground">Current<br />streak</span>
            </div>

            {data.rows.map((row) => {
              const colors = colorClasses(row.habit.color);
              return (
                <div
                  key={row.habit.id}
                  className={`group/row grid ${GRID_COLS} items-center gap-x-1 rounded-xl px-2 py-2 transition-colors hover:bg-muted/40`}
                >
                  <div className="flex min-w-0 items-center gap-1 pr-2">
                    <Link
                      href={`/habits/${row.habit.id}`}
                      title="Monthly & yearly view"
                      className="flex min-w-0 flex-1 items-center gap-2.5"
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-lg transition-transform group-hover/row:scale-105 ${colors.iconBg}`}
                      >
                        {row.habit.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-sm font-medium">
                          <span className="truncate">{row.habit.name}</span>
                          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100" />
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {configSummary(row)}
                        </span>
                      </span>
                    </Link>
                    <HabitRowMenu
                      habit={{
                        id: row.habit.id,
                        name: row.habit.name,
                        emoji: row.habit.emoji,
                        color: row.habit.color,
                        type: row.habit.type,
                        config: row.habit.config,
                      }}
                      sports={sports}
                    />
                  </div>

                  {row.cells.map((cell) =>
                    row.habit.type === "manual" ? (
                      <ManualCell
                        key={cell.date}
                        habitId={row.habit.id}
                        date={cell.date}
                        status={cell.status}
                      />
                    ) : (
                      <StaticCell key={cell.date} cell={cell} />
                    ),
                  )}

                  <span className="text-center">
                    {row.weekly ? (
                      <Badge
                        variant="secondary"
                        className={`tabular-nums ${
                          row.weekly.state === "met"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : row.weekly.state === "missed"
                              ? "bg-red-500/10 text-red-400/80"
                              : "text-muted-foreground"
                        }`}
                      >
                        {row.weekly.achieved}/{row.weekly.target}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="tabular-nums text-muted-foreground">
                        {row.cells.filter((cell) => cell.status === "met").length}/7
                      </Badge>
                    )}
                  </span>
                  <span className="text-center">
                    <Badge
                      variant="secondary"
                      className={`tabular-nums ${
                        row.streak.count > 0
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {row.streak.count} {row.streak.unit}{row.streak.count === 1 ? "" : "s"}
                    </Badge>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {data.rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Streaks are current as of today, based on saved data. An unfinished day
          or week keeps your previous streak alive. Weeks run Monday–Sunday.
        </p>
      )}
    </section>
  );
}
