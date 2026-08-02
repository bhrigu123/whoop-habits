import "server-only";

import { count } from "drizzle-orm";

import { db, users } from "@/lib/db";

/** WHOOP allows an unapproved app at most this many authorized users. */
export const WHOOP_USER_LIMIT = 10;

/**
 * Whether we've used up WHOOP's signup allowance.
 *
 * This counts our own user rows, which can drift above WHOOP's number: a user
 * who revokes the grant from the WHOOP app without also using "Delete my data"
 * leaves their row behind. So treat it as a close approximation, and never as a
 * reason to block a returning user from signing in.
 */
export async function signupsFull(): Promise<boolean> {
  const [row] = await db.select({ value: count() }).from(users);
  return (row?.value ?? 0) >= WHOOP_USER_LIMIT;
}
