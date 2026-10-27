/**
 * Catering page helpers that both the public page and the dashboard use.
 *
 * Free of server-only imports so the admin forms can read the same list of
 * sections in the browser.
 */

export const CATERING_SECTIONS = ["offer", "step", "point", "option"] as const;
export type CateringSection = (typeof CATERING_SECTIONS)[number];

export function isCateringSection(value: unknown): value is CateringSection {
  return CATERING_SECTIONS.includes(value as CateringSection);
}

/** One entry per non-empty line, as typed in the dashboard. */
export function lines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * The enquiry form's choices, typed one per line as "Title | explanation".
 * The explanation is optional.
 */
export function interestChoices(value: string | null | undefined): { title: string; hint: string }[] {
  return lines(value).map((line) => {
    const [title, ...rest] = line.split("|");
    return { title: title!.trim(), hint: rest.join("|").trim() };
  }).filter((c) => c.title);
}

/** Card padding and type per card-size setting. */
export const CATERING_CARD_CLASS = {
  sm: { pad: "p-5", title: "text-[1.3rem]", body: "text-[0.85rem]" },
  md: { pad: "p-7", title: "text-[1.6rem]", body: "text-[0.92rem]" },
  lg: { pad: "p-9", title: "text-[1.9rem]", body: "text-[1rem]" },
} as const;
