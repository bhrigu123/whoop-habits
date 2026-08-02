/**
 * Calendar-day helpers. All dates are YYYY-MM-DD strings; arithmetic runs at
 * UTC noon so DST transitions can never shift a day.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidDateString(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function atNoon(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function addDays(date: string, days: number): string {
  return new Date(atNoon(date).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Monday of the ISO week containing `date`. */
export function mondayOf(date: string): string {
  const dow = atNoon(date).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

/** The 7 days of a week, Monday first. */
export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function formatShort(date: string): string {
  return atNoon(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatWeekLabel(monday: string): string {
  return `${formatShort(monday)} – ${formatShort(addDays(monday, 6))}`;
}

// ---------------------------------------------------------------------------
// Month / year helpers for the detail views
// ---------------------------------------------------------------------------

export function isValidMonthString(value: string | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isValidYearString(value: string | undefined): value is string {
  return !!value && /^\d{4}$/.test(value) && +value >= 2000 && +value <= 2100;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** All days of a YYYY-MM month. */
export function monthDates(month: string): string[] {
  return Array.from(
    { length: daysInMonth(month) },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function formatMonthLabel(month: string): string {
  return atNoon(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const MONTH_SHORT_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
