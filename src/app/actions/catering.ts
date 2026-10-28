"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { getStorage } from "@/lib/storage";
import { processSiteImage, processCatalogue } from "@/lib/site-media";
import { notifyOwner } from "@/lib/email";
import { HEADING_SIZE_OPTIONS, CARD_SIZE_OPTIONS } from "@/lib/home-sections";
import { isCateringSection, interestChoices } from "@/lib/catering-shared";

/**
 * Everything on the For Business page (/business): the page's wording (one row), its cards,
 * steps and options (many rows), and the public enquiry form.
 */

export type CateringState = { ok: true; message: string } | { ok: false; error: string } | undefined;

function revalidateCatering() {
  revalidatePath("/business");
  revalidatePath("/admin/business");
  // The nav and footer link to the page only while it is switched on.
  revalidatePath("/", "layout");
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

const text = (max: number) => z.string().trim().max(max);
const sizeEnum = <T extends { value: string }>(opts: T[]) =>
  z.enum(opts.map((o) => o.value) as [string, ...string[]]);

// ------------------------------------------------------------
//  The page's own wording — saved one group at a time
// ------------------------------------------------------------

/**
 * Which fields each dashboard form owns. Each form posts only its own group,
 * so saving the opening never touches the enquiry wording, and a slip in one
 * group cannot stop another being fixed.
 */
const GROUPS = {
  page: {
    text: { navLabel: 40 },
    flags: ["enabled"],
    sizes: true,
  },
  hero: {
    text: {
      heroEyebrow: 60,
      heroHeading: 120,
      heroBody: 600,
      heroPrimaryLabel: 40,
      heroSecondaryLabel: 40,
      heroImageAlt: 160,
    },
    flags: [],
    image: "heroImageUrl",
  },
  corporate: {
    text: {
      corporateNavLabel: 40,
      corporateEyebrow: 60,
      corporateHeading: 120,
      corporateBody: 600,
      corporatePrimaryLabel: 40,
      corporateSecondaryLabel: 40,
      corporateNote: 300,
    },
    flags: ["corporateEnabled"],
  },
  hospitality: {
    text: {
      hospitalityNavLabel: 40,
      hospitalityEyebrow: 60,
      hospitalityHeading: 120,
      hospitalityBody: 600,
      hospitalityTags: 400,
      hospitalityImageAlt: 160,
      stepsHeading: 120,
      hospitalityButtonLabel: 40,
    },
    flags: ["hospitalityEnabled"],
    image: "hospitalityImageUrl",
  },
  supermarket: {
    text: {
      supermarketNavLabel: 40,
      supermarketEyebrow: 60,
      supermarketHeading: 120,
      supermarketBody: 600,
      supermarketButtonLabel: 40,
      supermarketImageAlt: 160,
    },
    flags: ["supermarketEnabled"],
    image: "supermarketImageUrl",
  },
  quote: {
    text: { quoteText: 400, quoteName: 120 },
    flags: ["quoteEnabled"],
  },
  enquiry: {
    text: {
      enquiryEyebrow: 60,
      enquiryHeading: 120,
      enquiryBody: 600,
      enquiryQuestion: 120,
      enquiryNote: 400,
      enquiryInterests: 1000,
      enquiryButtonLabel: 40,
    },
    flags: [],
  },
} as const satisfies Record<
  string,
  { text: Record<string, number>; flags: readonly string[]; image?: string; sizes?: boolean }
>;

type Group = keyof typeof GROUPS;

export async function updateCateringPage(
  _prev: CateringState,
  formData: FormData,
): Promise<CateringState> {
  await assertAdmin();

  const groupName = String(formData.get("group")) as Group;
  const group = GROUPS[groupName];
  if (!group) return { ok: false, error: "Unknown section." };

  const data: Record<string, string | boolean | null> = {};

  for (const [field, max] of Object.entries(group.text)) {
    const parsed = text(max).safeParse(formData.get(field) ?? "");
    if (!parsed.success) return { ok: false, error: `“${field}” is too long (max ${max}).` };
    data[field] = parsed.data;
  }
  for (const flag of group.flags) data[flag] = formData.get(flag) === "on";
  for (const alt of ["heroImageAlt", "hospitalityImageAlt", "supermarketImageAlt"]) {
    if (alt in data) data[alt] = (data[alt] as string) || null;
  }

  if ("sizes" in group && group.sizes) {
    const h = sizeEnum(HEADING_SIZE_OPTIONS).safeParse(formData.get("headingSize"));
    const c = sizeEnum(CARD_SIZE_OPTIONS).safeParse(formData.get("cardSize"));
    if (!h.success || !c.success) return { ok: false, error: "Please choose a size." };
    data.headingSize = h.data;
    data.cardSize = c.data;
  }

  const existing = await db.cateringPage.findUnique({ where: { id: "singleton" } });
  const replaced: (string | null | undefined)[] = [];

  try {
    if ("image" in group && group.image) {
      const file = formData.get("photo") as File | null;
      if (file && file.size > 0) {
        const processed = await processSiteImage(file);
        data[group.image] = processed.url;
        replaced.push(existing?.[group.image]);
      } else if (formData.get("removePhoto") === "on") {
        // Back to the built-in photo (or none, for Supermarkets).
        data[group.image] = null;
        replaced.push(existing?.[group.image]);
      }
    }

    // The catalogue belongs to the Corporate group: an uploaded PDF wins,
    // then a typed link; "remove" clears it and hides the button.
    if (groupName === "corporate") {
      const file = formData.get("catalogue") as File | null;
      const link = String(formData.get("catalogueLink") ?? "").trim();
      if (formData.get("removeCatalogue") === "on") {
        data.catalogueUrl = null;
        replaced.push(existing?.catalogueUrl);
      } else if (file && file.size > 0) {
        data.catalogueUrl = (await processCatalogue(file)).url;
        replaced.push(existing?.catalogueUrl);
      } else if (link && link !== existing?.catalogueUrl) {
        if (!/^(https?:\/\/|\/)/.test(link)) {
          return { ok: false, error: "The catalogue link must start with https:// or /" };
        }
        data.catalogueUrl = link.slice(0, 500);
        replaced.push(existing?.catalogueUrl);
      }
    }

    await db.cateringPage.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }

  for (const url of replaced) await cleanup(url);
  revalidateCatering();
  return { ok: true, message: "Saved — live on the site now." };
}

// ------------------------------------------------------------
//  Cards, steps, points and options
// ------------------------------------------------------------

const ItemSchema = z.object({
  section: z.string().refine(isCateringSection, "Unknown section"),
  eyebrow: text(40),
  title: z.string().trim().min(1, "Give it a heading").max(90),
  body: text(600),
  details: text(600),
  alt: text(160),
});

function readItem(formData: FormData) {
  return ItemSchema.safeParse({
    section: formData.get("section"),
    eyebrow: formData.get("eyebrow") ?? "",
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    details: formData.get("details") ?? "",
    alt: formData.get("alt") ?? "",
  });
}

export async function addCateringItem(
  _prev: CateringState,
  formData: FormData,
): Promise<CateringState> {
  await assertAdmin();
  const parsed = readItem(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check." };

  const file = formData.get("photo") as File | null;
  try {
    const image = file && file.size > 0 ? await processSiteImage(file) : null;
    const last = await db.cateringItem.findFirst({
      where: { section: parsed.data.section },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    await db.cateringItem.create({
      data: {
        section: parsed.data.section,
        eyebrow: parsed.data.eyebrow,
        title: parsed.data.title,
        body: parsed.data.body,
        details: parsed.data.details,
        imageAlt: parsed.data.alt || null,
        imageUrl: image?.url ?? null,
        blurDataUrl: image?.blur ?? null,
        highlight: formData.get("highlight") === "on",
        displayOrder: (last?.displayOrder ?? -1) + 1,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add that." };
  }

  revalidateCatering();
  return { ok: true, message: "Added." };
}

export async function updateCateringItem(
  _prev: CateringState,
  formData: FormData,
): Promise<CateringState> {
  await assertAdmin();
  const id = String(formData.get("id"));
  const existing = await db.cateringItem.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "That no longer exists." };

  const parsed = readItem(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check." };

  const file = formData.get("photo") as File | null;
  const removePhoto = formData.get("removePhoto") === "on";
  try {
    const image = file && file.size > 0 ? await processSiteImage(file) : null;
    await db.cateringItem.update({
      where: { id },
      data: {
        eyebrow: parsed.data.eyebrow,
        title: parsed.data.title,
        body: parsed.data.body,
        details: parsed.data.details,
        imageAlt: parsed.data.alt || null,
        highlight: formData.get("highlight") === "on",
        isVisible: formData.get("isVisible") === "on",
        ...(image
          ? { imageUrl: image.url, blurDataUrl: image.blur }
          : removePhoto
            ? { imageUrl: null, blurDataUrl: null }
            : {}),
      },
    });
    if (image || removePhoto) await cleanup(existing.imageUrl);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save that." };
  }

  revalidateCatering();
  return { ok: true, message: "Saved." };
}

export async function deleteCateringItem(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const item = await db.cateringItem.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!item) return;
  await db.cateringItem.delete({ where: { id } });
  await cleanup(item.imageUrl);
  revalidateCatering();
}

export async function moveCateringItem(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const direction = String(formData.get("direction"));

  const item = await db.cateringItem.findUnique({ where: { id }, select: { section: true } });
  if (!item) return;
  const all = await db.cateringItem.findMany({
    where: { section: item.section },
    orderBy: { displayOrder: "asc" },
  });
  const index = all.findIndex((c) => c.id === id);
  const swap = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swap < 0 || swap >= all.length) return;

  const reordered = [...all];
  [reordered[index], reordered[swap]] = [reordered[swap]!, reordered[index]!];
  await db.$transaction(
    reordered.map((c, i) => db.cateringItem.update({ where: { id: c.id }, data: { displayOrder: i } })),
  );
  revalidateCatering();
}

// ------------------------------------------------------------
//  Public enquiry form
//  Lands in the dashboard's Messages inbox and emails the owner, with the
//  same anti-spam measures as the contact form in actions/messages.ts.
// ------------------------------------------------------------

const MIN_SECONDS_ON_FORM = 3;

// Every field is asked for, and the wording stays as gentle as the form's.
const EnquirySchema = z.object({
  name: z.string().trim().min(2, "Kindly let us know your name.").max(80),
  company: z.string().trim().min(1, "Kindly add your company or organisation.").max(120),
  email: z
    .string()
    .trim()
    .min(1, "Kindly add an email address we can reply to.")
    .email("That email address doesn't look quite right — would you mind checking it?")
    .max(120),
  phone: z.string().trim().min(7, "Kindly add a phone number, in case a quick call is easier.").max(30),
  interest: text(120),
  when: z.string().trim().min(1, "Kindly add a date and rough numbers. An estimate is perfectly fine.").max(120),
  details: z.string().trim().min(3, "Kindly share a sentence or two about what you have in mind.").max(2000),
});

export type EnquiryState = { ok: true } | { ok: false; error: string } | undefined;

export async function sendCateringEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  if (String(formData.get("website") ?? "").trim() !== "") return { ok: true };

  const startedAt = Number(formData.get("startedAt"));
  if (Number.isFinite(startedAt) && startedAt > 0 && (Date.now() - startedAt) / 1000 < MIN_SECONDS_ON_FORM) {
    return { ok: false, error: "Sorry, that was a little too quick for us. Would you mind sending it again?" };
  }

  const parsed = EnquirySchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    interest: formData.get("interest") ?? "",
    when: formData.get("when") ?? "",
    details: formData.get("details") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const d = parsed.data;

  // Only accept an interest the page actually offers.
  const page = await db.cateringPage.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const choices = interestChoices(page?.enquiryInterests);
  const interest = choices.some((c) => c.title === d.interest) ? d.interest : "";
  // A choice is needed only while the form offers some.
  if (choices.length > 0 && !interest) {
    return { ok: false, error: "Kindly choose the option closest to what you need." };
  }

  const subject = `Business enquiry${interest ? ` — ${interest}` : ""}`;
  const facts = [
    d.company ? `Company: ${d.company}` : "",
    interest ? `Interested in: ${interest}` : "",
    d.when ? `Date and guests: ${d.when}` : "",
  ].filter(Boolean);
  const body = [...facts, ...(facts.length ? [""] : []), d.details || "(No further details given.)"].join("\n");

  const email = d.email.toLowerCase();
  const recent = await db.message.findFirst({
    where: { email, body, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    select: { id: true },
  });
  if (recent) return { ok: true };

  try {
    await db.message.create({
      data: { name: d.name, email, phone: d.phone || null, subject, body },
    });
  } catch {
    return { ok: false, error: "Something went wrong sending that. Please try again." };
  }

  try {
    const settings = await db.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { email: true },
    });
    await notifyOwner(
      {
        subject: `${subject} from ${d.name}`,
        replyTo: d.email,
        lines: [
          `From: ${d.name} <${d.email}>`,
          ...(d.phone ? [`Phone: ${d.phone}`] : []),
          "",
          body,
          "",
          "Reply directly to this email to answer them.",
        ],
      },
      settings?.email,
    );
  } catch {
    /* saved in Messages either way */
  }

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true };
}
