/**
 * Verifies menu search against the real database — the point being that a
 * casual visitor who doesn't know how the menu is categorised still finds
 * what they want.
 *
 *   npx tsx scripts/verify-search.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { expandQuery, matches, normalise } from "../src/lib/search-terms";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const categories = await prisma.category.findMany({
    where: { isVisible: true },
    include: { items: { include: { tags: { include: { tag: true } } } } },
  });

  // Mirrors the haystack the browser builds.
  const index = categories.flatMap((c) =>
    c.items.map((i) => ({
      name: i.name,
      category: c.name,
      haystack: normalise(
        [
          i.name,
          i.description ?? "",
          c.name,
          c.description ?? "",
          ...i.tags.map((t) => t.tag.name),
          i.isAvailable ? "available" : "sold out",
        ].join(" "),
      ),
    })),
  );

  console.log(`Indexed ${index.length} items across ${categories.length} categories.\n`);

  const queries = [
    "lunch",
    "breakfast",
    "hot drink",
    "cold drink",
    "something sweet",
    "dessert",
    "cake",
    "pastries",
    "pastry",
    "coffee",
    "vegetarian",
    "veggie",
    "no meat",
    "vegan",
    "gluten free",
    "bestsellers",
    "snack",
    "birthday",
    "chocolate",
    "milk",
    "vegetarian lunch",
    "iced coffee",
  ];

  let empty = 0;
  for (const q of queries) {
    const groups = expandQuery(q);
    const hits = index.filter((i) => matches(i.haystack, groups));
    if (hits.length === 0) empty++;
    const names = hits.slice(0, 4).map((h) => h.name).join(", ");
    console.log(
      `  ${hits.length > 0 ? "HIT " : "MISS"} ${q.padEnd(20)} ${String(hits.length).padStart(2)} ` +
        `${names}${hits.length > 4 ? " …" : ""}`,
    );
  }

  console.log(`\n  ${queries.length - empty}/${queries.length} queries returned results.`);
  if (empty > 0) {
    console.log("  (Misses are expected where the menu genuinely has nothing of that kind.)");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
