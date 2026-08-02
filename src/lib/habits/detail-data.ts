import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db, habits, type Habit, type User, type WorkoutFrequencyConfig } from "@/lib/db";
import {
  evaluateHabitDays,
  weeklyRollup,
  type HabitDayCell,
} from "./engine";
import { buildEvaluationInputs } from "./data";
import { addDays, mondayOf, monthDates, weekDates } from "./dates";

export interface HabitStat {
  label: string;
  value: string;
}

export interface HabitPeriodData {
  habit: Habit;
  /** One cell per day of the requested period, in order. */
  cells: HabitDayCell[];
  today: string;
  stats: HabitStat[];
}

export async function getOwnedHabit(
  user: User,
  habitId: string,
): Promise<Habit | null> {
  return (
    (await db.query.habits.findFirst({
      where: and(
        eq(habits.id, habitId),
        eq(habits.userId, user.id),
        isNull(habits.archivedAt),
      ),
    })) ?? null
  );
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/**
 * Evaluate a habit over an arbitrary run of days. The fetch range is widened
 * to full Mon–Sun weeks so weekly rollups at the period edges are correct.
 */
export async function getHabitPeriod(
  user: User,
  habit: Habit,
  dates: string[],
): Promise<HabitPeriodData> {
  const first = dates[0];
  const last = dates[dates.length - 1];

  const fetchStart = mondayOf(first);
  const fetchEnd = addDays(mondayOf(last), 6);
  const fetchDates: string[] = [];
  for (let d = fetchStart; d <= fetchEnd; d = addDays(d, 1)) fetchDates.push(d);

  const inputs = await buildEvaluationInputs(user, [habit], fetchDates);
  const cellsByDate = new Map(
    evaluateHabitDays(habit, fetchDates, inputs).map((c) => [c.date, c]),
  );
  const cells = dates.map((d) => cellsByDate.get(d)!);

  const stats: HabitStat[] = [];
  const met = cells.filter((c) => c.status === "met").length;
  const missed = cells.filter((c) => c.status === "missed").length;

  if (habit.type === "workout_frequency") {
    const config = habit.config as WorkoutFrequencyConfig;
    stats.push({ label: "Active days", value: String(met) });

    // Week-level success across every week the period touches.
    let weeksMet = 0;
    let weeksDecided = 0;
    for (let monday = fetchStart; monday <= fetchEnd; monday = addDays(monday, 7)) {
      const week = weekDates(monday);
      const weekCells = week.map((d) => cellsByDate.get(d)!);
      const rollup = weeklyRollup(habit, weekCells, inputs.today);
      if (!rollup) continue;
      if (rollup.state === "met") {
        weeksMet++;
        weeksDecided++;
      } else if (rollup.state === "missed") {
        weeksDecided++;
      }
      // in_progress weeks aren't decided yet - excluded from the denominator.
    }
    stats.push({
      label: `Weeks at ${config.timesPerWeek}×`,
      value: weeksDecided > 0 ? `${weeksMet}/${weeksDecided}` : "-",
    });
  } else {
    const graded = met + missed;
    stats.push({ label: "Met", value: String(met) });
    stats.push({ label: "Missed", value: String(missed) });
    stats.push({
      label: "Success",
      value: graded > 0 ? `${Math.round((met / graded) * 100)}%` : "-",
    });

    if (habit.type === "sleep_duration") {
      // Average of the graded nights shown in this period.
      let total = 0;
      let nights = 0;
      for (const date of dates) {
        const sleeps = (inputs.sleepsByDate.get(date) ?? []).filter(
          (s) => !s.isNap && s.sleepMinutes != null,
        );
        if (sleeps.length === 0) continue;
        total += Math.max(...sleeps.map((s) => s.sleepMinutes!));
        nights++;
      }
      if (nights > 0) {
        stats.push({ label: "Avg sleep", value: formatMinutes(total / nights) });
      }
    }
  }

  return { habit, cells, today: inputs.today, stats };
}

export function yearDates(year: string): string[] {
  const months = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
  );
  return months.flatMap(monthDates);
}
