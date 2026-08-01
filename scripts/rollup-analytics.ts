/**
 * Rolls raw view events into daily totals, then prunes them.
 *
 * Raw MenuItemView rows are what the dashboard queries for the last 30 days.
 * Older than that they are pure weight, so they get aggregated into
 * DailyItemStat — which keeps the long-term history in a handful of rows per
 * item per day instead of one row per view.
 *
 *   npx tsx scripts/rollup-analytics.ts
 *
 * Run nightly. On the VPS, a cron entry such as:
 *   15 3 * * *  cd /srv/daar && npx tsx scripts/rollup-analytics.ts >> logs/rollup.log 2>&1
 *
 * Safe to run repeatedly: the upsert is keyed on (menuItemId, date).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const RETAIN_DAYS = 30;

function dayStart(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const cutoff = dayStart(RETAIN_DAYS);
  console.log(`Rolling up views older than ${cutoff.toISOString().slice(0, 10)}…`);

  const stale = await prisma.menuItemView.findMany({
    where: { viewedAt: { lt: cutoff } },
    select: { menuItemId: true, viewedAt: true },
  });

  if (stale.length === 0) {
    console.log("  nothing to roll up.");
    await prisma.$disconnect();
    return;
  }

  // Group in memory: (item, day) -> count.
  const buckets = new Map<string, { menuItemId: string; date: Date; views: number }>();
  for (const row of stale) {
    const day = new Date(row.viewedAt);
    day.setUTCHours(0, 0, 0, 0);
    const key = `${row.menuItemId}|${day.toISOString().slice(0, 10)}`;
    const existing = buckets.get(key);
    if (existing) existing.views += 1;
    else buckets.set(key, { menuItemId: row.menuItemId, date: day, views: 1 });
  }

  let written = 0;
  for (const b of buckets.values()) {
    await prisma.dailyItemStat.upsert({
      where: { menuItemId_date: { menuItemId: b.menuItemId, date: b.date } },
      // Increment rather than overwrite, so a partial previous run is not lost.
      update: { views: { increment: b.views } },
      create: { menuItemId: b.menuItemId, date: b.date, views: b.views },
    });
    written++;
  }

  const { count: pruned } = await prisma.menuItemView.deleteMany({
    where: { viewedAt: { lt: cutoff } },
  });

  console.log(`  aggregated ${stale.length} events into ${written} daily rows`);
  console.log(`  pruned ${pruned} raw events`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
