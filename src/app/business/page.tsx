import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { BusinessTabs } from "@/components/site/BusinessTabs";
import { CateringEnquiryForm } from "@/components/site/CateringEnquiryForm";
import { getSettings } from "@/lib/menu";
import { getCateringPage, getCateringItems } from "@/lib/catering";
import { lines, interestChoices, CATERING_CARD_CLASS } from "@/lib/catering-shared";
import {
  HEADING_SIZE_CLASS,
  SECTION_HEADING_SIZE_CLASS,
  headingSize,
  cardSize,
} from "@/lib/home-sections";
import { SITE } from "@/lib/config";
import { socialImage } from "@/lib/seo";

/** Rendered per request — see the note in visit/page.tsx. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCateringPage();
  const name = page?.navLabel || "For Business";
  const { openGraph, twitter } = socialImage(
    page?.heroImageUrl,
    "/brand/item-tart.jpg",
    `${SITE.name} for business`,
  );
  const description =
    page?.heroBody ||
    "Corporate events, office catering, and fresh pastry and bread for restaurants, hotels, schools and supermarkets in Nairobi.";
  return {
    title: name,
    description,
    alternates: { canonical: "/business" },
    openGraph: {
      ...openGraph,
      title: `${name} — ${SITE.name}`,
      description,
      url: `${SITE.url}/business`,
    },
    twitter,
  };
}

/* ---------- shared pieces ---------- */

const eyebrowCls =
  "font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.3em] text-daar-tan";
const primaryBtn =
  "biz-btn inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-daar-tan to-daar-ochre px-8 py-4 text-center font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-ink hover:-translate-y-0.5 hover:brightness-110 sm:w-auto";
const ghostBtn =
  "biz-btn inline-flex w-full items-center justify-center rounded-full border border-daar-tan/60 px-8 py-4 text-center font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan hover:-translate-y-0.5 hover:border-daar-tan hover:bg-daar-tan/10 sm:w-auto";
const cardBg = "rounded-[6px] border border-white/[0.07] bg-[#1d1b19]";
/** Anchored sections land below the sticky header and tab strip. */
const anchor = "scroll-mt-32 sm:scroll-mt-36";

function Eyebrow({ index, label }: { index?: number; label: string }) {
  if (!label) return null;
  return (
    <p className={`flex items-center gap-3 ${eyebrowCls}`}>
      {index !== undefined && (
        <>
          <span>{String(index).padStart(2, "0")}</span>
          <span aria-hidden className="biz-line h-px w-8 bg-daar-tan/70" />
        </>
      )}
      {label}
    </p>
  );
}

/** A photograph that zooms slowly on hover. Nothing renders without one. */
function Photo({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className: string;
  priority?: boolean;
}) {
  if (!src) return null;
  return (
    <div className={`biz-photo relative overflow-hidden bg-[#2a2825] ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="biz-img object-cover" />
    </div>
  );
}

function Section({ id, tone, children }: { id?: string; tone: "a" | "b"; children: ReactNode }) {
  return (
    <section
      id={id}
      className={[
        anchor,
        "overflow-hidden border-t border-white/[0.06] px-5 py-16 sm:py-24 lg:py-28",
        tone === "a" ? "bg-[#181614]" : "bg-daar-ink",
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1040px]">{children}</div>
    </section>
  );
}

export default async function BusinessPage() {
  const [page, items, settings] = await Promise.all([
    getCateringPage(),
    getCateringItems(),
    getSettings(),
  ]);
  if (!page?.enabled) notFound();

  const hSize = headingSize(page.headingSize);
  const card = CATERING_CARD_CLASS[cardSize(page.cardSize)];
  const sectionHeading = `font-[family-name:var(--font-display)] leading-[1.05] text-daar-bone ${SECTION_HEADING_SIZE_CLASS[hSize]}`;

  const offers = items.filter((i) => i.section === "offer");
  const steps = items.filter((i) => i.section === "step");
  const points = items.filter((i) => i.section === "point");
  const options = items.filter((i) => i.section === "option");

  // Numbered in the order they appear, so hiding one never leaves a gap.
  const shown = [
    page.corporateEnabled && { id: "corporate", label: page.corporateNavLabel },
    page.hospitalityEnabled && { id: "hospitality", label: page.hospitalityNavLabel },
    page.supermarketEnabled && { id: "supermarkets", label: page.supermarketNavLabel },
  ].filter(Boolean) as { id: string; label: string }[];
  const number = (id: string) => shown.findIndex((s) => s.id === id) + 1;

  const tags = lines(page.hospitalityTags);
  const interests = interestChoices(page.enquiryInterests);

  return (
    <>
      <SiteHeader solid />

      <main className="biz-page flex-1 bg-daar-ink text-daar-cream">
        {/* ---------- OPENING ---------- */}
        <section className="relative overflow-hidden bg-[#181614] px-5 pb-16 pt-12 sm:pb-24 sm:pt-20">
          {/* A soft gold glow behind the photograph. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(210,175,138,0.10),transparent_65%)]"
          />
          <div className="relative mx-auto grid max-w-[1040px] items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="order-2 lg:order-1">
              <Reveal>
                <Eyebrow label={page.heroEyebrow} />
              </Reveal>
              <Reveal delay={120}>
                <h1
                  className={`mt-5 font-[family-name:var(--font-display)] leading-[1.02] text-daar-bone sm:mt-6 ${HEADING_SIZE_CLASS[hSize]}`}
                >
                  {page.heroHeading}
                </h1>
              </Reveal>
              {page.heroBody && (
                <Reveal delay={240}>
                  <p className="mt-6 max-w-[460px] text-[1rem] font-light leading-relaxed text-daar-cream/85">
                    {page.heroBody}
                  </p>
                </Reveal>
              )}
              <Reveal delay={360} className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
                {page.heroPrimaryLabel && (
                  <a href="#enquire" className={primaryBtn}>
                    {page.heroPrimaryLabel}
                  </a>
                )}
                {page.heroSecondaryLabel && shown[0] && (
                  <a href={`#${shown[0].id}`} className={ghostBtn}>
                    {page.heroSecondaryLabel}
                  </a>
                )}
              </Reveal>
            </div>
            <Reveal rise className="order-1 lg:order-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] bg-[#2a2825] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
                <Image
                  src={page.heroImageUrl ?? "/brand/item-tart.jpg"}
                  alt={page.heroImageAlt ?? `Pastry from ${SITE.name}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 500px, 92vw"
                  className="daar-drift object-cover"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- TABS ---------- */}
        {shown.length > 1 && <BusinessTabs tabs={shown} />}

        {/* ---------- CORPORATE ---------- */}
        {page.corporateEnabled && (
          <Section id="corporate" tone="a">
            <div className="grid items-end gap-5 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <Eyebrow index={number("corporate")} label={page.corporateEyebrow} />
                <h2 className={`mt-5 ${sectionHeading}`}>{page.corporateHeading}</h2>
              </Reveal>
              {page.corporateBody && (
                <Reveal delay={150}>
                  <p className="font-light leading-relaxed text-daar-cream/80">{page.corporateBody}</p>
                </Reveal>
              )}
            </div>

            {offers.length > 0 && (
              <div className="mt-10 grid gap-5 sm:mt-12 md:grid-cols-2">
                {offers.map((o, i) => (
                  <Reveal key={o.id} rise delay={i * 120}>
                    <article className={`biz-card h-full overflow-hidden ${cardBg}`}>
                      <Photo
                        src={o.imageUrl}
                        alt={o.imageAlt ?? o.title}
                        sizes="(min-width: 768px) 510px, 92vw"
                        className="aspect-[16/10] border-b border-white/[0.07]"
                      />
                      <div className={card.pad}>
                        <h3 className={`font-[family-name:var(--font-display)] text-daar-bone ${card.title}`}>
                          {o.title}
                        </h3>
                        {o.body && (
                          <p className={`mt-4 font-light leading-relaxed text-daar-cream/75 ${card.body}`}>
                            {o.body}
                          </p>
                        )}
                        {lines(o.details).length > 0 && (
                          <ul className={`mt-5 space-y-2.5 font-light text-daar-cream/85 ${card.body}`}>
                            {lines(o.details).map((line) => (
                              <li key={line} className="flex gap-3">
                                <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-daar-tan" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}

            {page.corporateNote && (
              <Reveal>
                <p className="mt-8 max-w-[640px] font-light italic leading-relaxed text-daar-cream/75">
                  {page.corporateNote}
                </p>
              </Reveal>
            )}

            <Reveal className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {page.corporatePrimaryLabel && (
                <a href="#enquire" className={primaryBtn}>
                  {page.corporatePrimaryLabel}
                </a>
              )}
              {page.corporateSecondaryLabel && page.catalogueUrl && (
                <a
                  href={page.catalogueUrl}
                  className={ghostBtn}
                  download={page.catalogueUrl.startsWith("/") ? "" : undefined}
                >
                  {page.corporateSecondaryLabel}
                </a>
              )}
            </Reveal>
          </Section>
        )}

        {/* ---------- HOSPITALITY ---------- */}
        {page.hospitalityEnabled && (
          <Section id="hospitality" tone="b">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <Reveal>
                  <Eyebrow index={number("hospitality")} label={page.hospitalityEyebrow} />
                  <h2 className={`mt-5 ${sectionHeading}`}>{page.hospitalityHeading}</h2>
                </Reveal>
                {page.hospitalityBody && (
                  <Reveal delay={120}>
                    <p className="mt-6 font-light leading-relaxed text-daar-cream/80">{page.hospitalityBody}</p>
                  </Reveal>
                )}
                {tags.length > 0 && (
                  <Reveal delay={240}>
                    <ul className="mt-6 flex flex-wrap gap-2.5">
                      {tags.map((t) => (
                        <li
                          key={t}
                          className="rounded-full border border-white/15 px-4 py-2 text-[0.8rem] font-light text-daar-cream/85 transition-colors duration-500 hover:border-daar-tan/60 hover:text-daar-tan"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                )}
              </div>
              <Reveal rise>
                <Photo
                  src={page.hospitalityImageUrl ?? "/brand/item-05.jpg"}
                  alt={page.hospitalityImageAlt ?? `A baker at ${SITE.name}`}
                  sizes="(min-width: 1024px) 500px, 92vw"
                  className="aspect-[4/3] rounded-[6px] sm:aspect-[3/2]"
                />
              </Reveal>
            </div>

            {steps.length > 0 && (
              <div className="mt-14 sm:mt-16">
                {page.stepsHeading && (
                  <Reveal>
                    <h3 className="font-[family-name:var(--font-display)] text-[clamp(1.4rem,3.4vw,1.9rem)] text-daar-bone">
                      {page.stepsHeading}
                    </h3>
                  </Reveal>
                )}
                <ol
                  className="mt-7 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-[repeat(var(--steps),minmax(0,1fr))]"
                  style={{ "--steps": Math.min(steps.length, 6) } as CSSProperties}
                >
                  {steps.map((s, i) => (
                    <Reveal as="li" key={s.id} delay={i * 110}>
                      <span aria-hidden className="biz-line block h-px w-full bg-gradient-to-r from-daar-tan/80 to-white/15" />
                      <p className="mt-5 font-[family-name:var(--font-display)] text-[2rem] leading-none text-daar-tan">
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-4 text-[0.95rem] font-medium text-daar-bone">{s.title}</p>
                      {s.body && (
                        <p className={`mt-2 font-light leading-relaxed text-daar-cream/70 ${card.body}`}>{s.body}</p>
                      )}
                    </Reveal>
                  ))}
                </ol>
              </div>
            )}

            {page.hospitalityButtonLabel && (
              <Reveal className="mt-12">
                <a href="#enquire" className={primaryBtn}>
                  {page.hospitalityButtonLabel}
                </a>
              </Reveal>
            )}
          </Section>
        )}

        {/* ---------- SUPERMARKETS ---------- */}
        {page.supermarketEnabled && (
          <Section id="supermarkets" tone="a">
            <div className="grid items-end gap-5 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <Eyebrow index={number("supermarkets")} label={page.supermarketEyebrow} />
                <h2 className={`mt-5 ${sectionHeading}`}>{page.supermarketHeading}</h2>
              </Reveal>
              {page.supermarketBody && (
                <Reveal delay={150}>
                  <p className="font-light leading-relaxed text-daar-cream/80">{page.supermarketBody}</p>
                </Reveal>
              )}
            </div>

            {page.supermarketImageUrl && (
              <Reveal rise className="mt-10 sm:mt-12">
                <Photo
                  src={page.supermarketImageUrl}
                  alt={page.supermarketImageAlt ?? `Bread from ${SITE.name}`}
                  sizes="(min-width: 1040px) 1040px, 92vw"
                  className="aspect-[16/9] rounded-[6px] sm:aspect-[21/8]"
                />
              </Reveal>
            )}

            {points.length > 0 && (
              <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
                {points.map((p, i) => (
                  <Reveal key={p.id} delay={i * 110}>
                    <article className={`biz-card h-full overflow-hidden ${cardBg}`}>
                      <Photo
                        src={p.imageUrl}
                        alt={p.imageAlt ?? p.title}
                        sizes="(min-width: 1024px) 340px, (min-width: 640px) 46vw, 92vw"
                        className="aspect-[16/10] border-b border-white/[0.07]"
                      />
                      <div className={card.pad}>
                        <span aria-hidden className="biz-line block h-px w-10 bg-daar-tan" />
                        <h3 className={`mt-5 font-[family-name:var(--font-display)] text-daar-bone ${card.title}`}>
                          {p.title}
                        </h3>
                        {p.body && (
                          <p className={`mt-3 font-light leading-relaxed text-daar-cream/75 ${card.body}`}>{p.body}</p>
                        )}
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}

            {options.length > 0 && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {options.map((o, i) => (
                  <Reveal key={o.id} rise delay={i * 140}>
                    <article
                      className={[
                        "biz-card group relative h-full overflow-hidden rounded-[6px] border",
                        o.highlight
                          ? "border-daar-tan/60 bg-[linear-gradient(150deg,rgba(210,175,138,0.13),rgba(29,27,25,1)_55%)]"
                          : "border-white/[0.08] bg-[#1d1b19]",
                      ].join(" ")}
                    >
                      <Photo
                        src={o.imageUrl}
                        alt={o.imageAlt ?? o.title}
                        sizes="(min-width: 768px) 510px, 92vw"
                        className="aspect-[16/9] border-b border-white/[0.07]"
                      />
                      {/* A large letter in the corner: A, B, C… */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -bottom-8 right-4 font-[family-name:var(--font-display)] text-[9rem] leading-none text-daar-tan/[0.07] transition-transform duration-700 group-hover:-translate-y-2 sm:text-[11rem]"
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div className={`relative ${card.pad} pb-10`}>
                        {o.eyebrow && (
                          <span
                            className={[
                              "inline-block rounded-full border px-3.5 py-1.5 font-[family-name:var(--font-label)] text-[0.62rem] uppercase tracking-[0.26em]",
                              o.highlight
                                ? "border-daar-tan/70 bg-daar-tan/15 text-daar-tan"
                                : "border-white/15 text-daar-cream/70",
                            ].join(" ")}
                          >
                            {o.eyebrow}
                          </span>
                        )}
                        <h3 className={`mt-5 font-[family-name:var(--font-display)] text-daar-bone ${card.title}`}>
                          {o.title}
                        </h3>
                        <span
                          aria-hidden
                          className={`biz-line mt-4 block h-px w-16 ${o.highlight ? "bg-daar-tan" : "bg-white/25"}`}
                        />
                        {o.body && (
                          <p className={`mt-4 max-w-[420px] font-light leading-relaxed text-daar-cream/80 ${card.body}`}>
                            {o.body}
                          </p>
                        )}
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}

            {page.supermarketButtonLabel && (
              <Reveal className="mt-10">
                <a href="#enquire" className={primaryBtn}>
                  {page.supermarketButtonLabel}
                </a>
              </Reveal>
            )}
          </Section>
        )}

        {/* ---------- QUOTE (off unless the café adds one) ---------- */}
        {page.quoteEnabled && page.quoteText && (
          <section className="border-t border-white/[0.06] bg-[#0f0d0c] px-5 py-16 text-center sm:py-24">
            <Reveal className="mx-auto max-w-[760px]">
              <blockquote className="font-[family-name:var(--font-display)] text-[clamp(1.35rem,3.6vw,2.1rem)] italic leading-snug text-daar-bone">
                &ldquo;{page.quoteText}&rdquo;
              </blockquote>
              {page.quoteName && (
                <p className="mt-7 font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.3em] text-daar-tan">
                  {page.quoteName}
                </p>
              )}
            </Reveal>
          </section>
        )}

        {/* ---------- ENQUIRE ---------- */}
        <section
          id="enquire"
          className={`${anchor} border-t border-white/[0.06] bg-[#141210] px-5 py-16 sm:py-24 lg:py-28`}
        >
          <div className="mx-auto grid max-w-[1040px] gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
            <Reveal>
              <Eyebrow label={page.enquiryEyebrow} />
              <h2 className={`mt-5 ${sectionHeading}`}>{page.enquiryHeading}</h2>
              {page.enquiryBody && (
                <p className="mt-6 font-light leading-relaxed text-daar-cream/80">{page.enquiryBody}</p>
              )}
              <div className="mt-8 space-y-3 text-[0.95rem] font-light">
                {settings?.phone && (
                  <a
                    href={`tel:${settings.phone.replace(/\s/g, "")}`}
                    className="block transition-colors hover:text-daar-tan"
                  >
                    {settings.phone}
                  </a>
                )}
                {settings?.email && (
                  <a href={`mailto:${settings.email}`} className="block text-daar-tan hover:underline">
                    {settings.email}
                  </a>
                )}
                {settings?.addressLine && <p>{settings.addressLine}</p>}
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="rounded-[6px] border border-white/[0.07] bg-[#1b1917] p-5 sm:p-8">
                <CateringEnquiryForm
                  question={page.enquiryQuestion}
                  interests={interests}
                  buttonLabel={page.enquiryButtonLabel}
                />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter email={settings?.email} phone={settings?.phone} />
    </>
  );
}
