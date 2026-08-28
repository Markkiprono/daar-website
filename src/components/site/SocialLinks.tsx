import type { ReactNode } from "react";
import type { SocialLink } from "@/lib/socials";

/**
 * Glyphs for the platforms the dashboard offers.
 *
 * Inline SVG rather than an icon package: three shapes do not justify a
 * dependency, and these have to inherit `currentColor` so the same markup
 * works on the ink footer and anywhere else it is dropped later.
 *
 * Instagram is drawn with strokes because its mark genuinely is an outline.
 * TikTok is a filled path because a stroked version of that note is not
 * recognisable at 20px, and being recognisable is the entire job of a social
 * icon — nobody reads the label.
 */
const ICONS: Record<string, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: (
    <path
      fill="currentColor"
      stroke="none"
      d="M16.83 5.9a4.6 4.6 0 0 1-1.2-2.9h-2.98v11.9a2.42 2.42 0 1 1-1.72-2.32V9.5a5.42 5.42 0 1 0 4.7 5.37V9.63a7.5 7.5 0 0 0 4.14 1.26V7.9a4.55 4.55 0 0 1-2.94-2Z"
    />
  ),
  facebook: (
    <path
      fill="currentColor"
      stroke="none"
      d="M14.6 3.2h-2.1a4.6 4.6 0 0 0-4.6 4.6v2.3H5.6v3.3h2.3v7.4h3.4v-7.4h2.4l.5-3.3h-2.9V7.8c0-.7.5-1.2 1.2-1.2h1.9V3.2Z"
    />
  ),
};

/**
 * The café's social links as icons.
 *
 * Renders nothing at all when the dashboard holds none, so a café that has not
 * filled them in gets no empty row and no stray heading.
 *
 * A platform we have no glyph for still gets a link — its name in words —
 * rather than being silently dropped. Adding a key to the dashboard should
 * never mean a link that quietly goes nowhere, which is the failure this whole
 * component exists to end.
 */
export function SocialLinks({
  links,
  className = "",
}: {
  links: SocialLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {links.map((social) => {
        const icon = ICONS[social.key];
        return (
          <li key={social.key}>
            <a
              href={social.url}
              target="_blank"
              // noreferrer as well as noopener: the target page should not be
              // told which of our pages sent it.
              rel="noopener noreferrer"
              // The icon carries no text, so the accessible name has to come
              // from here — otherwise a screen reader announces "link" three
              // times and the row is useless.
              aria-label={`${social.label} (opens in a new tab)`}
              // h-11 w-11 is the 44px minimum touch target. The icon inside is
              // 20px; the rest is the tappable area, which is the difference
              // between a link and a link somebody can actually hit on a phone.
              className="grid h-11 w-11 place-items-center rounded-full text-daar-cream/80 transition hover:bg-daar-cream/10 hover:text-daar-tan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-daar-tan"
            >
              {icon ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {icon}
                </svg>
              ) : (
                <span className="font-[family-name:var(--font-label)] text-[0.65rem] uppercase tracking-[0.1em]">
                  {social.label.slice(0, 2)}
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
