import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { getMenu, getFeatured, getSettings, getHours, categoryImage, FALLBACK_IMAGES } from "@/lib/menu";
import { formatPrice, DAY_NAMES } from "@/lib/config";
import { bakeryJsonLd, jsonLdString } from "@/lib/seo";

/** Menu and content change from the dashboard, so don't cache indefinitely. */
export const revalidate = 60;

export default async function HomePage() {
  const [categories, featured, settings, hours] = await Promise.all([
    getMenu(),
    getFeatured(),
    getSettings(),
    getHours(),
  ]);

  const heroImage = settings?.heroImageUrl ?? "/brand/counter.jpg";
  const storyImage = settings?.storyImageUrl ?? "/brand/patience-plates.jpg";

  // Collapse consecutive days that share hours: "Mon – Thu   7:00 — 21:00".
  const grouped: { label: string; value: string }[] = [];
  for (const h of hours) {
    const value = h.isClosed ? "Closed" : `${h.openTime} — ${h.closeTime}`;
    const day = DAY_NAMES[h.dayOfWeek]!.slice(0, 3);
    const last = grouped.at(-1);
    if (last && last.value === value) {
      last.label = `${last.label.split(" – ")[0]} – ${day}`;
    } else {
      grouped.push({ label: day, value });
    }
  }

  return (
    <>
      {/* Tells search engines this is a bakery with an address, hours and a
          menu — feeds the local map pack and "open now" results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(bakeryJsonLd(settings, hours)) }}
      />
      <SiteHeader />

      {/* ---------- HERO ---------- */}
      <section className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-daar-ink text-center">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="Inside Daar — takeaway boxes on a paint-marbled table"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,15,.15),rgba(18,16,15,.55)_55%,rgba(18,16,15,.92))]" />
        </div>
        <div className="daar-tex-hero pointer-events-none absolute inset-0" />

        <div className="relative z-10 max-w-[960px] px-5 py-24">
          <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
            {settings?.addressLine ?? "Nairobi"} · Café &amp; Bakery
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.75rem,11vw,7rem)] leading-[0.94] tracking-[-0.015em] text-daar-bone">
            {settings?.heroHeadline ?? "Patience tastes better"}
          </h1>
          {settings?.heroSubcopy && (
            <p className="mt-6 text-[clamp(1.15rem,3vw,1.5rem)] font-light text-daar-cream/90">
              {settings.heroSubcopy}
            </p>
          )}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/menu"
              className="rounded-full bg-gradient-to-br from-daar-tan to-daar-ochre px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-ink transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Explore the menu
            </Link>
            <Link
              href="/visit"
              className="rounded-full border border-daar-cream px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:-translate-y-0.5 hover:bg-daar-cream hover:text-daar-ink"
            >
              Find us
            </Link>
          </div>
        </div>
      </section>

      <main className="flex-1 bg-daar-bone text-daar-ink">
        {/* ---------- INTRO ---------- */}
        {settings?.storyBody && (
          <section className="px-5 py-24">
            <Reveal className="mx-auto max-w-[760px] text-center">
              <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                Daar means home
              </p>
              <p className="mt-5 text-[clamp(1.15rem,3vw,1.5rem)] font-light leading-relaxed">
                {settings.storyBody}
              </p>
            </Reveal>
          </section>
        )}

        {/* ---------- CATEGORIES ---------- */}
        {categories.length > 0 && (
          <section className="px-5 pb-24">
            <div className="mx-auto max-w-[1240px]">
              <Reveal className="mx-auto mb-12 max-w-[640px] text-center">
                <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                  What we make
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,4rem)] leading-none">
                  Our Categories
                </h2>
                <div className="mx-auto mt-6 h-px w-16 bg-[linear-gradient(90deg,transparent,var(--daar-tan),transparent)]" />
              </Reveal>

              <Reveal className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                {categories.map((c, i) => {
                  const img = categoryImage(c, FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]!);
                  return (
                    <Link
                      key={c.id}
                      href={`/menu#${c.slug}`}
                      className="daar-arch group relative block aspect-[3/4] bg-daar-slate"
                    >
                      <Image
                        src={img.src}
                        alt={c.name}
                        fill
                        sizes="(min-width: 768px) 280px, 45vw"
                        className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-105"
                        {...(img.blur ? { placeholder: "blur" as const, blurDataURL: img.blur } : {})}
                      />
                      <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(18,16,15,.82))]" />
                      <span className="absolute inset-x-0 bottom-6 z-10 text-center font-[family-name:var(--font-display)] text-[1.15rem] text-daar-bone md:text-[1.5rem]">
                        {c.name}
                        <span className="mt-1 block font-[family-name:var(--font-label)] text-[10px] uppercase tracking-[0.18em] text-daar-tan">
                          {c.items.length} item{c.items.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </Reveal>
            </div>
          </section>
        )}
      </main>

      {/* ---------- CHEF'S SPECIAL ---------- */}
      {featured && (
        <section className="daar-tex daar-tex-dark bg-daar-ink px-5 py-24 text-daar-cream">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
            <Reveal className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-daar-slate">
              <span className="absolute left-4 top-4 z-10 rounded-full bg-gradient-to-br from-daar-tan to-daar-ochre px-4 py-1.5 font-[family-name:var(--font-label)] text-[10px] uppercase tracking-[0.18em] text-daar-ink">
                Chef&apos;s Special
              </span>
              <Image
                src={featured.imageUrl ?? "/brand/item-04.jpg"}
                alt={featured.imageAlt ?? featured.name}
                fill
                sizes="(min-width: 1024px) 600px, 92vw"
                className="object-cover"
                {...(featured.blurDataUrl
                  ? { placeholder: "blur" as const, blurDataURL: featured.blurDataUrl }
                  : {})}
              />
            </Reveal>

            <Reveal>
              <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
                {featured.category.name}
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,4rem)] leading-none">
                {featured.name}
              </h2>
              <p className="mt-4 font-[family-name:var(--font-label)] text-[clamp(1.15rem,3vw,1.5rem)] tracking-[0.06em] text-daar-tan">
                {formatPrice(featured.priceCents)}
              </p>
              {featured.description && (
                <p className="mt-6 font-light text-daar-cream/85">{featured.description}</p>
              )}
              <div className="mt-8">
                <Link
                  href={`/menu#${featured.category.slug}`}
                  className="inline-block rounded-full bg-gradient-to-br from-daar-tan to-daar-ochre px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-ink transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  See the full menu
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---------- STORY ---------- */}
      <section
        id="story"
        className="daar-tex daar-tex-ox scroll-mt-24 bg-daar-oxblood px-5 py-24 text-daar-cream"
      >
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <Reveal className="daar-arch relative aspect-[3/4] bg-daar-slate">
            <Image
              src={storyImage}
              alt="Daar plates reading ‘Patience tastes better’"
              fill
              sizes="(min-width: 1024px) 480px, 92vw"
              className="object-cover"
            />
          </Reveal>
          <Reveal>
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
              Our story
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,4rem)] leading-none">
              {settings?.storyTitle}
            </h2>
            {settings?.storyBody && (
              <p className="mt-6 line-clamp-4 font-light text-daar-cream/85">
                {settings.storyBody}
              </p>
            )}
            <Link
              href="/story"
              className="mt-8 inline-block rounded-full border border-daar-cream px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:-translate-y-0.5 hover:bg-daar-cream hover:text-daar-oxblood"
            >
              Read the full story
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------- VISIT ---------- */}
      <section id="visit" className="scroll-mt-24 bg-daar-bone px-5 py-24 text-daar-ink">
        <div className="mx-auto max-w-[1240px]">
          <Reveal className="mx-auto mb-12 max-w-[640px] text-center">
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
              Come in
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,4rem)] leading-none">
              Visit
            </h2>
            <div className="mx-auto mt-6 h-px w-16 bg-[linear-gradient(90deg,transparent,var(--daar-tan),transparent)]" />
            <Link
              href="/visit"
              className="mt-8 inline-block rounded-full bg-daar-oxblood px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:-translate-y-0.5 hover:bg-daar-ink"
            >
              Plan your visit
            </Link>
          </Reveal>

          <Reveal className="grid gap-10 md:grid-cols-3 md:gap-12">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-[1.3rem]">Where</h3>
              <p className="mt-3 text-sm text-daar-muted">{settings?.addressLine}</p>
            </div>

            <div>
              <h3 className="font-[family-name:var(--font-display)] text-[1.3rem]">Hours</h3>
              <dl className="mt-3">
                {grouped.map((g) => (
                  <div
                    key={g.label}
                    className="flex justify-between gap-4 border-b border-daar-rule py-2 text-sm last:border-0"
                  >
                    <dt>{g.label}</dt>
                    <dd className="tabular-nums text-daar-muted">{g.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="font-[family-name:var(--font-display)] text-[1.3rem]">Contact</h3>
              {/* py-2.5 keeps these at a comfortable thumb size on mobile. */}
              <div className="mt-1 text-sm text-daar-muted">
                {settings?.email && (
                  <a
                    href={`mailto:${settings.email}`}
                    className="block py-2.5 hover:text-daar-oxblood"
                  >
                    {settings.email}
                  </a>
                )}
                {settings?.phone && (
                  <a
                    href={`tel:${settings.phone.replace(/\s/g, "")}`}
                    className="block py-2.5 hover:text-daar-oxblood"
                  >
                    {settings.phone}
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter email={settings?.email} phone={settings?.phone} />
    </>
  );
}
