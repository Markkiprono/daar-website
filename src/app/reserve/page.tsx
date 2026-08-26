import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MediaBackdrop } from "@/components/site/MediaBackdrop";
import { splitMedia } from "@/lib/media";
import { Reveal } from "@/components/site/Reveal";
import { ReservationForm } from "@/components/site/ReservationForm";
import { getSettings, getHours } from "@/lib/menu";
import { DAY_NAMES, SITE } from "@/lib/config";
import { socialImage } from "@/lib/seo";

/** Never cache: opening hours and the on/off switch must take effect at once. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const { openGraph, twitter } = socialImage(
    settings?.visitImageUrl,
    "/brand/interior-02.jpg",
    `The dining room at ${SITE.name}`,
  );

  return {
    title: "Reserve a Table",
    description:
      "Book a table at Daar by Izzi in Westlands, Nairobi. Tell us when you'd like to come and we'll confirm by phone or WhatsApp.",
    alternates: { canonical: "/reserve" },
    openGraph: {
      ...openGraph,
      title: `Reserve a Table — ${SITE.name}`,
      description: "Tell us when you'd like to come.",
      url: `${SITE.url}/reserve`,
    },
    twitter,
  };
}

export default async function ReservePage() {
  const [settings, hours] = await Promise.all([getSettings(), getHours()]);
  const visit = splitMedia(settings?.visitImageUrl, "/brand/interior-01.jpg");
  const closedDays = hours.filter((h) => h.isClosed).map((h) => h.dayOfWeek);
  const enabled = settings?.reservationsEnabled ?? true;

  return (
    <>
      <SiteHeader solid />

      <section className="daar-tex daar-tex-dark bg-daar-ink px-5 pb-16 pt-20 text-center text-daar-cream">
        <div className="mx-auto max-w-[760px]">
          <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
            Book with us
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2.5rem,9vw,5rem)] leading-[0.95] text-daar-bone">
            Reserve a table
          </h1>
          <p className="mt-5 font-light text-daar-cream/80">
            Tell us when you&apos;d like to come and we&apos;ll confirm by phone.
          </p>
        </div>
      </section>

      <main className="flex-1 bg-daar-bone px-5 py-16 text-daar-ink">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[1.1fr_.9fr] lg:gap-20">
          <Reveal>
            {enabled ? (
              <ReservationForm
                maxPartySize={settings?.maxPartySize ?? 12}
                note={settings?.reservationNote}
                closedDays={closedDays}
                hours={hours.map((h) => ({
                  dayOfWeek: h.dayOfWeek,
                  openTime: h.openTime,
                  closeTime: h.closeTime,
                  isClosed: h.isClosed,
                }))}
                phone={settings?.phone}
              />
            ) : (
              <div className="rounded-[3px] border border-daar-rule bg-white p-8 text-center">
                <p className="font-[family-name:var(--font-display)] text-2xl">
                  Online booking is closed
                </p>
                <p className="mt-3 text-sm text-daar-muted">
                  Please call or message us and we&apos;ll find you a table.
                </p>
                {settings?.phone && (
                  <a
                    href={`tel:${settings.phone.replace(/\s/g, "")}`}
                    className="mt-6 inline-block rounded-full bg-daar-oxblood px-8 py-3.5 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream"
                  >
                    {settings.phone}
                  </a>
                )}
              </div>
            )}
          </Reveal>

          <Reveal>
            <div className="daar-arch relative aspect-[3/4] bg-daar-slate">
              <MediaBackdrop
                image={visit.image}
                video={visit.video}
                alt="The dining room at Daar"
                priority={false}
                overlayClassName=""
                sizes="(min-width: 1024px) 480px, 92vw"
              />
            </div>

            <div className="mt-8">
              <h2 className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                Opening hours
              </h2>
              <dl className="mt-4">
                {hours.map((h) => (
                  <div
                    key={h.id}
                    className="flex justify-between gap-4 border-b border-daar-rule py-2 text-sm last:border-0"
                  >
                    <dt>{DAY_NAMES[h.dayOfWeek]}</dt>
                    <dd className="tabular-nums text-daar-muted">
                      {h.isClosed ? "Closed" : `${h.openTime} — ${h.closeTime}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </main>

      <SiteFooter email={settings?.email} phone={settings?.phone} />
    </>
  );
}
