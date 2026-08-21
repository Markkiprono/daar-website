import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

/**
 * There has been a service worker since the offline menu shipped, but no
 * manifest to go with it — so "Add to home screen" had no name and no icon to
 * use and fell back to a screenshot of the page. These are the same door-mark
 * PNGs the favicon is cut from.
 *
 * Kept static (no database read) so it stays cacheable: the dashboard favicon
 * is a browser-tab concern, and a home-screen icon that changed under an
 * installed app would be worse than one that doesn't.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.descriptor} in ${SITE.area}`,
    short_name: SITE.shortName,
    description: "Slow-proved bread and pastry, baked the same morning it's served.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#481819",
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Declared separately: a maskable icon gets cropped to the launcher's
      // shape, and the door would lose its edges if the same file were used
      // for both. The mark already sits inside a safe margin.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
