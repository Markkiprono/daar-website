/**
 * Creates or resets the single admin account.
 *
 *   npx tsx scripts/create-admin.ts <email> <password>
 *
 * Kept out of prisma/seed.ts on purpose: seeding runs in CI and on every
 * fresh checkout, and a hard-coded admin password committed to the repo
 * would be a live credential. This is an explicit, manual step.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { randomBytes, scrypt as _scrypt } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (p: string, s: Buffer, l: number) => Promise<Buffer>;

async function hash(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/create-admin.ts <email> <password>");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Refusing: choose a password of at least 10 characters.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const normalised = email.toLowerCase().trim();
  const passwordHash = await hash(password);

  const admin = await prisma.adminUser.upsert({
    where: { email: normalised },
    update: { passwordHash },
    create: { email: normalised, passwordHash, name: "Daar Admin" },
  });

  const total = await prisma.adminUser.count();
  console.log(`Admin ready: ${admin.email}`);
  if (total > 1) {
    console.warn(`WARNING: ${total} admin accounts exist. This site is designed for one.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
