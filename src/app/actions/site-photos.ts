"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { getStorage, buildKey } from "@/lib/storage";
import { MAX_VIDEO_MB, VIDEO_TYPES } from "@/lib/image-rules";
import { processSiteImage, processSiteVideo } from "@/lib/site-media";

export type PhotoState = { ok: true; message: string } | { ok: false; error: string } | undefined;

/** Which SiteSettings column each single-photo slot writes to. */
const SLOTS = {
  hero: "heroImageUrl",
  story: "storyImageUrl",
  visit: "visitImageUrl",
  chef: "chefImageUrl",
  closing: "closingImageUrl",
  storyBand: "storyBandImageUrl",
} as const;
type Slot = keyof typeof SLOTS;

/** Everything that touches the public pages. */
function revalidatePublic() {
  for (const p of ["/", "/menu", "/story", "/visit", "/reserve"]) revalidatePath(p);
  revalidatePath("/admin/photos");
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
    return { ok: true, message: "Removed — the default is back." };
  }

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Choose a photo or video first." };

  // One column, either kind of file. Which one it holds is read back off the
  // extension the server chose here — see src/lib/media.ts.
  const video = VIDEO_TYPES.includes(file.type);

  try {
    const { url } = video ? await processSiteVideo(file) : await processSiteImage(file);
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
  return { ok: true, message: video ? "Video updated." : "Photo updated." };
}

// ------------------------------------------------------------
//  Hero video
// ------------------------------------------------------------

/**
 * The looping film near the foot of the home page.
 *
 * heroVideoUrl has existed on SiteSettings since the beginning with nothing
 * to set it and nothing to render it — this is the missing half. The name is
 * kept rather than migrated: it is one column, and renaming it would cost a
 * migration to buy nothing.
 *
 * Stored byte-for-byte rather than re-encoded: there is no ffmpeg in the
 * image, and re-encoding video is not something to do inside a request. That
 * puts the burden on the file being sensible before it is uploaded, which is
 * what the limit and the guidance on the form are for.
 *
 * A still photograph sits under it as the poster frame, the fallback when a
 * browser refuses to autoplay, and what anyone on Reduce Motion or Save-Data
 * gets instead. With no video the section is not rendered at all.
 */
export async function updateHeroVideo(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  await assertAdmin();

  const current = await db.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { heroVideoUrl: true },
  });
  const currentUrl = current?.heroVideoUrl ?? null;

  if (formData.get("remove") === "on") {
    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: { heroVideoUrl: null },
      create: { id: "singleton", heroVideoUrl: null },
    });
    await cleanup(currentUrl);
    revalidatePublic();
    return { ok: true, message: "Video removed — that section is now hidden." };
  }

  const file = formData.get("video") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Choose a video first." };

  if (!VIDEO_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: `That file is ${file.type || "an unknown type"}. Please use an MP4 or WebM — a .mov from a phone needs converting first.`,
    };
  }
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    return {
      ok: false,
      error: `That video is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_VIDEO_MB} MB. A hero loop should be a few seconds and heavily compressed.`,
    };
  }

  try {
    const extension = file.type === "video/webm" ? "webm" : "mp4";
    const bytes = Buffer.from(await file.arrayBuffer());
    const storage = await getStorage();
    const stored = await storage.put(buildKey(`hero.${extension}`, "site"), bytes, file.type);

    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: { heroVideoUrl: stored.url },
      create: { id: "singleton", heroVideoUrl: stored.url },
    });
    await cleanup(currentUrl);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  revalidatePublic();
  return { ok: true, message: "Video updated." };
}

// ------------------------------------------------------------
//  Story gallery
// ------------------------------------------------------------

export async function addStoryPhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  await assertAdmin();

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Choose a photo first." };

  try {
    const { url, blur } = await processSiteImage(file);
    // One past the highest rather than the row count — see the note on
    // addHomePhoto, which had the same collision after a deletion.
    const top = await db.storyPhoto.aggregate({ _max: { displayOrder: true } });
    await db.storyPhoto.create({
      data: {
        imageUrl: url,
        blurDataUrl: blur,
        imageAlt: (formData.get("alt") as string | null)?.trim() || "A photo of Daar",
        displayOrder: (top._max.displayOrder ?? -1) + 1,
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

  // Ordered exactly as the dashboard listed them, ties included, or the arrow
  // swaps a different pair than the one the person clicked between.
  const all = await db.storyPhoto.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });
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
//  Home gallery — the drifting band of plates
// ------------------------------------------------------------

/**
 * Photographs only, unlike the backdrop slots above.
 *
 * The band holds a dozen or more tiles and every one of them is on screen at
 * once. A dozen films autoplaying side by side is minutes of somebody's
 * mobile data and a phone that gets warm, for a strip that is decoration. If
 * the café wants moving pictures on the home page, the panels take them.
 */
export async function addHomePhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  await assertAdmin();

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Choose a photo first." };

  try {
    const { url, blur } = await processSiteImage(file);
    // One past the highest, not the number of rows. Deleting from the middle
    // of the band leaves a gap, after which the count is no longer the next
    // free slot: three photographs, delete the second, and the count is 2 —
    // which the third photograph is already using. The two then share a
    // displayOrder and the band's order between them is whatever Postgres
    // returns that second. Gaps are harmless; ties are not.
    const top = await db.homePhoto.aggregate({ _max: { displayOrder: true } });
    await db.homePhoto.create({
      data: {
        imageUrl: url,
        blurDataUrl: blur,
        imageAlt: (formData.get("alt") as string | null)?.trim() || "A photo of Daar",
        displayOrder: (top._max.displayOrder ?? -1) + 1,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  revalidatePublic();
  return { ok: true, message: "Added to the band." };
}

export async function deleteHomePhoto(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const photo = await db.homePhoto.findUnique({ where: { id }, select: { imageUrl: true } });
  await db.homePhoto.delete({ where: { id } });
  await cleanup(photo?.imageUrl);
  revalidatePublic();
}

export async function moveHomePhoto(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const direction = String(formData.get("direction")) as "up" | "down";

  // Same as moveStoryPhoto: the order shown is the order swapped.
  const all = await db.homePhoto.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) return;
  const swap = direction === "up" ? index - 1 : index + 1;
  if (swap < 0 || swap >= all.length) return;

  const reordered = [...all];
  [reordered[index], reordered[swap]] = [reordered[swap]!, reordered[index]!];
  await db.$transaction(
    reordered.map((p, i) => db.homePhoto.update({ where: { id: p.id }, data: { displayOrder: i } })),
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

// ------------------------------------------------------------
//  Menu items in the band
// ------------------------------------------------------------

/**
 * Which menu items appear in the drifting band, set in one go.
 *
 * The form carries the whole answer rather than one item's worth of it: an
 * unticked checkbox submits nothing at all, so "everything off, then these
 * back on" is the only reading of the posted data that cannot lose a tick.
 * Toggling one row at a time would also mean a round trip per click, and
 * choosing eight items is eight chances for one of them not to land.
 *
 * Both halves run in a transaction. Between the clear and the set the band
 * has nothing ticked in it, and the home page renders on every request — a
 * visitor landing in that gap would be served the random draw and the
 * built-in photographs, which is precisely the thing the café is here to
 * turn off.
 */
export async function updateBandItems(
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  await assertAdmin();

  const ids = formData.getAll("inBand").map(String).filter(Boolean);

  await db.$transaction([
    db.menuItem.updateMany({ where: { isInBand: true }, data: { isInBand: false } }),
    ...(ids.length > 0
      ? [db.menuItem.updateMany({ where: { id: { in: ids } }, data: { isInBand: true } })]
      : []),
  ]);

  revalidatePublic();

  if (ids.length === 0) {
    return {
      ok: true,
      message:
        "No menu items ticked. The band now shows your uploaded photos, or picks from the menu on its own if there are none.",
    };
  }
  return {
    ok: true,
    message: `${ids.length} menu ${ids.length === 1 ? "item" : "items"} now showing in the band.`,
  };
}
