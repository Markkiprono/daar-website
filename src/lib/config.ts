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

/**
 * One canonical name, used everywhere. The descriptor goes *after* the name
 * and never inside it ("Daar by Izzi — Café & Bakery"), so search engines,
 * the Google Business Profile and social previews all agree on what the
 * business is called. Three competing variants used to be in circulation.
 */
export const SITE = {
  name: "Daar by Izzi",
  shortName: "Daar",
  descriptor: "Café & Bakery",
  tagline: "Patience tastes better",
  city: "Nairobi",
  area: "Westlands",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
