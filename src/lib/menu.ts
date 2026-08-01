import { cache } from "react";
import { db } from "./db";

/**
 * Public read queries. Wrapped in React `cache` so a page that needs the
 * same data in two places (e.g. nav counts and the grid) hits Postgres once
 * per render pass.
 *
 * Only visible categories and only items in them are returned — the admin
 * can hide a whole section without deleting anything.
 */

export const getMenu = cache(async () => {
  return db.category.findMany({
    where: { isVisible: true },
    orderBy: { displayOrder: "asc" },
    include: {
      items: {
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { tags: { include: { tag: true } } },
      },
    },
  });
});

export const getFeatured = cache(async () => {
  return db.menuItem.findFirst({
    where: { isFeatured: true, category: { isVisible: true } },
    // Defensive ordering: if the data ever ends up with two flagged rows,
    // show the most recently touched one rather than an arbitrary pick.
    orderBy: { updatedAt: "desc" },
    include: { category: true, tags: { include: { tag: true } } },
  });
});

export const getSettings = cache(async () => {
  return db.siteSettings.findUnique({ where: { id: "singleton" } });
});

export const getHours = cache(async () => {
  return db.openingHours.findMany({ orderBy: { dayOfWeek: "asc" } });
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
