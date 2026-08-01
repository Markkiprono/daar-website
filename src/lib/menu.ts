import { cache } from "react";
import { db } from "./db";

/**
 * Public read queries.
 *
 * Every one is wrapped so a database failure degrades instead of crashing.
 * Two reasons:
 *
 *   1. The Docker image is built without a database — `next build` prerenders
 *      these pages and would otherwise fail with P1001. Returning empty lets
 *      the build finish; the pages fill in on first request via ISR.
 *   2. In production, a Postgres restart should show an empty menu for a few
 *      seconds, not a 500 page for every visitor.
 *
 * Wrapped in React `cache` so a page needing the same data twice hits
 * Postgres once per render pass.
 */

/** Logs once and returns the fallback, so failures are visible but harmless. */
function survive<T>(label: string, fallback: T) {
  return (e: unknown): T => {
    console.error(`[menu] ${label} failed:`, e instanceof Error ? e.message : e);
    return fallback;
  };
}

export const getMenu = cache(async () => {
  return db.category
    .findMany({
      where: { isVisible: true },
      orderBy: { displayOrder: "asc" },
      include: {
        items: {
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          include: { tags: { include: { tag: true } } },
        },
      },
    })
    .catch(survive("getMenu", [] as never[]));
});

export const getFeatured = cache(async () => {
  return db.menuItem
    .findFirst({
      where: { isFeatured: true, category: { isVisible: true } },
      // Defensive ordering: if the data ever ends up with two flagged rows,
      // show the most recently touched one rather than an arbitrary pick.
      orderBy: { updatedAt: "desc" },
      include: { category: true, tags: { include: { tag: true } } },
    })
    .catch(survive("getFeatured", null));
});

export const getSettings = cache(async () => {
  return db.siteSettings
    .findUnique({ where: { id: "singleton" } })
    .catch(survive("getSettings", null));
});

export const getHours = cache(async () => {
  return db.openingHours
    .findMany({ orderBy: { dayOfWeek: "asc" } })
    .catch(survive("getHours", [] as never[]));
});

/**
 * Category tiles need a photograph. Rather than adding another upload the
 * owner has to manage, we borrow the first item in the category that has
 * one — so tiles improve automatically as photos get added.
 */
export function categoryImage(
  category: { items: { imageUrl: string | null; blurDataUrl: string | null }[] },
  fallback: string,
) {
  const withPhoto = category.items.find((i) => i.imageUrl);
  return {
    src: withPhoto?.imageUrl ?? fallback,
    blur: withPhoto?.blurDataUrl ?? null,
  };
}

/** Stand-in photography until every category has its own item shots. */
export const FALLBACK_IMAGES = [
  "/brand/item-tart.jpg",
  "/brand/item-latte.jpg",
  "/brand/item-05.jpg",
  "/brand/item-06.jpg",
  "/brand/item-03.jpg",
] as const;
