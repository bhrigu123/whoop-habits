"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createHabit, updateHabit } from "@/lib/habits/actions";
import { HABIT_COLORS, COLOR_CLASSES, type HabitColor } from "@/lib/habits/colors";
import { formatSportName, sportEmoji } from "@/lib/whoop/sports";
import type { HabitConfig, SleepDurationConfig, WorkoutFrequencyConfig } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface HabitDialogHabit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: "sleep_duration" | "workout_frequency" | "manual";
  config: HabitConfig;
}

const TYPE_OPTIONS = [
  {
    type: "sleep_duration" as const,
    emoji: "😴",
    title: "Sleep duration",
    description: "Slept at least X hours - filled in from WHOOP",
    defaultColor: "violet" as HabitColor,
  },
  {
    type: "workout_frequency" as const,
    emoji: "💪",
    title: "Workout frequency",
    description: "N sessions a week - filled in from WHOOP",
    defaultColor: "emerald" as HabitColor,
  },
  {
    type: "manual" as const,
    emoji: "✍️",
    title: "Manual habit",
    description: "Anything WHOOP can't see - check it off yourself",
    defaultColor: "sky" as HabitColor,
  },
];

interface HabitDialogProps {
  mode: "create" | "edit";
  habit?: HabitDialogHabit;
  sports: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitDialog({ mode, habit, sports, open, onOpenChange }: HabitDialogProps) {
  const [type, setType] = useState<HabitDialogHabit["type"] | null>(
    habit?.type ?? null,
  );
  const [name, setName] = useState(habit?.name ?? "");
  const [emoji, setEmoji] = useState(habit?.emoji ?? "");
  const [color, setColor] = useState<string>(habit?.color ?? "emerald");
  const [minHours, setMinHours] = useState(
    habit?.type === "sleep_duration"
      ? (habit.config as SleepDurationConfig).minHours
      : 8,
  );
  const [timesPerWeek, setTimesPerWeek] = useState(
    habit?.type === "workout_frequency"
      ? (habit.config as WorkoutFrequencyConfig).timesPerWeek
      : 3,
  );
  const [selectedSports, setSelectedSports] = useState<string[]>(
    habit?.type === "workout_frequency"
      ? (habit.config as WorkoutFrequencyConfig).sports
      : [],
  );
  const [isPending, startTransition] = useTransition();

  function reset() {
    setType(habit?.type ?? null);
    setName(habit?.name ?? "");
    setEmoji(habit?.emoji ?? "");
    setColor(habit?.color ?? "emerald");
  }

  function pickType(option: (typeof TYPE_OPTIONS)[number]) {
    setType(option.type);
    setEmoji(option.emoji);
    setColor(option.defaultColor);
    if (option.type === "sleep_duration" && !name) setName("Sleep 8h+");
  }

  function toggleSport(sport: string) {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
    );
  }

  function submit() {
    if (!type) return;
    const config: HabitConfig =
      type === "sleep_duration"
        ? { minHours }
        : type === "workout_frequency"
          ? { sports: selectedSports, timesPerWeek }
          : {};

    const formData = new FormData();
    if (mode === "edit" && habit) formData.set("habitId", habit.id);
    formData.set("type", type);
    formData.set("name", name);
    formData.set("emoji", emoji || "✅");
    formData.set("color", color);
    formData.set("config", JSON.stringify(config));

    startTransition(async () => {
      const result =
        mode === "create" ? await createHabit(formData) : await updateHabit(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Habit created 🎉" : "Habit updated");
      onOpenChange(false);
      if (mode === "create") {
        setType(null);
        setName("");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New habit" : `Edit ${habit?.name}`}
          </DialogTitle>
          <DialogDescription>
            {type === null
              ? "What kind of habit is this?"
              : type === "manual"
                ? "You'll check this one off yourself."
                : "WHOOP fills this in for you - no manual tracking."}
          </DialogDescription>
        </DialogHeader>

        {type === null ? (
          <div className="flex flex-col gap-2">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => pickType(option)}
                className="flex items-start gap-3 rounded-md border p-4 text-left transition-colors hover:border-foreground/40 hover:bg-muted"
              >
                <span className="text-2xl">{option.emoji}</span>
                <span>
                  <span className="block font-medium">{option.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex gap-3">
              <div className="w-16 space-y-2">
                <Label htmlFor="habit-emoji">Emoji</Label>
                <Input
                  id="habit-emoji"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="text-center text-lg"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="habit-name">Name</Label>
                <Input
                  id="habit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    type === "sleep_duration"
                      ? "Sleep 8h+"
                      : type === "workout_frequency"
                        ? "Run 3×/week"
                        : "Read 30 minutes"
                  }
                  autoFocus
                />
              </div>
            </div>

            {type === "sleep_duration" && (
              <div className="space-y-2">
                <Label htmlFor="habit-hours">Minimum hours of sleep</Label>
                <Input
                  id="habit-hours"
                  type="number"
                  min={1}
                  max={16}
                  step={0.5}
                  value={minHours}
                  onChange={(e) => setMinHours(Number(e.target.value))}
                  className="w-28"
                />
              </div>
            )}

            {type === "workout_frequency" && (
              <>
                <div className="space-y-2">
                  <Label>Times per week</Label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setTimesPerWeek(n)}
                        className={`size-9 rounded-lg border text-sm font-medium transition-colors ${
                          timesPerWeek === n
                            ? "border-foreground bg-muted text-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Which activities count?</Label>
                  <p className="text-xs text-muted-foreground">
                    {selectedSports.length === 0
                      ? "None selected - any WHOOP workout counts."
                      : `${selectedSports.length} selected.`}
                  </p>
                  <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                    {sports.map((sport) => (
                      <button
                        key={sport}
                        type="button"
                        onClick={() => toggleSport(sport)}
                        className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                          selectedSports.includes(sport)
                            ? "border-foreground bg-muted text-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {sportEmoji(sport)} {formatSportName(sport)}
                      </button>
                    ))}
                  </div>
                  {sports.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No synced workouts yet - any workout will count for now.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setColor(c)}
                    className={`size-7 rounded-full ${COLOR_CLASSES[c].swatch} transition-transform ${
                      color === c ? "scale-110 ring-2 ring-foreground/60 ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-2">
              {mode === "create" ? (
                <Button type="button" variant="ghost" onClick={() => setType(null)}>
                  ← Back
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving…"
                  : mode === "create"
                    ? "Create habit"
                    : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
