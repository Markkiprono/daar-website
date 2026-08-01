import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter, StoredFile } from "./index";

/**
 * Local-disk driver.
 *
 * Files live OUTSIDE ./public and are served by src/app/api/uploads/[...path].
 * Writing into /public looks simpler but is broken: `next start` snapshots the
 * public directory at build time, so anything uploaded afterwards 404s until
 * the app is rebuilt.
 *
 * Usable on a VPS with a persistent volume (point UPLOADS_DIR at it). Still
 * unsuitable for serverless, where the filesystem is ephemeral — use the S3
 * driver there.
 */

export const UPLOADS_ROOT = path.resolve(
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "storage", "uploads"),
);

function resolveSafe(key: string): string {
  const full = path.resolve(UPLOADS_ROOT, key);
  if (!full.startsWith(UPLOADS_ROOT + path.sep)) {
    throw new Error("Refusing to write outside the uploads directory");
  }
  return full;
}

export const localStorage: StorageAdapter = {
  async put(key, body): Promise<StoredFile> {
    const full = resolveSafe(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return { url: `/api/uploads/${key}`, key };
  },

  async delete(key) {
    try {
      await unlink(resolveSafe(key));
    } catch {
      // Already gone is a success for our purposes.
    }
  },
};
