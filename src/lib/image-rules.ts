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

/**
 * What a given slot will accept.
 *
 * "media" is a slot that takes either — the site's backdrops, where the owner
 * may want a still one week and a few seconds of film the next. It is its own
 * kind rather than a `photo | video` union at every call site, because the
 * size limit depends on which one actually arrived.
 */
export type UploadKind = "photo" | "favicon" | "video" | "media";

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
  media: {
    types: [...PHOTO_TYPES, ...VIDEO_TYPES],
    // Never consulted: a media slot picks its limit from what arrived, below.
    maxMB: MAX_VIDEO_MB,
    noun: "photo or video",
    wanted: "a JPG, PNG, WebP, MP4 or WebM",
  },
};

/** Whether this file is one of the video types, i.e. which limit applies. */
export function isVideoFile(file: File): boolean {
  return VIDEO_TYPES.includes(file.type);
}

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

  // A slot taking either has two limits, and the file itself says which one
  // applies — 12 MB is right for a photograph and absurd for a film.
  const video = isVideoFile(file);
  const maxMB = kind === "media" ? (video ? MAX_VIDEO_MB : MAX_PHOTO_MB) : rule.maxMB;
  const noun = kind === "media" ? (video ? "video" : "photo") : rule.noun;

  if (file.size > maxMB * 1024 * 1024) {
    return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB and exceeds the ${maxMB} MB limit. Please choose a smaller ${noun}.`;
  }

  return null;
}
