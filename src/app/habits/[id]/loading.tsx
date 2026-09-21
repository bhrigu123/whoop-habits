import { Skeleton } from "@/components/ui/skeleton";

export default function HabitDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[968px] flex-1 flex-col gap-8 px-5 py-8">
      <header className="flex items-center justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="size-8 rounded-lg" />
      </header>

      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-48 sm:w-64" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="rounded-lg border bg-card p-3 sm:p-6">
        <div className="mx-auto grid w-fit grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="size-8 sm:size-10 rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  );
}
