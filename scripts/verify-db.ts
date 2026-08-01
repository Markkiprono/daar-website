/** Sanity check: reads the seeded data back out through the real client. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { formatPrice } from "../src/lib/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      items: {
        orderBy: { displayOrder: "asc" },
        include: { tags: { include: { tag: true } } },
      },
    },
  });

  for (const c of categories) {
    console.log(`\n${c.name}  (${c.items.length})`);
    for (const i of c.items) {
      const badges = i.tags.map((t) => t.tag.name).join(", ");
      const state = i.isAvailable ? "" : "  [SOLD OUT]";
      const star = i.isFeatured ? "  ★ featured" : "";
      console.log(`  ${i.name.padEnd(30)} ${formatPrice(i.priceCents).padStart(10)}  ${badges}${state}${star}`);
    }
  }

  const featured = await prisma.menuItem.findFirst({ where: { isFeatured: true } });
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  console.log(`\nChef's Special: ${featured?.name ?? "(none)"}`);
  console.log(`Currency: ${settings?.currency}   Address: ${settings?.addressLine}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
