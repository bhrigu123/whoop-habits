/**
 * Date attribution helpers. WHOOP records carry a `timezone_offset` like
 * "+05:30" or "-08:00" describing the user's local offset when the activity
 * happened - we use it (not the account timezone) so travel days land on the
 * calendar day the user actually experienced.
 */

/** Parse "±HH:MM" into minutes east of UTC. Returns 0 for malformed input. */
export function parseOffsetMinutes(offset: string | undefined): number {
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset ?? "");
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/** The local calendar day (YYYY-MM-DD) an instant fell on at a given offset. */
export function localDateAtOffset(instant: string | Date, offset: string): string {
  const time = typeof instant === "string" ? new Date(instant) : instant;
  const shifted = new Date(time.getTime() + parseOffsetMinutes(offset) * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Today's calendar day (YYYY-MM-DD) in an IANA timezone. */
export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function daysAgo(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}

/** YYYY-MM-DD (UTC) for a Date. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
