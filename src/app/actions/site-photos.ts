"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { getStorage, buildKey } from "@/lib/storage";
import { processMenuImage, MAX_UPLOAD_BYTES, ACCEPTED_TYPES } from "@/lib/images";

export type PhotoState = { ok: true; message: string } | { ok: false; error: string } | undefined;

/** Which SiteSettings column each single-photo slot writes to. */
const SLOTS = {
  hero: "heroImageUrl",
  story: "storyImageUrl",
  visit: "visitImageUrl",
} as const;
type Slot = keyof typeof SLOTS;

/** Everything that touches the public pages. */
function revalidatePublic() {
  for (const p of ["/", "/menu", "/story", "/visit", "/reserve"]) revalidatePath(p);
  revalidatePath("/admin/photos");
}

/** Processes an upload through the shared menu-image pipeline (WebP + blur). */
async function process(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported type: ${file.type || "unknown"}. Use JPEG, PNG, WebP or AVIF.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 12 MB.`);
  }
  const input = Buffer.from(await file.arrayBuffer());
  // Site photos are used large (hero is full-screen), so allow more width.
  const processed = await processMenuImage(input, 2000);
  const storage = await getStorage();
  const stored = await storage.put(buildKey("site.webp", "site"), processed.buffer, processed.contentType);
  return { url: stored.url, blur: processed.blurDataUrl };
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

export async function updateSitePhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  await assertAdmin();

  const slot = String(formData.get("slot")) as Slot;
  const column = SLOTS[slot];
  if (!column) return { ok: false, error: "Unknown photo." };

  const current = await db.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { [column]: true },
  });
  const currentUrl = (current as Record<string, string | null> | null)?.[column] ?? null;

  // Remove.
  if (formData.get("remove") === "on") {
    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: { [column]: null },
      create: { id: "singleton", [column]: null },
    });
    await cleanup(currentUrl);
    revalidatePublic();
    return { ok: true, message: "Photo removed — the default is back." };
  }

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Choose a photo first." };

  try {
    const { url } = await process(file);
    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: { [column]: url },
      create: { id: "singleton", [column]: url },
    });
    await cleanup(currentUrl);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  revalidatePublic();
  return { ok: true, message: "Photo updated." };
}

// ------------------------------------------------------------
//  Story gallery
// ------------------------------------------------------------

export async function addStoryPhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  await assertAdmin();

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Choose a photo first." };

  try {
    const { url, blur } = await process(file);
    const count = await db.storyPhoto.count();
    await db.storyPhoto.create({
      data: {
        imageUrl: url,
        blurDataUrl: blur,
        imageAlt: (formData.get("alt") as string | null)?.trim() || "A photo of Daar",
        displayOrder: count,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  revalidatePublic();
  return { ok: true, message: "Added to the gallery." };
}

export async function deleteStoryPhoto(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const photo = await db.storyPhoto.findUnique({ where: { id }, select: { imageUrl: true } });
  await db.storyPhoto.delete({ where: { id } });
  await cleanup(photo?.imageUrl);
  revalidatePublic();
}

export async function moveStoryPhoto(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const direction = String(formData.get("direction")) as "up" | "down";

  const all = await db.storyPhoto.findMany({ orderBy: { displayOrder: "asc" } });
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) return;
  const swap = direction === "up" ? index - 1 : index + 1;
  if (swap < 0 || swap >= all.length) return;

  const reordered = [...all];
  [reordered[index], reordered[swap]] = [reordered[swap]!, reordered[index]!];
  await db.$transaction(
    reordered.map((p, i) => db.storyPhoto.update({ where: { id: p.id }, data: { displayOrder: i } })),
  );
  revalidatePublic();
}

// ------------------------------------------------------------
//  Favicon
// ------------------------------------------------------------

export async function updateFavicon(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  await assertAdmin();

  const current = await db.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { faviconUrl: true },
  });

  if (formData.get("remove") === "on") {
    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: { faviconUrl: null },
      create: { id: "singleton", faviconUrl: null },
    });
    await cleanup(current?.faviconUrl);
    revalidatePath("/", "layout");
    revalidatePath("/admin/photos");
    return { ok: true, message: "Favicon removed — the door mark is back." };
  }

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Choose an image first." };
  if (!["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"].includes(file.type)) {
    return { ok: false, error: "Use a PNG, ICO or SVG for the favicon." };
  }
  if (file.size > 1024 * 1024) return { ok: false, error: "Keep the favicon under 1 MB." };

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const storage = await getStorage();
    const ext = file.type === "image/svg+xml" ? "svg" : file.type === "image/png" ? "png" : "ico";
    const stored = await storage.put(buildKey(`favicon.${ext}`, "site"), input, file.type);
    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: { faviconUrl: stored.url },
      create: { id: "singleton", faviconUrl: stored.url },
    });
    await cleanup(current?.faviconUrl);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  // Metadata is set in the root layout — refresh the whole tree.
  revalidatePath("/", "layout");
  revalidatePath("/admin/photos");
  return { ok: true, message: "Favicon updated. Browsers may take a while to show it." };
}
