"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { getStorage, buildKey } from "@/lib/storage";
import { processMenuImage, MAX_UPLOAD_BYTES, ACCEPTED_TYPES } from "@/lib/images";

export type CategoryState = { error?: string; ok?: boolean } | undefined;
export type CategoryPhotoState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined;

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

/** Best-effort cleanup of a replaced/removed local file. */
async function cleanup(url: string | null | undefined) {
  if (!url?.startsWith("/api/uploads/")) return;
  try {
    const storage = await getStorage();
    await storage.delete(url.replace("/api/uploads/", ""));
  } catch {
    /* an orphaned file is acceptable */
  }
}

/**
 * The marketing photo shown on the home page category tile. Optional: with no
 * image set, categoryImage() falls back to borrowing one from the category's
 * items, which is how every tile worked before this existed.
 */
export async function updateCategoryImage(
  _prev: CategoryPhotoState,
  formData: FormData,
): Promise<CategoryPhotoState> {
  await assertAdmin();

  const id = String(formData.get("id"));
  const category = await db.category.findUnique({
    where: { id },
    select: { id: true, name: true, imageUrl: true },
  });
  if (!category) return { ok: false, error: "That category no longer exists." };

  if (formData.get("remove") === "on") {
    await db.category.update({
      where: { id },
      data: { imageUrl: null, imageAlt: null, imageWidth: null, imageHeight: null, blurDataUrl: null },
    });
    await cleanup(category.imageUrl);
    revalidatePath("/admin/categories");
    revalidatePath("/menu");
    revalidatePath("/");
    return { ok: true, message: "Photo removed." };
  }

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Choose a photo first." };

  // Re-checked here because the browser's copy of these rules is a
  // convenience, not a guarantee — the request can arrive without it.
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: `Unsupported type: ${file.type || "unknown"}. Use JPEG, PNG, WebP or AVIF.` };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 12 MB.` };
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    // Tiles render wide on the home page, so allow more width than a menu card.
    const processed = await processMenuImage(input, 2000);
    const storage = await getStorage();
    const stored = await storage.put(
      buildKey(`category-${category.id}.webp`, "site"),
      processed.buffer,
      processed.contentType,
    );

    await db.category.update({
      where: { id },
      data: {
        imageUrl: stored.url,
        imageAlt: category.name,
        imageWidth: processed.width,
        imageHeight: processed.height,
        blurDataUrl: processed.blurDataUrl,
      },
    });
    await cleanup(category.imageUrl);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/menu");
  revalidatePath("/");
  return { ok: true, message: "Photo updated." };
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

  const doomed = await db.category.findUnique({ where: { id }, select: { imageUrl: true } });
  await db.category.delete({ where: { id } });
  await cleanup(doomed?.imageUrl);
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
