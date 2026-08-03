import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

/**
 * Invite crawlers in and point them at the sitemap. The admin tree is
 * disallowed as a courtesy; the real guarantees are the proxy 404ing /admin
 * on this host and the X-Robots-Tag noindex on the admin host itself.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
