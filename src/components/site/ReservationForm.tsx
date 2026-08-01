"use client";

import { useActionState, useMemo, useState } from "react";
import { createReservation, type ReservationState } from "@/app/actions/reservations";
import { cafeNow, isSlotBookable, allSlots, LEAD_MINUTES } from "@/lib/time";

type Props = {
  maxPartySize: number;
  note?: string | null;
  /** Days the café is shut, 0 = Sunday. Blocked in the picker. */
  closedDays: number[];
  phone?: string | null;
};

export function ReservationForm({ maxPartySize, note, closedDays, phone }: Props) {
  const [state, formAction, pending] = useActionState<ReservationState, FormData>(
    createReservation,
    undefined,
  );

  // Dates are bounded by the café's clock, not the visitor's device.
  const { today, maxDate } = useMemo(() => {
    const now = cafeNow();
    const [y, m, d] = now.date.split("-").map(Number);
    const max = new Date(Date.UTC(y!, m! - 1, d!));
    max.setUTCDate(max.getUTCDate() + 180);
    return { today: now.date, maxDate: max.toISOString().slice(0, 10) };
  }, []);

  const [chosenDate, setChosenDate] = useState("");

  /**
   * Only offer slots that are still bookable. When the guest picks today,
   * everything already past (plus the lead time) disappears from the list.
   * The server re-checks this — the page may have been open for hours.
   */
  const times = useMemo(() => {
    const now = cafeNow();
    return allSlots().filter((t) => !chosenDate || isSlotBookable(chosenDate, t, now));
  }, [chosenDate]);

  const isToday = chosenDate === cafeNow().date;
  const noSlotsLeft = chosenDate !== "" && times.length === 0;

  if (state?.ok) {
    return (
      <div className="rounded-[3px] border border-daar-tan bg-white p-8 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl">Request received</p>
        <p className="mt-3 text-sm text-daar-muted">
          We&apos;ll confirm by phone shortly. Your reference is{" "}
          <strong className="text-daar-oxblood">{state.reference}</strong>.
        </p>
        <p className="mt-4 text-xs text-daar-muted">
          This is a request, not a confirmed booking — we&apos;ll be in touch to finalise it.
        </p>
      </div>
    );
  }

  const field =
    "mt-1.5 h-12 w-full rounded-[3px] border border-daar-rule bg-white px-4 text-[16px] text-daar-ink outline-none transition focus:border-daar-tan focus:ring-2 focus:ring-daar-tan/30";
  const labelCls =
    "font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.18em] text-daar-muted";

  return (
    <form action={formAction} className="space-y-5">
      {note && <p className="rounded-[3px] bg-daar-cream/60 px-4 py-3 text-sm text-daar-muted">{note}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="r-name" className={labelCls}>
            Name <span aria-hidden className="text-daar-red">*</span>
          </label>
          <input id="r-name" name="name" required maxLength={80} autoComplete="name" className={field} />
        </div>

        <div>
          <label htmlFor="r-phone" className={labelCls}>
            Phone <span aria-hidden className="text-daar-red">*</span>
          </label>
          <input
            id="r-phone"
            name="phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="+254 7…"
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="r-email" className={labelCls}>
          Email <span aria-hidden className="text-daar-red">*</span>
        </label>
        <input
          id="r-email"
          name="email"
          type="email"
          required
          maxLength={120}
          inputMode="email"
          autoComplete="email"
          className={field}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="r-date" className={labelCls}>
            Date <span aria-hidden className="text-daar-red">*</span>
          </label>
          <input
            id="r-date"
            name="date"
            type="date"
            required
            min={today}
            max={maxDate}
            className={field}
            onChange={(e) => {
              const value = e.target.value;
              setChosenDate(value);
              if (!value) return;
              // Warn early rather than after a round-trip.
              const [y, m, d] = value.split("-").map(Number);
              const day = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
              e.target.setCustomValidity(
                closedDays.includes(day) ? "We're closed that day — please pick another." : "",
              );
              e.target.reportValidity();
            }}
          />
        </div>

        <div>
          <label htmlFor="r-time" className={labelCls}>
            Time <span aria-hidden className="text-daar-red">*</span>
          </label>
          <select
            id="r-time"
            name="time"
            required
            defaultValue=""
            disabled={chosenDate === "" || noSlotsLeft}
            className={`${field} disabled:cursor-not-allowed disabled:bg-daar-cream/40 disabled:text-daar-muted`}
          >
            <option value="" disabled>
              {chosenDate === "" ? "Pick a date first" : noSlotsLeft ? "None left today" : "Choose…"}
            </option>
            {times.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="r-party" className={labelCls}>
            Guests <span aria-hidden className="text-daar-red">*</span>
          </label>
          <select id="r-party" name="partySize" required defaultValue="2" className={field}>
            {Array.from({ length: maxPartySize }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {noSlotsLeft ? (
        <p className="rounded-[3px] bg-daar-cream/60 px-4 py-3 text-sm text-daar-muted">
          We&apos;re done taking bookings for today — please choose tomorrow or later.
        </p>
      ) : isToday ? (
        <p className="text-xs text-daar-muted">
          Booking for today — times within the next {LEAD_MINUTES} minutes aren&apos;t available.
        </p>
      ) : null}

      <div>
        <label htmlFor="r-occasion" className={labelCls}>
          Occasion <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="r-occasion"
          name="occasion"
          maxLength={60}
          placeholder="Birthday, anniversary…"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="r-notes" className={labelCls}>
          Anything we should know? <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="r-notes"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="Allergies, high chair, seating preference…"
          className="mt-1.5 w-full rounded-[3px] border border-daar-rule bg-white px-4 py-3 text-[16px] text-daar-ink outline-none transition focus:border-daar-tan focus:ring-2 focus:ring-daar-tan/30"
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="rounded-[3px] bg-daar-red/10 px-4 py-3 text-sm text-daar-red">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-full bg-daar-oxblood font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:bg-daar-ink disabled:opacity-60"
      >
        {pending ? "Sending…" : "Request a table"}
      </button>

      <p className="text-center text-xs text-daar-muted">
        We&apos;ll confirm by phone. {phone ? <>Prefer to call? <a href={`tel:${phone.replace(/\s/g, "")}`} className="underline">{phone}</a></> : null}
      </p>
    </form>
  );
}
