/**
 * Mints a genuine admin session token, for verifying the authenticated
 * path without driving a browser. Development aid — not used at runtime.
 *
 *   npx tsx scripts/mint-test-token.ts
 */
import "dotenv/config";
import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const admin = await prisma.adminUser.findFirst();
  if (!admin) throw new Error("No admin row — run scripts/create-admin.ts first.");
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not set.");

  const key = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ adminId: admin.id, email: admin.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + 3_600_000))
    .sign(key);

  console.log(token);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
