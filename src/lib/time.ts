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

/** 1170 -> "19:30". */
export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** No booking is taken this close to closing time. */
export const LAST_SEATING_MINUTES = 30;

/** A day's opening hours as stored on OpeningHours. */
export type DayHours = {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
};

/** The weekday (0 = Sunday) for a "YYYY-MM-DD" string, read in UTC so the
 *  visitor's own timezone cannot shift it onto the wrong day. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/**
 * Half-hour slots for one day, derived from that day's actual opening hours.
 *
 * Previously the form offered a fixed 07:00–21:30 that ignored OpeningHours
 * entirely, so it took bookings before opening — which the server then
 * rejected — while refusing late ones on the nights the café is open latest.
 *
 * Times that do not span a day are treated as "no slots" rather than guessed
 * at: hours are stored as same-day "HH:MM", so a closing time before the
 * opening one is bad data, not a night that runs past midnight.
 */
export function slotsForHours(openTime: string | null, closeTime: string | null): string[] {
  if (!openTime || !closeTime) return [];

  const open = toMinutes(openTime);
  const lastSeating = toMinutes(closeTime) - LAST_SEATING_MINUTES;
  if (Number.isNaN(open) || Number.isNaN(lastSeating) || lastSeating < open) return [];

  const out: string[] = [];
  // Start on the first :00 or :30 at or after opening.
  for (let m = Math.ceil(open / 30) * 30; m <= lastSeating; m += 30) out.push(fromMinutes(m));
  return out;
}

/** Slots for a specific date, or [] when the café is shut that day. */
export function slotsForDate(date: string, hours: DayHours[]): string[] {
  const day = hours.find((h) => h.dayOfWeek === weekdayOf(date));
  if (!day || day.isClosed) return [];
  return slotsForHours(day.openTime, day.closeTime);
}
