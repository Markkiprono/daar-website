import { cache } from "react";
import { db } from "./db";

/**
 * Public reads for the For Business page (/business). Like src/lib/menu.ts, a database
 * failure degrades to "nothing" rather than a 500.
 */

export const getCateringPage = cache(async () => {
  return db.cateringPage.findUnique({ where: { id: "singleton" } }).catch((e: unknown) => {
    console.error("[catering] page failed:", e instanceof Error ? e.message : e);
    return null;
  });
});

export const getCateringItems = cache(async () => {
  return db.cateringItem
    .findMany({ where: { isVisible: true }, orderBy: { displayOrder: "asc" } })
    .catch((e: unknown) => {
      console.error("[catering] items failed:", e instanceof Error ? e.message : e);
      return [];
    });
});

/**
 * The page's name in the menu bar and footer, or null while it is switched
 * off — then nothing links to it.
 */
export const businessNavLabel = cache(async (): Promise<string | null> => {
  const page = await getCateringPage();
  if (!page?.enabled) return null;
  return page.navLabel || "For Business";
});
