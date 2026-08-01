/**
 * DAAR — database seed.
 *
 * Idempotent: every write is an upsert keyed on `slug`, so this can be
 * re-run safely against an existing database without duplicating rows.
 *
 * NOTE: item names, prices and copy below are PLACEHOLDERS carried over
 * from the Phase 0 prototype. Replace with Daar's real menu when it lands.
 * The admin user is deliberately NOT seeded here — it's created in Phase 2
 * alongside the password-hashing decision.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, TagKind } from "../src/generated/prisma/client";

// Prisma 7 requires an explicit driver adapter.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** KES are quoted in whole shillings; we store minor units. */
const shillings = (amount: number) => amount * 100;

const categories = [
  { slug: "breakfast", name: "Breakfast", description: "Served from opening until 11:30.", displayOrder: 1 },
  { slug: "pastries", name: "Pastries", description: "Folded by hand. Batches through the morning.", displayOrder: 2 },
  { slug: "coffee", name: "Coffee", description: "Kenyan single origin, roasted for us each fortnight.", displayOrder: 3 },
  { slug: "lunch", name: "Lunch", description: "From midday.", displayOrder: 4 },
  { slug: "cakes", name: "Cakes", description: "Whole cakes to order — 48 hours' notice.", displayOrder: 5 },
];

const tags = [
  { slug: "bestseller", name: "Bestseller", kind: TagKind.BADGE },
  { slug: "new", name: "New", kind: TagKind.BADGE },
  { slug: "seasonal", name: "Seasonal", kind: TagKind.BADGE },
  { slug: "limited", name: "Limited", kind: TagKind.BADGE },
  { slug: "to-order", name: "To order", kind: TagKind.BADGE },
  { slug: "vegetarian", name: "Vegetarian", kind: TagKind.DIETARY },
  { slug: "vegan", name: "Vegan", kind: TagKind.DIETARY },
  { slug: "gluten-free", name: "Gluten-free", kind: TagKind.DIETARY },
];

type SeedItem = {
  slug: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  isAvailable?: boolean;
  isFeatured?: boolean;
  order: number;
};

const items: SeedItem[] = [
  // --- Breakfast ---
  { slug: "shakshuka", name: "Shakshuka", description: "Slow tomato, baked eggs, sourdough soldiers.", price: 950, category: "breakfast", tags: ["vegetarian"], order: 1 },
  { slug: "cardamom-bun", name: "Cardamom Bun", description: "Laminated overnight, hand-knotted, baked at six.", price: 350, category: "breakfast", tags: ["bestseller"], order: 2 },
  { slug: "chocolate-babka", name: "Chocolate Babka", description: "Dark chocolate, twisted twice, glazed warm.", price: 550, category: "breakfast", tags: ["new"], order: 3 },

  // --- Pastries ---
  { slug: "raspberry-pistachio-tart", name: "Raspberry & Pistachio Tart", description: "Almond frangipane, fresh raspberries, Sicilian pistachio.", price: 650, category: "pastries", tags: ["bestseller", "vegetarian"], order: 1 },
  { slug: "almond-croissant", name: "Almond Croissant", description: "Yesterday's croissant, today's frangipane. As intended.", price: 420, category: "pastries", tags: ["vegetarian"], order: 2 },
  { slug: "pain-au-chocolat", name: "Pain au Chocolat", description: "Two batons of dark chocolate, 27 layers.", price: 380, category: "pastries", tags: ["limited"], isAvailable: false, order: 3 },

  // --- Coffee ---
  { slug: "iced-latte", name: "Iced Latte", description: "Double shot, cold milk, poured over ice.", price: 400, category: "coffee", tags: ["new"], order: 1 },
  { slug: "citrus-cooler", name: "Citrus Cooler", description: "Orange, lemon, mint, soda. Built over ice.", price: 450, category: "coffee", tags: ["vegan"], order: 2 },
  { slug: "flat-white", name: "Flat White", description: "Ristretto double, steamed to 60°.", price: 380, category: "coffee", tags: ["bestseller"], order: 3 },

  // --- Lunch ---
  { slug: "sourdough-open-sandwich", name: "Sourdough Open Sandwich", description: "House sourdough, whipped feta, roast tomato, dukkah.", price: 890, category: "lunch", tags: ["vegetarian"], order: 1 },
  { slug: "soup-of-the-day", name: "Soup of the Day", description: "Ask the counter. Always with bread.", price: 650, category: "lunch", tags: ["seasonal"], order: 2 },

  // --- Cakes ---
  { slug: "pistachio-basque", name: "Pistachio Basque", description: "Burnt top, soft centre. Twelve a day.", price: 700, category: "cakes", tags: ["bestseller", "limited"], isFeatured: true, order: 1 },
  { slug: "seasonal-fruit-tart", name: "Seasonal Fruit Tart", description: "Whatever the market had that morning.", price: 620, category: "cakes", tags: ["seasonal", "vegetarian"], order: 2 },
  { slug: "celebration-cake", name: "Celebration Cake", description: "Your flavours, our hands. Order at the counter.", price: 4500, category: "cakes", tags: ["to-order"], order: 3 },
];

const hours = [
  { dayOfWeek: 0, openTime: "08:00", closeTime: "22:00" }, // Sunday
  { dayOfWeek: 1, openTime: "07:00", closeTime: "21:00" },
  { dayOfWeek: 2, openTime: "07:00", closeTime: "21:00" },
  { dayOfWeek: 3, openTime: "07:00", closeTime: "21:00" },
  { dayOfWeek: 4, openTime: "07:00", closeTime: "21:00" },
  { dayOfWeek: 5, openTime: "07:00", closeTime: "22:00" }, // Friday
  { dayOfWeek: 6, openTime: "08:00", closeTime: "22:00" }, // Saturday
];

async function main() {
  // --- categories ---
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, displayOrder: c.displayOrder },
      create: c,
    });
  }

  // --- tags ---
  for (const t of tags) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      update: { name: t.name, kind: t.kind },
      create: t,
    });
  }

  // --- menu items (+ tag links) ---
  for (const item of items) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: item.category } });

    const record = await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        priceCents: shillings(item.price),
        categoryId: category.id,
        isAvailable: item.isAvailable ?? true,
        isFeatured: item.isFeatured ?? false,
        displayOrder: item.order,
      },
      create: {
        slug: item.slug,
        name: item.name,
        description: item.description,
        priceCents: shillings(item.price),
        categoryId: category.id,
        isAvailable: item.isAvailable ?? true,
        isFeatured: item.isFeatured ?? false,
        displayOrder: item.order,
      },
    });

    // Replace the tag set so re-seeding can't accumulate stale links.
    await prisma.menuItemTag.deleteMany({ where: { menuItemId: record.id } });
    for (const slug of item.tags) {
      const tag = await prisma.tag.findUniqueOrThrow({ where: { slug } });
      await prisma.menuItemTag.create({ data: { menuItemId: record.id, tagId: tag.id } });
    }
  }

  // --- site settings (single row) ---
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      storyBody:
        "Daar means home. We built one room around one idea — that the things worth eating can't be hurried.",
      addressLine: "Nairobi, Kenya",
      email: "hello@daarbyizzi.com",
      currency: "KES",
      socials: { instagram: "", tiktok: "" },
    },
  });

  // --- opening hours ---
  for (const h of hours) {
    await prisma.openingHours.upsert({
      where: { dayOfWeek: h.dayOfWeek },
      update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: false },
      create: { ...h, isClosed: false },
    });
  }

  const counts = {
    categories: await prisma.category.count(),
    tags: await prisma.tag.count(),
    menuItems: await prisma.menuItem.count(),
    openingHours: await prisma.openingHours.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
