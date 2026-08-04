import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getMenu, getSettings, getHours } from "@/lib/menu";
import { formatPrice, DAY_NAMES, SITE } from "@/lib/config";
import { PrintButton } from "@/components/site/PrintButton";

/** Prices and sold-out marks must be current at the moment of printing. */
export const dynamic = "force-dynamic";

/**
 * The menu as a printable sheet, for the dashboard only.
 *
 * Deliberately plain — no photography, no navigation — because it exists to
 * become a PDF or a piece of paper: a counter card, a supplier's copy, or a
 * handout. Everything is server-rendered text, so it prints identically from
 * any device and needs no JavaScript.
 *
 * Sold-out items print struck through rather than omitted: a saved copy is
 * read later, and a missing line looks like an item that never existed rather
 * than one that ran out this morning.
 */
export default async function PrintMenuPage() {
  await requireAdmin();

  const [categories, settings, hours] = await Promise.all([getMenu(), getSettings(), getHours()]);
  const withItems = categories.filter((c) => c.items.length > 0);

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

      {/* The sheet. White and bordered on screen so it reads as paper. */}
      <article className="mx-auto max-w-[820px] rounded-lg border border-neutral-200 bg-white p-8 text-neutral-900 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="border-b border-neutral-300 pb-5 text-center">
          <h2 className="text-3xl font-medium">{SITE.name}</h2>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
            {SITE.descriptor} · {settings?.addressLine ?? `${SITE.area}, ${SITE.city}`}
          </p>
          {(settings?.phone || settings?.email) && (
            <p className="mt-1 text-xs text-neutral-500">
              {[settings?.phone, settings?.email].filter(Boolean).join(" · ")}
            </p>
          )}
          {openLine && <p className="mt-1 text-xs text-neutral-500">{openLine}</p>}
        </header>

        {withItems.length === 0 ? (
          <p className="py-16 text-center text-neutral-500">
            No menu items yet. Add them under Menu, then come back.
          </p>
        ) : (
          withItems.map((category) => (
            <section key={category.id} className="mt-7 break-inside-avoid">
              <h3 className="text-xl font-medium">{category.name}</h3>
              {category.description && (
                <p className="mt-0.5 text-sm text-neutral-500">{category.description}</p>
              )}

              <ul className="mt-2">
                {category.items.map((item) => {
                  const dietary = item.tags
                    .filter((t) => t.tag.kind === "DIETARY")
                    .map((t) => t.tag.name);

                  return (
                    <li
                      key={item.id}
                      className="flex items-baseline justify-between gap-4 border-b border-dotted border-neutral-300 py-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className={item.isAvailable ? "font-medium" : "font-medium text-neutral-400 line-through"}>
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
                      </div>
                      <p className="shrink-0 tabular-nums">{formatPrice(item.priceCents)}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        <footer className="mt-8 border-t border-neutral-300 pt-4 text-center text-xs text-neutral-500">
          Printed {printedOn} · {SITE.url.replace(/^https?:\/\//, "")}
        </footer>
      </article>
    </div>
  );
}
