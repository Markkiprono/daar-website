import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getMenu, getSettings, getHours } from "@/lib/menu";
import { formatPrice, DAY_NAMES, SITE, CURRENCY } from "@/lib/config";
import { startingCents, changesPrice, type PickerGroup } from "@/lib/options";
import { PrintButton } from "@/components/site/PrintButton";

/** Prices and sold-out marks must be current at the moment of printing. */
export const dynamic = "force-dynamic";

type Category = Awaited<ReturnType<typeof getMenu>>[number];
type Item = Category["items"][number];

/**
 * The menu as a printable sheet, for the dashboard only.
 *
 * Two sheets, really, chosen with ?photos=1:
 *
 *   Price list — dense text. Cheap on ink, and what the counter and a
 *                supplier actually want.
 *   Photo book — one picture per dish, the name small and spaced, the price a
 *                bare number. This is the menu that goes on a table.
 *
 * The mode lives in the URL rather than in component state so both sheets are
 * server-rendered: the print dialog gets finished HTML, it prints identically
 * from any device, and a saved link reopens the same sheet.
 *
 * Sold-out items print struck through rather than omitted: a saved copy is
 * read later, and a missing line looks like an item that never existed rather
 * than one that ran out this morning.
 */
export default async function PrintMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ photos?: string }>;
}) {
  await requireAdmin();

  const { photos } = await searchParams;
  const withPhotos = photos === "1";

  const [categories, settings, hours] = await Promise.all([getMenu(), getSettings(), getHours()]);
  const withItems = categories.filter((c) => c.items.length > 0);

  /* Worth saying before the owner prints twenty pages: a photo book with
     holes in it is the thing they would otherwise notice too late. */
  const missingPhotos = withItems.reduce(
    (n, c) => n + c.items.filter((i) => !i.imageUrl).length,
    0,
  );

  const printedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const openLine = hours
    .filter((h) => !h.isClosed && h.openTime && h.closeTime)
    .map((h) => `${DAY_NAMES[h.dayOfWeek]!.slice(0, 3)} ${h.openTime}–${h.closeTime}`)
    .join(" · ");

  return (
    <div className="space-y-6">
      {/* Screen-only controls; the sheet below is what prints. */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="mr-auto">
          <h1 className="text-2xl font-medium">Print the menu</h1>
          <p className="text-sm text-neutral-500">
            {withItems.length === 0
              ? "Nothing to print yet — add items to the menu first."
              : "Choose “Save as PDF” in the print dialog to keep a copy."}
          </p>
        </div>
        <Link
          href="/admin/menu"
          className="rounded-full border border-neutral-200 px-4 py-2 text-xs text-neutral-600 transition hover:border-[#481819] hover:text-[#481819]"
        >
          Back to menu
        </Link>
        <PrintButton className="rounded-full bg-[#481819] px-5 py-2 text-xs uppercase tracking-[0.14em] text-white transition hover:opacity-90" />
      </div>

      {/* Which sheet. A segmented pair rather than a checkbox, because these
          are two different documents, not one document with a setting. */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="inline-flex rounded-full border border-neutral-200 p-1">
          <ModeLink href="/admin/print-menu" active={!withPhotos}>
            Price list
          </ModeLink>
          <ModeLink href="/admin/print-menu?photos=1" active={withPhotos}>
            With photos
          </ModeLink>
        </div>
        <p className="text-xs text-neutral-500">
          {withPhotos
            ? "Each course starts on a fresh page, like a printed book."
            : "Plain text on one continuous run of pages."}{" "}
          {withPhotos && missingPhotos > 0 && (
            <span className="text-[#481819]">
              {missingPhotos} {missingPhotos === 1 ? "item has" : "items have"} no photo yet.
            </span>
          )}
        </p>
      </div>

      {/* The sheet. White and bordered on screen so it reads as paper. */}
      <article className="mx-auto max-w-[820px] rounded-lg border border-neutral-200 bg-white p-8 text-neutral-900 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="border-b border-neutral-300 pb-5 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">
            {SITE.name}
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
            {SITE.descriptor} · {settings?.addressLine ?? `${SITE.area}, ${SITE.city}`}
          </p>
          {(settings?.phone || settings?.email) && (
            <p className="mt-1 text-xs text-neutral-500">
              {[settings?.phone, settings?.email].filter(Boolean).join(" · ")}
            </p>
          )}
          {openLine && <p className="mt-1 text-xs text-neutral-500">{openLine}</p>}
          {/* The photo sheet drops the currency off every plate to keep the
              numbers quiet, so it has to be said once, here. */}
          {withPhotos && (
            <p className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500">
              All prices in {CURRENCY}
            </p>
          )}
        </header>

        {withItems.length === 0 ? (
          <p className="py-16 text-center text-neutral-500">
            No menu items yet. Add them under Menu, then come back.
          </p>
        ) : withPhotos ? (
          withItems.map((category, i) => (
            <PlateSpread key={category.id} category={category} first={i === 0} />
          ))
        ) : (
          withItems.map((category) => <PriceList key={category.id} category={category} />)
        )}

        <footer className="mt-8 border-t border-neutral-300 pt-4 text-center text-xs text-neutral-500">
          Printed {printedOn} · {SITE.url.replace(/^https?:\/\//, "")}
        </footer>
      </article>
    </div>
  );
}

function ModeLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.14em] transition",
        active ? "bg-[#481819] text-white" : "text-neutral-600 hover:text-[#481819]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Shared parts
 * ------------------------------------------------------------------ */

/** Dietary marks only — a badge like "New" is a shop-window word, not paper. */
function dietaryOf(item: Item) {
  return item.tags.filter((t) => t.tag.kind === "DIETARY").map((t) => t.tag.name);
}

/**
 * The price to print, and whether it needs the word "from".
 *
 * Shaped exactly as the menu card shapes it — same helpers, same filtering by
 * what this item actually offers — because paper and screen disagreeing about
 * a price is how the café ends up arguing with a guest at the till. A drink
 * whose small is 300 must not print the item's own 350 as if it were final.
 */
function printedPrice(item: Item) {
  const offered = new Set(item.offeredOptions.map((o) => o.optionId));
  const groups: PickerGroup[] = item.optionGroups.map(({ group }) => ({
    id: group.id,
    name: group.name,
    select: group.select,
    pricing: group.pricing,
    helpText: group.helpText,
    options: group.options
      .filter((o) => offered.has(o.id))
      .map((o) => ({
        id: o.id,
        name: o.name,
        priceCents: o.priceCents,
        isAvailable: o.isAvailable,
      })),
  }));

  return { cents: startingCents(item.priceCents, groups), from: changesPrice(groups) };
}

/**
 * Paper cannot be tapped, so every choice is spelled out under the item —
 * this is the sheet the counter reads prices off.
 */
function OptionLines({ item, className = "" }: { item: Item; className?: string }) {
  const on = new Set(item.offeredOptions.map((o) => o.optionId));

  return (
    <>
      {item.optionGroups.map(({ group }) => {
        const choices = group.options.filter((o) => o.isAvailable && on.has(o.id));
        if (choices.length === 0) return null;

        return (
          <p key={group.id} className={`mt-0.5 text-neutral-600 ${className}`}>
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-neutral-500">
              {group.name}
            </span>{" "}
            {choices
              .map((o) =>
                group.pricing === "ABSOLUTE"
                  ? `${o.name} ${formatPrice(o.priceCents, { withCode: false })}`
                  : o.priceCents === 0
                    ? o.name
                    : `${o.name} +${formatPrice(o.priceCents, { withCode: false })}`,
              )
              .join(" · ")}
          </p>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Sheet one — the price list
 * ------------------------------------------------------------------ */

function PriceList({ category }: { category: Category }) {
  return (
    <section className="mt-7 break-inside-avoid">
      <h3 className="text-xl font-medium">{category.name}</h3>
      {category.description && (
        <p className="mt-0.5 text-sm text-neutral-500">{category.description}</p>
      )}

      <ul className="mt-2">
        {category.items.map((item) => {
          const dietary = dietaryOf(item);
          const price = printedPrice(item);

          return (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-4 border-b border-dotted border-neutral-300 py-2 last:border-0"
            >
              <div className="min-w-0">
                <p
                  className={
                    item.isAvailable ? "font-medium" : "font-medium text-neutral-400 line-through"
                  }
                >
                  {item.name}
                  {!item.isAvailable && (
                    <span className="ml-2 text-[0.65rem] uppercase tracking-[0.14em] no-underline">
                      Sold out
                    </span>
                  )}
                </p>
                {item.description && (
                  <p className="mt-0.5 text-sm text-neutral-600">{item.description}</p>
                )}
                {dietary.length > 0 && (
                  <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-neutral-500">
                    {dietary.join(" · ")}
                  </p>
                )}
                <OptionLines item={item} className="text-sm" />
              </div>
              <p className="shrink-0 tabular-nums">
                {price.from && (
                  <span className="mr-1 text-[0.65rem] uppercase tracking-[0.14em] text-neutral-500">
                    from
                  </span>
                )}
                {formatPrice(price.cents)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Sheet two — the photo book
 * ------------------------------------------------------------------ */

/**
 * One course per page: its name centred between two rules, the plates in two
 * columns beneath. That is the shape of a printed table menu, where a course
 * is something you turn to rather than something you scroll past.
 *
 * Two columns and not three: at A4 inside a 14mm margin, three columns leave
 * each photo about 55mm across, which is a thumbnail — and the whole point of
 * this sheet is the food.
 */
function PlateSpread({ category, first }: { category: Category; first: boolean }) {
  return (
    <section className={first ? "daar-plates mt-8" : "daar-plates mt-8 break-before-page print:pt-6"}>
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-neutral-300" />
        <h3 className="text-center font-[family-name:var(--font-display)] text-lg uppercase tracking-[0.3em]">
          {category.name}
        </h3>
        <span className="h-px flex-1 bg-neutral-300" />
      </div>
      {category.description && (
        <p className="mt-2 text-center text-sm text-neutral-500">{category.description}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-7">
        {category.items.map((item) => (
          <Plate key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function Plate({ item }: { item: Item }) {
  const dietary = dietaryOf(item);
  const price = printedPrice(item);

  return (
    <figure className="break-inside-avoid">
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        {item.imageUrl ? (
          /* Eager, never lazy: a print dialog does not scroll, so an image
             that never entered the viewport prints as an empty box. */
          <Image
            src={item.imageUrl}
            alt={item.imageAlt ?? item.name}
            fill
            sizes="400px"
            loading="eager"
            className={item.isAvailable ? "object-cover" : "object-cover opacity-45"}
          />
        ) : (
          <div className="grid h-full place-items-center">
            <span className="text-[0.6rem] uppercase tracking-[0.18em] text-neutral-400">
              No photo
            </span>
          </div>
        )}
      </div>

      <figcaption className="mt-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h4
            className={[
              "text-[0.78rem] font-semibold uppercase tracking-[0.12em]",
              item.isAvailable ? "" : "text-neutral-400 line-through",
            ].join(" ")}
          >
            {item.name}
          </h4>
          <span
            className={[
              "shrink-0 text-[0.9rem] tabular-nums",
              item.isAvailable ? "" : "text-neutral-400",
            ].join(" ")}
          >
            {price.from && (
              <span className="mr-1 text-[0.6rem] uppercase tracking-[0.14em] text-neutral-500">
                from
              </span>
            )}
            {formatPrice(price.cents, { withCode: false })}
          </span>
        </div>

        {!item.isAvailable && (
          <p className="mt-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-neutral-500">
            Sold out
          </p>
        )}
        {item.description && (
          <p className="mt-1 text-[0.72rem] leading-snug text-neutral-600">{item.description}</p>
        )}
        {dietary.length > 0 && (
          <p className="mt-1 text-[0.6rem] uppercase tracking-[0.14em] text-neutral-500">
            {dietary.join(" · ")}
          </p>
        )}
        <OptionLines item={item} className="text-[0.72rem] leading-snug" />
      </figcaption>
    </figure>
  );
}
