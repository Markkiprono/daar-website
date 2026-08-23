/**
 * Pricing for menu item options.
 *
 * One item, one photo, several prices: a cappuccino is still a cappuccino
 * whether the beans are Kenyan or Brazilian. The arithmetic lives here rather
 * than in the picker because four places need to agree about it — the
 * interactive picker, the menu card's "from" price, the printed menu and the
 * structured data. When they disagree, the café gets asked why the website
 * said one number and the till said another.
 *
 * Deliberately pure: no database, no React. Both the server components and the
 * browser-side picker import the same functions.
 */

/** The shape the picker needs. Mirrors the Option row, minus the bookkeeping. */
export type PickerOption = {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
};

export type PickerGroup = {
  id: string;
  name: string;
  /** ONE renders as radios, MANY as checkboxes. */
  select: "ONE" | "MANY";
  /** SURCHARGE adds to the base price; ABSOLUTE replaces it. */
  pricing: "SURCHARGE" | "ABSOLUTE";
  helpText: string | null;
  options: PickerOption[];
};

/** groupId → the option ids chosen in that group. */
export type Selection = Record<string, string[]>;

/**
 * What the customer currently owes.
 *
 * ABSOLUTE replaces the *base*, not the running total — a large latte with
 * caramel is (large price + caramel), not (caramel alone). Getting this
 * backwards is the whole reason the two pricing modes are named rather than
 * expressed as a signed number.
 */
export function totalCents(baseCents: number, groups: PickerGroup[], selection: Selection): number {
  let base = baseCents;
  let extras = 0;

  for (const group of groups) {
    const chosenIds = selection[group.id] ?? [];
    if (chosenIds.length === 0) continue;

    for (const option of group.options) {
      if (!chosenIds.includes(option.id)) continue;
      // An option withdrawn while someone had it selected must not keep
      // charging for itself.
      if (!option.isAvailable) continue;

      if (group.pricing === "ABSOLUTE") {
        base = option.priceCents;
      } else {
        extras += option.priceCents;
      }
    }
  }

  return base + extras;
}

/**
 * The number the menu card advertises.
 *
 * Surcharges can only ever push the price up, so the item's own price is the
 * floor and "from" is honest. Sizes are the exception: if a drink's small is
 * 300, advertising the item's 350 would be wrong, so an ABSOLUTE group takes
 * over and the cheapest size becomes the floor.
 */
export function startingCents(baseCents: number, groups: PickerGroup[]): number {
  const sized = groups.find((g) => g.pricing === "ABSOLUTE");
  if (sized) {
    const available = sized.options.filter((o) => o.isAvailable);
    if (available.length > 0) return Math.min(...available.map((o) => o.priceCents));
  }
  return baseCents;
}

/**
 * Whether to write "from KES 350" rather than "KES 350".
 *
 * A group whose every option is free — milk choice, say — is a real choice but
 * not a price one, so it must not put "from" on the card. Otherwise every card
 * ends up hedged and the word stops meaning anything.
 */
export function changesPrice(groups: PickerGroup[]): boolean {
  return groups.some(
    (g) =>
      g.pricing === "ABSOLUTE" ||
      g.options.some((o) => o.isAvailable && o.priceCents !== 0),
  );
}

/**
 * Toggle one option, honouring the group's selection mode. Returns a new
 * Selection; never mutates.
 *
 * Re-picking the chosen option in a ONE group clears it, which is what lets
 * someone back out to the plain item price without reloading the page.
 */
export function toggle(selection: Selection, group: PickerGroup, optionId: string): Selection {
  const current = selection[group.id] ?? [];
  const has = current.includes(optionId);

  let next: string[];
  if (group.select === "ONE") {
    next = has ? [] : [optionId];
  } else {
    next = has ? current.filter((id) => id !== optionId) : [...current, optionId];
  }

  return { ...selection, [group.id]: next };
}

/** Flat list of what was chosen, in menu order — for the summary line. */
export function chosenOptions(groups: PickerGroup[], selection: Selection): PickerOption[] {
  const out: PickerOption[] = [];
  for (const group of groups) {
    const ids = selection[group.id] ?? [];
    for (const option of group.options) {
      if (ids.includes(option.id) && option.isAvailable) out.push(option);
    }
  }
  return out;
}

/**
 * One line describing what a group does, for the item form's tick boxes.
 * Kept here so the item form and the options manager cannot drift apart.
 */
export function summarise(select: "ONE" | "MANY", pricing: "SURCHARGE" | "ABSOLUTE"): string {
  const pick = select === "ONE" ? "pick one" : "pick any";
  const price = pricing === "ABSOLUTE" ? "sets the price" : "added on top";
  return `${pick} · ${price}`;
}
