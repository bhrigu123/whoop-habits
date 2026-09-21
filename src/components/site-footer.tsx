"use client";

import { useState, useTransition } from "react";
import { Ellipsis, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteMyData } from "@/lib/auth/actions";
import { GITHUB_URL, X_URL } from "@/lib/links";
import { GithubIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const iconLinkClasses =
  "flex size-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground";

export function SiteFooter({
  showDelete = false,
  showDisclaimer = false,
}: {
  showDelete?: boolean;
  showDisclaimer?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteMyData();
      if (result?.error) toast.error(result.error);
      // On success the action redirects to "/" before returning.
    });
  }

  return (
    <footer className="mt-auto flex flex-wrap items-center justify-end gap-0.5 border-t pt-5">
      
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub repository"
        className={iconLinkClasses}
      >
        <GithubIcon className="size-4" />
      </a>
      <a
        href={X_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="X profile"
        className={iconLinkClasses}
      >
        <XIcon className="size-3.5" />
      </a>
      {showDisclaimer && (
        <span className="mr-1.5 text-xs text-muted-foreground/70">
          (Not affiliated with WHOOP)
        </span>
      )}

      {showDelete && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="More options"
                  className="size-8 text-muted-foreground/60 hover:text-foreground"
                >
                  <Ellipsis className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="size-4" /> Delete my data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Delete all your data?</DialogTitle>
                <DialogDescription>
                  This removes your account, habits, check-ins, and every
                  synced WHOOP record, and revokes the WHOOP connection.
                  There is no undo. You can reconnect fresh anytime.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting…" : "Delete everything"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </footer>
  );
}
