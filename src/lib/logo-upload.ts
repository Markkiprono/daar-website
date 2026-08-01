import "server-only";
import sharp from "sharp";
import { assertSafeSvg } from "./svg-safety";
import { normalizeLogoSvg } from "./svg-normalize";

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB — a logo is never bigger
export const ACCEPTED_LOGO_TYPES = [
  "image/svg+xml",
  "image/png",
  "image/webp",
  "image/jpeg",
];

export type ProcessedLogo = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

/**
 * Prepares an uploaded logo.
 *
 * SVG passes through unchanged (after the safety check) so it stays crisp and
 * inherits colour. Raster formats are trimmed of surrounding whitespace,
 * bounded to 512px and converted to WebP with transparency preserved.
 */
export async function processLogo(file: File): Promise<ProcessedLogo> {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}. Use SVG, PNG or WebP.`);
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 2 MB.`);
  }

  const input = Buffer.from(await file.arrayBuffer());

  if (file.type === "image/svg+xml") {
    assertSafeSvg(input.toString("utf8"));
    // Crop to the artwork and swap the fixed brand colour for currentColor,
    // so the mark fills its space and can be tinted per section.
    const normalized = await normalizeLogoSvg(input);
    return { buffer: Buffer.from(normalized, "utf8"), contentType: "image/svg+xml", extension: "svg" };
  }

  const buffer = await sharp(input, { failOn: "none" })
    .trim() // drop empty margins so the mark sits flush in the navbar
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100 })
    .toBuffer();

  return { buffer, contentType: "image/webp", extension: "webp" };
}
