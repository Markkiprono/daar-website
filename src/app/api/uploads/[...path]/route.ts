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
  mp4: "video/mp4",
  webm: "video/webm",
};

/** Extensions a browser will stream rather than download in one go. */
const STREAMABLE = new Set(["mp4", "webm"]);

export async function GET(
  request: Request,
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
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  /**
   * Range requests, without which video does not work.
   *
   * Safari and iOS will not begin playback at all unless the server answers a
   * Range request with 206, and every browser needs it to seek — without it
   * the whole file is pulled down before the first frame. Images are happy
   * either way, so this only engages for media that streams.
   */
  const range = STREAMABLE.has(ext) ? request.headers.get("range") : null;
  const shared = {
    // Keys are content-addressed (timestamp + random), so a given URL
    // never changes — safe to cache hard.
    "Cache-Control": "public, max-age=31536000, immutable",
    // Defence in depth for uploaded SVGs. They are screened on upload, but
    // an SVG opened directly is a document: this stops any script inside
    // one executing, and stops a mislabelled file being sniffed as HTML.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      const [, rawStart, rawEnd] = match;
      let start: number;
      let end: number;

      if (rawStart === "" && rawEnd !== "") {
        // "bytes=-500" asks for the final 500 bytes, not the first 500.
        start = Math.max(0, size - Number(rawEnd));
        end = size - 1;
      } else {
        start = Number(rawStart || 0);
        end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
      }

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
        });
      }

      const partial = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
      return new NextResponse(partial, {
        status: 206,
        headers: {
          ...shared,
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Content-Length": String(end - start + 1),
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      ...shared,
      "Content-Type": contentType,
      "Content-Length": String(size),
      // Advertised so a player knows it may seek rather than refusing to.
      "Accept-Ranges": "bytes",
    },
  });
}
