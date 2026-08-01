/**
 * Booking time helpers, pinned to the café's own timezone.
 *
 * Everything about "has this slot already passed?" must be answered in
 * Nairobi time, not the server's and not the visitor's. A VPS usually runs
 * UTC, and a guest may be booking from another country — both would otherwise
 * see the wrong slots greyed out.
 *
 * Kenya observes no daylight saving, but Intl handles that regardless.
 *
 * Deliberately not `server-only`: the form filters slots on the client using
 * exactly the same logic the action validates with.
 */

export const CAFE_TIMEZONE = "Africa/Nairobi";

/** Minimum notice before a slot can be booked. */
export const LEAD_MINUTES = 30;

/** Current date/time at the café. `date` is "YYYY-MM-DD", `time` is "HH:MM". */
export function cafeNow(): { date: string; time: string; minutes: number } {
  const now = new Date();

  // en-CA formats dates as YYYY-MM-DD, which matches <input type="date">.
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAFE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAFE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return { date, time, minutes: toMinutes(time) };
}

/** "19:30" -> 1170. Returns NaN for malformed input. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

/**
 * True when the given date ("YYYY-MM-DD") and time ("HH:MM") is far enough
 * in the future to be bookable.
 */
export function isSlotBookable(date: string, time: string, now = cafeNow()): boolean {
  if (date > now.date) return true; // a future day — always fine
  if (date < now.date) return false; // already gone
  const slot = toMinutes(time);
  if (Number.isNaN(slot)) return false;
  return slot >= now.minutes + LEAD_MINUTES;
}

/** Half-hour slots across the café's widest possible opening span. */
export function allSlots(from = 7, to = 21): string[] {
  const out: string[] = [];
  for (let h = from; h <= to; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}
