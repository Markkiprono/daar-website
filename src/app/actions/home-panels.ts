"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { getStorage } from "@/lib/storage";
import { processSiteImage, processSiteVideo } from "@/lib/site-media";
import { VIDEO_TYPES } from "@/lib/image-rules";
import { HEADING_SIZE_OPTIONS } from "@/lib/home-sections";

/**
 * The sliding panels below the hero, and every fixed label on the home page.
 *
 * Both were written into src/app/page.tsx. The panels were worse than the
 * rest: their photographs were already editable from Photos while the
 * sentences on top of them were not, so the café could change the picture
 * behind a sentence they had no way to change.
 */

export type PanelState = { ok: true; message: string } | { ok: false; error: string } | undefined;

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/admin/sections");
}

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
 * A panel's media, whichever kind arrived.
 *
 * One column holds either, exactly as the SiteSettings slots it replaced did;
 * which one it is gets read back off the extension — see src/lib/media.ts.
 */
async function processMedia(file: File) {
  if (VIDEO_TYPES.includes(file.type)) {
    const stored = await processSiteVideo(file);
    return { url: stored.url, blur: null as string | null };
  }
  const stored = await processSiteImage(file);
  return { url: stored.url, blur: stored.blur };
}

/** A link is only a link when it has both halves. */
const LinkPair = {
  label: z.string().trim().max(40),
  href: z.string().trim().max(200),
};

const PanelSchema = z.object({
  eyebrow: z.string().trim().max(60),
  // These are set at up to 5rem across a full screen; past about this length
  // the sentence stops being a statement and starts being a paragraph.
  line: z.string().trim().min(1, "A panel needs its sentence").max(160),
  alt: z.string().trim().max(160),
  linkOneLabel: LinkPair.label,
  linkOneHref: LinkPair.href,
  linkTwoLabel: LinkPair.label,
  linkTwoHref: LinkPair.href,
});

function readPanel(formData: FormData) {
  return PanelSchema.safeParse({
    eyebrow: formData.get("eyebrow") ?? "",
    line: formData.get("line"),
    alt: formData.get("alt") ?? "",
    linkOneLabel: formData.get("linkOneLabel") ?? "",
    linkOneHref: formData.get("linkOneHref") ?? "",
    linkTwoLabel: formData.get("linkTwoLabel") ?? "",
    linkTwoHref: formData.get("linkTwoHref") ?? "",
  });
}

export async function addHomePanel(_prev: PanelState, formData: FormData): Promise<PanelState> {
  await assertAdmin();

  const parsed = readPanel(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the panel." };
  }

  const file = formData.get("photo") as File | null;

  try {
    let media: { url: string; blur: string | null } | null = null;
    if (file && file.size > 0) media = await processMedia(file);

    /* The highest order in use, not the row count. After a delete those
       differ — four rows at 0,1,2,3 minus the one at 1 leaves a count of 3
       and a row already sitting at 3, so the next addition tied with it and
       the two swapped places between page loads. */
    const last = await db.homePanel.findFirst({
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    await db.homePanel.create({
      data: {
        eyebrow: parsed.data.eyebrow,
        line: parsed.data.line,
        imageAlt: parsed.data.alt || null,
        linkOneLabel: parsed.data.linkOneLabel,
        linkOneHref: parsed.data.linkOneHref,
        linkTwoLabel: parsed.data.linkTwoLabel,
        linkTwoHref: parsed.data.linkTwoHref,
        imageUrl: media?.url ?? null,
        blurDataUrl: media?.blur ?? null,
        displayOrder: (last?.displayOrder ?? -1) + 1,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add that panel." };
  }

  revalidatePublic();
  return { ok: true, message: "Panel added." };
}

export async function updateHomePanel(_prev: PanelState, formData: FormData): Promise<PanelState> {
  await assertAdmin();

  const id = String(formData.get("id"));
  const existing = await db.homePanel.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "That panel no longer exists." };

  const parsed = readPanel(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the panel." };
  }

  const file = formData.get("photo") as File | null;

  try {
    let media: { url: string; blur: string | null } | null = null;
    if (file && file.size > 0) media = await processMedia(file);

    await db.homePanel.update({
      where: { id },
      data: {
        eyebrow: parsed.data.eyebrow,
        line: parsed.data.line,
        imageAlt: parsed.data.alt || null,
        linkOneLabel: parsed.data.linkOneLabel,
        linkOneHref: parsed.data.linkOneHref,
        linkTwoLabel: parsed.data.linkTwoLabel,
        linkTwoHref: parsed.data.linkTwoHref,
        isVisible: formData.get("isVisible") === "on",
        // Untouched unless a new file actually arrived: saving a wording
        // change must never quietly drop the picture behind it.
        ...(media ? { imageUrl: media.url, blurDataUrl: media.blur } : {}),
      },
    });

    if (media) await cleanup(existing.imageUrl);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save that panel." };
  }

  revalidatePublic();
  return { ok: true, message: "Panel saved." };
}

export async function deleteHomePanel(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const panel = await db.homePanel.findUnique({ where: { id }, select: { imageUrl: true } });
  await db.homePanel.delete({ where: { id } });
  await cleanup(panel?.imageUrl);
  revalidatePublic();
}

export async function moveHomePanel(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const direction = String(formData.get("direction")) as "up" | "down";

  const all = await db.homePanel.findMany({ orderBy: { displayOrder: "asc" } });
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) return;
  const swap = direction === "up" ? index - 1 : index + 1;
  if (swap < 0 || swap >= all.length) return;

  const reordered = [...all];
  [reordered[index], reordered[swap]] = [reordered[swap]!, reordered[index]!];
  await db.$transaction(
    reordered.map((p, i) => db.homePanel.update({ where: { id: p.id }, data: { displayOrder: i } })),
  );
  revalidatePublic();
}

// ------------------------------------------------------------
//  Every other label on the home page
// ------------------------------------------------------------

const LabelsSchema = z.object({
  heroEyebrow: z.string().trim().max(90),
  heroPrimaryLabel: z.string().trim().max(40),
  heroSecondaryLabel: z.string().trim().max(40),
  counterEyebrow: z.string().trim().max(60),
  counterHeading: z.string().trim().max(90),
  chefEyebrow: z.string().trim().max(60),
  featuredBadge: z.string().trim().max(40),
  storyEyebrow: z.string().trim().max(60),
  closingEyebrow: z.string().trim().max(60),
  closingHeading: z.string().trim().max(120),
  visitEyebrow: z.string().trim().max(60),
  visitHeading: z.string().trim().max(90),
  // Checked against the offered sizes rather than accepted as a free string,
  // so a hand-posted value cannot put an arbitrary class name on the page.
  homeHeadingSize: z.enum(HEADING_SIZE_OPTIONS.map((o) => o.value) as [string, ...string[]]),
});

export async function updateHomeLabels(_prev: PanelState, formData: FormData): Promise<PanelState> {
  await assertAdmin();

  const parsed = LabelsSchema.safeParse(
    Object.fromEntries(Object.keys(LabelsSchema.shape).map((k) => [k, formData.get(k) ?? ""])),
  );
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the wording." };
  }

  try {
    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: parsed.data,
      create: { id: "singleton", ...parsed.data },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the wording." };
  }

  revalidatePublic();
  return { ok: true, message: "Wording saved." };
}
