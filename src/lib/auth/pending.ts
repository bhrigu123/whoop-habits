export const PENDING_COOKIE = "wh_pending";

/** State carried across the consent redirect via a short-lived cookie. */
export interface PendingAuth {
  /** Provisional Vercel Connect subject id awaiting its WHOOP grant. */
  subjectId: string;
  /** IANA timezone captured from the browser before redirecting. */
  timezone: string;
}

export function parsePendingAuth(raw: string | undefined): PendingAuth | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingAuth>;
    if (typeof value.subjectId !== "string" || !value.subjectId) return null;
    return {
      subjectId: value.subjectId,
      timezone: typeof value.timezone === "string" ? value.timezone : "UTC",
    };
  } catch {
    return null;
  }
}
