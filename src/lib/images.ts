import "server-only";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB — camera originals are big
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export type ProcessedImage = {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  blurDataUrl: string;
};

/**
 * Owner uploads straight from a phone or a 30MP camera file. We never store
 * the original: it is resized, re-encoded as WebP, and a tiny blurred
 * placeholder is produced so menu cards don't shift layout while loading.
 */
export async function processMenuImage(input: Buffer, maxEdge = 1600): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: "none" }).rotate(); // honour EXIF orientation

  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Could not read image dimensions — is the file a valid image?");
  }

  const resized = pipeline.resize({
    width: maxEdge,
    height: maxEdge,
    fit: "inside",
    withoutEnlargement: true,
  });

  const buffer = await resized.webp({ quality: 82 }).toBuffer();
  const out = await sharp(buffer).metadata();

  // 16px wide blur, inlined as a data URI — a few hundred bytes.
  const blur = await sharp(input)
    .rotate()
    .resize(16, 16, { fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    buffer,
    contentType: "image/webp",
    width: out.width ?? meta.width,
    height: out.height ?? meta.height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}
