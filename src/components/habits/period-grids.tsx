import type { HabitDayCell, DayStatus } from "@/lib/habits/engine";
import { dayOfMonth, MONTH_SHORT_LABELS } from "@/lib/habits/dates";

/**
 * The minimal red/green boxes. Rest days (weekly habits) are neutral blocks,
 * deliberately distinct from the faint "no data" state.
 */
function boxClasses(status: DayStatus): string {
  switch (status) {
    case "met":
      return "bg-emerald-500/85";
    case "missed":
      return "bg-red-500/45";
    case "rest":
      return "bg-muted";
    case "none":
      return "bg-muted/40";
    case "future":
      return "bg-muted/15";
  }
}

const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/** Calendar-shaped month view: 7 columns, aligned to the real weekdays. */
export function MonthGrid({
  cells,
  today,
}: {
  cells: HabitDayCell[];
  today: string;
}) {
  const firstDate = cells[0]?.date;
  if (!firstDate) return null;
  // getUTCDay(): 0 = Sunday → offset from Monday.
  const offset = (new Date(`${firstDate}T12:00:00Z`).getUTCDay() + 6) % 7;

  return (
    <div className="mx-auto grid w-fit grid-cols-7 gap-1.5">
      {DOW_LABELS.map((label, i) => (
        <span
          key={i}
          className="flex size-10 items-center justify-center text-xs font-medium text-muted-foreground"
        >
          {label}
        </span>
      ))}
      {Array.from({ length: offset }, (_, i) => (
        <span key={`pad-${i}`} className="size-10" />
      ))}
      {cells.map((cell) => (
        <span
          key={cell.date}
          title={`${cell.date}${cell.detail ? ` · ${cell.detail}` : ""}`}
          className={`flex size-10 items-center justify-center rounded-lg text-xs font-medium tabular-nums ${boxClasses(cell.status)} ${
            cell.status === "met"
              ? "text-emerald-950 font-semibold"
              : cell.status === "missed"
                ? "text-red-50 font-semibold"
                : "text-muted-foreground"
          } ${cell.date === today ? "ring-2 ring-foreground/70" : ""}`}
        >
          {dayOfMonth(cell.date)}
        </span>
      ))}
    </div>
  );
}

/** Year at a glance: 12 month rows × 31 day columns of tiny boxes. */
export function YearGrid({
  cells,
  today,
}: {
  cells: HabitDayCell[];
  today: string;
}) {
  const byMonth = new Map<number, HabitDayCell[]>();
  for (const cell of cells) {
    const month = Number(cell.date.slice(5, 7));
    const list = byMonth.get(month) ?? [];
    list.push(cell);
    byMonth.set(month, list);
  }

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto flex w-fit flex-col gap-[5px]">
        {MONTH_SHORT_LABELS.map((label, i) => {
          const monthCells = byMonth.get(i + 1) ?? [];
          return (
            <div key={label} className="flex items-center gap-[5px]">
              <span className="w-8 text-right text-[11px] text-muted-foreground">
                {label}
              </span>
              {monthCells.map((cell) => (
                <span
                  key={cell.date}
                  title={`${cell.date}${cell.detail ? ` · ${cell.detail}` : ""}`}
                  className={`size-3.5 rounded-[4px] ${boxClasses(cell.status)} ${
                    cell.date === today ? "ring-1 ring-foreground/70" : ""
                  }`}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GridLegend({ showRest }: { showRest: boolean }) {
  const items: Array<{ label: string; className: string }> = [
    { label: "Met", className: "bg-emerald-500/85" },
    { label: "Missed", className: "bg-red-500/35" },
    ...(showRest ? [{ label: "Rest", className: "bg-muted" }] : []),
    { label: "No data", className: "bg-muted/40" },
  ];
  return (
    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`size-3 rounded-[4px] ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
