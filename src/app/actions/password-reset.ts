"use server";

import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { notifyOwner, emailConfigured } from "@/lib/email";

/**
 * Password reset by emailed link.
 *
 * Design notes:
 *   - Only a SHA-256 hash of the token is stored, so a leaked database row
 *     cannot be used to reset anything.
 *   - Tokens expire in 45 minutes and are single-use.
 *   - Requesting a reset never reveals whether an account exists.
 *   - A reset does NOT bypass two-factor: the next login still asks for a code.
 *
 * Requires email to be configured. Without it the request fails honestly and
 * points at the CLI, rather than pretending to send something.
 */

const TTL_MINUTES = 45;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export type ResetRequestState = { ok: true; message: string } | { ok: false; error: string } | undefined;

export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = z
    .object({ email: z.string().trim().email("Enter a valid email address").max(120) })
    .safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  if (!emailConfigured()) {
    return {
      ok: false,
      error:
        "Email isn't set up on this site yet, so a reset link can't be sent. Reset from the server instead — see DEPLOY.md.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const admin = await db.adminUser.findUnique({ where: { email } });

  // Always the same reply, whether or not the account exists.
  const SAME = {
    ok: true as const,
    message: "If that email has an account, a reset link is on its way. It expires in 45 minutes.",
  };

  if (!admin) return SAME;

  // Don't let repeated submits spray links.
  const recent = await db.passwordResetToken.findFirst({
    where: { adminId: admin.id, createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }, usedAt: null },
  });
  if (recent) return SAME;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

  await db.$transaction([
    // Any older outstanding link stops working the moment a new one is issued.
    db.passwordResetToken.deleteMany({ where: { adminId: admin.id, usedAt: null } }),
    db.passwordResetToken.create({
      data: { adminId: admin.id, tokenHash: hashToken(token), expiresAt },
    }),
  ]);

  const host = process.env.ADMIN_HOST ?? "admin.localtest.me:3000";
  const scheme = host.includes("localhost") || host.includes("localtest") ? "http" : "https";
  const link = `${scheme}://${host}/reset?token=${token}`;

  await notifyOwner(
    {
      subject: "Reset your Daar dashboard password",
      lines: [
        "Someone asked to reset the password for the Daar dashboard.",
        "",
        link,
        "",
        `This link works once and expires in ${TTL_MINUTES} minutes.`,
        "If this wasn't you, ignore this email — nothing has changed.",
      ],
    },
    admin.email,
  );

  return SAME;
}

export type ResetState = { ok: false; error: string } | undefined;

const NewPassword = z
  .object({
    token: z.string().min(1),
    next: z.string().min(10, "Use at least 10 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "The passwords don't match" });

export async function completePasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = NewPassword.safeParse({
    token: formData.get("token"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "That link has expired or already been used. Request a new one." };
  }

  await db.$transaction([
    db.adminUser.update({
      where: { id: record.adminId },
      data: { passwordHash: await hashPassword(parsed.data.next) },
    }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Burn every other outstanding link for this account.
    db.passwordResetToken.deleteMany({ where: { adminId: record.adminId, usedAt: null } }),
  ]);

  redirect("/admin/login?reset=1");
}

/** Is this token worth showing a form for? Checked before rendering. */
export async function isResetTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return Boolean(record && !record.usedAt && record.expiresAt > new Date());
}
