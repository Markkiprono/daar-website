/**
 * Reading the social links off SiteSettings.
 *
 * `socials` is a Json column — `{ instagram: "https://…", tiktok: "https://…" }`
 * — written by updateSettings, which has already turned a bare handle into a
 * full URL. So nothing here needs to build a URL; it only needs to survive
 * whatever is actually in the column, which for a Json field means anything at
 * all: null, a string, an array, a key whose value is a number.
 *
 * This lived as a private copy inside the Visit page, which is why the footer
 * had no social links for so long — the parsing was there, the intent was
 * there, and the one page that could read them was the one page nobody
 * checks. Shared, so a new surface gets them by importing rather than by
 * remembering.
 */

/** The platforms the dashboard offers, in the order they should be shown. */
const ORDER = ["instagram", "tiktok", "facebook"] as const;

/**
 * How each platform spells itself.
 *
 * Capitalising the first letter of the key gets "Instagram" and "Facebook"
 * right and "Tiktok" wrong, and a brand's own name is not a detail to get
 * wrong on the page that links to it. Anything not listed falls back to the
 * capitalised key, which is the correct guess for most one-word names.
 */
const LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  x: "X",
};

export type SocialLink = {
  /** Lowercase platform key — "instagram", "tiktok", "facebook". */
  key: string;
  /** Capitalised for a label or an aria-label: "Instagram". */
  label: string;
  url: string;
};

/**
 * The links worth rendering, in a stable order.
 *
 * Only `http(s)` URLs are returned. The column is written by our own action,
 * but it is still a Json blob a future migration or a hand-edited row could
 * put anything into, and an unchecked value here would be rendered straight
 * into an href — `javascript:` included. Cheap to check, so it is checked.
 */
export function readSocials(value: unknown): SocialLink[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  const entries = Object.entries(value as Record<string, unknown>)
    .filter((e): e is [string, string] => typeof e[1] === "string" && e[1].trim().length > 0)
    .filter(([, url]) => /^https?:\/\//i.test(url.trim()))
    .map(([rawKey, url]) => {
      const key = rawKey.toLowerCase();
      return {
        key,
        label: LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
        url: url.trim(),
      };
    });

  // Known platforms first and always in the same order, so the footer does not
  // reshuffle itself because a Json object came back with different key order.
  // Anything unrecognised keeps its place at the end rather than being dropped.
  const rank = (k: string) => {
    const i = ORDER.indexOf(k as (typeof ORDER)[number]);
    return i === -1 ? ORDER.length : i;
  };
  return entries.sort((a, b) => rank(a.key) - rank(b.key));
}

/**
 * A social field may be a full URL, a pasted address, or a bare handle.
 *
 * The scheme test used to be the only branch, so anything that was not
 * literally http(s) was treated as a handle and glued onto the base — and the
 * single most likely thing to paste is an address copied from the browser bar
 * without its scheme. "instagram.com/daarbyizzi" became
 * "https://instagram.com/instagram.com/daarbyizzi", which saves without
 * complaint and 404s for every visitor who clicks it.
 *
 * Three cases now, in order of how specific they are: an address with a
 * scheme is kept; an address without one gets https://; anything else is a
 * handle. Spaces are stripped rather than encoded, because "@daar byizzi" is
 * a typo, and %20 in a profile URL is a link that never resolves.
 */
export function socialUrl(value: string, base: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;

  // Looks like "instagram.com/…", "www.tiktok.com/@…" or "//example.com/…":
  // a domain followed by a slash. Give it the scheme it is missing.
  const bare = v.replace(/^\/+/, "");
  if (/^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/|$)/i.test(bare)) return `https://${bare}`;

  return `${base}${bare.replace(/^@+/, "").replace(/\s+/g, "")}`;
}
