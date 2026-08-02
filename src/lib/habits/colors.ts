/** Accent palette for habits. Full class strings so Tailwind JIT sees them. */

export const HABIT_COLORS = [
  "emerald",
  "sky",
  "violet",
  "amber",
  "rose",
] as const;

export type HabitColor = (typeof HABIT_COLORS)[number];

export const COLOR_CLASSES: Record<
  HabitColor,
  { swatch: string; iconBg: string }
> = {
  emerald: { swatch: "bg-emerald-500", iconBg: "bg-emerald-500/15" },
  sky: { swatch: "bg-sky-500", iconBg: "bg-sky-500/15" },
  violet: { swatch: "bg-violet-500", iconBg: "bg-violet-500/15" },
  amber: { swatch: "bg-amber-500", iconBg: "bg-amber-500/15" },
  rose: { swatch: "bg-rose-500", iconBg: "bg-rose-500/15" },
};

export function colorClasses(color: string) {
  return COLOR_CLASSES[(color as HabitColor) in COLOR_CLASSES ? (color as HabitColor) : "emerald"];
}
