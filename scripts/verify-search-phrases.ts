/**
 * Checks that natural phrasing works — the way someone actually types when
 * they don't know how the menu is organised.
 *
 *   npx tsx scripts/verify-search-phrases.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { expandQuery, matches, normalise } from "../src/lib/search-terms";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const cats = await prisma.category.findMany({
    where: { isVisible: true },
    include: { items: { include: { tags: { include: { tag: true } } } } },
  });

  const index = cats.flatMap((c) =>
    c.items.map((i) => ({
      name: i.name,
      hay: normalise(
        [i.name, i.description ?? "", c.name, c.description ?? "", ...i.tags.map((t) => t.tag.name)].join(" "),
      ),
    })),
  );

  const phrases = [
    "I want something sweet",
    "looking for a hot drink",
    "do you have anything vegan",
    "something for lunch",
    "a nice cake for a birthday",
    "something quick",
    "any gluten free options",
    "what is popular",
  ];

  let empty = 0;
  for (const q of phrases) {
    const hits = index.filter((i) => matches(i.hay, expandQuery(q)));
    if (hits.length === 0) empty++;
    console.log(
      `  ${hits.length ? "HIT " : "MISS"} "${q}"`.padEnd(42) +
        `${String(hits.length).padStart(2)}  ${hits.slice(0, 3).map((h) => h.name).join(", ")}`,
    );
  }

  console.log(`\n  ${phrases.length - empty}/${phrases.length} natural phrases returned results.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
