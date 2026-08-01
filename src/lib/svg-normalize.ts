// Deliberately not `server-only`: this needs to run from maintenance scripts
// too (scripts/prepare-logos.ts, scripts/renormalize-uploaded-logos.ts).
// It imports sharp, a native module that cannot be bundled for the browser,
// so it cannot end up in client code by accident.
import sharp from "sharp";
import { assertSafeSvg } from "./svg-safety";

/**
 * Turns a designer's SVG export into artwork the site can actually use.
 *
 * Two things are wrong with a raw export:
 *
 *   1. The shapes sit inside the original artboard, so most of the viewBox is
 *      empty. Daar's door mark filled only 22% of its canvas — at navbar size
 *      it would render tiny with huge margins.
 *
 *   2. The brand colour is baked in, usually through a <style> block and
 *      .cls-N classes. That fixes the colour (tan on a white login screen) and,
 *      because the same ids and class names would appear twice when the file is
 *      inlined in both the navbar and the footer, produces invalid markup.
 *
 * So: measure the true ink bounds, rewrite the viewBox to fit, strip the style
 * machinery, and set fill="currentColor" on the root so CSS `color` drives it.
 */

function parseViewBox(svg: string): [number, number, number, number] | null {
  const m = svg.match(/viewBox="([\d.\-\s]+)"/);
  if (!m) return null;
  const parts = m[1]!.trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
  return parts as [number, number, number, number];
}

/** Rasterise and trim to find where the ink actually is, in user units. */
async function inkBounds(svg: Buffer, vb: [number, number, number, number]) {
  const [, , vbW, vbH] = vb;
  const SCALE = 4;
  const png = await sharp(svg, { density: 72 * SCALE })
    .resize({ width: Math.round(vbW * SCALE), height: Math.round(vbH * SCALE), fit: "fill" })
    .png()
    .toBuffer();

  const { info } = await sharp(png).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const offLeft = (info as unknown as { trimOffsetLeft?: number }).trimOffsetLeft ?? 0;
  const offTop = (info as unknown as { trimOffsetTop?: number }).trimOffsetTop ?? 0;

  return {
    x: Math.abs(offLeft) / SCALE,
    y: Math.abs(offTop) / SCALE,
    w: info.width / SCALE,
    h: info.height / SCALE,
  };
}

export async function normalizeLogoSvg(input: Buffer): Promise<string> {
  let svg = input.toString("utf8");
  assertSafeSvg(svg);

  // --- tighten the canvas ---
  const vb = parseViewBox(svg);
  if (vb) {
    try {
      const b = await inkBounds(input, vb);
      // Guard against a degenerate trim (fully transparent or already tight).
      if (b.w > 0 && b.h > 0 && b.w * b.h < vb[2] * vb[3] * 0.98) {
        const pad = Math.max(b.w, b.h) * 0.02;
        const next = [
          (vb[0] + b.x - pad).toFixed(2),
          (vb[1] + b.y - pad).toFixed(2),
          (b.w + pad * 2).toFixed(2),
          (b.h + pad * 2).toFixed(2),
        ].join(" ");
        svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${next}"`);
      }
    } catch {
      // Measuring failed — keep the original canvas rather than lose the logo.
    }
  }

  /* --- preserve non-painted shapes BEFORE the style block is removed ---
   *
   * Exports often carry an invisible artboard rect styled `fill: none`. If the
   * <style> block is stripped and the root is set to currentColor, that rect
   * inherits the fill and becomes a solid block covering the whole logo.
   *
   * So read the class → fill map first and pin `fill="none"` onto the elements
   * that rely on it. Coloured classes need no attribute; they inherit the root.
   */
  const noFillClasses = new Set<string>();
  for (const styleBlock of svg.match(/<style[\s\S]*?<\/style>/gi) ?? []) {
    for (const rule of styleBlock.matchAll(/\.([\w-]+)\s*\{[^}]*?fill:\s*none[^}]*?\}/gi)) {
      noFillClasses.add(rule[1]!);
    }
  }
  if (noFillClasses.size > 0) {
    svg = svg.replace(/<(\w+)\b([^>]*)>/g, (tag, name: string, attrs: string) => {
      const cls = attrs.match(/class="([^"]*)"/)?.[1];
      if (!cls) return tag;
      if (!cls.split(/\s+/).some((c) => noFillClasses.has(c))) return tag;
      if (/\bfill\s*=/i.test(attrs)) return tag;

      // Keep self-closing tags self-closing — appending after the slash
      // produces `<rect …/ fill="none">`, which is broken markup.
      const trimmed = attrs.trimEnd();
      const selfClosing = trimmed.endsWith("/");
      const body = selfClosing ? trimmed.slice(0, -1).trimEnd() : attrs;
      return `<${name}${body} fill="none"${selfClosing ? "/" : ""}>`;
    });
  }

  // --- make it tintable and safe to inline more than once ---
  svg = svg.replace(/<\?xml[^>]*\?>\s*/, "");
  svg = svg.replace(/<defs>[\s\S]*?<\/defs>\s*/gi, (block) =>
    // Only remove a defs block that exists purely to hold colour styles.
    /<style/i.test(block) &&
    !/<(linearGradient|radialGradient|mask|clipPath|filter|pattern)/i.test(block)
      ? ""
      : block,
  );
  svg = svg.replace(/\s*class="[^"]*"/gi, "");
  svg = svg.replace(/\s*(?:id|data-name)="[^"]*"/gi, "");
  svg = svg.replace(/\s*fill="#[0-9a-f]{3,8}"/gi, ""); // keeps fill="none"

  // Drop width/height from the ROOT only, so CSS controls the size.
  // Applying this globally would strip the dimensions off every <rect> —
  // which silently erases parts of the lettering.
  svg = svg.replace(
    /<svg\b([^>]*)>/,
    (_tag, attrs: string) => `<svg${attrs.replace(/\s*(?:width|height)="[^"]*"/gi, "")}>`,
  );

  if (!/<svg[^>]*\bfill=/i.test(svg)) {
    svg = svg.replace(/<svg\b/, '<svg fill="currentColor"');
  }

  return svg;
}
