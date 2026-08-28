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
 * index, so any number of cards gets the same loose-deck look. The
 * alternating sign matters more than the size: it is what leaves the cards
 * underneath showing a corner instead of hiding in perfect register.
 */
const TILT = [-2.2, 1.7, -1.3, 2];

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
 * "What we stand for" — a deck of cards that stacks up as the page scrolls.
 *
 * THE CARDS PILE UP, THEY DO NOT SLIDE SIDEWAYS. Each card is `sticky` with a
 * `top` slightly lower than the one before it, so scrolling down carries a
 * card up to park while the next slides over it, leaving the earlier ones
 * showing as a stack of tilted edges underneath. That is the whole mechanism:
 * the browser's own sticky positioning — no scroll listener, no transform
 * maths, no library, and nothing to stutter on a cheap phone.
 *
 * An earlier version made this a horizontal swipe strip. That was a
 * misreading of what was asked for, and it is named here so nobody "fixes" it
 * back: scrolling sideways hides cards behind a gesture and needs arrows
 * bolted on for anyone using a mouse, while stacking shows every card on the
 * way past and asks nothing of the reader at all.
 *
 * Every word, picture and size comes from the dashboard. This section shipped
 * with its cards written into the page source, which meant the café could not
 * correct a typo on their own home page without a developer and a deploy.
 * They are rows in ValueCard now, and the heading, the label above it and
 * both size settings are columns on SiteSettings. Nothing in this file
 * decides what it says — only how it is set.
 *
 * With scripting off it behaves identically: this is CSS, and every line and
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
  // No cards means no section. A heading over an empty deck is worse than
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
          The padding gives the last card somewhere to rest before the section
          ends. Without it the whole deck unsticks the moment the final card
          arrives, and every card appears to drop off the screen at once.
        */}
        <div className="mt-12 pb-[12vh] md:mt-16">
          {cards.map((card, i) => {
            const lines = bodyLines(card.body);
            const image = card.imageUrl ?? FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]!;

            return (
              <div
                key={card.id}
                // The sticky element is this wrapper rather than the card, so
                // the card itself is free to carry the rotation: a transform
                // on a sticky element is the sort of thing that works until a
                // browser decides otherwise.
                //
                // The bottom margin is what creates the scroll distance
                // between one card parking and the next arriving. Without it
                // they would all stick at once and there would be no deck.
                className={`sticky mx-auto mb-[22vh] w-full last:mb-0 ${size.card}`}
                // Each card parks a little lower than the one before, and
                // that offset is exactly the sliver of the earlier card left
                // showing underneath.
                style={{ top: `calc(5.5rem + ${i * 0.9}rem)` }}
              >
                <article
                  className="relative overflow-hidden rounded-[1.5rem] bg-daar-ink shadow-[0_30px_60px_-20px_rgba(18,16,15,0.75)]"
                  style={{ rotate: `${TILT[i % TILT.length]}deg` }}
                >
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={image}
                      // The café's own description when they wrote one.
                      // Falling back to the heading beats an empty alt: the
                      // card is a titled thing, and "Craft" tells a screen
                      // reader more than silence does.
                      alt={card.imageAlt ?? card.title}
                      fill
                      sizes="(min-width: 640px) 470px, 92vw"
                      className="object-cover"
                      {...(card.blurDataUrl
                        ? { placeholder: "blur" as const, blurDataURL: card.blurDataUrl }
                        : {})}
                    />
                    {/* Dark only where the words are, so the photograph keeps
                        its top two-thirds. */}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(18,16,15,0.5)_58%,rgba(18,16,15,0.93))]" />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
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
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
