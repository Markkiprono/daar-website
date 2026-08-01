import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "daar_admin_session";
const MAX_AGE_DAYS = 7;

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Fail loudly at call time rather than silently signing with undefined.
    throw new Error("AUTH_SECRET is not set — the admin session cannot be signed.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  adminId: string;
  email: string;
};

export async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.adminId !== "string" || typeof payload.email !== "string") return null;
    return { adminId: payload.adminId, email: payload.email };
  } catch {
    // Expired, tampered, or signed with a rotated secret — all mean "no session".
    return null;
  }
}

/**
 * Whether to set the cookie's Secure flag.
 *
 * Keyed on the *actual request protocol*, never on NODE_ENV. A production
 * build served over plain HTTP (local `npm start`, or a container behind a
 * proxy that terminates TLS) would otherwise emit a Secure cookie that the
 * browser silently discards — login appears to do nothing at all.
 *
 * Behind Nginx/Cloudflare, x-forwarded-proto is "https" and Secure is set.
 */
async function requestIsHttps(): Promise<boolean> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]!.trim() === "https";
  return (h.get("origin") ?? h.get("referer") ?? "").startsWith("https://");
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const token = await encrypt(payload, expiresAt);
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: await requestIsHttps(),
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(MFA_COOKIE);
}

// ------------------------------------------------------------
//  Two-factor challenge
//
//  Between "password was correct" and "code was correct" the visitor holds a
//  short-lived, signed token — NOT a session. It grants nothing on its own:
//  every protected page checks for a full session, which is only issued once
//  the second factor passes.
// ------------------------------------------------------------

export const MFA_COOKIE = "daar_admin_mfa";
const MFA_MINUTES = 5;

export async function createMfaChallenge(adminId: string) {
  const expiresAt = new Date(Date.now() + MFA_MINUTES * 60 * 1000);
  const token = await new SignJWT({ adminId, stage: "mfa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key());

  const store = await cookies();
  store.set(MFA_COOKIE, token, {
    httpOnly: true,
    secure: await requestIsHttps(),
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function readMfaChallenge(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(MFA_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.stage !== "mfa" || typeof payload.adminId !== "string") return null;
    return payload.adminId;
  } catch {
    return null;
  }
}

export async function clearMfaChallenge() {
  const store = await cookies();
  store.delete(MFA_COOKIE);
}
