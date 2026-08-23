import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { HeroMedia } from "@/components/site/HeroMedia";
import { Stack } from "@/components/site/Stack";
import { Marquee, type Frame } from "@/components/site/Marquee";
import { getFeatured, getSettings, getHours, getGallery } from "@/lib/menu";
import { formatPrice, DAY_NAMES, SITE } from "@/lib/config";
import { bakeryJsonLd, jsonLdString } from "@/lib/seo";

/** Menu and content change from the dashboard, so don't cache indefinitely. */
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

export default async function HomePage() {
  const [featured, settings, hours, gallery] = await Promise.all([
    getFeatured(),
    getSettings(),
    getHours(),
    getGallery(),
  ]);

  /**
   * The band: a few plates among the room, not a catalogue of the menu.
   *
   * getGallery draws five at random in the database, so it is a different
   * handful every visit rather than the same photographs forever. That works
   * because this page renders per request — see the note on force-dynamic
   * above.
   *
   * Interleaved rather than concatenated: plates first then rooms would read
   * as two separate strips joined end to end.
   */
  const ROOM: Frame[] = [
    { src: "/brand/interior-02.jpg", alt: "The room at Daar" },
    { src: "/brand/terrace-drink.jpg", alt: "A drink on the terrace" },
    { src: "/brand/packaging-marble.jpg", alt: "Daar packaging" },
    { src: "/brand/counter.jpg", alt: "The counter" },
    { src: "/brand/interior-01.jpg", alt: "Brushed steel against plaster" },
    { src: "/brand/patience-plates.jpg", alt: "Plates reading ‘Patience tastes better’" },
  ];

  const plates: Frame[] = gallery.map((g) => ({
    src: g.imageUrl,
    alt: g.imageAlt ?? g.name,
    blur: g.blurDataUrl,
  }));

  const strip: Frame[] = [];
  for (let i = 0; i < Math.max(plates.length, ROOM.length); i += 1) {
    if (plates[i]) strip.push(plates[i]);
    if (ROOM[i]) strip.push(ROOM[i]);
  }
  const galleryTop = strip.filter((_, i) => i % 2 === 0);
  const galleryBottom = strip.filter((_, i) => i % 2 === 1);

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
        <HeroMedia
          image={heroImage}
          video={null}
          alt="Inside Daar — takeaway boxes on a paint-marbled table"
        />
        <div className="daar-tex-hero pointer-events-none absolute inset-0" />

        <div className="relative z-10 max-w-[960px] px-5 py-24">
          {/* The neighbourhood, not the postal address. This printed the full
              addressLine, which was fine while that said "Nairobi, Kenya" and
              became two cramped uppercase lines under the navbar the moment a
              real one was entered. The full address belongs on Visit, in the
              footer and in the structured data — the hero just says where we
              are. */}
          {/* Tighter tracking below sm so it holds one line on a 320px phone;
              text-balance so that if it ever does wrap, it wraps evenly rather
              than leaving one orphaned word. */}
          <p className="text-balance font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.13em] text-daar-tan sm:tracking-[0.18em]">
            {SITE.area}, {SITE.city} · {SITE.descriptor}
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

        {/* Says there is more below without asking anyone to read a word. */}
        <span
          aria-hidden
          className="absolute bottom-8 left-1/2 h-12 w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,var(--daar-tan))]"
        />
      </section>

      <main className="flex-1 bg-daar-bone text-daar-ink">
      </main>

      {/* ---------- THE IDEA ----------
          The café's own sentence, one panel at a time, each sliding up over
          the last instead of a paragraph nobody stops for. */}
      <Stack
        panels={[
          {
            eyebrow: "Daar means home",
            line: "Daar means home.",
            image: settings?.storyImageUrl ?? "/brand/interior-01.jpg",
            alt: "Inside Daar — brushed steel against the plaster wall",
          },
          {
            line: "One room. One idea.",
            image: heroImage,
            alt: "The counter at Daar",
          },
          {
            line: "The things worth eating can’t be hurried.",
            image: settings?.visitImageUrl ?? "/brand/patience-plates.jpg",
            alt: "Daar plates reading ‘Patience tastes better’",
            links: [
              { label: "See the menu", href: "/menu" },
              { label: "Plan your visit", href: "/visit" },
            ],
          },
        ]}
      />

      {/* ---------- WHAT WE DO ----------
          Laid out like a spread rather than three equal columns: the number
          hangs in the margin, the rules run the full measure, and the rows
          alternate so the eye moves down the page instead of straight across
          three identical boxes. */}
      <section className="bg-daar-bone px-5 py-28 text-daar-ink">
        <div className="mx-auto max-w-[1240px]">
          <Reveal className="mb-16 border-b border-daar-rule pb-8">
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
              What we do
            </p>
          </Reveal>

          <div className="divide-y divide-daar-rule">
            {[
              {
                title: "Proved slowly",
                body: "Dough is given the hours it asks for. There is no version of this that goes faster, and we have stopped looking for one.",
              },
              {
                title: "Baked this morning",
                body: "Everything on the counter was made in our kitchen today. What sells out, sells out — we would rather run short than bake ahead.",
              },
              {
                title: "Room to sit",
                body: `The whole fourth floor of The Mandrake, in ${SITE.area}. Come for a coffee and stay for the afternoon; nobody will hurry you along.`,
              },
            ].map((pillar, i) => (
              <Reveal
                key={pillar.title}
                delay={i * 90}
                className="grid gap-4 py-10 md:grid-cols-[5rem_1fr_1.1fr] md:items-baseline md:gap-10 md:py-14"
              >
                <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,5vw,3rem)] leading-[1.02]">
                  {pillar.title}
                </h3>
                <p className="max-w-[46ch] font-light leading-relaxed text-daar-muted">
                  {pillar.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- THE COUNTER ----------
          Real plates, drifting past. Menu photographs first, the room behind
          them, so it reads as this kitchen rather than a stock strip. */}
      {gallery.length + 4 > 4 && (
        <section className="overflow-hidden bg-daar-ink py-24 text-daar-cream">
          <Reveal className="mx-auto mb-12 max-w-[1240px] px-5">
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
              On the counter
            </p>
            <h2 className="mt-3 max-w-[16ch] font-[family-name:var(--font-display)] text-[clamp(2rem,6vw,3.5rem)] leading-[1.02]">
              What today looks like
            </h2>
          </Reveal>

          <Reveal rise>
            <Marquee top={galleryTop} bottom={galleryBottom} />
          </Reveal>
        </section>
      )}

      {/* ---------- THE CHEF ---------- */}
      <section className="bg-daar-bone px-5 py-28 text-daar-ink">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          <Reveal rise className="daar-arch relative aspect-[3/4] bg-daar-slate">
            <Image
              src="/brand/chef-vikash.webp"
              alt="Vikash Pandey, Executive Chef at Daar"
              fill
              sizes="(min-width: 1024px) 440px, 92vw"
              className="object-cover"
            />
          </Reveal>

          <Reveal>
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
              From the kitchen
            </p>
            <blockquote className="mt-6 font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.6vw,2.5rem)] leading-[1.15]">
              &ldquo;Everything that leaves this kitchen has been through my hands or my team&rsquo;s.
              We cook the way we would at home, for people we are glad to see. Come hungry, and
              stay as long as you like.&rdquo;
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <span className="h-px w-12 bg-daar-tan" />
              <div>
                <p className="font-[family-name:var(--font-display)] text-[1.25rem]">
                  Vikash Pandey
                </p>
                <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                  Executive Chef
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

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

      {/* ---------- THE FILM ----------
          Sits at the foot of the page on purpose. A loop behind the headline
          competes with the headline; down here it is the last thing seen
          before the address, which is the note to leave people on. */}
      {settings?.heroVideoUrl && (
        <section className="relative grid min-h-[80svh] place-items-center overflow-hidden bg-daar-ink px-5 text-center text-daar-cream">
          <HeroMedia
            image={settings.visitImageUrl ?? "/brand/terrace-drink.jpg"}
            video={settings.heroVideoUrl}
            alt="Inside Daar"
          />
          <div className="relative z-10 mx-auto max-w-[820px] py-24">
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
              Come and see
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,4.5rem)] leading-[1.02] text-daar-bone">
              {SITE.tagline}
            </h2>
          </div>
        </section>
      )}

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
