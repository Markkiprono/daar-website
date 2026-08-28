"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { getStorage } from "@/lib/storage";
import { processSiteImage } from "@/lib/site-media";
import { HEADING_SIZE_OPTIONS, CARD_SIZE_OPTIONS } from "@/lib/home-sections";

/**
 * The "What we stand for" cards, and the section's own wording and sizing.
 *
 * Split from site-photos.ts because these are not photographs with captions —
 * they are content with a photograph attached, and the difference shows in
 * every function: a card can be saved without touching its picture, and its
 * words are the point.
 */

export type CardState = { ok: true; message: string } | { ok: false; error: string } | undefined;

/** Everything that renders this section. */
function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/admin/sections");
}

/** Best-effort cleanup of a replaced or removed upload. */
async function cleanup(url: string | null | undefined) {
  if (!url?.startsWith("/api/uploads/")) return;
  try {
    const storage = await getStorage();
    await storage.delete(url.replace("/api/uploads/", ""));
  } catch {
    /* an orphaned file is acceptable */
  }
}

const CardSchema = z.object({
  title: z.string().trim().min(1, "Give the card a heading").max(60),
  // Long enough for four unhurried lines and short enough that nobody pastes
  // an essay onto a card the size of a postcard.
  body: z.string().trim().max(400),
  alt: z.string().trim().max(160).optional().or(z.literal("")),
});

// ------------------------------------------------------------
//  Cards
// ------------------------------------------------------------

export async function addValueCard(_prev: CardState, formData: FormData): Promise<CardState> {
  await assertAdmin();

  const parsed = CardSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    alt: formData.get("alt") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the card." };
  }

  const file = formData.get("photo") as File | null;

  try {
    // A card with no photograph is allowed: the café may want the words up
    // today and the picture when they have taken one. The public component
    // falls back to brand artwork rather than leaving a hole.
    let image: { url: string; blur: string | null } | null = null;
    if (file && file.size > 0) {
      const processed = await processSiteImage(file);
      image = { url: processed.url, blur: processed.blur };
    }

    /* The highest order in use, not the row count. After a delete those
       differ — four rows at 0,1,2,3 minus the one at 1 leaves a count of 3
       and a row already sitting at 3, so the next addition tied with it and
       the two swapped places between page loads. */
    const last = await db.valueCard.findFirst({
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    await db.valueCard.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        imageUrl: image?.url ?? null,
        blurDataUrl: image?.blur ?? null,
        imageAlt: parsed.data.alt || null,
        displayOrder: (last?.displayOrder ?? -1) + 1,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add that card." };
  }

  revalidatePublic();
  return { ok: true, message: "Card added." };
}

export async function updateValueCard(_prev: CardState, formData: FormData): Promise<CardState> {
  await assertAdmin();

  const id = String(formData.get("id"));
  const existing = await db.valueCard.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "That card no longer exists." };

  const parsed = CardSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    alt: formData.get("alt") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the card." };
  }

  const file = formData.get("photo") as File | null;
  const replacing = Boolean(file && file.size > 0);

  try {
    let image: { url: string; blur: string | null } | null = null;
    if (replacing) {
      const processed = await processSiteImage(file!);
      image = { url: processed.url, blur: processed.blur };
    }

    await db.valueCard.update({
      where: { id },
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        imageAlt: parsed.data.alt || null,
        isVisible: formData.get("isVisible") === "on",
        // Only touched when a new file actually arrived — saving a wording
        // change must never quietly drop the photograph.
        ...(image ? { imageUrl: image.url, blurDataUrl: image.blur } : {}),
      },
    });

    if (image) await cleanup(existing.imageUrl);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save that card." };
  }

  revalidatePublic();
  return { ok: true, message: "Card saved." };
}

export async function deleteValueCard(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const card = await db.valueCard.findUnique({ where: { id }, select: { imageUrl: true } });
  await db.valueCard.delete({ where: { id } });
  await cleanup(card?.imageUrl);
  revalidatePublic();
}

export async function moveValueCard(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const direction = String(formData.get("direction")) as "up" | "down";

  const all = await db.valueCard.findMany({ orderBy: { displayOrder: "asc" } });
  const index = all.findIndex((c) => c.id === id);
  if (index === -1) return;
  const swap = direction === "up" ? index - 1 : index + 1;
  if (swap < 0 || swap >= all.length) return;

  const reordered = [...all];
  [reordered[index], reordered[swap]] = [reordered[swap]!, reordered[index]!];
  await db.$transaction(
    reordered.map((c, i) => db.valueCard.update({ where: { id: c.id }, data: { displayOrder: i } })),
  );
  revalidatePublic();
}

// ------------------------------------------------------------
//  The section itself — heading, label, sizes, on/off
// ------------------------------------------------------------

const SectionSchema = z.object({
  eyebrow: z.string().trim().max(60),
  heading: z.string().trim().min(1, "The section needs a heading").max(90),
  // Checked against the offered options rather than a free string, so a
  // hand-posted value cannot put an arbitrary class name on the page.
  headingSize: z.enum(HEADING_SIZE_OPTIONS.map((o) => o.value) as [string, ...string[]]),
  cardSize: z.enum(CARD_SIZE_OPTIONS.map((o) => o.value) as [string, ...string[]]),
});

export async function updateStandForSection(
  _prev: CardState,
  formData: FormData,
): Promise<CardState> {
  await assertAdmin();

  const parsed = SectionSchema.safeParse({
    eyebrow: formData.get("eyebrow") ?? "",
    heading: formData.get("heading"),
    headingSize: formData.get("headingSize"),
    cardSize: formData.get("cardSize"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the section." };
  }

  const data = {
    standForEnabled: formData.get("enabled") === "on",
    standForEyebrow: parsed.data.eyebrow,
    standForHeading: parsed.data.heading,
    standForHeadingSize: parsed.data.headingSize,
    standForCardSize: parsed.data.cardSize,
  };

  try {
    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the section." };
  }

  revalidatePublic();
  return { ok: true, message: "Section saved." };
}
