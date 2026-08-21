import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

/**
 * Invite crawlers in and point them at the sitemap. The admin tree is
 * disallowed as a courtesy; the real guarantees are the proxy 404ing /admin
 * on this host and the X-Robots-Tag noindex on the admin host itself.
 *
 * /api/uploads/ is carved back out of the /api/ block, and that carve-out is
 * load-bearing. Every photo the owner uploads is served from there — menu
 * items, the hero used as the Open Graph image, the dashboard favicon and
 * logo. Blanket-disallowing /api/ told Google it could not fetch any of them,
 * so shared links had no preview image, the food never reached Google Images
 * and an uploaded favicon could not be read. A more specific Allow wins over
 * a broader Disallow, so the rest of the API stays shut.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/uploads/"],
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
