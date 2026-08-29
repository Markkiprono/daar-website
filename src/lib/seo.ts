import { SITE } from "./config";
import { isVideoUrl } from "./media";

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
  storyImageUrl: string | null;
  visitImageUrl: string | null;
  logoWordmarkUrl: string | null;
  latitude: string | null;
  longitude: string | null;
  priceRange: string | null;
  currency: string;
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

/**
 * The café's coordinates, when they are actually coordinates.
 *
 * Truthiness is not enough of a test here, and the site was published wrong
 * for it. The columns hold text, a blank latitude box was being stored as the
 * string "0" (see the note in src/app/actions/settings.ts), and "0" is a
 * perfectly truthy string — so `latitude && longitude` passed and Google was
 * told the bakery sits at 0°N 0°E: open water in the Gulf of Guinea, roughly
 * 500 km off West Africa, directly contradicting the Westlands street address
 * in the same block. A coordinate that disagrees with the address is worse
 * than no coordinate, because `geo` is what feeds the local map pack.
 *
 * Null Island is rejected only when BOTH are zero. A latitude of exactly zero
 * is otherwise legitimate — the equator runs through this country — so the
 * pair is judged together rather than each half on its own.
 */
function coordinates(latitude: string | null | undefined, longitude: string | null | undefined) {
  if (latitude == null || longitude == null) return null;

  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  if (lat === 0 && lon === 0) return null;

  return {
    geo: {
      "@type": "GeoCoordinates",
      latitude: String(lat),
      longitude: String(lon),
    },
  } as const;
}

export function bakeryJsonLd(settings: Settings, hours: Hours) {
  const socials =
    settings?.socials && typeof settings.socials === "object"
      ? Object.values(settings.socials as Record<string, unknown>).filter(
          (v): v is string => typeof v === "string" && v.startsWith("http"),
        )
      : [];

  // Every photo we can honestly point at. Google prefers several.
  // A slot holding a film falls back to the brand still: this list is
  // `image` on a Restaurant, and an .mp4 there is not a photograph of the
  // premises, it is a broken result.
  const stillOr = (uploaded: string | null | undefined, fallback: string) =>
    isVideoUrl(uploaded) ? fallback : (uploaded ?? fallback);

  const images = [
    stillOr(settings?.heroImageUrl, "/brand/interior-02.jpg"),
    stillOr(settings?.visitImageUrl, "/brand/interior-01.jpg"),
    stillOr(settings?.storyImageUrl, "/brand/patience-plates.jpg"),
  ]
    .map(absolute)
    .filter((v): v is string => Boolean(v));

  const address = settings?.addressLine ?? SITE.city;

  return {
    "@context": "https://schema.org",
    // Several types at once: it is a restaurant, a bakery and a coffee shop,
    // and each one matches a different way people search.
    "@type": ["Restaurant", "Bakery", "CafeOrCoffeeShop"],
    "@id": `${SITE.url}/#business`,
    name: SITE.name,
    alternateName: SITE.shortName,
    description: `${SITE.descriptor} in ${SITE.area}, ${SITE.city}. Slow-proved bread and pastry, baked the same morning it's served.`,
    url: SITE.url,
    image: images,
    // Always emit a logo. This used to be omitted whenever the owner hadn't
    // uploaded a wordmark in the dashboard, which is the usual state — and
    // with no `logo` in the structured data there is nothing for Google to
    // show as the brand's mark. The committed PNG is the same lockup, on
    // bone, so search surfaces it cleanly against white.
    logo: absolute(settings?.logoWordmarkUrl ?? "/brand/logo.png"),
    servesCuisine: ["Bakery", "Coffee", "Brunch", "Pastry"],
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: SITE.city,
      addressRegion: "Nairobi County",
      addressCountry: "KE",
    },
    // Coordinates put the pin in the right place; omitted rather than guessed.
    ...(coordinates(settings?.latitude, settings?.longitude) ?? {}),
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.name} ${address}`)}`,
    ...(settings?.phone ? { telephone: settings.phone } : {}),
    ...(settings?.email ? { email: settings.email } : {}),
    ...(settings?.priceRange ? { priceRange: settings.priceRange } : {}),
    currenciesAccepted: settings?.currency ?? "KES",
    paymentAccepted: "Cash, M-Pesa, Credit Card",
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

/**
 * Shared Open Graph / Twitter block. Every page gets a real image that exists,
 * preferring the owner's uploaded photo and falling back to brand stock, so a
 * link shared on WhatsApp always shows a picture instead of a bare title.
 */
export function socialImage(uploaded: string | null | undefined, fallback: string, alt: string) {
  /* A slot may now hold a film instead of a photograph, and an .mp4 in
     og:image is a link that unfurls as a broken box on WhatsApp and in search
     results. The brand still is the right thing to send in that case. */
  const url = absolute(isVideoUrl(uploaded) ? fallback : (uploaded ?? fallback))!;
  return {
    openGraph: { images: [{ url, alt }] },
    twitter: { images: [url] },
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
