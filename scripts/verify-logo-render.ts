/**
 * Renders each prepared logo and compares its ink against the original export.
 *
 * Catches the failure mode that string-level checks miss: a transform that
 * produces valid-looking SVG which actually draws the wrong thing — parts
 * erased, or an invisible artboard rect turned into a solid block.
 *
 *   npx tsx scripts/verify-logo-render.ts
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "brand", "logo");
const PAIRS: { prepared: string; source: RegExp }[] = [
  { prepared: "mark.svg", source: /door/i },
  { prepared: "wordmark.svg", source: /text/i },
  { prepared: "full.svg", source: /^(?!.*(door|text|original)).*logo.*\.svg$/i },
  { prepared: "lockup.svg", source: /original/i },
];

/** Fraction of pixels with any opacity, plus the rendered aspect ratio. */
async function inkStats(svg: Buffer) {
  const { data, info } = await sharp(svg, { density: 300 })
    .resize({ width: 400, height: 400, fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let painted = 0;
  const px = info.width * info.height;
  for (let i = 3; i < data.length; i += info.channels) if (data[i]! > 8) painted++;
  return { coverage: painted / px, w: info.width, h: info.height };
}

async function main() {
  const files = await readdir(DIR);
  let failures = 0;

  for (const { prepared, source } of PAIRS) {
    if (!files.includes(prepared)) {
      console.log(`  SKIP  ${prepared} (not generated)`);
      continue;
    }
    const src = files.find((f) => f !== prepared && source.test(f));
    if (!src) {
      console.log(`  SKIP  ${prepared} (source not found)`);
      continue;
    }

    const [a, b] = await Promise.all([
      inkStats(await readFile(path.join(DIR, src))),
      inkStats(await readFile(path.join(DIR, prepared))),
    ]);

    // A solid block means an invisible rect started painting.
    const solidBlock = b.coverage > 0.9;
    // Nothing drawn means the artwork was erased.
    const blank = b.coverage < 0.01;
    // Cropping raises coverage (same ink, smaller canvas) — that's expected —
    // but it should never *lose* ink relative to the original.
    const lostInk = b.coverage < a.coverage * 0.9;

    const ok = !solidBlock && !blank && !lostInk;
    if (!ok) failures++;

    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${prepared.padEnd(13)}` +
        `original ${(a.coverage * 100).toFixed(1).padStart(5)}% ink  ->  ` +
        `prepared ${(b.coverage * 100).toFixed(1).padStart(5)}% ink` +
        `  ${b.w}x${b.h}` +
        (solidBlock ? "   <-- SOLID BLOCK" : "") +
        (blank ? "   <-- BLANK" : "") +
        (lostInk ? "   <-- INK LOST" : ""),
    );
  }

  console.log(`\n  ${failures === 0 ? "All logos render correctly." : `${failures} FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
