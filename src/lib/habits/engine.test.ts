import assert from "node:assert/strict";
import { test } from "node:test";

import { currentStreak, type EvaluationInputs } from "./engine";

function inputs(today = "2026-09-12"): EvaluationInputs {
  return {
    today,
    manualChecks: new Map(),
    sleepsByDate: new Map(),
    workoutsByDate: new Map(),
  };
}

const manual = { id: "manual", type: "manual", config: {} } as const;
const sleep = {
  id: "sleep", type: "sleep_duration", config: { minHours: 8 },
} as const;
const workout = {
  id: "workout", type: "workout_frequency" as const,
  config: { sports: ["running"], timesPerWeek: 2 },
};

test("empty history has zero streaks for all habit types", () => {
  for (const habit of [manual, sleep, workout]) {
    assert.equal(currentStreak(habit, inputs()).count, 0);
  }
});

test("daily streak preserves yesterday, includes today when met, and stops at gaps", () => {
  const data = inputs();
  for (const date of ["2026-09-08", "2026-09-10", "2026-09-11"]) {
    data.manualChecks.set(`manual:${date}`, true);
  }
  assert.deepEqual(currentStreak(manual, data), { count: 2, unit: "day" });
  data.manualChecks.set("manual:2026-09-12", true);
  assert.equal(currentStreak(manual, data).count, 3);
  data.manualChecks.set("manual:2026-09-11", false);
  assert.equal(currentStreak(manual, data).count, 1);
  data.manualChecks.set("manual:2026-09-12", false);
  assert.equal(currentStreak(manual, data).count, 0);
});

test("sleep uses the longest scored non-nap sleep and regrades with config edits", () => {
  const data = inputs();
  data.sleepsByDate.set("2026-09-11", [
    { sleepMinutes: 480, isNap: false },
    { sleepMinutes: 300, isNap: false },
  ]);
  data.sleepsByDate.set("2026-09-10", [
    { sleepMinutes: 600, isNap: true },
    { sleepMinutes: null, isNap: false },
  ]);
  assert.deepEqual(currentStreak(sleep, data), { count: 1, unit: "day" });
  assert.equal(currentStreak({ ...sleep, config: { minHours: 9 } }, data).count, 0);
});

test("weekly streak preserves unfinished week and counts distinct matching days", () => {
  const data = inputs();
  for (const date of ["2026-08-24", "2026-08-25", "2026-08-31", "2026-09-01"]) {
    data.workoutsByDate.set(date, [{ sportName: "Running" }]);
  }
  data.workoutsByDate.set("2026-09-07", [
    { sportName: "running" }, { sportName: "running" },
  ]);
  data.workoutsByDate.set("2026-09-08", [{ sportName: "cycling" }]);
  assert.deepEqual(currentStreak(workout, data), { count: 2, unit: "week" });
  data.workoutsByDate.set("2026-09-09", [{ sportName: "RUNNING" }]);
  assert.equal(currentStreak(workout, data).count, 3);
  data.workoutsByDate.delete("2026-09-01");
  assert.equal(currentStreak(workout, data).count, 1);
});

test("an incomplete week breaks the streak on Monday, not Sunday", () => {
  const data = inputs("2026-09-13");
  for (const date of ["2026-08-31", "2026-09-01"]) {
    data.workoutsByDate.set(date, [{ sportName: "running" }]);
  }
  assert.equal(currentStreak(workout, data).count, 1);
  data.today = "2026-09-14";
  assert.equal(currentStreak(workout, data).count, 0);
});

test("daily streak crosses year boundaries and ignores future checks", () => {
  const data = inputs("2027-01-01");
  for (const date of ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]) {
    data.manualChecks.set(`manual:${date}`, true);
  }
  assert.equal(currentStreak(manual, data).count, 3);
});
