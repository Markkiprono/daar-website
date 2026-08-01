"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { getStorage, buildKey } from "@/lib/storage";
import { processMenuImage, MAX_UPLOAD_BYTES, ACCEPTED_TYPES } from "@/lib/images";

export type ActionState = { error?: string; ok?: boolean } | undefined;

const ItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  /** Entered in whole shillings; stored as minor units. */
  price: z.coerce.number().min(0, "Price cannot be negative").max(1_000_000),
  categoryId: z.string().min(1, "Choose a category"),
  isAvailable: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Appends -2, -3 … until the slug is free. Ignores the row being edited. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "item";
  let candidate = root;
  let n = 1;
  for (;;) {
    const clash = await db.menuItem.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === excludeId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

/** Returns image fields when a file was supplied, otherwise null. */
async function handleUpload(file: File | null) {
  if (!file || file.size === 0) return null;

  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported image type: ${file.type || "unknown"}. Use JPEG, PNG, WebP or AVIF.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 12 MB.`);
  }

  const input = Buffer.from(await file.arrayBuffer());
  const processed = await processMenuImage(input);

  const storage = await getStorage();
  const key = buildKey(file.name.replace(/\.[^.]+$/, ".webp"));
  const stored = await storage.put(key, processed.buffer, processed.contentType);

  return {
    imageUrl: stored.url,
    imageWidth: processed.width,
    imageHeight: processed.height,
    blurDataUrl: processed.blurDataUrl,
  };
}

function parse(formData: FormData) {
  return ItemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    categoryId: formData.get("categoryId"),
    isAvailable: formData.get("isAvailable") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    displayOrder: formData.get("displayOrder") || 0,
  });
}

async function syncTags(menuItemId: string, tagIds: string[]) {
  await db.menuItemTag.deleteMany({ where: { menuItemId } });
  if (tagIds.length === 0) return;
  await db.menuItemTag.createMany({
    data: tagIds.map((tagId) => ({ menuItemId, tagId })),
    skipDuplicates: true,
  });
}

export async function createMenuItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertAdmin();

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const d = parsed.data;

  // Everything that can fail lives in here. redirect() throws NEXT_REDIRECT
  // internally, so it must stay OUTSIDE the try or the catch swallows it and
  // the save silently appears to do nothing.
  try {
    const image = await handleUpload(formData.get("image") as File | null);
    const slug = await uniqueSlug(slugify(d.name));

    // Chef's Special is exclusive. Clearing it here as well as in
    // setFeatured() — otherwise ticking the switch on the form leaves the
    // previous special still flagged and the home page shows whichever
    // row the database happens to return first.
    const item = await db.$transaction(async (tx) => {
      if (d.isFeatured) {
        await tx.menuItem.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } });
      }
      return tx.menuItem.create({
        data: {
          name: d.name,
          slug,
          description: d.description || null,
          priceCents: Math.round(d.price * 100),
          categoryId: d.categoryId,
          isAvailable: d.isAvailable ?? true,
          isFeatured: d.isFeatured ?? false,
          displayOrder: d.displayOrder ?? 0,
          imageAlt: d.name,
          ...(image ?? {}),
        },
      });
    });

    await syncTags(item.id, formData.getAll("tagIds").map(String));

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save this item." };
  }

  redirect("/admin/menu");
}

export async function updateMenuItem(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertAdmin();

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const existing = await db.menuItem.findUnique({ where: { id } });
  if (!existing) return { error: "That item no longer exists." };

  const d = parsed.data;

  // See the note in createMenuItem: redirect() must stay outside the try.
  try {
    const image = await handleUpload(formData.get("image") as File | null);
    const slug = await uniqueSlug(slugify(d.name), id);

    // See createMenuItem: Chef's Special must stay exclusive.
    await db.$transaction(async (tx) => {
      if (d.isFeatured) {
        await tx.menuItem.updateMany({
          where: { isFeatured: true, NOT: { id } },
          data: { isFeatured: false },
        });
      }
      await tx.menuItem.update({
        where: { id },
        data: {
          name: d.name,
          slug,
          description: d.description || null,
          priceCents: Math.round(d.price * 100),
          categoryId: d.categoryId,
          isAvailable: d.isAvailable ?? false,
          isFeatured: d.isFeatured ?? false,
          displayOrder: d.displayOrder ?? 0,
          // Only overwrite the image when a new one was actually uploaded.
          ...(image ?? {}),
          imageAlt: d.name,
        },
      });
    });

    await syncTags(id, formData.getAll("tagIds").map(String));

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save this item." };
  }

  redirect("/admin/menu");
}

export async function deleteMenuItem(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));

  const item = await db.menuItem.findUnique({ where: { id }, select: { imageUrl: true } });
  await db.menuItem.delete({ where: { id } });

  // Best-effort media cleanup; a failure here must not fail the delete.
  if (item?.imageUrl?.startsWith("/api/uploads/")) {
    try {
      const storage = await getStorage();
      await storage.delete(item.imageUrl.replace("/api/uploads/", ""));
    } catch {
      /* orphaned file is acceptable; the row is gone */
    }
  }

  revalidatePath("/admin/menu");
  revalidatePath("/menu");
}

/** One-tap sold-out toggle — the owner's most-used control. */
export async function toggleAvailability(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const item = await db.menuItem.findUnique({ where: { id }, select: { isAvailable: true } });
  if (!item) return;

  await db.menuItem.update({ where: { id }, data: { isAvailable: !item.isAvailable } });
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
}

/** Only one item can be the Chef's Special at a time. */
export async function setFeatured(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));

  await db.$transaction([
    db.menuItem.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } }),
    db.menuItem.update({ where: { id }, data: { isFeatured: true } }),
  ]);

  revalidatePath("/admin/menu");
  revalidatePath("/");
}
