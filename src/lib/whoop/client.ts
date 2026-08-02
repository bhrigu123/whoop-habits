import "server-only";

import { getWhoopToken, invalidateWhoopToken } from "@/lib/connect/whoop";
import type {
  WhoopBasicProfile,
  WhoopPaginatedResponse,
  WhoopSleepRecord,
  WhoopWorkoutRecord,
} from "./types";

const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";
/** WHOOP caps collection pages at 25 records. */
const PAGE_LIMIT = "25";
/** Hard stop for pagination loops - far above any legitimate range we request. */
const MAX_PAGES = 60;

export class WhoopApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    body?: string,
  ) {
    super(`WHOOP API ${status} on ${path}${body ? `: ${body}` : ""}`);
    this.name = "WhoopApiError";
  }
}

const MAX_ATTEMPTS = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function whoopFetch<T>(
  subjectId: string,
  path: string,
  searchParams?: Record<string, string | undefined>,
): Promise<T> {
  const url = new URL(`${WHOOP_API_BASE}${path}`);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  const request = async () => {
    const token = await getWhoopToken(subjectId);
    return fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  };

  let retriedAuth = false;
  let res = await request();

  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
    if (res.status === 401 && !retriedAuth) {
      // A cached token can be stale if WHOOP rotated it out from under the
      // cache (their refresh invalidates the previous access token).
      retriedAuth = true;
      invalidateWhoopToken(subjectId);
      res = await request();
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      // Rate limited or transient upstream failure: back off and retry,
      // honoring Retry-After when WHOOP sends it.
      const retryAfterSec = Number(res.headers.get("retry-after"));
      const delayMs =
        Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? Math.min(retryAfterSec * 1000, 30_000)
          : attempt * 2_000;
      await sleep(delayMs);
      res = await request();
      continue;
    }
    break;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => undefined);
    throw new WhoopApiError(res.status, path, body);
  }
  return res.json() as Promise<T>;
}

export async function getBasicProfile(
  subjectId: string,
): Promise<WhoopBasicProfile> {
  return whoopFetch<WhoopBasicProfile>(subjectId, "/v2/user/profile/basic");
}

async function fetchAllPages<T>(
  fetchPage: (nextToken?: string) => Promise<WhoopPaginatedResponse<T>>,
): Promise<T[]> {
  const records: T[] = [];
  let nextToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetchPage(nextToken);
    records.push(...(response.records ?? []));
    if (!response.next_token) return records;
    nextToken = response.next_token;
  }
  throw new Error(`WHOOP pagination exceeded ${MAX_PAGES} pages - aborting`);
}

/** All sleeps whose start falls in [start, end], newest first. */
export async function getSleeps(
  subjectId: string,
  start: Date,
  end: Date,
): Promise<WhoopSleepRecord[]> {
  return fetchAllPages((nextToken) =>
    whoopFetch<WhoopPaginatedResponse<WhoopSleepRecord>>(
      subjectId,
      "/v2/activity/sleep",
      {
        start: start.toISOString(),
        end: end.toISOString(),
        limit: PAGE_LIMIT,
        nextToken,
      },
    ),
  );
}

/** All workouts whose start falls in [start, end], newest first. */
export async function getWorkouts(
  subjectId: string,
  start: Date,
  end: Date,
): Promise<WhoopWorkoutRecord[]> {
  return fetchAllPages((nextToken) =>
    whoopFetch<WhoopPaginatedResponse<WhoopWorkoutRecord>>(
      subjectId,
      "/v2/activity/workout",
      {
        start: start.toISOString(),
        end: end.toISOString(),
        limit: PAGE_LIMIT,
        nextToken,
      },
    ),
  );
}
