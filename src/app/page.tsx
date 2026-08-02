import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { signupsFull } from "@/lib/auth/signups";
import { X_URL } from "@/lib/links";
import { XIcon } from "@/components/icons";
import { ConnectWhoopButton } from "@/components/connect-whoop-button";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";

const ERROR_MESSAGES: Record<string, string> = {
  expired: "That sign-in attempt expired. Please try again.",
  denied: "WHOOP authorization wasn't completed. Try connecting again.",
  connect_failed: "Something went wrong finishing the connection. Please retry.",
  profile_failed: "Connected, but we couldn't read your WHOOP profile. Please retry.",
  reconnect:
    "Your WHOOP access was disconnected, so we signed you out. Connect again to resume syncing.",
};

const SAMPLE_WEEK = [
  { emoji: "😴", label: "Sleep 8h+", days: [true, true, false, true, true, true, true] },
  { emoji: "🏃", label: "Run 3×/week", days: [true, false, false, true, false, true, false] },
  { emoji: "🏋️", label: "Gym 4×/week", days: [false, true, true, false, true, false, true] },
];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  // "limit" comes back from the callback when WHOOP turned the grant down while
  // we were already at the cap. Either way the notice below says it, so it
  // replaces the generic error rather than stacking with it.
  const capReached = error === "limit" || (await signupsFull());
  const errorMessage =
    error && error !== "limit" ? ERROR_MESSAGES[error] : undefined;

  return (
    <main className="relative flex flex-1 flex-col bg-gradient-to-b from-background via-background to-emerald-100/60 px-6 pt-16 pb-4 dark:to-emerald-950/25">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="m-auto flex w-full max-w-md flex-col items-center gap-8 py-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="Whoop Habits logo"
            width={72}
            height={72}
            priority
            className="rounded-2xl shadow-lg shadow-emerald-500/10"
          />
          <h1 className="text-3xl font-bold tracking-tight">Whoop Habits</h1>
          <p className="text-muted-foreground">
            Habits, auto-filled from your WHOOP
          </p>
        </div>

        <div className="w-full rounded-2xl border bg-card/60 p-5 shadow-sm backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_repeat(7,1.75rem)] items-center gap-x-1 gap-y-2.5 text-sm">
            <span />
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="text-center text-xs font-medium text-muted-foreground">
                {d}
              </span>
            ))}
            {SAMPLE_WEEK.map((habit) => (
              <div key={habit.label} className="contents">
                <span className="flex items-center gap-2 truncate text-left font-medium">
                  <span>{habit.emoji}</span>
                  {habit.label}
                </span>
                {habit.days.map((done, i) => (
                  <span
                    key={i}
                    className={`mx-auto flex size-6 items-center justify-center rounded-md text-xs ${
                      done
                        ? "bg-emerald-500/20 text-emerald-500 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-400/70"
                    }`}
                  >
                    {done ? "✓" : "✕"}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Weekly board · monthly &amp; yearly views · sleep, workout &amp; manual habits
        </p>

        <div className="flex flex-col items-center gap-3">
          <ConnectWhoopButton />
          {errorMessage && (
            <p className="text-sm text-red-400" role="alert">
              {errorMessage}
            </p>
          )}
          {capReached && (
            <div className="w-full space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-sm">
              <p className="font-medium">New signups are full</p>
              <p className="text-muted-foreground">
                We&apos;ve reached the maximum number of users WHOOP allows
                before app approval, and we&apos;re working on raising the
                limit. Already connected? You can still sign in above.
              </p>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Follow for updates
                <XIcon className="size-3" />
              </a>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Read-only · disconnect anytime ·{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy
            </Link>
          </p>
        </div>
      </div>

      <SiteFooter showDisclaimer />
    </main>
  );
}
