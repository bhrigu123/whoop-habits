import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant shell shown while the board's server render is in flight - makes
 * navigation feel immediate instead of blocking on data.
 */
export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </header>

      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      <div className="rounded-2xl border bg-card/60 p-4 shadow-sm">
        <div className="flex flex-col gap-4 p-2">
          <div className="flex justify-end gap-3">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="size-8 rounded-lg" />
            ))}
            <span className="w-10" />
          </div>
          {Array.from({ length: 3 }, (_, row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="size-8 rounded-lg" />
              ))}
              <span className="w-10" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
