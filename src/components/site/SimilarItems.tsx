import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/config";

export type SimilarItem = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  imageAlt: string | null;
  blurDataUrl: string | null;
  isAvailable: boolean;
  categoryName: string;
};

/**
 * Related items.
 *
 * On phones this is a snap carousel; from `sm` up it becomes a grid.
 *
 * Built on CSS scroll-snap rather than a carousel library: it costs no
 * JavaScript, uses the browser's own inertial scrolling (which always feels
 * better than a re-implementation), and still works if the script fails.
 * The peeking next card is the affordance — no arrows needed on touch.
 */
export function SimilarItems({ items, heading }: { items: SimilarItem[]; heading: string }) {
  if (items.length === 0) return null;

  return (
    <section className="border-t border-daar-rule bg-daar-bone py-16">
      <div className="mx-auto max-w-[1240px]">
        <div className="px-5">
          <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
            {heading}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[clamp(1.5rem,4.5vw,2.25rem)] leading-none">
            You might also like
          </h2>
        </div>

        <ul
          className={[
            // phone: horizontal snap carousel, bleeding to the screen edge
            "daar-noscrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2",
            // sm+: a plain grid, no scrolling
            "sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible lg:grid-cols-4",
          ].join(" ")}
        >
          {items.map((item) => (
            <li
              key={item.id}
              // 72% width leaves the next card peeking, which is what tells
              // people the row scrolls.
              className="w-[72%] shrink-0 snap-start sm:w-auto sm:shrink"
            >
              <Link
                href={`/menu/${item.slug}`}
                className="group block rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-daar-tan focus-visible:ring-offset-4 focus-visible:ring-offset-daar-bone"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-daar-mist">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt ?? item.name}
                      fill
                      sizes="(min-width: 1024px) 280px, (min-width: 640px) 30vw, 72vw"
                      className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-105"
                      {...(item.blurDataUrl
                        ? { placeholder: "blur" as const, blurDataURL: item.blurDataUrl }
                        : {})}
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <span className="font-[family-name:var(--font-label)] text-[0.6rem] uppercase tracking-[0.18em] text-white/70">
                        Photo coming
                      </span>
                    </div>
                  )}

                  {!item.isAvailable && (
                    <div className="absolute inset-0 grid place-items-center bg-daar-ink/65">
                      <span className="border border-daar-bone px-3 py-1.5 font-[family-name:var(--font-label)] text-[0.6rem] uppercase tracking-[0.18em] text-daar-bone">
                        Sold out
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <h3 className="font-[family-name:var(--font-display)] text-[1.05rem] leading-tight transition-colors group-hover:text-daar-oxblood">
                    {item.name}
                  </h3>
                  <span className="shrink-0 font-[family-name:var(--font-label)] text-xs tracking-[0.06em] text-daar-oxblood">
                    {formatPrice(item.priceCents)}
                  </span>
                </div>
                <p className="mt-1 font-[family-name:var(--font-label)] text-[0.65rem] uppercase tracking-[0.18em] text-daar-muted">
                  {item.categoryName}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
