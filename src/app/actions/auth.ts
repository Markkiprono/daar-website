"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  createSession,
  deleteSession,
  createMfaChallenge,
  readMfaChallenge,
  clearMfaChallenge,
} from "@/lib/session";
import { verifyTotp, hashBackupCode } from "@/lib/totp";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginState =
  | { error?: string; needsCode?: false }
  /** Password accepted; the account has two-factor enabled. */
  | { needsCode: true; email: string; error?: string }
  | undefined;

/** Never reveal whether it was the email or the password that was wrong. */
const GENERIC = "Email or password is incorrect.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const code = String(formData.get("code") ?? "").trim();

  // --- second step: a challenge is already in flight ---
  if (code) {
    const adminId = await readMfaChallenge();
    if (!adminId) {
      return { error: "That took too long — please sign in again." };
    }

    const admin = await db.adminUser.findUnique({
      where: { id: adminId },
      include: { backupCodes: { where: { usedAt: null } } },
    });
    if (!admin?.totpSecret) return { error: GENERIC };

    let accepted = verifyTotp(admin.totpSecret, code);

    // Fall back to a recovery code, which is consumed on use.
    if (!accepted) {
      const hash = hashBackupCode(code);
      const match = admin.backupCodes.find((c) => c.codeHash === hash);
      if (match) {
        await db.backupCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
        accepted = true;
      }
    }

    if (!accepted) {
      return { needsCode: true, email: admin.email, error: "That code isn't right. Try again." };
    }

    await clearMfaChallenge();
    await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    await createSession({ adminId: admin.id, email: admin.email });
    redirect("/admin");
  }

  // --- first step: email + password ---
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC };
  }

  const admin = await db.adminUser.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });

  if (!admin) {
    // Spend comparable time hashing so a missing account isn't detectable
    // by response timing.
    await verifyPassword(parsed.data.password, "00:00");
    return { error: GENERIC };
  }

  if (!(await verifyPassword(parsed.data.password, admin.passwordHash))) {
    return { error: GENERIC };
  }

  // Password is right. If two-factor is on, stop here — no session yet.
  if (admin.totpEnabledAt && admin.totpSecret) {
    await createMfaChallenge(admin.id);
    return { needsCode: true, email: admin.email };
  }

  await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await createSession({ adminId: admin.id, email: admin.email });
  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
