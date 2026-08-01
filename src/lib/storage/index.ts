import "server-only";

/**
 * Storage adapter.
 *
 * Uploads never touch a provider SDK directly — features talk to this
 * interface, so moving from local disk to Cloudflare R2 / MinIO / any
 * S3 API is a config change rather than a rewrite.
 */
export type StoredFile = {
  /** Public URL the browser will load. */
  url: string;
  /** Provider-relative key, kept so the file can be deleted later. */
  key: string;
};

export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export type StorageDriver = "local" | "s3";

export async function getStorage(): Promise<StorageAdapter> {
  const driver = (process.env.STORAGE_DRIVER ?? "local") as StorageDriver;

  if (driver === "local") {
    const { localStorage } = await import("./local");
    return localStorage;
  }

  if (driver === "s3") {
    const { createS3Storage } = await import("./s3");
    return createS3Storage();
  }

  throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
}

/** Collision-resistant, URL-safe key derived from the original filename. */
export function buildKey(originalName: string, prefix = "menu"): string {
  const ext = (originalName.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const stem = originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${stem}-${stamp}${rand}.${ext}`;
}
