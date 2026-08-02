"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HabitDialog } from "./habit-dialog";

export function NewHabitButton({ sports }: { sports: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 font-semibold text-emerald-950 shadow-md shadow-emerald-500/20 transition-all hover:from-emerald-300 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30"
      >
        <Plus className="size-4" strokeWidth={2.5} /> New habit
      </Button>
      <HabitDialog mode="create" sports={sports} open={open} onOpenChange={setOpen} />
    </>
  );
}
