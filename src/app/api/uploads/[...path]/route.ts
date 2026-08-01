import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { UPLOADS_ROOT } from "@/lib/storage/local";

/**
 * Serves uploaded media.
 *
 * Why not just write into /public? Because `next start` snapshots the public
 * directory at BUILD time — a file written there afterwards returns 404 until
 * the app is rebuilt. That silently breaks every photo the owner uploads.
 *
 * Reading from disk per-request works identically in dev, in production, and
 * on a VPS with a persistent volume, with no rebuild.
 */

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const key = segments.join("/");

  // Resolve and confirm the result is still inside the uploads root, so a
  // crafted key ("../../.env") cannot read arbitrary files.
  const full = path.resolve(UPLOADS_ROOT, key);
  if (!full.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let size: number;
  try {
    const info = await stat(full);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });
    size = info.size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = (key.split(".").pop() ?? "").toLowerCase();
  const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Content-Length": String(size),
      // Keys are content-addressed (timestamp + random), so a given URL
      // never changes — safe to cache hard.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Defence in depth for uploaded SVGs. They are screened on upload, but
      // an SVG opened directly is a document: this stops any script inside
      // one executing, and stops a mislabelled file being sniffed as HTML.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
