/**
 * Verifies the booking time rules — the logic the form and the server action
 * both rely on. Run any time the rules change:
 *
 *   npx tsx scripts/verify-reservation-rules.ts
 */
import { cafeNow, isSlotBookable, toMinutes, allSlots, LEAD_MINUTES } from "../src/lib/time";

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

console.log("\nSlot list filtering for today:");
const offered = allSlots().filter((t) => isSlotBookable(now.date, t, now));
const hidden = allSlots().filter((t) => !isSlotBookable(now.date, t, now));
console.log(`  offered today : ${offered.length ? offered.join(" ") : "(none — too late in the day)"}`);
console.log(`  hidden today  : ${hidden.length ? hidden.join(" ") : "(none)"}`);
check("no offered slot is in the past", offered.every((t) => toMinutes(t) >= now.minutes + LEAD_MINUTES), true);

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
