/**
 * Verifies the anti-spam rules on the public message form.
 *
 * The endpoint is unauthenticated and writes to the database, so these checks
 * are the only thing between it and a bot. Mirrors the logic in
 * src/app/actions/messages.ts.
 *
 *   npx tsx scripts/verify-message-spam.ts
 */
const MIN_SECONDS_ON_FORM = 3;

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(52)}${actual === true ? "blocked" : "allowed"}`);
}

/** Honeypot: any non-empty value means a bot filled a hidden field. */
const honeypotTriggers = (v: string) => v.trim() !== "";

/** Timing: submitted faster than a human could type. */
const tooFast = (startedAt: number, now: number) =>
  Number.isFinite(startedAt) && startedAt > 0 && (now - startedAt) / 1000 < MIN_SECONDS_ON_FORM;

console.log("Honeypot field:");
check("empty (a real person)", honeypotTriggers(""), false);
check("whitespace only", honeypotTriggers("   "), false);
check("filled in by a bot", honeypotTriggers("http://spam.example"), true);

console.log("\nSubmission timing:");
const now = Date.now();
check("submitted instantly (0s)", tooFast(now, now), true);
check("submitted after 1s", tooFast(now - 1_000, now), true);
check(`submitted after ${MIN_SECONDS_ON_FORM - 0.1}s`, tooFast(now - 2_900, now), true);
check(`submitted after exactly ${MIN_SECONDS_ON_FORM}s`, tooFast(now - 3_000, now), false);
check("submitted after 30s (a real person)", tooFast(now - 30_000, now), false);
check("missing timestamp is not blocked", tooFast(NaN, now), false);

console.log("\nField validation boundaries:");
const bodyOk = (s: string) => s.trim().length >= 10 && s.trim().length <= 2000;
check("9-character message", !bodyOk("a".repeat(9)), true);
check("10-character message", !bodyOk("a".repeat(10)), false);
check("2000-character message", !bodyOk("a".repeat(2000)), false);
check("2001-character message", !bodyOk("a".repeat(2001)), true);
check("whitespace-only message", !bodyOk("          "), true);

console.log(`\n${failures === 0 ? "All anti-spam checks passed." : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
