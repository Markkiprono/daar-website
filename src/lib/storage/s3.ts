import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageAdapter, StoredFile } from "./index";

/**
 * S3-compatible storage — Cloudflare R2, MinIO, Backblaze B2, AWS S3.
 *
 * R2 is the recommended target: S3-compatible with **zero egress fees**,
 * which matters a great deal for a photo-heavy menu served over Kenyan
 * mobile data. MinIO on the VPS works identically if you would rather keep
 * everything on one box.
 *
 * Required environment:
 *   S3_ENDPOINT           https://<account>.r2.cloudflarestorage.com
 *   S3_BUCKET             daar-media
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_PUBLIC_URL         https://media.daarbyizzi.com   (public base for reads)
 *   S3_REGION             optional, defaults to "auto" (correct for R2)
 *
 * NOT YET EXERCISED against a real bucket — there isn't one to test with.
 * The shape is standard and the config is validated up front, but treat the
 * first upload after switching STORAGE_DRIVER=s3 as the real test.
 */

let client: S3Client | null = null;

function config() {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.S3_PUBLIC_URL;

  const missing = Object.entries({
    S3_ENDPOINT: endpoint,
    S3_BUCKET: bucket,
    S3_ACCESS_KEY_ID: accessKeyId,
    S3_SECRET_ACCESS_KEY: secretAccessKey,
    S3_PUBLIC_URL: publicUrl,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    // Fail loudly at startup rather than silently dropping the owner's uploads.
    throw new Error(
      `STORAGE_DRIVER=s3 but these are not set: ${missing.join(", ")}. ` +
        `Set them, or use STORAGE_DRIVER=local.`,
    );
  }

  return {
    endpoint: endpoint!,
    bucket: bucket!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    // Trailing slash here would produce "…//menu/x.webp" in every URL.
    publicUrl: publicUrl!.replace(/\/+$/, ""),
    region: process.env.S3_REGION || "auto",
  };
}

export function createS3Storage(): StorageAdapter {
  const cfg = config();

  if (!client) {
    client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      // R2 and MinIO both expect path-style addressing.
      forcePathStyle: true,
    });
  }

  return {
    async put(key, body, contentType): Promise<StoredFile> {
      await client!.send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Keys carry a timestamp and random suffix, so a given URL never
          // changes its content — safe to cache for a year.
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      return { url: `${cfg.publicUrl}/${key}`, key };
    },

    async delete(key) {
      try {
        await client!.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
      } catch {
        // Already gone is a success for our purposes.
      }
    },
  };
}
