import Image from "next/image";
import { Reveal } from "./Reveal";
import {
  HEADING_SIZE_CLASS,
  CARD_SIZE_CLASS,
  headingSize,
  cardSize,
  bodyLines,
} from "@/lib/home-sections";

export type ValueCardView = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  imageAlt: string | null;
  blurDataUrl: string | null;
};

/**
 * How far each card is turned, in degrees.
 *
 * Fixed rather than random so the page renders identically on the server and
 * in the browser — a random tilt is a hydration mismatch waiting to happen,
 * and re-rolling it on every visit is movement nobody asked for. Cycled by
 * index, so any number of cards gets the same loose-paper look. Small numbers
 * on purpose: enough that the row does not read as a grid, not so much that
 * the type looks like a mistake.
 */
const TILT = [-1.6, 1.2, -1, 1.5];

/**
 * Stands in when a card has no photograph of its own.
 *
 * Cycled by index rather than one shared default, so a café that adds four
 * cards in an afternoon and photographs them next week still gets four
 * different pictures instead of the same one four times.
 */
const FALLBACK_IMAGES = [
  "/brand/item-04.jpg",
  "/brand/patience-plates.jpg",
  "/brand/item-05.jpg",
  "/brand/interior-01.jpg",
];

/**
 * "What we stand for" — the house rules, on cards you can swipe.
 *
 * EVERY WORD, PICTURE AND SIZE HERE COMES FROM THE DASHBOARD. This section
 * shipped with its four cards written into the page source, which meant the
 * café could not correct a typo on their own home page without a developer
 * and a deploy. They are rows in ValueCard now, and the heading, the label
 * above it and both size settings are columns on SiteSettings. Nothing in
 * this file decides what it says — only how it is set.
 *
 * THE SLIDING IS THE BROWSER'S, NOT OURS. This is a scroll-snap carousel —
 * `overflow-x-auto` with `snap-x snap-mandatory`, and every card a snap point.
 * A finger drag, a trackpad swipe, a shift-wheel and the arrow keys all work
 * because they are the platform's own gestures; there is no drag handler, no
 * touch-start maths and no carousel library. That matters more than it sounds
 * on a phone: hand-rolled swipe code is the thing that fights the browser for
 * the scroll and ends up feeling sticky on cheap Android hardware.
 *
 * The card width leaves the next one peeking in from the right. That peek is
 * the whole affordance — it is how someone knows to swipe without being told,
 * which is why there are no dots and no arrows to maintain.
 *
 * From `lg` up the carousel turns itself off (`lg:flex-wrap`,
 * `lg:overflow-visible`) and the cards simply sit in a row. Swiping is a phone
 * gesture; on a wide screen there is room to show everything at once, and a
 * carousel that hides content behind an interaction is worse than a row that
 * does not.
 *
 * With scripting off it is identical: this is all CSS, and every line and
 * photograph is in the markup.
 */
export function StandFor({
  eyebrow,
  heading,
  headingSize: headingSizeValue,
  cardSize: cardSizeValue,
  cards,
}: {
  eyebrow: string | null;
  heading: string;
  headingSize: string | null;
  cardSize: string | null;
  cards: ValueCardView[];
}) {
  // No cards means no section. A heading over an empty strip is worse than
  // nothing, and the café hiding every card is a legitimate way to take the
  // section down.
  if (cards.length === 0) return null;

  const size = CARD_SIZE_CLASS[cardSize(cardSizeValue)];
  const headingClass = HEADING_SIZE_CLASS[headingSize(headingSizeValue)];

  return (
    <section className="bg-daar-clay px-5 py-24 text-daar-bone md:py-28">
      <div className="mx-auto max-w-[1240px]">
        <Reveal className="max-w-[20ch]">
          {eyebrow && (
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream">
              {eyebrow}
            </p>
          )}
          <h2
            className={`mt-4 font-[family-name:var(--font-display)] italic leading-[0.98] tracking-[-0.01em] ${headingClass}`}
          >
            {heading}
          </h2>
        </Reveal>

        {/*
          Focusable and labelled on purpose. A region that scrolls but cannot be
          reached by keyboard is a WCAG failure — someone driving the page from
          the keyboard has no other way to reach the last card. tabIndex={0}
          makes the arrow keys work here the way they already do for a mouse.

          `-mx-5 px-5` lets the strip run to both edges of the phone while the
          first card still lines up with the heading above it: the padding is
          inside the scroller, so it becomes leading space rather than a margin
          the cards can never cross.
        */}
        <div
          role="region"
          aria-label={heading}
          tabIndex={0}
          className="daar-swipe -mx-5 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 py-6 md:mt-16 lg:mx-0 lg:flex-wrap lg:justify-start lg:gap-6 lg:overflow-visible lg:px-0"
        >
          {cards.map((card, i) => {
            const lines = bodyLines(card.body);
            const image = card.imageUrl ?? FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]!;

            return (
              <article
                key={card.id}
                // shrink-0 or flexbox squeezes every card into one screen and
                // there is nothing left to scroll. On lg the row wraps instead,
                // and basis-0/grow lets any number of cards share the width.
                className={`relative shrink-0 snap-start overflow-hidden rounded-[1.5rem] bg-daar-ink shadow-[0_24px_50px_-18px_rgba(18,16,15,0.7)] lg:min-w-[220px] lg:flex-1 lg:basis-0 lg:shrink ${size.card} lg:w-auto lg:max-w-none`}
                style={{ rotate: `${TILT[i % TILT.length]}deg` }}
              >
                <div className="relative aspect-[3/4]">
                  <Image
                    src={image}
                    // The café's own description when they wrote one. Falling
                    // back to the heading is better than an empty alt: the card
                    // is a titled thing, and "Craft" tells a screen reader more
                    // than silence does.
                    alt={card.imageAlt ?? card.title}
                    fill
                    sizes="(min-width: 1024px) 300px, 88vw"
                    className="object-cover"
                    {...(card.blurDataUrl
                      ? { placeholder: "blur" as const, blurDataURL: card.blurDataUrl }
                      : {})}
                  />
                  {/* Dark only where the words are, so the photograph keeps its
                      top two-thirds. */}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(18,16,15,0.5)_58%,rgba(18,16,15,0.93))]" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3
                    className={`font-[family-name:var(--font-display)] leading-tight text-daar-bone ${size.title}`}
                  >
                    {card.title}
                  </h3>
                  {lines.length > 0 && (
                    <div
                      className={`mt-3 space-y-1 font-light leading-snug text-daar-cream/90 ${size.body}`}
                    >
                      {lines.map((line, n) => (
                        <p key={n}>{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
