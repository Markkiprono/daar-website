/**
 * Upload limits shared by the admin photo forms and the server pipeline.
 *
 * Deliberately free of server-only imports so the browser can apply the same
 * rules before an upload starts: past the request body limit the upload dies
 * mid-stream and the owner gets an error page instead of a message. The server
 * re-checks everything in src/lib/images.ts — this is convenience, not trust.
 *
 * One copy of the rules, because when they were inlined per form one of them
 * silently drifted and stopped checking the file type at all.
 */

export const MAX_PHOTO_MB = 12; // camera originals are big
export const MAX_FAVICON_MB = 1;

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const FAVICON_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

/** The reason this file can't be used, or null when it's fine. */
export function rejectionReason(file: File, favicon = false): string | null {
  const types = favicon ? FAVICON_TYPES : PHOTO_TYPES;
  const maxMB = favicon ? MAX_FAVICON_MB : MAX_PHOTO_MB;

  if (!types.includes(file.type)) {
    // Naming the type it got makes an unexpected HEIC or PDF obvious.
    const got = file.type ? ` (${file.type})` : "";
    return favicon
      ? `This file isn’t a PNG, SVG or ICO icon${got}.`
      : `This file isn’t a photo we can use${got}. Please choose a JPG, PNG or WebP.`;
  }

  if (file.size > maxMB * 1024 * 1024) {
    return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB and exceeds the ${maxMB} MB limit. Please choose a smaller ${favicon ? "icon" : "photo"}.`;
  }

  return null;
}
