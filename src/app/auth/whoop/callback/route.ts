import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { UserAuthorizationRequiredError } from "@vercel/connect";

import { createSession } from "@/lib/auth/session";
import { PENDING_COOKIE, parsePendingAuth } from "@/lib/auth/pending";
import { getWhoopToken } from "@/lib/connect/whoop";
import { getBasicProfile } from "@/lib/whoop/client";
import { db, habits, syncStates, users } from "@/lib/db";

/**
 * Starter habits for first-time users - a populated board beats an empty one.
 * Sport names match WHOOP's v2 sport_name values; users can edit the chips.
 */
const DEFAULT_HABITS = [
  {
    name: "Sleep 7h+",
    emoji: "😴",
    color: "violet",
    type: "sleep_duration" as const,
    config: { minHours: 7 },
  },
  {
    name: "Run 2×/week",
    emoji: "🏃",
    color: "emerald",
    type: "workout_frequency" as const,
    config: { sports: ["running"], timesPerWeek: 2 },
  },
  {
    name: "Gym 3×/week",
    emoji: "🏋️",
    color: "amber",
    type: "workout_frequency" as const,
    config: { sports: ["weightlifting"], timesPerWeek: 3 },
  },
];

/**
 * The user lands here after completing (or abandoning) WHOOP consent.
 * Vercel Connect has already finished the OAuth handshake server-side;
 * proof of success is simply that getToken() now works for the provisional
 * subject - an unguessable id bound to this browser via the pending cookie.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const jar = await cookies();
  const pending = parsePendingAuth(jar.get(PENDING_COOKIE)?.value);
  jar.delete(PENDING_COOKIE);

  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/?error=${code}`, request.url));

  if (!pending) return fail("expired");

  try {
    await getWhoopToken(pending.subjectId);
  } catch (error) {
    if (error instanceof UserAuthorizationRequiredError) {
      return fail("denied");
    }
    console.error("WHOOP token exchange failed:", error);
    return fail("connect_failed");
  }

  let profile;
  try {
    profile = await getBasicProfile(pending.subjectId);
  } catch (error) {
    console.error("WHOOP profile fetch failed:", error);
    return fail("profile_failed");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.whoopUserId, profile.user_id),
  });

  let userId: string;
  let isNewUser = false;

  if (existing) {
    // Returning user (possibly a new device): point their account at the
    // freshest grant and refresh profile fields.
    userId = existing.id;
    await db
      .update(users)
      .set({
        connectSubjectId: pending.subjectId,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
      })
      .where(eq(users.id, existing.id));
  } else {
    userId = crypto.randomUUID();
    isNewUser = true;
    await db.insert(users).values({
      id: userId,
      whoopUserId: profile.user_id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      timezone: pending.timezone,
      connectSubjectId: pending.subjectId,
    });
    await db.insert(syncStates).values({ userId }).onConflictDoNothing();
    await db.insert(habits).values(
      DEFAULT_HABITS.map((habit, index) => ({
        id: crypto.randomUUID(),
        userId,
        sortOrder: index,
        ...habit,
      })),
    );
  }

  await createSession(userId);

  const destination = isNewUser ? "/dashboard?welcome=1" : "/dashboard";
  return NextResponse.redirect(new URL(destination, request.url));
}
