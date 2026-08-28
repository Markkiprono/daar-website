/**
 * The size choices for the editable home page sections.
 *
 * One list, read by both ends: the dashboard builds its dropdowns from these
 * labels, and the public component looks up the Tailwind classes by the same
 * key. When the two were going to be separate — an enum in the schema and a
 * `switch` in the component — the first person to add "Extra large" would have
 * added it in one place and wondered why the page ignored it.
 *
 * Stored as plain strings rather than a Prisma enum so adding a size is a
 * change to this file, not a database migration. Nothing here trusts the
 * stored value: an unrecognised one falls back to the default, which is what
 * happens if a size is ever removed while a café still has it selected.
 *
 * Deliberately free of server-only imports — the admin previews these in the
 * browser.
 */

export type SizeOption<T extends string> = {
  value: T;
  /** What the dashboard calls it. */
  label: string;
  /** A word on what it is for, shown under the control. */
  hint: string;
};

export type HeadingSize = "sm" | "md" | "lg" | "xl";
export type CardSize = "sm" | "md" | "lg";

export const HEADING_SIZE_OPTIONS: SizeOption<HeadingSize>[] = [
  { value: "sm", label: "Small", hint: "Quiet — sits back and lets the cards lead." },
  { value: "md", label: "Medium", hint: "Balanced against the rest of the page." },
  { value: "lg", label: "Large", hint: "The default. Reads as a statement." },
  { value: "xl", label: "Extra large", hint: "Fills the width on a phone." },
];

export const CARD_SIZE_OPTIONS: SizeOption<CardSize>[] = [
  { value: "sm", label: "Small", hint: "More cards visible at once; less room for words." },
  { value: "md", label: "Medium", hint: "The default." },
  { value: "lg", label: "Large", hint: "One card at a time on a phone, bigger photographs." },
];

export const DEFAULT_HEADING_SIZE: HeadingSize = "lg";
export const DEFAULT_CARD_SIZE: CardSize = "md";

/**
 * Type sizes for the heading, as a clamp() so each choice is still fluid
 * between a phone and a desktop — the setting changes the whole range rather
 * than picking one fixed size that can only be right on one screen.
 */
export const HEADING_SIZE_CLASS: Record<HeadingSize, string> = {
  sm: "text-[clamp(1.6rem,5vw,2.4rem)]",
  md: "text-[clamp(2rem,7vw,3.4rem)]",
  lg: "text-[clamp(2.5rem,9vw,5rem)]",
  xl: "text-[clamp(3rem,12vw,6.5rem)]",
};

/**
 * Card width, and the type on it.
 *
 * The vw width is what decides how much of the next card peeks in, which is
 * the only thing telling a visitor the strip can be swiped — so "Large" stops
 * at 88vw rather than 100vw. A card filling the screen edge to edge looks like
 * a section, not like a deck, and nobody swipes a section.
 */
export const CARD_SIZE_CLASS: Record<CardSize, { card: string; title: string; body: string }> = {
  sm: {
    card: "w-[62vw] max-w-[260px]",
    title: "text-[clamp(1.15rem,3.6vw,1.4rem)]",
    body: "text-[0.8rem]",
  },
  md: {
    card: "w-[78vw] max-w-[330px]",
    title: "text-[clamp(1.4rem,4.5vw,1.8rem)]",
    body: "text-[0.9rem]",
  },
  lg: {
    card: "w-[88vw] max-w-[400px]",
    title: "text-[clamp(1.6rem,5.4vw,2.1rem)]",
    body: "text-[1rem]",
  },
};

/**
 * The size of every section heading down the home page — "What today looks
 * like", "Visit", "Our story" and the rest.
 *
 * One setting for all of them rather than one per section. Nine independent
 * heading sizes is not a feature, it is nine chances for the page to end up
 * looking assembled by committee; the café wants "bigger headings", not a
 * spreadsheet. The `lg` values are exactly what these headings measured when
 * they were written into the page, so choosing nothing changes nothing.
 */
export const SECTION_HEADING_SIZE_CLASS: Record<HeadingSize, string> = {
  sm: "text-[clamp(1.5rem,4.5vw,2.2rem)]",
  md: "text-[clamp(1.75rem,5.5vw,2.9rem)]",
  lg: "text-[clamp(2rem,7vw,4rem)]",
  xl: "text-[clamp(2.4rem,8.5vw,5.2rem)]",
};

/** The stored value, or the default when it is missing or no longer offered. */
export function headingSize(value: string | null | undefined): HeadingSize {
  return HEADING_SIZE_OPTIONS.some((o) => o.value === value)
    ? (value as HeadingSize)
    : DEFAULT_HEADING_SIZE;
}

export function cardSize(value: string | null | undefined): CardSize {
  return CARD_SIZE_OPTIONS.some((o) => o.value === value) ? (value as CardSize) : DEFAULT_CARD_SIZE;
}

/**
 * The card body as it is set on the page: one line per line the café typed.
 *
 * Blank lines are dropped rather than rendered as gaps — someone pressing
 * return twice means a break between thoughts, not an empty paragraph, and on
 * a card this size an empty paragraph pushes the last line off the bottom.
 */
export function bodyLines(body: string | null | undefined): string[] {
  if (!body) return [];
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
