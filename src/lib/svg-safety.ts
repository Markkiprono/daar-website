/**
 * SVG screening for uploaded artwork.
 *
 * An SVG is a document, not just an image — it can carry scripts, event
 * handlers and external references. Uploads are served from our own origin,
 * so a hostile file could execute in the site's context if a visitor opened
 * it directly.
 *
 * Rather than attempt a full sanitiser (hard to get right), we refuse
 * anything containing the dangerous constructs. A legitimate logo export
 * from Illustrator, Figma or Inkscape contains none of them.
 *
 * Kept free of `server-only` so it can be unit-tested directly.
 */

const BLOCKLIST: { pattern: RegExp; reason: string }[] = [
  { pattern: /<\s*script/i, reason: "a <script> tag" },
  { pattern: /\son\w+\s*=/i, reason: "an inline event handler (onclick, onload…)" },
  { pattern: /javascript:/i, reason: "a javascript: URL" },
  { pattern: /<\s*foreignObject/i, reason: "a <foreignObject> element" },
  { pattern: /<\s*iframe/i, reason: "an <iframe>" },
  { pattern: /<!ENTITY/i, reason: "an XML entity declaration" },
];

/** Throws with a message suitable for showing the owner. */
export function assertSafeSvg(text: string): void {
  if (!/<svg[\s>]/i.test(text)) {
    throw new Error("That file doesn't look like a valid SVG.");
  }
  for (const { pattern, reason } of BLOCKLIST) {
    if (pattern.test(text)) {
      throw new Error(
        `That SVG contains ${reason}, so it can't be used. Re-export it as a plain vector, or upload a PNG instead.`,
      );
    }
  }
}

export function isSafeSvg(text: string): boolean {
  try {
    assertSafeSvg(text);
    return true;
  } catch {
    return false;
  }
}
