import type {
  Habit,
  SleepDurationConfig,
  WorkoutFrequencyConfig,
} from "@/lib/db/schema";
import { addDays, mondayOf, weekDates } from "./dates";

/**
 * Pure habit evaluation. No IO here: callers assemble the inputs, these
 * functions grade them. Because results are always computed from raw synced
 * records, editing a habit's config retroactively re-grades all history.
 */

export type DayStatus =
  /** Goal met - green check. */
  | "met"
  /** Goal missed - red cross. */
  | "missed"
  /** No data to grade (unsynced/unscored day). */
  | "none"
  /** Rest day for weekly-cadence habits - neutral, not a failure. */
  | "rest"
  /** Day hasn't happened yet. */
  | "future";

export interface HabitDayCell {
  date: string;
  status: DayStatus;
  /** Human-readable context for tooltips, e.g. "7h 42m" or "2 activities". */
  detail?: string;
}

export interface WeeklyRollup {
  achieved: number;
  target: number;
  state: "met" | "missed" | "in_progress";
}

export interface HabitStreak {
  count: number;
  unit: "day" | "week";
}

/**
 * Count back from today using all available history and the current config.
 * An unfinished current period preserves the streak through the previous one;
 * any earlier period without a met goal ends it (including missing data).
 */
export function currentStreak(
  habit: Pick<Habit, "id" | "type" | "config">,
  inputs: EvaluationInputs,
): HabitStreak {
  const weekly = habit.type === "workout_frequency";
  const step = weekly ? 7 : 1;
  let period = weekly ? mondayOf(inputs.today) : inputs.today;
  const isMet = (date: string): boolean => {
    const cells = evaluateHabitDays(
      habit,
      weekly ? weekDates(date) : [date],
      inputs,
    );
    return weekly
      ? weeklyRollup(habit, cells, inputs.today)?.state === "met"
      : cells[0].status === "met";
  };

  if (!isMet(period)) period = addDays(period, -step);
  let count = 0;
  while (isMet(period)) {
    count++;
    period = addDays(period, -step);
  }
  return { count, unit: weekly ? "week" : "day" };
}

export interface SleepDayInput {
  sleepMinutes: number | null;
  isNap: boolean;
}

export interface WorkoutDayInput {
  sportName: string | null;
}

export interface EvaluationInputs {
  /** localDate → that day's sleeps. */
  sleepsByDate: Map<string, SleepDayInput[]>;
  /** localDate → that day's workouts. */
  workoutsByDate: Map<string, WorkoutDayInput[]>;
  /** `${habitId}:${localDate}` → checked. */
  manualChecks: Map<string, boolean>;
  /** Today in the user's timezone (YYYY-MM-DD). */
  today: string;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function evaluateSleepDay(
  config: SleepDurationConfig,
  date: string,
  inputs: EvaluationInputs,
): HabitDayCell {
  if (date > inputs.today) return { date, status: "future" };

  const scored = (inputs.sleepsByDate.get(date) ?? []).filter(
    (s) => !s.isNap && s.sleepMinutes != null,
  );
  if (scored.length === 0) return { date, status: "none" };

  // Longest non-nap sleep represents the night (guards odd double records).
  const best = Math.max(...scored.map((s) => s.sleepMinutes!));
  return {
    date,
    status: best >= config.minHours * 60 ? "met" : "missed",
    detail: formatMinutes(best),
  };
}

function matchesSport(
  config: WorkoutFrequencyConfig,
  sportName: string | null,
): boolean {
  if (config.sports.length === 0) return true;
  if (!sportName) return false;
  const name = sportName.toLowerCase();
  return config.sports.some((s) => s.toLowerCase() === name);
}

function evaluateWorkoutDay(
  config: WorkoutFrequencyConfig,
  date: string,
  inputs: EvaluationInputs,
): HabitDayCell {
  if (date > inputs.today) return { date, status: "future" };

  const matching = (inputs.workoutsByDate.get(date) ?? []).filter((w) =>
    matchesSport(config, w.sportName),
  );
  if (matching.length === 0) return { date, status: "rest" };
  return {
    date,
    status: "met",
    detail: matching.length > 1 ? `${matching.length} activities` : undefined,
  };
}

function evaluateManualDay(
  habitId: string,
  date: string,
  inputs: EvaluationInputs,
): HabitDayCell {
  if (date > inputs.today) return { date, status: "future" };

  const checked = inputs.manualChecks.get(`${habitId}:${date}`) ?? false;
  if (checked) return { date, status: "met" };
  // Today isn't a miss yet - leave it open and tappable.
  return { date, status: date === inputs.today ? "none" : "missed" };
}

export function evaluateHabitDays(
  habit: Pick<Habit, "id" | "type" | "config">,
  dates: string[],
  inputs: EvaluationInputs,
): HabitDayCell[] {
  switch (habit.type) {
    case "sleep_duration":
      return dates.map((d) =>
        evaluateSleepDay(habit.config as SleepDurationConfig, d, inputs),
      );
    case "workout_frequency":
      return dates.map((d) =>
        evaluateWorkoutDay(habit.config as WorkoutFrequencyConfig, d, inputs),
      );
    case "manual":
      return dates.map((d) => evaluateManualDay(habit.id, d, inputs));
  }
}

/**
 * Week-level progress for weekly-cadence habits. Counts distinct days with a
 * matching activity ("3 runs/week" = runs on 3 different days - consistency,
 * not volume).
 */
export function weeklyRollup(
  habit: Pick<Habit, "type" | "config">,
  cells: HabitDayCell[],
  today: string,
): WeeklyRollup | undefined {
  if (habit.type !== "workout_frequency") return undefined;

  const config = habit.config as WorkoutFrequencyConfig;
  const achieved = cells.filter((c) => c.status === "met").length;
  const weekOver = cells.every((c) => c.date < today);

  return {
    achieved,
    target: config.timesPerWeek,
    state:
      achieved >= config.timesPerWeek
        ? "met"
        : weekOver
          ? "missed"
          : "in_progress",
  };
}
