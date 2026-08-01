/**
 * Prepares the designer's SVG exports for use on the site.
 *
 * The actual work lives in src/lib/svg-normalize.ts, which the dashboard
 * upload path also uses — a previous version of this script duplicated that
 * logic and silently drifted out of sync, so it now just maps filenames to
 * slots and delegates.
 *
 *   npx tsx scripts/prepare-logos.ts
 *
 * Originals are left untouched; output is written alongside them.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { normalizeLogoSvg } from "../src/lib/svg-normalize";

const DIR = path.join(process.cwd(), "public", "brand", "logo");

/**
 * Which export becomes which slot. Matched case-insensitively on filename,
 * first match wins — so "original" is tested before the generic logo pattern.
 */
const MAPPING: { match: RegExp; out: string; label: string }[] = [
  { match: /original/i, out: "lockup.svg", label: "full stacked lockup" },
  { match: /door/i, out: "mark.svg", label: "door mark" },
  { match: /text/i, out: "wordmark.svg", label: "wordmark" },
  { match: /^(?!.*(door|text|original)).*logo.*\.svg$/i, out: "full.svg", label: "lettering lockup" },
];

const viewBoxOf = (svg: string) => svg.match(/viewBox="([^"]*)"/)?.[1] ?? "(none)";

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.toLowerCase().endsWith(".svg"));
  const generated = new Set(MAPPING.map((m) => m.out));
  const sources = files.filter((f) => !generated.has(f));

  if (sources.length === 0) {
    console.log("No source SVGs found in public/brand/logo/.");
    return;
  }

  for (const file of sources) {
    const target = MAPPING.find((m) => m.match.test(file));
    if (!target) {
      console.log(`SKIP  ${file}  (no slot matched)`);
      continue;
    }

    const raw = await readFile(path.join(DIR, file));
    const before = raw.toString("utf8");
    const after = await normalizeLogoSvg(raw);

    await writeFile(path.join(DIR, target.out), after, "utf8");

    const hiddenShapes = (after.match(/fill="none"/g) ?? []).length;
    console.log(
      `OK    ${target.out.padEnd(13)} <- "${file}"  (${target.label})\n` +
        `        viewBox ${viewBoxOf(before)}  ->  ${viewBoxOf(after)}\n` +
        `        currentColor: ${/fill="currentColor"/.test(after) ? "yes" : "NO"}` +
        `   non-painted shapes preserved: ${hiddenShapes}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
