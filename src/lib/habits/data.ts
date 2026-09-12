import "server-only";

import { and, asc, between, eq, inArray, isNull, lte } from "drizzle-orm";

import {
  db,
  habits,
  manualChecks,
  whoopSleeps,
  whoopWorkouts,
  type Habit,
  type User,
} from "@/lib/db";
import { todayInTimezone } from "@/lib/whoop/dates";
import {
  evaluateHabitDays,
  currentStreak,
  weeklyRollup,
  type EvaluationInputs,
  type HabitDayCell,
  type HabitStreak,
  type WeeklyRollup,
} from "./engine";
import { isValidDateString, mondayOf, weekDates } from "./dates";

export interface WeekBoardRow {
  habit: Habit;
  cells: HabitDayCell[];
  weekly?: WeeklyRollup;
  streak: HabitStreak;
}

export interface WeekBoardData {
  weekStart: string;
  days: string[];
  today: string;
  rows: WeekBoardRow[];
}

export async function getActiveHabits(userId: string): Promise<Habit[]> {
  return db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
    .orderBy(asc(habits.sortOrder), asc(habits.createdAt));
}

/** Sports the user has actually logged - powers the workout-habit picker. */
export async function getUserSports(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ sportName: whoopWorkouts.sportName })
    .from(whoopWorkouts)
    .where(eq(whoopWorkouts.userId, userId));
  return rows
    .map((r) => r.sportName)
    .filter((s): s is string => s !== null)
    .sort();
}

export async function buildEvaluationInputs(
  user: User,
  habitList: Habit[],
  dates: string[],
  includeHistory = false,
): Promise<EvaluationInputs> {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const habitIds = habitList.map((h) => h.id);

  const [sleeps, workouts, checks] = await Promise.all([
    db
      .select({
        localDate: whoopSleeps.localDate,
        sleepMinutes: whoopSleeps.sleepMinutes,
        isNap: whoopSleeps.isNap,
      })
      .from(whoopSleeps)
      .where(
        and(
          eq(whoopSleeps.userId, user.id),
          includeHistory
            ? lte(whoopSleeps.localDate, last)
            : between(whoopSleeps.localDate, first, last),
        ),
      ),
    db
      .select({
        localDate: whoopWorkouts.localDate,
        sportName: whoopWorkouts.sportName,
      })
      .from(whoopWorkouts)
      .where(
        and(
          eq(whoopWorkouts.userId, user.id),
          includeHistory
            ? lte(whoopWorkouts.localDate, last)
            : between(whoopWorkouts.localDate, first, last),
        ),
      ),
    habitIds.length > 0
      ? db
          .select({
            habitId: manualChecks.habitId,
            localDate: manualChecks.localDate,
            checked: manualChecks.checked,
          })
          .from(manualChecks)
          .where(
            and(
              inArray(manualChecks.habitId, habitIds),
              includeHistory
                ? lte(manualChecks.localDate, last)
                : between(manualChecks.localDate, first, last),
            ),
          )
      : Promise.resolve([]),
  ]);

  const sleepsByDate = new Map<string, { sleepMinutes: number | null; isNap: boolean }[]>();
  for (const s of sleeps) {
    const list = sleepsByDate.get(s.localDate) ?? [];
    list.push(s);
    sleepsByDate.set(s.localDate, list);
  }

  const workoutsByDate = new Map<string, { sportName: string | null }[]>();
  for (const w of workouts) {
    const list = workoutsByDate.get(w.localDate) ?? [];
    list.push(w);
    workoutsByDate.set(w.localDate, list);
  }

  const manualMap = new Map<string, boolean>();
  for (const c of checks) {
    manualMap.set(`${c.habitId}:${c.localDate}`, c.checked);
  }

  return {
    sleepsByDate,
    workoutsByDate,
    manualChecks: manualMap,
    today: todayInTimezone(user.timezone),
  };
}

export async function getWeekBoard(
  user: User,
  weekParam?: string,
): Promise<WeekBoardData> {
  const today = todayInTimezone(user.timezone);
  const weekStart = isValidDateString(weekParam)
    ? mondayOf(weekParam)
    : mondayOf(today);
  const days = weekDates(weekStart);

  const habitList = await getActiveHabits(user.id);
  if (habitList.length === 0) return { weekStart, days, today, rows: [] };

  // Reuse the same three batched queries for the board and streaks. Fetch all
  // saved history so long streaks aren't cut off by the displayed week.
  const end = days[6] > today ? days[6] : today;
  const inputs = await buildEvaluationInputs(user, habitList, [days[0], end], true);
  inputs.today = today;

  const rows: WeekBoardRow[] = habitList.map((habit) => {
    const cells = evaluateHabitDays(habit, days, inputs);
    return {
      habit,
      cells,
      weekly: weeklyRollup(habit, cells, inputs.today),
      streak: currentStreak(habit, inputs),
    };
  });

  return { weekStart, days, today: inputs.today, rows };
}
