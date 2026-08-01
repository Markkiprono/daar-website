import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { db } from "./db";
import { isSafeSvg } from "./svg-safety";

/**
 * Resolves the Daar logo, in order of preference:
 *
 *   1. Artwork uploaded through Admin → Settings (stored in SiteSettings)
 *   2. A file dropped into public/brand/logo/ (see the README there)
 *   3. null — callers fall back to the hand-traced door mark
 *
 * Cached per render pass: this runs in the header and footer of every page.
 */
const LOGO_DIR = path.join(process.cwd(), "public", "brand", "logo");

export type ResolvedLogo =
  /** Inline markup — the only form that can be tinted with CSS `color`. */
  | { kind: "svg"; markup: string }
  /** A URL for <img>. Renders at its own colours; cannot be tinted. */
  | { kind: "img"; src: string }
  | null;

function droppedFile(base: string): string | null {
  for (const ext of ["svg", "png", "webp"]) {
    const file = path.join(LOGO_DIR, `${base}.${ext}`);
    try {
      if (fs.existsSync(file)) return file;
    } catch {
      /* unreadable directory — fall through */
    }
  }
  return null;
}

export type LogoSlot = "mark" | "wordmark" | "full" | "lockup";

export const getLogo = cache(async (base: LogoSlot = "mark"): Promise<ResolvedLogo> => {
  // 1. Uploaded through the dashboard.
  //    Only "mark" and "wordmark" have upload slots. "full" and "lockup" are
  //    file-only and must NOT fall through to logoMarkUrl, or every slot
  //    would render the door mark.
  const hasUploadSlot = base === "mark" || base === "wordmark";
  try {
    const settings = !hasUploadSlot
      ? null
      : await db.siteSettings.findUnique({
          where: { id: "singleton" },
          select: { logoMarkUrl: true, logoWordmarkUrl: true },
        });
    const uploaded = base === "wordmark" ? settings?.logoWordmarkUrl : settings?.logoMarkUrl;

    if (uploaded) {
      // Inline uploaded SVGs too — served through <img> they are isolated
      // documents and currentColor would resolve to black.
      if (uploaded.endsWith(".svg") && uploaded.startsWith("/api/uploads/")) {
        try {
          const { UPLOADS_ROOT } = await import("./storage/local");
          const key = uploaded.replace("/api/uploads/", "");
          const full = path.resolve(UPLOADS_ROOT, key);
          if (full.startsWith(path.resolve(UPLOADS_ROOT) + path.sep) && fs.existsSync(full)) {
            const markup = fs.readFileSync(full, "utf8");
            if (isSafeSvg(markup)) return { kind: "svg", markup };
          }
        } catch {
          // Not on local disk (S3, say) — fall back to referencing the URL.
        }
      }
      return { kind: "img", src: uploaded };
    }
  } catch {
    // A database hiccup must never take down the navbar.
  }

  // 2. Dropped into public/brand/logo/.
  const file = droppedFile(base);
  if (!file) return null;

  /**
   * SVGs are inlined rather than referenced with <img>.
   *
   * This matters: an SVG loaded through <img> is an isolated document, so the
   * page's `color` never reaches it and `fill="currentColor"` resolves to
   * black. Inlining is what makes the mark tan on dark sections and oxblood
   * on light ones.
   */
  if (file.endsWith(".svg")) {
    try {
      const markup = fs.readFileSync(file, "utf8");
      if (isSafeSvg(markup)) return { kind: "svg", markup };
    } catch {
      /* fall through to the traced mark */
    }
    return null;
  }

  return { kind: "img", src: `/brand/logo/${path.basename(file)}` };
});
