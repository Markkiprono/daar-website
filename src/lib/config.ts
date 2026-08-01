/**
 * Single source of truth for currency and site-wide constants.
 * Changing the currency is a one-line change, as the brief required.
 */

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "KES";

/**
 * Kenyan Shillings are quoted in whole units in practice, so we round
 * away the minor units on display while still storing them (so a future
 * currency that uses cents needs no migration).
 */
export function formatPrice(
  priceCents: number,
  { currency = CURRENCY, withCode = true }: { currency?: string; withCode?: boolean } = {},
): string {
  const whole = Math.round(priceCents / 100);
  const grouped = whole.toLocaleString("en-KE");
  return withCode ? `${currency} ${grouped}` : grouped;
}

/** 0 = Sunday, matching OpeningHours.dayOfWeek. */
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const SITE = {
  name: "Daar & Bakery",
  tagline: "Patience tastes better",
  city: "Nairobi",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
