"use client";

import { useState, useTransition } from "react";
import { Ellipsis, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteMyData } from "@/lib/auth/actions";
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

const GITHUB_URL = "https://github.com/bhrigu123/whoop-habits";
const X_URL = "https://x.com/Bhrigu_Sr";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.24 2.25h3.31l-7.23 8.26L22.83 21.75h-6.66l-5.22-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
    </svg>
  );
}

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
    <footer className="mt-auto flex items-center justify-end gap-0.5 pt-8">
      
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
