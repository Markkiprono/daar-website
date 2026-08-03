import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { MessageForm } from "@/components/site/MessageForm";
import { getSettings, getStoryPhotos } from "@/lib/menu";
import { SITE } from "@/lib/config";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Story",
  description:
    "Daar means home. The story behind Daar Cafe & Bakery in Nairobi — proved slowly, baked the same morning it's served.",
};

export default async function StoryPage() {
  const [settings, galleryPhotos] = await Promise.all([getSettings(), getStoryPhotos()]);

  // All prose comes from the dashboard. Paragraphs split on blank lines, so
  // the owner controls the whole page without touching code.
  const paragraphs = (settings?.storyBody ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Owner's gallery when set, otherwise the default brand photography.
  const gallery =
    galleryPhotos.length > 0
      ? galleryPhotos.map((p) => ({ src: p.imageUrl, alt: p.imageAlt ?? "A photo of Daar", blur: p.blurDataUrl }))
      : [
          { src: "/brand/atmos-02.jpg", alt: "A guest on the red banquette at Daar", blur: null },
          { src: "/brand/counter.jpg", alt: "Daar packaging on a paint-marbled table", blur: null },
          { src: "/brand/terrace-drink.jpg", alt: "An iced drink on the terrace", blur: null },
          { src: "/brand/interior-02.jpg", alt: "The dining room at Daar", blur: null },
        ];

  return (
    <>
      <SiteHeader solid />

      {/* ---------- masthead ---------- */}
      <section className="daar-tex daar-tex-dark bg-daar-ink px-5 pb-20 pt-20 text-center text-daar-cream">
        <div className="mx-auto max-w-[820px]">
          <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
            Our story
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.5rem,9vw,5.5rem)] leading-[0.95] text-daar-bone">
            {settings?.storyTitle ?? "Daar means home"}
          </h1>
        </div>
      </section>

      <main className="flex-1 bg-daar-bone text-daar-ink">
        {/* ---------- opening image ---------- */}
        <section className="px-5 pt-16">
          <Reveal className="mx-auto max-w-[1000px]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] bg-daar-slate">
              <Image
                src={settings?.storyImageUrl ?? "/brand/interior-01.jpg"}
                alt="Inside Daar — brushed steel against the plaster wall"
                fill
                priority
                sizes="(min-width: 1024px) 1000px, 92vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </section>

        {/* ---------- prose ---------- */}
        <section className="px-5 py-16">
          <div className="mx-auto max-w-[680px]">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <Reveal key={i}>
                  <p
                    className={
                      i === 0
                        ? "text-[clamp(1.25rem,3.5vw,1.6rem)] font-light leading-relaxed"
                        : "mt-7 font-light leading-relaxed text-daar-muted"
                    }
                  >
                    {p}
                  </p>
                </Reveal>
              ))
            ) : (
              <Reveal>
                <p className="text-center text-sm text-daar-muted">
                  The story is being written.
                </p>
              </Reveal>
            )}
          </div>
        </section>

        {/* ---------- pull quote: their own words, from the plates ---------- */}
        <section className="daar-tex daar-tex-ox bg-daar-oxblood px-5 py-24 text-center text-daar-cream">
          <Reveal className="mx-auto max-w-[820px]">
            <blockquote className="font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,4rem)] italic leading-[1.05]">
              “{SITE.tagline}”
            </blockquote>
            <p className="mt-6 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
              Written on every plate we serve
            </p>
          </Reveal>
        </section>

        {/* ---------- photography ---------- */}
        <section className="px-5 py-20">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {gallery.map((img, i) => (
                <Reveal key={img.src} delay={i * 90}>
                  <div className="daar-arch relative aspect-[3/4] bg-daar-slate">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 768px) 280px, 45vw"
                      className="object-cover"
                      {...(img.blur ? { placeholder: "blur" as const, blurDataURL: img.blur } : {})}
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- reach out ---------- */}
        <section id="reach-out" className="scroll-mt-24 px-5 pb-20 pt-4">
          <div className="mx-auto max-w-[1240px]">
            <Reveal className="mx-auto mb-12 max-w-[640px] text-center">
              <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                Say hello
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,6vw,3.25rem)] leading-none">
                Reach out to us
              </h2>
              <p className="mt-5 font-light text-daar-muted">
                Bulk orders, celebration cakes, private hire, press, or just a question about
                what&apos;s in something — we read everything.
              </p>
              <div className="mx-auto mt-6 h-px w-16 bg-[linear-gradient(90deg,transparent,var(--daar-tan),transparent)]" />
            </Reveal>

            <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                settings?.phone && {
                  label: "Call us",
                  value: settings.phone,
                  href: `tel:${settings.phone.replace(/\s/g, "")}`,
                  hint: "Fastest for same-day questions",
                },
                settings?.whatsapp && {
                  label: "WhatsApp",
                  value: "Message us",
                  href: `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`,
                  hint: "Send us a photo of what you want",
                },
                settings?.email && {
                  label: "Email",
                  value: settings.email,
                  href: `mailto:${settings.email}`,
                  hint: "Orders, press and partnerships",
                },
                {
                  label: "Book a table",
                  value: "Reserve",
                  href: "/reserve",
                  hint: "We'll confirm by phone",
                },
              ]
                .filter((x): x is { label: string; value: string; href: string; hint: string } => Boolean(x))
                .map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group block rounded-[3px] border border-daar-rule bg-white p-6 transition hover:-translate-y-0.5 hover:border-daar-tan"
                  >
                    <p className="font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.18em] text-daar-muted">
                      {c.label}
                    </p>
                    <p className="mt-3 break-words font-[family-name:var(--font-display)] text-[1.15rem] text-daar-oxblood">
                      {c.value}
                    </p>
                    <p className="mt-2 text-xs text-daar-muted">{c.hint}</p>
                  </a>
                ))}
            </Reveal>

            {!settings?.phone && !settings?.email && (
              <p className="mt-6 text-center text-sm text-daar-muted">
                Contact details are still being set up in the dashboard.
              </p>
            )}

            {/* ---------- leave us a message ---------- */}
            <Reveal className="mx-auto mt-14 max-w-[720px]">
              <div className="rounded-[3px] border border-daar-rule bg-white p-6 sm:p-10">
                <h3 className="text-center font-[family-name:var(--font-display)] text-[clamp(1.5rem,4vw,2rem)] leading-none">
                  Leave us a message
                </h3>
                <p className="mt-3 text-center text-sm text-daar-muted">
                  We&apos;ll reply by email. Nothing here is shared with anyone.
                </p>
                <div className="mt-8">
                  <MessageForm email={settings?.email} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- onward ---------- */}
        <section className="px-5 pb-24 text-center">
          <Reveal>
            <div className="mx-auto h-px w-16 bg-[linear-gradient(90deg,transparent,var(--daar-tan),transparent)]" />
            <h2 className="mt-8 font-[family-name:var(--font-display)] text-[clamp(1.75rem,5vw,2.75rem)] leading-none">
              Come and taste it
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/menu"
                className="rounded-full bg-daar-oxblood px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:-translate-y-0.5 hover:bg-daar-ink"
              >
                See the menu
              </Link>
              <Link
                href="/visit"
                className="rounded-full border border-daar-oxblood px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-oxblood transition hover:-translate-y-0.5 hover:bg-daar-oxblood hover:text-daar-cream"
              >
                Find us
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter email={settings?.email} phone={settings?.phone} />
    </>
  );
}
