import "server-only";

import {
  deleteTokenCacheEntry,
  getToken,
  revokeToken,
  startAuthorization,
  type ConnectTokenParams,
} from "@vercel/connect";

export const WHOOP_CONNECTOR = "whoop.com/whoop-habits";

/**
 * `offline` is requested at authorization time (not selectable in WHOOP's
 * dashboard) - it's what makes WHOOP issue the refresh token that Vercel
 * Connect uses to mint access tokens indefinitely.
 */
export const WHOOP_SCOPES = [
  "read:profile",
  "read:sleep",
  "read:workout",
  "offline",
];

/**
 * Params must be byte-identical across calls: the SDK's in-process token
 * cache is keyed on connector + params.
 */
function tokenParams(subjectId: string): ConnectTokenParams {
  return {
    subject: { type: "user", id: subjectId },
    scopes: WHOOP_SCOPES,
  };
}

/** Begin the consent flow; the returned URL is where the user must be sent. */
export async function startWhoopAuthorization(
  subjectId: string,
  callbackUrl: string,
) {
  return startAuthorization(WHOOP_CONNECTOR, tokenParams(subjectId), {
    callbackUrl,
  });
}

/** Mint (or reuse from cache) a short-lived WHOOP access token. */
export async function getWhoopToken(subjectId: string): Promise<string> {
  return getToken(WHOOP_CONNECTOR, tokenParams(subjectId));
}

/** Drop the cached token so the next getWhoopToken() call fetches fresh. */
export function invalidateWhoopToken(subjectId: string): void {
  deleteTokenCacheEntry(WHOOP_CONNECTOR, tokenParams(subjectId));
}

/** Revoke the user's WHOOP grant at Connect (and the provider, if supported). */
export async function revokeWhoopGrant(subjectId: string): Promise<void> {
  await revokeToken(WHOOP_CONNECTOR, {
    subject: { type: "user", id: subjectId },
  });
}
