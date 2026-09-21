import { Skeleton } from "@/components/ui/skeleton";

export function BoardSkeleton() {
  return (
    <section className="space-y-4" aria-label="Loading habits" role="status">
      <div className="flex justify-between gap-4"><Skeleton className="h-9 w-48" /><Skeleton className="h-9 w-24" /></div>
      <div className="overflow-hidden rounded-lg border bg-card p-4">
        <div className="min-w-[720px] space-y-4">
          {Array.from({ length: 4 }, (_, row) => (
            <div key={row} className="flex items-center gap-3 border-b py-3 last:border-0">
              <Skeleton className="size-8" /><Skeleton className="h-4 w-36 mr-auto" />
              {Array.from({ length: 7 }, (_, day) => <Skeleton key={day} className="size-8" />)}
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DashboardLoading() {
  return (
    <main className="app-main flex flex-1 flex-col gap-8">
      <div><p className="mb-2 text-xs text-muted-foreground">Overview</p><h1 className="app-title">Your habits</h1><p className="mt-3 text-sm text-muted-foreground">Great oaks from little acorns grow.</p></div>
      <BoardSkeleton />
    </main>
  );
}
