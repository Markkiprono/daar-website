import "server-only";

import { getStorage, buildKey } from "@/lib/storage";
import { processMenuImage, MAX_UPLOAD_BYTES, ACCEPTED_TYPES } from "@/lib/images";
import { MAX_VIDEO_MB, VIDEO_TYPES } from "@/lib/image-rules";

/**
 * Storing a photograph or a film for one of the site's own slots.
 *
 * THIS FILE EXISTS BECAUSE OF WHERE IT ISN'T. Both functions lived in
 * src/app/actions/site-photos.ts, which begins `"use server"`. They were
 * private there, and making them `export` so the panels and the value cards
 * could share one upload pipeline quietly turned each of them into a public
 * HTTP endpoint: Next compiles every *export* of a "use server" module into an
 * addressable POST action, whether or not anything imports it, and neither
 * called assertAdmin. See node_modules/next/dist/docs/01-app/02-guides/
 * data-security.md — "even if a Server Action or utility function is not
 * imported elsewhere in your code, it can still be called externally".
 *
 * The result was two unauthenticated endpoints that write up to 12 MB (image)
 * or 50 MB (film) into the uploads volume — the same disk Postgres runs on —
 * and hand back a permanently cached public URL. Adding assertAdmin to each
 * would have closed it; moving them out means the endpoints do not exist at
 * all, which is the better answer, and it costs nothing because every caller
 * already checks admin before it gets here.
 *
 * `import "server-only"` makes the mistake loud rather than silent: importing
 * this from a client component is now a build error instead of a bundle that
 * leaks the storage layer.
 */

/** Processes an upload through the shared menu-image pipeline (WebP + blur). */
export async function processSiteImage(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported type: ${file.type || "unknown"}. Use JPEG, PNG, WebP or AVIF.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 12 MB.`);
  }
  const input = Buffer.from(await file.arrayBuffer());
  // Site photos are used large (hero is full-screen), so allow more width.
  const processed = await processMenuImage(input, 2000);
  const storage = await getStorage();
  const stored = await storage.put(
    buildKey("site.webp", "site"),
    processed.buffer,
    processed.contentType,
  );
  return { url: stored.url, blur: processed.blurDataUrl };
}

/**
 * Stores a film byte-for-byte, the way the hero loop always has.
 *
 * No re-encoding: there is no ffmpeg in the runtime image, and transcoding
 * video inside a request is not a thing to start doing. The burden is on the
 * file being sensible before it arrives, which is what the size limit and the
 * wording on the form are for.
 */
export async function processSiteVideo(file: File) {
  if (!VIDEO_TYPES.includes(file.type)) {
    throw new Error(
      `That file is ${file.type || "an unknown type"}. Please use an MP4 or WebM — a .mov from a phone needs converting first.`,
    );
  }
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(
      `That video is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_VIDEO_MB} MB. A background loop should be a few seconds and heavily compressed.`,
    );
  }

  const extension = file.type === "video/webm" ? "webm" : "mp4";
  const bytes = Buffer.from(await file.arrayBuffer());
  const storage = await getStorage();
  const stored = await storage.put(buildKey(`site.${extension}`, "site"), bytes, file.type);
  return { url: stored.url };
}
