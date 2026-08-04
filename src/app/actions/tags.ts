"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { TagKind } from "@/generated/prisma/client";

export type TagState = { error?: string; ok?: boolean } | undefined;

const TagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  kind: z.enum(["BADGE", "DIETARY"]),
});

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/** The set most cafés want, offered as one click on a fresh install. */
const DEFAULTS: { name: string; kind: TagKind }[] = [
  { name: "Bestseller", kind: TagKind.BADGE },
  { name: "New", kind: TagKind.BADGE },
  { name: "Seasonal", kind: TagKind.BADGE },
  { name: "To order", kind: TagKind.BADGE },
  { name: "Vegetarian", kind: TagKind.DIETARY },
  { name: "Vegan", kind: TagKind.DIETARY },
  { name: "Gluten-free", kind: TagKind.DIETARY },
  { name: "Contains nuts", kind: TagKind.DIETARY },
];

export async function createTag(_prev: TagState, formData: FormData): Promise<TagState> {
  await assertAdmin();

  const parsed = TagSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const slug = slugify(parsed.data.name);
  if (!slug) return { error: "Please use at least one letter or number." };

  const clash = await db.tag.findUnique({ where: { slug }, select: { id: true } });
  if (clash) return { error: `“${parsed.data.name}” already exists.` };

  await db.tag.create({
    data: { name: parsed.data.name, slug, kind: parsed.data.kind as TagKind },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return { ok: true };
}

/**
 * Removing a tag also removes it from every item that carried it — the join
 * rows cascade. The items themselves are untouched.
 */
export async function deleteTag(formData: FormData) {
  await assertAdmin();
  await db.tag.delete({ where: { id: String(formData.get("id")) } });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
}

/** Creates any of the common tags that are missing. Existing ones are left alone. */
export async function addDefaultTags() {
  await assertAdmin();

  const existing = await db.tag.findMany({ select: { slug: true } });
  const have = new Set(existing.map((t) => t.slug));

  const missing = DEFAULTS.map((d) => ({ ...d, slug: slugify(d.name) })).filter(
    (d) => !have.has(d.slug),
  );
  if (missing.length > 0) await db.tag.createMany({ data: missing });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
}
