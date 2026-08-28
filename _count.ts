import { db } from "./src/lib/db";

async function main() {
  try {
    console.log("categories:", await db.category.count());
    console.log("menuItems :", await db.menuItem.count());
    console.log("tags      :", await db.tag.count());
    console.log("adminUsers:", await db.adminUser.count());
  } catch (e) {
    console.log("ERROR:", (e as Error).message.split("\n").slice(0, 6).join("\n"));
  }
  await db.$disconnect();
}
main();
