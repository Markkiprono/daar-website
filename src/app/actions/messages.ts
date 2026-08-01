"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { notifyOwner } from "@/lib/email";
import { MessageStatus } from "@/generated/prisma/client";

export type MessageState = { ok: true } | { ok: false; error: string } | undefined;

/**
 * Public "leave us a message" form.
 *
 * An untrusted, unauthenticated endpoint that writes to the database, so it
 * carries three cheap anti-spam measures rather than none:
 *
 *   1. A honeypot field, hidden from people but filled in by naive bots.
 *   2. A minimum time-on-form — bots post instantly, humans take seconds.
 *   3. A duplicate guard, which also stops double-taps creating two rows.
 *
 * None of these need an external service or a rate-limit store. If real spam
 * ever gets through, the next step is a proper rate limit keyed on IP.
 */
const MIN_SECONDS_ON_FORM = 3;

const MessageSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().min(1, "Please enter your email").email("That email doesn't look right").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(10, "Please write a little more so we can help")
    .max(2000, "That message is too long — please keep it under 2000 characters"),
});

export async function sendMessage(_prev: MessageState, formData: FormData): Promise<MessageState> {
  // 1. Honeypot. A real person never sees this field.
  if (String(formData.get("website") ?? "").trim() !== "") {
    // Report success so a bot learns nothing from the response.
    return { ok: true };
  }

  // 2. Submitted impossibly fast?
  const startedAt = Number(formData.get("startedAt"));
  if (Number.isFinite(startedAt) && startedAt > 0) {
    const seconds = (Date.now() - startedAt) / 1000;
    if (seconds < MIN_SECONDS_ON_FORM) {
      return { ok: false, error: "That was too quick — please try again." };
    }
  }

  const parsed = MessageSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    subject: formData.get("subject") ?? "",
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const d = parsed.data;

  // 3. Same person, same message, within the last ten minutes.
  const recent = await db.message.findFirst({
    where: {
      email: d.email.toLowerCase(),
      body: d.body,
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recent) return { ok: true };

  try {
    await db.message.create({
      data: {
        name: d.name,
        email: d.email.toLowerCase(),
        phone: d.phone || null,
        subject: d.subject || null,
        body: d.body,
      },
    });
  } catch {
    return { ok: false, error: "Something went wrong sending that. Please try again." };
  }

  // Notify the owner. Deliberately after the row is saved and never allowed
  // to fail the submission — the message is safe in the database either way.
  try {
    const settings = await db.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { email: true },
    });
    await notifyOwner(
      {
        subject: `New message from ${d.name}${d.subject ? ` — ${d.subject}` : ""}`,
        replyTo: d.email,
        lines: [
          `From: ${d.name} <${d.email}>`,
          d.phone ? `Phone: ${d.phone}` : "",
          d.subject ? `Subject: ${d.subject}` : "",
          "",
          d.body,
          "",
          "Reply directly to this email to answer them.",
        ].filter(Boolean),
      },
      settings?.email,
    );
  } catch {
    /* the message is saved; a failed notification is not the guest's problem */
  }

  revalidatePath("/admin/messages");
  return { ok: true };
}

// ------------------------------------------------------------
//  Admin
// ------------------------------------------------------------

export async function setMessageStatus(formData: FormData) {
  await assertAdmin();

  const id = String(formData.get("id"));
  const raw = String(formData.get("status"));
  if (!Object.values(MessageStatus).includes(raw as MessageStatus)) return;

  await db.message.update({
    where: { id },
    data: {
      status: raw as MessageStatus,
      readAt: raw === MessageStatus.UNREAD ? null : new Date(),
    },
  });

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function deleteMessage(formData: FormData) {
  await assertAdmin();
  await db.message.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}
