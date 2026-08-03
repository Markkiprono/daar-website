/**
 * Google Maps embed handling, shared by the admin form and the server action
 * so the preview you see while typing and the value that gets saved can never
 * disagree about what counts as valid.
 *
 * Free of server-only imports on purpose — the settings form is a client
 * component and needs the same rules to render its preview.
 */

/**
 * Google's "Embed a map" button copies a whole <iframe> element rather than a
 * bare URL, so that is what people paste. Pull the src out of it; anything not
 * starting with "<" is passed through untouched so a bare URL still works.
 */
export function mapEmbedSrc(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("<")) return trimmed;
  return (trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? trimmed).trim();
}

/**
 * The host stays pinned: this value is rendered as an iframe src, so allowing
 * an arbitrary one would let anyone who reaches the dashboard frame a page of
 * their choosing inside the site. Checked after extraction, never before.
 */
export function isMapEmbed(value: string): boolean {
  return /^https:\/\/www\.google\.com\/maps\/embed\?/.test(mapEmbedSrc(value));
}

export const MAP_EMBED_HELP =
  "That doesn't look like a Google Maps embed. In Google Maps use Share → Embed a map → COPY HTML, then paste the whole thing here.";
