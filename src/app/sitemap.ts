import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/lib/config";

/**
 * Every indexable page, so Google discovers new menu items without having to
 * find a link to them. Regenerated at most once an hour — menu edits are not
 * so urgent that crawlers need them sooner.
 */
export const revalidate = 3600;

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
