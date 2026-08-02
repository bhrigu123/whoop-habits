"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";

import { archiveHabit } from "@/lib/habits/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HabitDialog, type HabitDialogHabit } from "./habit-dialog";

interface HabitRowMenuProps {
  habit: HabitDialogHabit;
  sports: string[];
  /** After archiving, navigate back to the board (for the detail page). */
  redirectOnArchive?: boolean;
  /** Skip the hover-reveal behavior (for standalone placements). */
  alwaysVisible?: boolean;
}

export function HabitRowMenu({
  habit,
  sports,
  redirectOnArchive = false,
  alwaysVisible = false,
}: HabitRowMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function archive() {
    if (!window.confirm(`Archive "${habit.name}"? Its history is kept.`)) return;
    startTransition(async () => {
      const result = await archiveHabit(habit.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Archived ${habit.name}`);
      if (redirectOnArchive) router.push("/dashboard");
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className={`size-6 text-muted-foreground ${
                alwaysVisible
                  ? ""
                  : "opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100"
              }`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={archive} variant="destructive">
            <Archive className="size-4" /> Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <HabitDialog
        mode="edit"
        habit={habit}
        sports={sports}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
