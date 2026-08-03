/**
 * Verifies the booking time rules — the logic the form and the server action
 * both rely on. Run any time the rules change:
 *
 *   npx tsx scripts/verify-reservation-rules.ts
 */
import {
  cafeNow,
  isSlotBookable,
  toMinutes,
  slotsForHours,
  slotsForDate,
  weekdayOf,
  LEAD_MINUTES,
  LAST_SEATING_MINUTES,
  type DayHours,
} from "../src/lib/time";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  (got ${actual}, want ${expected})`}`);
}

const now = cafeNow();
console.log(`Café clock: ${now.date} ${now.time} (${now.minutes} min past midnight)\n`);

console.log("Past / future days:");
check("yesterday is never bookable", isSlotBookable("2020-01-01", "12:00", now), false);
check("far future day is bookable", isSlotBookable("2099-01-01", "12:00", now), true);

console.log("\nToday — elapsed slots:");
const mins = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const wellPast = Math.max(0, now.minutes - 120);
check(`${mins(wellPast)} (2h ago) rejected`, isSlotBookable(now.date, mins(wellPast), now), false);

const justPast = Math.max(0, now.minutes - 5);
check(`${mins(justPast)} (5 min ago) rejected`, isSlotBookable(now.date, mins(justPast), now), false);

const insideLead = now.minutes + LEAD_MINUTES - 5;
check(`${mins(insideLead)} (inside ${LEAD_MINUTES}min lead) rejected`, isSlotBookable(now.date, mins(insideLead), now), false);

const atLead = now.minutes + LEAD_MINUTES;
check(`${mins(atLead)} (exactly at lead) accepted`, isSlotBookable(now.date, mins(atLead), now), true);

const wellAhead = Math.min(23 * 60 + 59, now.minutes + 180);
check(`${mins(wellAhead)} (3h ahead) accepted`, isSlotBookable(now.date, mins(wellAhead), now), true);

console.log("\nMalformed input:");
check("empty time rejected", isSlotBookable(now.date, "", now), false);
check("garbage time rejected", isSlotBookable(now.date, "not-a-time", now), false);
check("toMinutes('19:30') === 1170", toMinutes("19:30"), 1170);

console.log("\nSlots follow the day's real opening hours:");
const weekday = slotsForHours("09:00", "22:15");
const lateNight = slotsForHours("09:00", "23:45");
check("first slot is opening time, not 07:00", weekday[0], "09:00");
check("nothing offered before opening", weekday.includes("08:30"), false);
// Slots sit on a :00/:30 grid, so the last one is the final half hour at or
// before (close - LAST_SEATING_MINUTES): 22:15 close -> 21:45 cutoff -> 21:30.
check(`last weekday table is on or before ${LAST_SEATING_MINUTES}min to close`, weekday.at(-1), "21:30");
check("late night reaches 23:00", lateNight.at(-1), "23:00");
check("late night keeps 22:00, which the old fixed list refused", lateNight.includes("22:00"), true);
check("opening on a half hour still starts there", slotsForHours("08:30", "12:00")[0], "08:30");
check("opening off-grid rounds up to the next half hour", slotsForHours("09:10", "12:00")[0], "09:30");

console.log("\nDegenerate hours are refused rather than guessed:");
check("missing times", slotsForHours(null, null).length, 0);
check("close before open", slotsForHours("18:00", "09:00").length, 0);
check("closing inside the last-seating buffer", slotsForHours("09:00", "09:20").length, 0);

console.log("\nClosed days offer nothing:");
const hours: DayHours[] = [
  { dayOfWeek: 0, openTime: "09:00", closeTime: "22:15", isClosed: false },
  { dayOfWeek: 1, openTime: null, closeTime: null, isClosed: true },
  { dayOfWeek: 2, openTime: "09:00", closeTime: "22:15", isClosed: false },
  { dayOfWeek: 3, openTime: "09:00", closeTime: "22:15", isClosed: false },
  { dayOfWeek: 4, openTime: "09:00", closeTime: "22:15", isClosed: false },
  { dayOfWeek: 5, openTime: "09:00", closeTime: "23:45", isClosed: false },
  { dayOfWeek: 6, openTime: "09:00", closeTime: "23:45", isClosed: false },
];
// 2026-08-03 is a Monday, 2026-08-07 a Friday.
check("weekdayOf reads the date in UTC", weekdayOf("2026-08-03"), 1);
check("Monday (closed) has no slots", slotsForDate("2026-08-03", hours).length, 0);
check("Friday runs late", slotsForDate("2026-08-07", hours).at(-1), "23:00");

console.log("\nSlot list filtering for today:");
const todaysSlots = slotsForDate(now.date, hours);
const offered = todaysSlots.filter((t) => isSlotBookable(now.date, t, now));
console.log(`  today's hours : ${todaysSlots.length ? `${todaysSlots[0]}–${todaysSlots.at(-1)}` : "(closed)"}`);
console.log(`  offered now   : ${offered.length ? offered.join(" ") : "(none — too late in the day)"}`);
check("no offered slot is in the past", offered.every((t) => toMinutes(t) >= now.minutes + LEAD_MINUTES), true);

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
