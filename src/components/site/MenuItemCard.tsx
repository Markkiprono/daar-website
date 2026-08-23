import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/config";

type Tag = { tag: { id: string; name: string; slug: string; kind: string } };

export type MenuItemForCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  imageAlt: string | null;
  blurDataUrl: string | null;
  isAvailable: boolean;
  tags: Tag[];
  /** What the card advertises — the base price, or the cheapest size. */
  fromCents: number;
  /** Whether a choice can actually move the price, i.e. write "from". */
  hasChoices: boolean;
  /** Names only, and only so search can match "caramel" to a cappuccino. */
  optionNames: string[];
};

/**
 * Product imagery is RECTANGULAR — the arch is reserved for atmosphere and
 * brand moments. That rule came out of the Phase 0 review.
 */
export function MenuItemCard({ item, priority = false }: { item: MenuItemForCard; priority?: boolean }) {
  const badges = item.tags.filter((t) => t.tag.kind === "BADGE");
  const dietary = item.tags.filter((t) => t.tag.kind === "DIETARY");

  return (
    <Link
      href={`/menu/${item.slug}`}
      className="group flex flex-col rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-daar-tan focus-visible:ring-offset-4 focus-visible:ring-offset-daar-bone"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-daar-mist">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.imageAlt ?? item.name}
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
            priority={priority}
            className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-105"
            {...(item.blurDataUrl
              ? { placeholder: "blur" as const, blurDataURL: item.blurDataUrl }
              : {})}
          />
        ) : (
          <div className="grid h-full place-items-center">
            <span className="font-[family-name:var(--font-label)] text-[0.65rem] uppercase tracking-[0.18em] text-white/70">
              Photo coming
            </span>
          </div>
        )}

        {!item.isAvailable && (
          <div className="absolute inset-0 grid place-items-center bg-daar-ink/65">
            <span className="border border-daar-bone px-4 py-2 font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.18em] text-daar-bone">
              Sold out
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-[1.2rem] leading-tight transition-colors group-hover:text-daar-oxblood">
          {item.name}
        </h3>
        <span className="shrink-0 font-[family-name:var(--font-label)] text-sm tracking-[0.06em] text-daar-oxblood">
          {/* "from" only when a choice can move the number — otherwise every
              card ends up hedged and the word stops meaning anything. */}
          {item.hasChoices && (
            <span className="mr-1 text-[0.75em] uppercase tracking-[0.14em] text-daar-muted">
              from
            </span>
          )}
          {formatPrice(item.fromCents)}
        </span>
      </div>

      {(badges.length > 0 || dietary.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map(({ tag }) => (
            <span
              key={tag.id}
              className={[
                "rounded-[2px] border px-2.5 py-1 font-[family-name:var(--font-label)] text-[10px] uppercase tracking-[0.14em]",
                tag.slug === "bestseller"
                  ? "border-daar-oxblood bg-daar-oxblood text-daar-cream"
                  : tag.slug === "new"
                    ? "border-transparent bg-gradient-to-br from-daar-tan to-daar-ochre text-daar-ink"
                    : "border-daar-rule text-daar-muted",
              ].join(" ")}
            >
              {tag.name}
            </span>
          ))}
          {dietary.map(({ tag }) => (
            <span
              key={tag.id}
              className="rounded-[2px] border border-[#7B8B5A] px-2.5 py-1 font-[family-name:var(--font-label)] text-[10px] uppercase tracking-[0.14em] text-[#5F6E42]"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
