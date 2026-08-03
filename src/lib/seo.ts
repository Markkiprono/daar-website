import { SITE } from "./config";

/**
 * Structured data (JSON-LD) builders.
 *
 * This is how search engines learn what Daar *is* — a bakery/cafe at a real
 * address with real hours and a real menu — rather than just a page of prose.
 * It feeds the local map pack, "open now" answers, and menu rich results.
 * Everything here is built from the same database rows the pages render, so
 * it can never drift from what a visitor sees.
 */

const DAY_SCHEMA = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type Settings = {
  addressLine: string;
  phone: string | null;
  email: string | null;
  socials: unknown;
  heroImageUrl: string | null;
} | null;

type Hours = { dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }[];

type MenuCategory = {
  name: string;
  description: string | null;
  items: {
    name: string;
    slug: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
  }[];
};

/** JSON-LD lives inside a <script> tag, so "</script>" in user content must not terminate it. */
export function jsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absolute(url: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${SITE.url}${url}`;
}

/** KES has no cents in practice; prices are stored in minor units. */
function schemaPrice(priceCents: number): string {
  return String(Math.round(priceCents / 100));
}

export function bakeryJsonLd(settings: Settings, hours: Hours) {
  const socials =
    settings?.socials && typeof settings.socials === "object"
      ? Object.values(settings.socials as Record<string, unknown>).filter(
          (v): v is string => typeof v === "string" && v.startsWith("http"),
        )
      : [];

  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "@id": `${SITE.url}/#business`,
    name: SITE.name,
    url: SITE.url,
    image: absolute(settings?.heroImageUrl ?? "/brand/counter.jpg"),
    servesCuisine: ["Bakery", "Cafe", "Breakfast", "Coffee"],
    address: {
      "@type": "PostalAddress",
      streetAddress: settings?.addressLine ?? SITE.city,
      addressLocality: SITE.city,
      addressCountry: "KE",
    },
    ...(settings?.phone ? { telephone: settings.phone } : {}),
    ...(settings?.email ? { email: settings.email } : {}),
    ...(socials.length ? { sameAs: socials } : {}),
    hasMenu: `${SITE.url}/menu`,
    acceptsReservations: `${SITE.url}/reserve`,
    openingHoursSpecification: hours
      .filter((h) => !h.isClosed && h.openTime && h.closeTime)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY_SCHEMA[h.dayOfWeek],
        opens: h.openTime,
        closes: h.closeTime,
      })),
  };
}

export function menuJsonLd(categories: MenuCategory[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE.url}/menu#menu`,
    name: `${SITE.name} Menu`,
    inLanguage: "en",
    hasMenuSection: categories.map((c) => ({
      "@type": "MenuSection",
      name: c.name,
      ...(c.description ? { description: c.description } : {}),
      hasMenuItem: c.items.map((i) => ({
        "@type": "MenuItem",
        name: i.name,
        url: `${SITE.url}/menu/${i.slug}`,
        ...(i.description ? { description: i.description } : {}),
        ...(i.imageUrl ? { image: absolute(i.imageUrl) } : {}),
        offers: {
          "@type": "Offer",
          price: schemaPrice(i.priceCents),
          priceCurrency: "KES",
        },
      })),
    })),
  };
}

export function menuItemJsonLd(item: {
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: item.name,
    url: `${SITE.url}/menu/${item.slug}`,
    ...(item.description ? { description: item.description } : {}),
    ...(item.imageUrl ? { image: absolute(item.imageUrl) } : {}),
    offers: {
      "@type": "Offer",
      price: schemaPrice(item.priceCents),
      priceCurrency: "KES",
      availability: item.isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}
