/**
 * Re-processes logos that were uploaded before normalisation existed.
 *
 * Rewrites the stored SVG in place: crops the viewBox to the artwork and
 * replaces the baked-in brand colour with currentColor, so the mark fills
 * its space and can be tinted per section.
 *
 *   npx tsx scripts/renormalize-uploaded-logos.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeLogoSvg } from "../src/lib/svg-normalize";

const UPLOADS_ROOT = path.resolve(
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "storage", "uploads"),
);

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { logoMarkUrl: true, logoWordmarkUrl: true },
  });

  const targets = [
    { label: "mark", url: settings?.logoMarkUrl },
    { label: "wordmark", url: settings?.logoWordmarkUrl },
  ].filter((t): t is { label: string; url: string } => Boolean(t.url));

  if (targets.length === 0) {
    console.log("No uploaded logos found.");
    await prisma.$disconnect();
    return;
  }

  for (const t of targets) {
    if (!t.url.endsWith(".svg") || !t.url.startsWith("/api/uploads/")) {
      console.log(`SKIP  ${t.label}: not a locally-stored SVG (${t.url})`);
      continue;
    }

    const full = path.resolve(UPLOADS_ROOT, t.url.replace("/api/uploads/", ""));
    if (!full.startsWith(UPLOADS_ROOT + path.sep) || !fs.existsSync(full)) {
      console.log(`SKIP  ${t.label}: file not found at ${full}`);
      continue;
    }

    const before = fs.readFileSync(full);
    const beforeVb = before.toString("utf8").match(/viewBox="([^"]*)"/)?.[1] ?? "(none)";
    const hadFixedFill = /#[0-9a-fA-F]{3,8}/.test(before.toString("utf8"));

    const after = await normalizeLogoSvg(before);
    fs.writeFileSync(full, after, "utf8");

    const afterVb = after.match(/viewBox="([^"]*)"/)?.[1] ?? "(none)";
    console.log(
      `OK    ${t.label}\n` +
        `        viewBox ${beforeVb}  ->  ${afterVb}\n` +
        `        fixed colour removed: ${hadFixedFill ? "yes" : "none present"}\n` +
        `        currentColor set:     ${/fill="currentColor"/.test(after) ? "yes" : "NO"}`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
