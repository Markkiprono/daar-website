import { cache } from "react";
import { db } from "./db";

/**
 * Analytics reads for the dashboard.
 *
 * Raw MenuItemView rows are kept for 30 days and queried directly — at café
 * scale that is a few thousand rows, far cheaper than maintaining a live
 * rollup. Anything older lives in DailyItemStat, written by
 * scripts/rollup-analytics.ts, so long-term history survives pruning.
 */

export type ItemStat = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  isAvailable: boolean;
  views: number;
};

/** UTC midnight, `daysAgo` days back. */
function dayStart(daysAgo = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

export const getItemViews = cache(async (days: number): Promise<ItemStat[]> => {
  const since = dayStart(days - 1);

  const grouped = await db.menuItemView.groupBy({
    by: ["menuItemId"],
    where: { viewedAt: { gte: since } },
    _count: { _all: true },
  });

  const counts = new Map(grouped.map((g) => [g.menuItemId, g._count._all]));

  // Every visible item appears, including zero-view ones — knowing what
  // nobody looks at is as useful as knowing the bestseller.
  const items = await db.menuItem.findMany({
    where: { category: { isVisible: true } },
    include: { category: { select: { name: true } } },
  });

  return items
    .map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      categoryName: i.category.name,
      isAvailable: i.isAvailable,
      views: counts.get(i.id) ?? 0,
    }))
    .sort((a, b) => b.views - a.views || a.name.localeCompare(b.name));
});

export type DayPoint = { date: string; label: string; views: number };

/** Daily totals across the window, zero-filled so the chart has no gaps. */
export const getDailyTotals = cache(async (days: number): Promise<DayPoint[]> => {
  const since = dayStart(days - 1);
  const rows = await db.menuItemView.findMany({
    where: { viewedAt: { gte: since } },
    select: { viewedAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(dayStart(i).toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = r.viewedAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
  }

  return [...buckets.entries()].map(([date, views]) => ({
    date,
    label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
    views,
  }));
});

export const getViewTotals = cache(async () => {
  const [today, week, month, allTime, archived] = await Promise.all([
    db.menuItemView.count({ where: { viewedAt: { gte: dayStart(0) } } }),
    db.menuItemView.count({ where: { viewedAt: { gte: dayStart(6) } } }),
    db.menuItemView.count({ where: { viewedAt: { gte: dayStart(29) } } }),
    db.menuItemView.count(),
    db.dailyItemStat.aggregate({ _sum: { views: true } }),
  ]);

  return {
    today,
    week,
    month,
    // Raw rows are pruned at 30 days, so lifetime = what's left + the archive.
    lifetime: allTime + (archived._sum.views ?? 0),
  };
});
