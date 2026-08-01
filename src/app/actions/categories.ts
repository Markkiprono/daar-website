"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";

export type CategoryState = { error?: string; ok?: boolean } | undefined;

const CategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).max(999).optional(),
});

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = base || "category";
  let candidate = root;
  let n = 1;
  for (;;) {
    const clash = await db.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === excludeId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

export async function createCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  await assertAdmin();

  const parsed = CategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await db.category.create({
    data: {
      name: parsed.data.name,
      slug: await uniqueSlug(slugify(parsed.data.name)),
      description: parsed.data.description || null,
      displayOrder: parsed.data.displayOrder ?? 0,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/menu");
  return { ok: true };
}

export async function updateCategory(id: string, _prev: CategoryState, formData: FormData): Promise<CategoryState> {
  await assertAdmin();

  const parsed = CategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await db.category.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug: await uniqueSlug(slugify(parsed.data.name), id),
      description: parsed.data.description || null,
      displayOrder: parsed.data.displayOrder ?? 0,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/menu");
  return { ok: true };
}

/**
 * Deleting a category cascades to its items (schema: onDelete: Cascade).
 * We refuse when items exist so the owner can't wipe the menu with one tap
 * by accident — they must move or delete the items first.
 */
export async function deleteCategory(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));

  const count = await db.menuItem.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new Error(`This category still has ${count} item(s). Move or delete them first.`);
  }

  await db.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  revalidatePath("/menu");
}

export async function moveCategory(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const direction = String(formData.get("direction")) as "up" | "down";

  const all = await db.category.findMany({ orderBy: { displayOrder: "asc" } });
  const index = all.findIndex((c) => c.id === id);
  if (index === -1) return;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) return;

  // Rewrite the whole sequence so duplicate/míssing orders self-heal.
  const reordered = [...all];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  await db.$transaction(
    reordered.map((c, i) => db.category.update({ where: { id: c.id }, data: { displayOrder: i + 1 } })),
  );

  revalidatePath("/admin/categories");
  revalidatePath("/menu");
}
