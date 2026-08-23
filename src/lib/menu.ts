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
          include: {
            tags: { include: { tag: true } },
            // Only so a card can say "from" and so search can match a
            // flavour name. The card never renders the choices themselves.
            optionGroups: {
              orderBy: { displayOrder: "asc" },
              include: { group: { include: { options: { orderBy: { displayOrder: "asc" } } } } },
            },
            // Exactly which of the attached groups' choices this item
            // offers — no fries on a croissant, though Extras carries them.
            offeredOptions: { select: { optionId: true } },
          },
        },
      },
    })
    .catch(survive("getMenu", [] as never[]));
});

/**
 * A handful of real plates for the home-page gallery.
 *
 * Only items that actually have a photograph — a strip of grey placeholders
 * is worse than a shorter strip. Availability is ignored on purpose: this is
 * a look at what the kitchen makes, not a list of what is left today.
 */
export const getGallery = cache(async () => {
  return db.menuItem
    .findMany({
      where: { imageUrl: { not: null }, category: { isVisible: true } },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 10,
      select: { id: true, name: true, imageUrl: true, imageAlt: true, blurDataUrl: true },
    })
    .catch(survive("getGallery", [] as never[]));
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

export const getStoryPhotos = cache(async () => {

  return db.storyPhoto
    .findMany({ orderBy: { displayOrder: "asc" } })
    .catch(survive("getStoryPhotos", [] as never[]));
});

/**
 * Category tiles need a photograph, in order of preference:
 *
 *   1. the category's own photo, set in admin — the one the owner controls
 *      deliberately, for tiles that need to sell rather than just illustrate;
 *   2. the first item in the category that has one, so a tile still looks
 *      right the moment items get photos and without any extra work;
 *   3. stock brand photography.
 *
 * Only (2) and (3) existed before, so tiles are unchanged until a category
 * photo is actually uploaded.
 */
export function categoryImage(
  category: {
    imageUrl?: string | null;
    blurDataUrl?: string | null;
    items: { imageUrl: string | null; blurDataUrl: string | null }[];
  },
  fallback: string,
) {
  if (category.imageUrl) {
    return { src: category.imageUrl, blur: category.blurDataUrl ?? null };
  }
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
