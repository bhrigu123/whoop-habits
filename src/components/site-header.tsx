import { Suspense } from "react";
import { Activity } from "lucide-react";
import { NavigationLink } from "@/components/navigation-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";

async function AccountControls() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <>
      <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="max-w-24 truncate sm:max-w-40" title={user.firstName ?? "Connected"}>{user.firstName ?? "Connected"}</span>
      </span>
      <form action={signOut}>
        <Button variant="ghost" size="sm" type="submit">Sign out</Button>
      </form>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="app-header">
      <div className="app-header-inner gap-3">
        <NavigationLink href="/" className="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-tight" aria-label="Whoop Habits home">
          <Activity className="size-5" strokeWidth={1.8} />
          <span className="hidden min-[400px]:inline">Whoop Habits</span>
        </NavigationLink>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <Suspense fallback={null}><AccountControls /></Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
