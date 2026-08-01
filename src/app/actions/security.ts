"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { verifyPassword, hashPassword } from "@/lib/password";
import {
  generateSecret,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
} from "@/lib/totp";

export type SecurityState =
  | { ok: true; message: string; backupCodes?: string[] }
  | { ok: false; error: string }
  | undefined;

/**
 * Begins two-factor setup: mints a secret and stores it UNCONFIRMED.
 * Nothing is enforced until a valid code proves the authenticator works —
 * otherwise a mis-scanned QR would lock the owner out of their own dashboard.
 */
export async function startTwoFactor(): Promise<SecurityState> {
  const session = await assertAdmin();
  const secret = generateSecret();
  await db.adminUser.update({
    where: { id: session.adminId },
    data: { totpSecret: secret, totpEnabledAt: null },
  });
  revalidatePath("/admin/security");
  return { ok: true, message: "Scan the code, then enter a code to confirm." };
}

export async function confirmTwoFactor(_prev: SecurityState, formData: FormData): Promise<SecurityState> {
  const session = await assertAdmin();
  const code = String(formData.get("code") ?? "").trim();

  const admin = await db.adminUser.findUnique({ where: { id: session.adminId } });
  if (!admin?.totpSecret) return { ok: false, error: "Start setup again." };
  if (!verifyTotp(admin.totpSecret, code)) {
    return { ok: false, error: "That code isn't right. Check your phone's clock and try again." };
  }

  // Confirmed — enable it and issue recovery codes.
  const codes = generateBackupCodes();
  await db.$transaction([
    db.adminUser.update({
      where: { id: admin.id },
      data: { totpEnabledAt: new Date() },
    }),
    db.backupCode.deleteMany({ where: { adminId: admin.id } }),
    db.backupCode.createMany({
      data: codes.map((c) => ({ adminId: admin.id, codeHash: hashBackupCode(c) })),
    }),
  ]);

  revalidatePath("/admin/security");
  return {
    ok: true,
    message: "Two-factor authentication is on.",
    // Shown once, never retrievable — only hashes are stored.
    backupCodes: codes,
  };
}

/** Turning 2FA off requires the password — a hijacked session must not suffice. */
export async function disableTwoFactor(_prev: SecurityState, formData: FormData): Promise<SecurityState> {
  const session = await assertAdmin();
  const password = String(formData.get("password") ?? "");

  const admin = await db.adminUser.findUnique({ where: { id: session.adminId } });
  if (!admin) return { ok: false, error: "Account not found." };
  if (!(await verifyPassword(password, admin.passwordHash))) {
    return { ok: false, error: "That password isn't right." };
  }

  await db.$transaction([
    db.adminUser.update({
      where: { id: admin.id },
      data: { totpSecret: null, totpEnabledAt: null },
    }),
    db.backupCode.deleteMany({ where: { adminId: admin.id } }),
  ]);

  revalidatePath("/admin/security");
  return { ok: true, message: "Two-factor authentication is off." };
}

export async function regenerateBackupCodes(_prev: SecurityState, formData: FormData): Promise<SecurityState> {
  const session = await assertAdmin();
  const password = String(formData.get("password") ?? "");

  const admin = await db.adminUser.findUnique({ where: { id: session.adminId } });
  if (!admin) return { ok: false, error: "Account not found." };
  if (!(await verifyPassword(password, admin.passwordHash))) {
    return { ok: false, error: "That password isn't right." };
  }

  const codes = generateBackupCodes();
  await db.$transaction([
    db.backupCode.deleteMany({ where: { adminId: admin.id } }),
    db.backupCode.createMany({
      data: codes.map((c) => ({ adminId: admin.id, codeHash: hashBackupCode(c) })),
    }),
  ]);

  revalidatePath("/admin/security");
  return { ok: true, message: "New recovery codes generated. The old ones no longer work.", backupCodes: codes };
}

const PasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(10, "Use at least 10 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "The new passwords don't match" });

export async function changePassword(_prev: SecurityState, formData: FormData): Promise<SecurityState> {
  const session = await assertAdmin();

  const parsed = PasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };

  const admin = await db.adminUser.findUnique({ where: { id: session.adminId } });
  if (!admin) return { ok: false, error: "Account not found." };
  if (!(await verifyPassword(parsed.data.current, admin.passwordHash))) {
    return { ok: false, error: "Your current password isn't right." };
  }

  await db.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });

  revalidatePath("/admin/security");
  return { ok: true, message: "Password changed." };
}
