"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/dal";
import { OptionPricing, OptionSelect } from "@/generated/prisma/client";

export type OptionState = { error?: string; ok?: boolean } | undefined;

/**
 * Option groups are shared across items on purpose, so every write here can
 * change several menu pages at once. Item pages are listed explicitly because
 * they are the only place the picker actually renders.
 */
function refresh() {
  revalidatePath("/admin/options");
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  revalidatePath("/menu/[slug]", "page");
  revalidatePath("/");
}

const GroupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  select: z.enum(["ONE", "MANY"]),
  pricing: z.enum(["SURCHARGE", "ABSOLUTE"]),
  helpText: z.string().trim().max(120).optional().or(z.literal("")),
});

const OptionSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(60),
  /** Entered in whole shillings, stored as minor units — as MenuItem does. */
  price: z.coerce.number().min(0, "Price cannot be negative").max(1_000_000),
});

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = base || "group";
  let candidate = root;
  let n = 1;
  for (;;) {
    const clash = await db.optionGroup.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash || clash.id === excludeId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

// ---------------------------------------------------------------- groups

export async function createOptionGroup(_prev: OptionState, formData: FormData): Promise<OptionState> {
  await assertAdmin();

  const parsed = GroupSchema.safeParse({
    name: formData.get("name"),
    select: formData.get("select") ?? "ONE",
    pricing: formData.get("pricing") ?? "SURCHARGE",
    helpText: formData.get("helpText") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const last = await db.optionGroup.findFirst({
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  await db.optionGroup.create({
    data: {
      name: parsed.data.name,
      slug: await uniqueSlug(slugify(parsed.data.name)),
      select: parsed.data.select as OptionSelect,
      pricing: parsed.data.pricing as OptionPricing,
      helpText: parsed.data.helpText || null,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });

  refresh();
  return { ok: true };
}

export async function updateOptionGroup(
  id: string,
  _prev: OptionState,
  formData: FormData,
): Promise<OptionState> {
  await assertAdmin();

  const parsed = GroupSchema.safeParse({
    name: formData.get("name"),
    select: formData.get("select") ?? "ONE",
    pricing: formData.get("pricing") ?? "SURCHARGE",
    helpText: formData.get("helpText") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await db.optionGroup.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug: await uniqueSlug(slugify(parsed.data.name), id),
      select: parsed.data.select as OptionSelect,
      pricing: parsed.data.pricing as OptionPricing,
      helpText: parsed.data.helpText || null,
    },
  });

  refresh();
  return { ok: true };
}

/**
 * Refused while the group is still ticked onto items, mirroring how a category
 * with items in it cannot be deleted. Deleting silently would strip choices off
 * several menu items at once with nothing on screen to say so.
 */
export async function deleteOptionGroup(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id"));

  const inUse = await db.menuItemOptionGroup.count({ where: { groupId: id } });
  if (inUse > 0) return;

  await db.optionGroup.delete({ where: { id } });
  refresh();
}

// --------------------------------------------------------------- options

export async function createOption(_prev: OptionState, formData: FormData): Promise<OptionState> {
  await assertAdmin();

  const parsed = OptionSchema.safeParse({
    groupId: formData.get("groupId"),
    name: formData.get("name"),
    price: formData.get("price") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const last = await db.option.findFirst({
    where: { groupId: parsed.data.groupId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  await db.option.create({
    data: {
      groupId: parsed.data.groupId,
      name: parsed.data.name,
      priceCents: Math.round(parsed.data.price * 100),
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });

  refresh();
  return { ok: true };
}

export async function updateOption(
  id: string,
  _prev: OptionState,
  formData: FormData,
): Promise<OptionState> {
  await assertAdmin();

  const parsed = OptionSchema.safeParse({
    groupId: formData.get("groupId"),
    name: formData.get("name"),
    price: formData.get("price") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await db.option.update({
    where: { id },
    data: { name: parsed.data.name, priceCents: Math.round(parsed.data.price * 100) },
  });

  refresh();
  return { ok: true };
}

export async function deleteOption(formData: FormData): Promise<void> {
  await assertAdmin();
  await db.option.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

/**
 * Sold out for the afternoon, without losing the price. The picker keeps
 * showing it, struck through, and refuses to charge for it.
 */
export async function toggleOptionAvailability(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id"));

  const option = await db.option.findUnique({ where: { id }, select: { isAvailable: true } });
  if (!option) return;

  await db.option.update({ where: { id }, data: { isAvailable: !option.isAvailable } });
  refresh();
}

/** Swap an option with its neighbour. Same shape as moveCategory. */
export async function moveOption(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id"));
  const up = String(formData.get("direction")) === "up";

  const current = await db.option.findUnique({ where: { id } });
  if (!current) return;

  const neighbour = await db.option.findFirst({
    where: {
      groupId: current.groupId,
      displayOrder: up ? { lt: current.displayOrder } : { gt: current.displayOrder },
    },
    orderBy: { displayOrder: up ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await db.$transaction([
    db.option.update({ where: { id: current.id }, data: { displayOrder: neighbour.displayOrder } }),
    db.option.update({ where: { id: neighbour.id }, data: { displayOrder: current.displayOrder } }),
  ]);

  refresh();
}
