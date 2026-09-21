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
        className="gap-1.5 px-3"
      >
        <Plus className="size-4" strokeWidth={2.5} /> New habit
      </Button>
      <HabitDialog mode="create" sports={sports} open={open} onOpenChange={setOpen} />
    </>
  );
}
