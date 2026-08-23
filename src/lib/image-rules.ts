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
/**
 * A hero loop should be a few seconds, muted, and heavily compressed — the
 * cap is high enough for a decent 1080p clip and low enough to discourage
 * dropping a raw phone recording on people paying for mobile data.
 */
export const MAX_VIDEO_MB = 50;

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
/** H.264 MP4 plays everywhere; WebM covers the rest. */
export const VIDEO_TYPES = ["video/mp4", "video/webm"];

export const FAVICON_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

/** What a given slot will accept. */
export type UploadKind = "photo" | "favicon" | "video";

const RULES: Record<UploadKind, { types: string[]; maxMB: number; noun: string; wanted: string }> = {
  photo: {
    types: PHOTO_TYPES,
    maxMB: MAX_PHOTO_MB,
    noun: "photo",
    wanted: "a JPG, PNG or WebP",
  },
  favicon: {
    types: FAVICON_TYPES,
    maxMB: MAX_FAVICON_MB,
    noun: "icon",
    wanted: "a PNG, SVG or ICO",
  },
  video: {
    types: VIDEO_TYPES,
    maxMB: MAX_VIDEO_MB,
    noun: "video",
    wanted: "an MP4 or WebM",
  },
};

/**
 * The reason this file can't be used, or null when it's fine.
 *
 * Takes a kind rather than a boolean: with three slots a flag would have to be
 * read as "not a favicon, therefore a photo", which is exactly how the old
 * per-form copies drifted apart.
 */
export function rejectionReason(file: File, kind: UploadKind = "photo"): string | null {
  const rule = RULES[kind];

  if (!rule.types.includes(file.type)) {
    // Naming the type it got makes an unexpected HEIC, MOV or PDF obvious.
    const got = file.type ? ` (${file.type})` : "";
    return `This file isn’t ${rule.noun === "icon" ? "an icon" : `a ${rule.noun}`} we can use${got}. Please choose ${rule.wanted}.`;
  }

  if (file.size > rule.maxMB * 1024 * 1024) {
    return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB and exceeds the ${rule.maxMB} MB limit. Please choose a smaller ${rule.noun}.`;
  }

  return null;
}
