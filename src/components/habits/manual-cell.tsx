"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { toggleManualCheck } from "@/lib/habits/actions";
import type { DayStatus } from "@/lib/habits/engine";

interface ManualCellProps {
  habitId: string;
  date: string;
  status: DayStatus;
}

export function ManualCell({ habitId, date, status }: ManualCellProps) {
  const [isPending, startTransition] = useTransition();
  const [intended, setIntended] = useState(false);

  if (status === "future") {
    return (
      <span className="mx-auto size-8 rounded-lg border border-muted/40 opacity-30" />
    );
  }

  // Optimistic: while the action is in flight, show the intended state.
  const checked = isPending ? intended : status === "met";
  const showMiss = !checked && status === "missed" && !isPending;

  function toggle() {
    const next = !(status === "met");
    setIntended(next);
    startTransition(async () => {
      const result = await toggleManualCheck(habitId, date, next);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={checked}
      aria-label={`${checked ? "Uncheck" : "Check off"} ${date}`}
      title={checked ? "Uncheck" : "Check off"}
      className={`mx-auto flex size-8 items-center justify-center rounded-lg text-sm transition-colors ${
        checked
          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/30"
          : showMiss
            ? "bg-red-500/10 text-red-700 dark:text-red-400/80 hover:bg-red-500/20"
            : "border border-dashed border-muted-foreground/30 text-transparent hover:border-emerald-500/60 hover:text-emerald-500/50"
      }`}
    >
      {checked ? "✓" : showMiss ? "✕" : "✓"}
    </button>
  );
}
