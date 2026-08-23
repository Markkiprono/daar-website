import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MenuBrowser } from "@/components/site/MenuBrowser";
import { getMenu, getSettings } from "@/lib/menu";
import { menuJsonLd, jsonLdString, socialImage } from "@/lib/seo";
import { SITE } from "@/lib/config";
import { changesPrice, startingCents, type PickerGroup } from "@/lib/options";

/**
 * Rendered per request, never at build time.
 *
 * The image is built with no database. Anything prerendered then ran its
 * queries against nothing, survive() turned the failure into empty data, and
 * Next cached that empty render as a good page — the menu read "being
 * updated" for a minute after every deploy.
 *
 * Declared rather than inferred. Reaching for a request-time API inside the
 * query layer only marks a route dynamic if the build happens to execute it,
 * and a build with no database skips exactly the pages that need it most.
 * This says so outright, so it cannot depend on what the build could reach.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const { openGraph, twitter } = socialImage(
    settings?.heroImageUrl,
    "/brand/item-tart.jpg",
    `Pastries on the counter at ${SITE.name}`,
  );

  return {
    title: "Menu",
    description:
      "Pastries, bread, coffee, breakfast and cakes, baked fresh each morning in Westlands. See what's on the counter today and what's already sold out.",
    alternates: { canonical: "/menu" },
    openGraph: {
      ...openGraph,
      title: `Menu — ${SITE.name}`,
      description: "Baked this morning. The counter updates through the day.",
      url: `${SITE.url}/menu`,
    },
    twitter,
  };
}

export default async function MenuPage() {
  const [categories, settings] = await Promise.all([getMenu(), getSettings()]);
  const withItems = categories.filter((c) => c.items.length > 0);

  return (
    <>
      {/* The full menu as structured data — item names, prices and photos,
          eligible for menu rich results on searches like "menus in Nairobi". */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(menuJsonLd(withItems)) }}
      />
      <SiteHeader solid />

      <section className="daar-tex daar-tex-dark bg-daar-ink px-5 pb-14 pt-20 text-center text-daar-cream">
        <div className="mx-auto max-w-[760px]">
          <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
            Baked this morning
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,4rem)] leading-none text-daar-bone">
            The Menu
          </h1>
          <p className="mt-5 font-light text-daar-cream/80">
            Everything below is made in our kitchen. Sold-out items are marked — the counter
            updates through the day.
          </p>
        </div>
      </section>

      <main className="flex-1 bg-daar-bone pb-16 text-daar-ink">
        {withItems.length === 0 ? (
          <div className="mx-auto max-w-[1240px] px-5 py-32 text-center">
            <p className="font-[family-name:var(--font-display)] text-2xl">The menu is being updated.</p>
            <p className="mt-3 text-sm text-daar-muted">Please check back shortly.</p>
          </div>
        ) : (
          <MenuBrowser
            categories={withItems.map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
              description: c.description,
              items: c.items.map((item) => {
                // Shaped here rather than in the browser: only the names and
                // two numbers need to cross to the client, not every option
                // row for every item on the menu.
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

                return {
                  ...item,
                  fromCents: startingCents(item.priceCents, groups),
                  hasChoices: changesPrice(groups),
                  optionNames: groups.flatMap((g) =>
                    g.options.filter((o) => o.isAvailable).map((o) => o.name),
                  ),
                };
              }),
            }))}
          />
        )}
      </main>

      <SiteFooter email={settings?.email} phone={settings?.phone} />
    </>
  );
}
