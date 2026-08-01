/**
 * Verifies the password hashing round-trip the login action depends on.
 *
 *   npx tsx scripts/verify-auth.ts <password-to-test>
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (p: string, s: Buffer, l: number) => Promise<Buffer>;

async function verify(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== 64) return false;
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  return timingSafeEqual(actual, expected);
}

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("Usage: npx tsx scripts/verify-auth.ts <password>");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const admin = await prisma.adminUser.findFirst();
  if (!admin) {
    console.error("No admin row — run scripts/create-admin.ts first.");
    process.exit(1);
  }

  console.log(`admin: ${admin.email}`);
  console.log(`  correct password -> ${await verify(password, admin.passwordHash)}`);
  console.log(`  wrong password   -> ${await verify(password + "-wrong", admin.passwordHash)}`);
  console.log(`  malformed hash   -> ${await verify(password, "not-a-hash")}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
