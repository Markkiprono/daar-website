import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/lib/config";

/**
 * Every indexable page, so Google discovers new menu items without having to
 * find a link to them.
 *
 * Built at request time, not at build time, and that is the whole point. A
 * sitemap is a cached Route Handler by default, so this used to be rendered
 * during `docker build` — where there is deliberately no database. The query
 * threw, the catch below turned that into an empty list, and an image was
 * shipped whose sitemap advertised six static pages and not one menu item.
 * Every deploy silently re-broke it.
 *
 * Declared dynamic rather than inferred: a request-time API only marks a
 * route dynamic if the build actually executes it, which is not something to
 * rely on. Crawlers fetch this a handful of times a day and it is one indexed
 * SELECT over a hundred-odd rows, so there is nothing to save by caching it.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let items: { slug: string; updatedAt: Date }[] = [];
  try {
    items = await db.menuItem.findMany({
      where: { category: { isVisible: true } },
      select: { slug: true, updatedAt: true },
    });
  } catch {
    // A database hiccup should degrade to a static-pages sitemap, not a 500.
  }

  const pages: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/menu`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/story`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/visit`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/reserve`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...pages,
    ...items.map((i) => ({
      url: `${SITE.url}/menu/${i.slug}`,
      lastModified: i.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
