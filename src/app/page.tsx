import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { MediaBackdrop } from "@/components/site/MediaBackdrop";
import { Stack } from "@/components/site/Stack";
import { Marquee, type Frame } from "@/components/site/Marquee";
import {
  getFeatured,
  getSettings,
  getHours,
  getGallery,
  getBandItems,
  getHomePhotos,
  getValueCards,
  getHomePanels,
} from "@/lib/menu";
import { formatPrice, DAY_NAMES, SITE } from "@/lib/config";
import { splitMedia } from "@/lib/media";
import { SECTION_HEADING_SIZE_CLASS, headingSize } from "@/lib/home-sections";
import { StandFor } from "@/components/site/StandFor";
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
  const [featured, settings, hours, gallery, chosen, bandItems, valueCards, homePanels] =
    await Promise.all([
      getFeatured(),
      getSettings(),
      getHours(),
      getGallery(),
      getHomePhotos(),
      getBandItems(),
      getValueCards(),
      getHomePanels(),
    ]);

  /**
   * The band, in the café's own hands.
   *
   * Two ways in, and they add up rather than compete: photographs uploaded
   * for the band, and menu items ticked for it. Either one on its own is a
   * complete answer; together they are the strip.
   *
   * These six were written into this file, which meant the one part of the
   * home page that is supposed to show what the counter looks like *today*
   * could only be changed by a deploy. They are now nothing but the picture
   * of last resort — the state before anyone has chosen, kept so a café that
   * has not touched the dashboard yet still has a home page. The moment a
   * photograph is uploaded or a single item is ticked, every one of them is
   * gone from the page.
   */
  const ROOM: Frame[] = [
    { src: "/brand/interior-02.jpg", alt: "The room at Daar" },
    { src: "/brand/terrace-drink.jpg", alt: "A drink on the terrace" },
    { src: "/brand/packaging-marble.jpg", alt: "Daar packaging" },
    { src: "/brand/counter.jpg", alt: "The counter" },
    { src: "/brand/interior-01.jpg", alt: "Brushed steel against plaster" },
    { src: "/brand/patience-plates.jpg", alt: "Plates reading ‘Patience tastes better’" },
  ];

  /* Photographs uploaded for the band, in the order she arranged them. */
  const uploaded: Frame[] = chosen.map((p) => ({
    src: p.imageUrl,
    alt: p.imageAlt ?? "A photo of Daar",
    blur: p.blurDataUrl,
  }));

  /* Menu items ticked for the band. The photograph is the item's own, so
     replacing it on the Menu page replaces it here too — which is the whole
     reason to tick an item rather than upload the same picture twice. */
  const ticked: Frame[] = bandItems.flatMap((item) =>
    item.imageUrl ? [{ src: item.imageUrl, alt: item.imageAlt ?? item.name, blur: item.blurDataUrl }] : [],
  );

  /* The self-filling version: a few plates drawn at random among the room.
     getGallery redraws on every request — see the note on force-dynamic
     above — so this is a different handful each visit rather than the same
     photographs forever. */
  const plates: Frame[] = gallery.map((g) => ({
    src: g.imageUrl,
    alt: g.imageAlt ?? g.name,
    blur: g.blurDataUrl,
  }));

  /* Each source laid end to end, NOT shuffled one for one.
   *
   * The alternating split below is what actually mixes them, and it takes
   * every second frame — so interleaving here too cancels it out exactly and
   * hands back the thing it was meant to prevent: with four uploads and four
   * ticked items you got a row of four photographs above a row of four
   * plates, two separate strips stacked. Concatenated, the same split deals
   * the two sources alternately into both rows.
   *
   * This is why the band has been reading as one row of menu photographs
   * above one row of the built-in pictures.
   *
   * What she chose wins outright — a band half her picks and half a random
   * draw is neither. Nothing chosen leaves the self-filling version, which
   * is all the built-in photographs are still for. */
  const picked = [...uploaded, ...ticked];
  const strip: Frame[] = picked.length > 0 ? picked : [...plates, ...ROOM];

  /* Alternating, so the two bands read as one strip cut in half rather than
     as the first half above the second. Below two photographs the split
     leaves the lower band empty and it does not render at all — a café that
     takes the dashboard at its word and adds a single picture got half a
     section for it. One photograph feeds both bands instead; the Marquee
     repeats whatever it is given until it is wider than the screen, so a
     short strip is already its problem to solve rather than this one. */
  const galleryTop = strip.length < 2 ? strip : strip.filter((_, i) => i % 2 === 0);
  const galleryBottom = strip.length < 2 ? strip : strip.filter((_, i) => i % 2 === 1);

  /**
   * Every backdrop the dashboard can set, resolved once.
   *
   * Each of these sections once borrowed another page's photograph, from the
   * days before it had a slot of its own. Two of those borrows survive, on
   * the terms below; the rest have their own brand artwork.
   *
   * splitMedia decides which of the pair a slot is holding. A slot with a
   * film in it hands back the built-in default as the still underneath, so a
   * video upload can never leave a section blank.
   *
   * NOTHING ON THIS PAGE BORROWS A PICTURE FROM ANYWHERE ELSE ANY MORE, and
   * that is the fix for two separate bugs rather than a tidy-up.
   *
   * Each of these sections used to fall back to one of the three original
   * slots — panel two showed the hero photograph, the arch showed the Story
   * one, the closing band showed Visit. A café that filled in the three
   * fields it was offered therefore got six full-screen sections showing
   * three pictures, each of them twice. And because a slot may hold a film,
   * one upload into the Story slot played the same few seconds twice on this
   * page and again on the Story page — the "it shows up three times" this all
   * started with.
   *
   * Every section now owns what it displays: the panels are rows in
   * HomePanel, and the rest are their own columns. There is no fallback chain
   * left to repeat anything.
   */
  /* The opening photograph is the room, not the merchandise: this was the
     takeaway boxes on the marbled table (counter.jpg), which is a fine
     picture of the packaging and a poor first impression of a bakery. It
     still appears in the drifting band below, at the size it deserves. */
  const brandHero = "/brand/interior-02.jpg";
  const brandStory = "/brand/patience-plates.jpg";

  const hero = splitMedia(settings?.heroImageUrl, brandHero);
  /**
   * The sliding panels, now rows the café writes and illustrates themselves.
   *
   * Each falls back to a different brand still, cycled by position, so a
   * café that adds three panels before photographing any of them gets three
   * different pictures rather than the same one three times. splitMedia still
   * decides whether the stored URL is a photograph or a film.
   */
  const PANEL_FALLBACKS = [
    "/brand/interior-01.jpg",
    "/brand/terrace-drink.jpg",
    brandStory,
    "/brand/interior-02.jpg",
  ];
  const panels = homePanels.map((panel, i) => {
    const media = splitMedia(panel.imageUrl, PANEL_FALLBACKS[i % PANEL_FALLBACKS.length]!);
    const links = [
      { label: panel.linkOneLabel, href: panel.linkOneHref },
      { label: panel.linkTwoLabel, href: panel.linkTwoHref },
    ].filter((l) => l.label && l.href);
    return {
      id: panel.id,
      eyebrow: panel.eyebrow || undefined,
      line: panel.line,
      image: media.image,
      video: media.video,
      alt: panel.imageAlt ?? "Inside Daar",
      links: links.length > 0 ? links : undefined,
    };
  });

  /* One size for every section heading down the page, chosen in the
     dashboard — see src/lib/home-sections.ts. */
  const sectionHeading = SECTION_HEADING_SIZE_CLASS[headingSize(settings?.homeHeadingSize)];
  const storyBand = splitMedia(settings?.storyBandImageUrl, "/brand/item-tart.jpg");
  /* Only ever a poster frame: this section does not render at all without a
     film or a photograph of its own, a few lines below. */
  const closing = splitMedia(settings?.closingImageUrl, brandStory);

  /* The closing band predates its own slot: it existed only to carry the
     "Film" upload, and disappeared without one. It now also appears for a
     café that puts a still or a film in the closing slot itself. */
  const closingVideo = closing.video ?? settings?.heroVideoUrl ?? null;
  const chef = splitMedia(settings?.chefImageUrl, "/brand/chef-vikash.webp");
  const showClosing = Boolean(closingVideo || settings?.closingImageUrl);

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
        <MediaBackdrop
          image={hero.image}
          video={hero.video}
          alt="Inside Daar"
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
            {settings?.heroEyebrow?.trim() ||
              `${SITE.area}, ${SITE.city} · ${SITE.descriptor}`}
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
              {settings?.heroPrimaryLabel || "Explore the menu"}
            </Link>
            <Link
              href="/visit"
              className="rounded-full border border-daar-cream px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:-translate-y-0.5 hover:bg-daar-cream hover:text-daar-ink"
            >
              {settings?.heroSecondaryLabel || "Find us"}
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
          the last instead of a paragraph nobody stops for. Every sentence,
          picture and button comes from Sections in the dashboard. */}
      {panels.length > 0 && <Stack panels={panels} />}

      {/* ---------- WHAT WE STAND FOR ----------
          Every word, picture and size comes from the dashboard — Sections in
          the admin. This was four cards written into this file, which meant
          the café could not fix their own typo without a deploy. The section
          hides itself when it is switched off or has no visible cards. */}
      {settings?.standForEnabled !== false && (
        <StandFor
          eyebrow={settings?.standForEyebrow ?? null}
          heading={settings?.standForHeading ?? "What we stand for"}
          headingSize={settings?.standForHeadingSize ?? null}
          cardSize={settings?.standForCardSize ?? null}
          cards={valueCards.map((c) => ({
            id: c.id,
            title: c.title,
            body: c.body,
            imageUrl: c.imageUrl,
            imageAlt: c.imageAlt,
            blurDataUrl: c.blurDataUrl,
          }))}
        />
      )}

      {/* ---------- THE COUNTER ----------
          Real plates, drifting past. Menu photographs first, the room behind
          them, so it reads as this kitchen rather than a stock strip.

          Gated on what is about to be drawn, not on where it came from. This
          asked whether the random draw of menu photographs found anything,
          which is the one question that does not decide it: the café's own
          chosen photographs override that draw entirely a few lines up, so a
          menu with no pictures on it yet hid the section underneath a band
          that had been filled in by hand. Uploading photographs and watching
          the section vanish is the worst way to learn that. */}
      {strip.length > 0 && (
        <section className="overflow-hidden bg-daar-ink py-24 text-daar-cream">
          <Reveal className="mx-auto mb-12 max-w-[1240px] px-5">
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
              {settings?.counterEyebrow || "On the counter"}
            </p>
            <h2
              className={`mt-3 max-w-[16ch] font-[family-name:var(--font-display)] leading-[1.02] ${sectionHeading}`}
            >
              {settings?.counterHeading || "What today looks like"}
            </h2>
          </Reveal>

          <Reveal rise>
            <Marquee top={galleryTop} bottom={galleryBottom} />
          </Reveal>
        </section>
      )}

      {/* ---------- THE CHEF ----------
          Every word and the portrait come from the dashboard. Published under
          a named person, so they have to be changeable by that person rather
          than by a deploy — and with no name or no words the section does not
          render at all, which is better than a placeholder with someone's
          name under it. */}
      {settings?.chefName && settings?.chefQuote && (
        <section className="bg-daar-bone px-5 py-28 text-daar-ink">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
            <Reveal rise className="daar-arch relative aspect-[3/4] bg-daar-slate">
              <MediaBackdrop
                image={chef.image}
                video={chef.video}
                alt={`${settings.chefName}, ${settings.chefRole ?? "chef"} at ${SITE.name}`}
                priority={false}
                overlayClassName=""
                sizes="(min-width: 1024px) 440px, 92vw"
              />
            </Reveal>

            <Reveal>
              <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                {settings?.chefEyebrow || "From the kitchen"}
              </p>
              <blockquote className="mt-6 font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.6vw,2.5rem)] leading-[1.15]">
                &ldquo;{settings.chefQuote}&rdquo;
              </blockquote>
              <div className="mt-8 flex items-center gap-4">
                <span className="h-px w-12 bg-daar-tan" />
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[1.25rem]">
                    {settings.chefName}
                  </p>
                  {settings.chefRole && (
                    <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                      {settings.chefRole}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---------- CHEF'S SPECIAL ---------- */}
      {featured && (
        <section className="daar-tex daar-tex-dark bg-daar-ink px-5 py-24 text-daar-cream">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
            <Reveal className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-daar-slate">
              <span className="absolute left-4 top-4 z-10 rounded-full bg-gradient-to-br from-daar-tan to-daar-ochre px-4 py-1.5 font-[family-name:var(--font-label)] text-[10px] uppercase tracking-[0.18em] text-daar-ink">
                {settings?.featuredBadge || "Chef’s Special"}
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
            {/* No scrim: nothing sits over this one, and darkening it would
                only mute a photograph the arch already frames. */}
            <MediaBackdrop
              image={storyBand.image}
              video={storyBand.video}
              alt="Inside Daar"
              priority={false}
              overlayClassName=""
              sizes="(min-width: 1024px) 480px, 92vw"
            />
          </Reveal>
          <Reveal>
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
              {settings?.storyEyebrow || "Our story"}
            </p>
            <h2
              className={`mt-3 font-[family-name:var(--font-display)] leading-none ${sectionHeading}`}
            >
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
      {showClosing && (
        <section className="relative grid min-h-[80svh] place-items-center overflow-hidden bg-daar-ink px-5 text-center text-daar-cream">
          <MediaBackdrop
            image={closing.image}
            video={closingVideo}
            alt="Inside Daar"
            priority={false}
          />
          <div className="relative z-10 mx-auto max-w-[820px] py-24">
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
              {settings?.closingEyebrow || "Come and see"}
            </p>
            <h2
              className={`mt-4 font-[family-name:var(--font-display)] leading-[1.02] text-daar-bone ${sectionHeading}`}
            >
              {settings?.closingHeading?.trim() || SITE.tagline}
            </h2>
          </div>
        </section>
      )}

      {/* ---------- VISIT ---------- */}
      <section id="visit" className="scroll-mt-24 bg-daar-bone px-5 py-24 text-daar-ink">
        <div className="mx-auto max-w-[1240px]">
          <Reveal className="mx-auto mb-12 max-w-[640px] text-center">
            <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
              {settings?.visitEyebrow || "Come in"}
            </p>
            <h2
              className={`mt-3 font-[family-name:var(--font-display)] leading-none ${sectionHeading}`}
            >
              {settings?.visitHeading || "Visit"}
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
