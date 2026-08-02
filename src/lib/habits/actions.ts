"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { db, habits, manualChecks, type HabitConfig } from "@/lib/db";
import { todayInTimezone } from "@/lib/whoop/dates";
import { HABIT_COLORS } from "./colors";
import { isValidDateString } from "./dates";

export interface ActionResult {
  error?: string;
}

const baseSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(60, "Name is too long"),
  emoji: z.string().trim().min(1).max(16),
  color: z.enum(HABIT_COLORS),
});

const configSchemas = {
  sleep_duration: z.object({
    minHours: z.number().min(1, "At least 1 hour").max(16, "At most 16 hours"),
  }),
  workout_frequency: z.object({
    sports: z.array(z.string().trim().min(1).max(64)).max(30),
    timesPerWeek: z.number().int().min(1).max(7),
  }),
  manual: z.object({}).strict(),
} as const;

type HabitType = keyof typeof configSchemas;

function parseHabitForm(formData: FormData):
  | { error: string }
  | {
      type: HabitType;
      name: string;
      emoji: string;
      color: string;
      config: HabitConfig;
    } {
  const type = formData.get("type");
  if (type !== "sleep_duration" && type !== "workout_frequency" && type !== "manual") {
    return { error: "Unknown habit type" };
  }

  const base = baseSchema.safeParse({
    name: formData.get("name"),
    emoji: formData.get("emoji"),
    color: formData.get("color"),
  });
  if (!base.success) {
    return { error: base.error.issues[0]?.message ?? "Invalid habit" };
  }

  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(String(formData.get("config") ?? "{}"));
  } catch {
    return { error: "Invalid habit settings" };
  }
  const config = configSchemas[type].safeParse(rawConfig);
  if (!config.success) {
    return { error: config.error.issues[0]?.message ?? "Invalid habit settings" };
  }

  return { type, ...base.data, config: config.data as HabitConfig };
}

export async function createHabit(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parseHabitForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  await db.insert(habits).values({
    id: crypto.randomUUID(),
    userId: user.id,
    name: parsed.name,
    emoji: parsed.emoji,
    color: parsed.color,
    type: parsed.type,
    config: parsed.config,
  });

  revalidatePath("/dashboard");
  return {};
}

export async function updateHabit(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const habitId = String(formData.get("habitId") ?? "");
  if (!habitId) return { error: "Missing habit" };

  const parsed = parseHabitForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const existing = await db.query.habits.findFirst({
    where: and(eq(habits.id, habitId), eq(habits.userId, user.id)),
  });
  if (!existing) return { error: "Habit not found" };
  if (existing.type !== parsed.type) return { error: "Habit type can't change" };

  await db
    .update(habits)
    .set({
      name: parsed.name,
      emoji: parsed.emoji,
      color: parsed.color,
      config: parsed.config,
    })
    .where(eq(habits.id, habitId));

  revalidatePath("/dashboard");
  return {};
}

export async function archiveHabit(habitId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await db
    .update(habits)
    .set({ archivedAt: new Date() })
    .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
    .returning({ id: habits.id });
  if (result.length === 0) return { error: "Habit not found" };

  revalidatePath("/dashboard");
  return {};
}

export async function toggleManualCheck(
  habitId: string,
  localDate: string,
  checked: boolean,
): Promise<ActionResult> {
  const user = await requireUser();

  if (!isValidDateString(localDate)) return { error: "Invalid date" };
  if (localDate > todayInTimezone(user.timezone)) {
    return { error: "Can't check off the future" };
  }

  const habit = await db.query.habits.findFirst({
    where: and(eq(habits.id, habitId), eq(habits.userId, user.id)),
  });
  if (!habit) return { error: "Habit not found" };
  if (habit.type !== "manual") return { error: "Not a manual habit" };

  await db
    .insert(manualChecks)
    .values({ habitId, localDate, checked })
    .onConflictDoUpdate({
      target: [manualChecks.habitId, manualChecks.localDate],
      set: { checked },
    });

  revalidatePath("/dashboard");
  return {};
}
