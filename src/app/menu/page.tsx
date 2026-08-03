import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MenuBrowser } from "@/components/site/MenuBrowser";
import { getMenu, getSettings } from "@/lib/menu";
import { menuJsonLd, jsonLdString } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Menu",
  description:
    "The Daar Cafe & Bakery menu — pastries, coffee, breakfast, lunch and cakes, baked fresh in Nairobi.",
};

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
              items: c.items,
            }))}
          />
        )}
      </main>

      <SiteFooter email={settings?.email} phone={settings?.phone} />
    </>
  );
}
