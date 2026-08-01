import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, decrypt, type SessionPayload } from "./session";
import { db } from "./db";

/**
 * Data Access Layer.
 *
 * Next's own guidance: Proxy is for *optimistic* checks only. The real
 * authorization must sit as close to the data as possible — here.
 * Every admin page and every mutating action calls requireAdmin().
 *
 * `cache` memoises within a single render pass, so a page that checks
 * auth in the layout and again in the page hits the DB once.
 */

export const verifySession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await decrypt(token);
  if (!payload) return null;

  // A valid signature is not enough: the admin may have been deleted, or
  // the row rotated, since the token was issued.
  const admin = await db.adminUser.findUnique({
    where: { id: payload.adminId },
    select: { id: true, email: true },
  });
  if (!admin) return null;

  return { adminId: admin.id, email: admin.email };
});

/** Use in admin pages/layouts. Redirects to login when unauthenticated. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * Use in Server Actions. Throws instead of redirecting, so a failed
 * mutation surfaces as an error rather than a confusing silent redirect.
 */
export async function assertAdmin(): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session) throw new Error("Unauthorised");
  return session;
}
