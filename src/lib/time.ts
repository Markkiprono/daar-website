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

/** Minutes in a day — how much a closing time past midnight is worth. */
const MINUTES_PER_DAY = 1440;

/**
 * The latest slot that can be offered on any date, 23:30.
 *
 * A booking is stored against one calendar date, so a slot has to fall inside
 * that date. Without this cap a café closing at 01:00 would compute a last
 * seating of 24:30 and fromMinutes would hand back the string "24:30" — not a
 * time, and rejected by the very validation that generated it.
 *
 * Tables after midnight are therefore not offered online. That is a deliberate
 * limit rather than an oversight: making them work means a slot whose date is
 * the following day, which every other part of the booking flow — the date
 * comparison in isSlotBookable, the closed-day check, the list the café reads
 * in the morning — would have to be taught about. Someone wanting a table at
 * half past midnight can telephone.
 */
const LAST_SLOT_MINUTES = 23 * 60 + 30;

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
 * A closing time EARLIER than the opening one means the night runs past
 * midnight, and is read that way.
 *
 * This used to be treated as bad data and answered with no slots at all. It
 * is not bad data: the dashboard offers a plain time field, midnight is
 * "00:00" in it, and a café open till midnight on Friday and Saturday enters
 * exactly that. The result was that the two busiest nights of the week
 * silently accepted no bookings — the guest was told "we're done taking
 * bookings for today" on a Saturday morning — while the five quiet days
 * worked perfectly, which is why it went unnoticed. Both halves of the
 * booking flow call this function, so both refused; nothing was logged,
 * because as far as the code was concerned it had been asked for the slots of
 * a day that has none.
 */
export function slotsForHours(openTime: string | null, closeTime: string | null): string[] {
  if (!openTime || !closeTime) return [];

  const open = toMinutes(openTime);
  let close = toMinutes(closeTime);
  if (Number.isNaN(open) || Number.isNaN(close)) return [];

  // Strictly earlier, not "earlier or equal": an opening and closing time that
  // are identical says nothing usable — it could be a full day or a slip of
  // the finger — and guessing a 24-hour café out of it would start taking
  // bookings the owner never agreed to. That stays "no slots".
  if (close < open) close += MINUTES_PER_DAY;

  const lastSeating = Math.min(close - LAST_SEATING_MINUTES, LAST_SLOT_MINUTES);
  if (lastSeating < open) return [];

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
