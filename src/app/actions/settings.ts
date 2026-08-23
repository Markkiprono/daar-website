"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { getStorage, buildKey } from "@/lib/storage";
import { processLogo } from "@/lib/logo-upload";
import { mapEmbedSrc, isMapEmbed, MAP_EMBED_HELP } from "@/lib/map-embed";

export type SettingsState = { ok?: true; error?: string } | undefined;

/**
 * A Google Maps embed URL, and nothing else.
 *
 * This value ends up as an <iframe src>. Accepting an arbitrary URL would let
 * anyone who reaches the dashboard embed a page of their choosing inside the
 * site, so the host is pinned. Guests are told exactly where to get the link.
 */
// Rules live in src/lib/map-embed.ts so the admin preview and this validation
// apply exactly the same test — see the note there about the pinned host.
const MapEmbed = z
  .string()
  .transform(mapEmbedSrc)
  .refine((v) => v === "" || isMapEmbed(v), MAP_EMBED_HELP);

const SettingsSchema = z.object({
  // Contact
  addressLine: z.string().trim().min(1, "Address is required").max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(120).optional().or(z.literal("")),
  mapEmbedUrl: MapEmbed.optional().or(z.literal("")),

  // Structured-data only. Bounds are the real limits of each coordinate, so a
  // transposed pair or a stray character is rejected rather than published.
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
  priceRange: z.string().trim().max(8).optional().or(z.literal("")),

  // Socials
  instagram: z.string().trim().max(200).optional().or(z.literal("")),
  tiktok: z.string().trim().max(200).optional().or(z.literal("")),
  facebook: z.string().trim().max(200).optional().or(z.literal("")),

  // Home page
  heroHeadline: z.string().trim().min(1, "Hero headline is required").max(120),
  heroSubcopy: z.string().trim().max(300).optional().or(z.literal("")),

  // The chef, on the home page
  chefName: z.string().trim().max(80).optional().or(z.literal("")),
  chefRole: z.string().trim().max(80).optional().or(z.literal("")),
  chefQuote: z.string().trim().max(600).optional().or(z.literal("")),

  // Story page
  storyTitle: z.string().trim().min(1, "Story title is required").max(120),
  storyBody: z.string().trim().max(6000).optional().or(z.literal("")),

  // Reservations
  reservationsEnabled: z.coerce.boolean().optional(),
  maxPartySize: z.coerce.number().int().min(1).max(50),
  reservationNote: z.string().trim().max(300).optional().or(z.literal("")),

  currency: z.string().trim().min(1).max(8),
});

/** A social field may be a full URL or a bare handle; store a usable URL. */
function socialUrl(value: string, base: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${base}${v.replace(/^@/, "")}`;
}

export async function updateSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await assertAdmin();

  const parsed = SettingsSchema.safeParse({
    addressLine: formData.get("addressLine"),
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    email: formData.get("email") ?? "",
    mapEmbedUrl: formData.get("mapEmbedUrl") ?? "",
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
    priceRange: formData.get("priceRange") ?? "",
    instagram: formData.get("instagram") ?? "",
    tiktok: formData.get("tiktok") ?? "",
    facebook: formData.get("facebook") ?? "",
    heroHeadline: formData.get("heroHeadline"),
    heroSubcopy: formData.get("heroSubcopy") ?? "",
    storyTitle: formData.get("storyTitle"),
    storyBody: formData.get("storyBody") ?? "",
    reservationsEnabled: formData.get("reservationsEnabled") === "on",
    maxPartySize: formData.get("maxPartySize") || 12,
    reservationNote: formData.get("reservationNote") ?? "",
    currency: formData.get("currency") || "KES",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const d = parsed.data;

  // --- logo artwork ---------------------------------------------------
  // Three states per slot: a new upload replaces, "remove" clears, and
  // neither leaves whatever is already there untouched.
  const logo: { logoMarkUrl?: string | null; logoWordmarkUrl?: string | null } = {};
  try {
    for (const slot of ["mark", "wordmark"] as const) {
      const field = slot === "mark" ? "logoMarkUrl" : "logoWordmarkUrl";

      if (formData.get(`remove-${slot}`) === "on") {
        logo[field] = null;
        continue;
      }

      const file = formData.get(`logo-${slot}`) as File | null;
      if (!file || file.size === 0) continue;

      const processed = await processLogo(file);
      const storage = await getStorage();
      const key = buildKey(`${slot}.${processed.extension}`, "brand");
      const stored = await storage.put(key, processed.buffer, processed.contentType);
      logo[field] = stored.url;
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not process that logo file." };
  }

  const socials: Record<string, string> = {};
  const ig = socialUrl(d.instagram ?? "", "https://instagram.com/");
  const tt = socialUrl(d.tiktok ?? "", "https://tiktok.com/@");
  const fb = socialUrl(d.facebook ?? "", "https://facebook.com/");
  if (ig) socials.instagram = ig;
  if (tt) socials.tiktok = tt;
  if (fb) socials.facebook = fb;

  try {
    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: {
        addressLine: d.addressLine,
        phone: d.phone || null,
        whatsapp: d.whatsapp || null,
        email: d.email || null,
        mapEmbedUrl: d.mapEmbedUrl || null,
        // Stored as text: schema.org wants the string form, and this avoids
        // a float silently rounding the last decimal off a map pin.
        latitude: d.latitude === "" || d.latitude === undefined ? null : String(d.latitude),
        longitude: d.longitude === "" || d.longitude === undefined ? null : String(d.longitude),
        priceRange: d.priceRange || null,
        socials,
        heroHeadline: d.heroHeadline,
        heroSubcopy: d.heroSubcopy || "",
        chefName: d.chefName || null,
        chefRole: d.chefRole || null,
        chefQuote: d.chefQuote || null,
        storyTitle: d.storyTitle,
        storyBody: d.storyBody || "",
        reservationsEnabled: d.reservationsEnabled ?? false,
        maxPartySize: d.maxPartySize,
        reservationNote: d.reservationNote || null,
        currency: d.currency,
        ...logo,
      },
      create: {
        id: "singleton",
        addressLine: d.addressLine,
        heroHeadline: d.heroHeadline,
        chefName: d.chefName || null,
        chefRole: d.chefRole || null,
        chefQuote: d.chefQuote || null,
        storyTitle: d.storyTitle,
        currency: d.currency,
        socials,
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save settings." };
  }

  // Every public page reads these.
  for (const p of ["/", "/menu", "/story", "/visit", "/reserve", "/privacy"]) revalidatePath(p);
  // Item pages are prerendered and read all of this, but nothing used to
  // refresh them — so an edit sat stale until the 60s window lapsed, and
  // the first visitor after that got the old page while it regenerated.
  revalidatePath("/menu/[slug]", "page");
  revalidatePath("/admin/settings");

  return { ok: true };
}

const HoursSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  isClosed: z.coerce.boolean().optional(),
});

export async function updateHours(formData: FormData) {
  await assertAdmin();

  // One submit saves all seven rows.
  for (let day = 0; day < 7; day++) {
    const parsed = HoursSchema.safeParse({
      dayOfWeek: day,
      openTime: formData.get(`open-${day}`) ?? "",
      closeTime: formData.get(`close-${day}`) ?? "",
      isClosed: formData.get(`closed-${day}`) === "on",
    });
    if (!parsed.success) continue;

    const d = parsed.data;
    await db.openingHours.upsert({
      where: { dayOfWeek: day },
      update: {
        openTime: d.isClosed ? null : d.openTime || null,
        closeTime: d.isClosed ? null : d.closeTime || null,
        isClosed: d.isClosed ?? false,
      },
      create: {
        dayOfWeek: day,
        openTime: d.isClosed ? null : d.openTime || null,
        closeTime: d.isClosed ? null : d.closeTime || null,
        isClosed: d.isClosed ?? false,
      },
    });
  }

  for (const p of ["/", "/visit", "/reserve"]) revalidatePath(p);
  revalidatePath("/menu/[slug]", "page");
  revalidatePath("/admin/settings");
}
