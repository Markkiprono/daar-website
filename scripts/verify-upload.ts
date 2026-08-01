/**
 * Exercises the exact upload pipeline a menu-item save runs:
 * sharp processing -> storage adapter -> public URL.
 *
 *   npx tsx scripts/verify-upload.ts <path-to-image>
 */
import "dotenv/config";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

async function main() {
  const src =
    process.argv[2] ??
    "C:\\Users\\BEAST IZZI\\Desktop\\daar-website\\design\\img\\item-tart.jpg";

  console.log(`source: ${src}`);
  const input = await readFile(src);
  console.log(`  read ok: ${(input.length / 1024 / 1024).toFixed(2)} MB`);

  // --- mirror src/lib/images.ts ---
  const pipeline = sharp(input, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  console.log(`  metadata: ${meta.width}x${meta.height} ${meta.format}`);

  const buffer = await pipeline
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const out = await sharp(buffer).metadata();
  console.log(`  webp: ${out.width}x${out.height}, ${(buffer.length / 1024).toFixed(0)} KB`);

  const blur = await sharp(input)
    .rotate()
    .resize(16, 16, { fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer();
  console.log(`  blur placeholder: ${blur.length} bytes`);

  // --- mirror src/lib/storage/local.ts ---
  const ROOT = path.join(process.cwd(), "public", "uploads");
  const key = `menu/verify-${Date.now().toString(36)}.webp`;
  const full = path.resolve(ROOT, key);

  if (!full.startsWith(path.resolve(ROOT) + path.sep)) {
    throw new Error("path traversal guard tripped");
  }

  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
  console.log(`  wrote: ${full}`);
  console.log(`  public url: /uploads/${key}`);
  console.log("\nUpload pipeline OK.");
}

main().catch((e) => {
  console.error("\nUpload pipeline FAILED:");
  console.error(e);
  process.exit(1);
});
