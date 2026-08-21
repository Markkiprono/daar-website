/**
 * Renders the favicon / app-icon set from the brand door mark.
 *
 *   npx tsx scripts/make-icons.ts
 *
 * Why this exists at all: the repo shipped with create-next-app's default
 * favicon.ico (a Vercel triangle) sitting in src/app/. File-based metadata
 * outranks the `icons` field in generateMetadata, so that placeholder won
 * every time and the door mark in the config was never used. The fix is a
 * real, brand-accurate icon served from /public — but it has to be generated,
 * because the source mark is a tall SVG and every consumer here wants a
 * SQUARE raster:
 *
 *   Google  — rejects non-square favicons outright, and wants a multiple
 *             of 48px it can fetch from a stable URL.
 *   iOS     — ignores SVG apple-touch-icons; it needs a 180px PNG.
 *   Android — reads the sizes named in the web manifest.
 *
 * Output is committed, so a deploy never depends on this running.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PUBLIC = path.join(process.cwd(), "public");
const OXBLOOD = "#481819";
const TAN = "#d2af8a";
const BONE = "#faf6ef";

/**
 * Fraction of the square the mark occupies. Tighter at small sizes: the door
 * is drawn in hairlines, and at 16px the padding was costing it whole pixels
 * of stroke — the mark read as a smudge. Less margin, more mark.
 */
const inset = (size: number) => (size <= 16 ? 0.9 : size <= 32 ? 0.82 : 0.72);

/** Pull the drawable innards out of one of the designer's SVG exports. */
async function markSource(file: string) {
  const raw = await readFile(path.join(PUBLIC, "brand", "logo", file), "utf8");
  const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw new Error(`${file} has no viewBox — cannot place it.`);
  const body = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return { viewBox, body };
}

/**
 * A square icon: flat brand ground, mark centred on it. The nested <svg> does
 * the fitting — preserveAspectRatio keeps the door's proportions instead of
 * squashing it into the square, which is what makes it still readable at 16px.
 *
 * `canvas` is the size this is drawn at; `target` is the size it will finally
 * be seen at. They differ when we author large and downscale for antialiasing,
 * and the margin has to follow the size the eye gets, not the one sharp gets.
 */
function squareIcon(
  mark: { viewBox: string; body: string },
  canvas: number,
  bg: string,
  fg: string,
  target: number = canvas,
) {
  const size = canvas;
  const box = Math.round(size * inset(target));
  const edge = Math.round((size - box) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <svg x="${edge}" y="${edge}" width="${box}" height="${box}" viewBox="${mark.viewBox}" preserveAspectRatio="xMidYMid meet">
    <g fill="${fg}">${mark.body}</g>
  </svg>
</svg>`;
}

/**
 * ICO container. Each frame is a whole PNG rather than a raw bitmap — every
 * browser released this century reads that, and it keeps the file small
 * enough that the 48px frame Google prefers costs nothing.
 */
function ico(frames: { size: number; png: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);

  let offset = 6 + frames.length * 16;
  const dir: Buffer[] = [];
  for (const { size, png } of frames) {
    const e = Buffer.alloc(16);
    // 0 means 256 in this field; none of our sizes hit that, but be exact.
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    offset += png.length;
  }
  return Buffer.concat([header, ...dir, ...frames.map((f) => f.png)]);
}

const png = (svg: string, size: number) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

async function main() {
  const mark = await markSource("mark.svg");

  // The vector favicon. Modern browsers prefer it and it stays crisp on any
  // display; the .ico below is the floor for everything that doesn't.
  const vector = squareIcon(mark, 512, OXBLOOD, TAN);
  await writeFile(path.join(PUBLIC, "favicon.svg"), `${vector}\n`, "utf8");

  // Each frame is authored at its own size so the inset above actually
  // applies — downscaling one 512px master would bake in the wide margin.
  const frames = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      png: await png(squareIcon(mark, size * 8, OXBLOOD, TAN, size), size),
    })),
  );
  await writeFile(path.join(PUBLIC, "favicon.ico"), ico(frames));

  // Apple ignores transparency and composites onto white, so the ground is
  // already opaque here — no surprise white corners on a home screen.
  await writeFile(path.join(PUBLIC, "apple-icon.png"), await png(vector, 180));
  await writeFile(path.join(PUBLIC, "icon-192.png"), await png(vector, 192));
  await writeFile(path.join(PUBLIC, "icon-512.png"), await png(vector, 512));

  // Organization logo for structured data. Google reads the raster reliably;
  // it sits on bone rather than oxblood because search surfaces it on white.
  const lockup = await markSource("lockup.svg");
  const [, , vbW, vbH] = lockup.viewBox.split(/[\s,]+/).map(Number);
  const width = 600;
  const height = Math.round((width * vbH) / vbW);
  await writeFile(
    path.join(PUBLIC, "brand", "logo.png"),
    await sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BONE}"/>
  <svg x="0" y="0" width="${width}" height="${height}" viewBox="${lockup.viewBox}" preserveAspectRatio="xMidYMid meet">
    <g fill="${OXBLOOD}">${lockup.body}</g>
  </svg>
</svg>`,
      ),
    )
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );

  console.log("favicon.svg, favicon.ico (16/32/48), apple-icon.png, icon-192, icon-512, brand/logo.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
