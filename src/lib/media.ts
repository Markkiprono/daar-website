/**
 * Telling a stored video apart from a stored photograph.
 *
 * The site's media slots hold one URL each, and that URL may now point at
 * either kind — the owner drops a film into the same box that took a picture.
 * Rather than carry a `kind` column beside every one of them (six columns of
 * bookkeeping that can drift out of step with the file they describe), the
 * answer is read from the extension.
 *
 * That is safe here specifically because nothing else names these files: the
 * upload pipeline writes them itself, always as .webp for a photograph and
 * .mp4 or .webm for a film (see src/app/actions/site-photos.ts). The
 * extension is not a guess about a user-supplied name — it is the one the
 * server chose from the verified MIME type.
 *
 * Deliberately free of server-only imports, because the admin preview needs
 * the same answer in the browser.
 */

/** Extensions the video branch of the upload pipeline can produce. */
const VIDEO_EXTENSIONS = [".mp4", ".webm"];

/**
 * Whether this URL points at a film rather than a photograph.
 *
 * A query string is tolerated so a cache-busting suffix never silently turns
 * a video back into an image and hands a <video> file to next/image.
 */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split(/[?#]/)[0]!.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext));
}

/**
 * Split one slot's value into the pair the backdrop components want.
 *
 * A slot holding a film has no still of its own, so the built-in default
 * stands in as the poster frame: it is what shows while the film loads, what
 * a browser that refuses to autoplay keeps showing, and what anyone on Reduce
 * Motion or Save-Data sees instead. That is why a video upload never leaves
 * the section blank, and why `fallback` is required rather than optional.
 */
export function splitMedia(
  stored: string | null | undefined,
  fallback: string,
): { image: string; video: string | null } {
  if (isVideoUrl(stored)) return { image: fallback, video: stored! };
  return { image: stored ?? fallback, video: null };
}
