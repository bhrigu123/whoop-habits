"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { destroySession } from "@/lib/auth/session";
import { PENDING_COOKIE, type PendingAuth } from "@/lib/auth/pending";
import { startWhoopAuthorization } from "@/lib/connect/whoop";

function safeTimezone(value: unknown): string {
  if (typeof value !== "string" || !value) return "UTC";
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

/**
 * Kick off the WHOOP consent flow. We don't know who the visitor is yet, so
 * we mint a provisional subject id, remember it in a short-lived cookie, and
 * find out who they are from their WHOOP profile once consent completes.
 */
export async function startWhoopAuth(formData: FormData): Promise<void> {
  const timezone = safeTimezone(formData.get("timezone"));
  const subjectId = crypto.randomUUID();

  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const callbackUrl = `${proto}://${host}/auth/whoop/callback`;

  const { url } = await startWhoopAuthorization(subjectId, callbackUrl);

  const pending: PendingAuth = { subjectId, timezone };
  const jar = await cookies();
  jar.set(PENDING_COOKIE, JSON.stringify(pending), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  redirect(url);
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}
