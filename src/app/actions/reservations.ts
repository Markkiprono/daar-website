"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { cafeNow, isSlotBookable, LEAD_MINUTES } from "@/lib/time";
import { notifyOwner } from "@/lib/email";
import { ReservationStatus } from "@/generated/prisma/client";

export type ReservationState =
  | { ok: true; reference: string }
  | { ok: false; error: string }
  | undefined;

/**
 * Public booking request.
 *
 * This is an untrusted entry point — anyone can POST to it — so everything is
 * validated server-side regardless of what the form enforces, and the record
 * is created as PENDING. Nothing is ever auto-confirmed.
 */
const ReservationSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach you on")
    .max(30)
    .regex(/^[+\d][\d\s()-]+$/, "That phone number doesn't look right"),
  email: z.string().trim().min(1, "Please enter your email").email("That email doesn't look right").max(120),
  partySize: z.coerce.number().int().min(1, "At least one guest").max(50),
  date: z.string().min(1, "Please choose a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Please choose a time"),
  occasion: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

/** Short human-friendly reference the guest can quote on the phone. */
function reference(id: string) {
  return `DAAR-${id.slice(-6).toUpperCase()}`;
}

export async function createReservation(
  _prev: ReservationState,
  formData: FormData,
): Promise<ReservationState> {
  const parsed = ReservationSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    partySize: formData.get("partySize"),
    date: formData.get("date"),
    time: formData.get("time"),
    occasion: formData.get("occasion") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const d = parsed.data;

  // Dates arrive as "YYYY-MM-DD" from the date input. Parse as UTC midnight so
  // the stored day matches what the guest picked regardless of server timezone.
  const [y, m, day] = d.date.split("-").map(Number);
  if (!y || !m || !day) return { ok: false, error: "Please choose a valid date." };
  const date = new Date(Date.UTC(y, m - 1, day));

  // "Now" is the café's clock, never the server's and never the guest's —
  // a VPS on UTC or a guest booking from abroad must not shift the cutoff.
  const now = cafeNow();

  if (d.date < now.date) {
    return { ok: false, error: "That date has already passed." };
  }

  // Re-checked here even though the form hides passed slots: this action is a
  // public endpoint and the client list can be stale by the time it's sent.
  if (!isSlotBookable(d.date, d.time, now)) {
    return {
      ok: false,
      error:
        d.date === now.date
          ? `That time has already passed — please choose a slot at least ${LEAD_MINUTES} minutes from now.`
          : "That time has already passed.",
    };
  }

  const [ny, nm, nd] = now.date.split("-").map(Number);
  const maxAhead = new Date(Date.UTC(ny!, nm! - 1, nd!));
  maxAhead.setUTCDate(maxAhead.getUTCDate() + 180);
  if (date > maxAhead) {
    return { ok: false, error: "Please book within the next six months." };
  }

  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
  if (settings && !settings.reservationsEnabled) {
    return { ok: false, error: "Online booking is closed at the moment — please call us." };
  }
  if (settings && d.partySize > settings.maxPartySize) {
    return {
      ok: false,
      error: `For parties over ${settings.maxPartySize}, please call us so we can look after you properly.`,
    };
  }

  // Refuse bookings on a day the café is shut.
  const hours = await db.openingHours.findUnique({ where: { dayOfWeek: date.getUTCDay() } });
  if (hours?.isClosed) {
    return { ok: false, error: "We're closed that day — please pick another." };
  }
  if (hours?.openTime && hours?.closeTime && (d.time < hours.openTime || d.time > hours.closeTime)) {
    return {
      ok: false,
      error: `That day we're open ${hours.openTime}–${hours.closeTime}. Please choose a time in between.`,
    };
  }

  // Cheap duplicate guard: same phone, same day, same time.
  const existing = await db.reservation.findFirst({
    where: { phone: d.phone, date, time: d.time, status: { not: ReservationStatus.CANCELLED } },
  });
  if (existing) {
    return { ok: true, reference: reference(existing.id) };
  }

  const created = await db.reservation.create({
    data: {
      name: d.name,
      phone: d.phone,
      email: d.email,
      partySize: d.partySize,
      date,
      time: d.time,
      occasion: d.occasion || null,
      notes: d.notes || null,
    },
  });

  // Notify the owner. Never allowed to fail the booking — the request is
  // already saved and visible in the dashboard.
  try {
    await notifyOwner(
      {
        subject: `New booking request — ${d.name}, ${d.partySize} on ${d.date} at ${d.time}`,
        replyTo: d.email,
        lines: [
          `${d.name} — ${d.partySize} ${d.partySize === 1 ? "guest" : "guests"}`,
          `${d.date} at ${d.time}`,
          `Phone: ${d.phone}`,
          `Email: ${d.email}`,
          d.occasion ? `Occasion: ${d.occasion}` : "",
          d.notes ? `Notes: ${d.notes}` : "",
          "",
          `Reference: ${reference(created.id)}`,
          "This is a REQUEST — confirm or decline it in the dashboard.",
        ].filter(Boolean),
      },
      settings?.email,
    );
  } catch {
    /* booking is saved; a failed notification is not the guest's problem */
  }

  revalidatePath("/admin/reservations");
  return { ok: true, reference: reference(created.id) };
}

// ------------------------------------------------------------
//  Admin
// ------------------------------------------------------------

export async function setReservationStatus(formData: FormData) {
  await assertAdmin();

  const id = String(formData.get("id"));
  const raw = String(formData.get("status"));
  if (!Object.values(ReservationStatus).includes(raw as ReservationStatus)) return;

  await db.reservation.update({
    where: { id },
    data: {
      status: raw as ReservationStatus,
      respondedAt: new Date(),
      adminNote: (formData.get("adminNote") as string | null) || undefined,
    },
  });

  revalidatePath("/admin/reservations");
}

export async function deleteReservation(formData: FormData) {
  await assertAdmin();
  await db.reservation.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/reservations");
}
