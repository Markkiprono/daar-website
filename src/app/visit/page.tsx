import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { getSettings, getHours } from "@/lib/menu";
import { DAY_NAMES, SITE } from "@/lib/config";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Visit",
  description: "Find Daar Cafe & Bakery in Nairobi — address, opening hours and contact details.",
};

/** Socials are stored as free-form JSON, so read defensively. */
function readSocials(value: unknown): { label: string; url: string }[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)
    .map(([key, url]) => ({ label: key.charAt(0).toUpperCase() + key.slice(1), url }));
}

export default async function VisitPage() {
  const [settings, hours] = await Promise.all([getSettings(), getHours()]);

  const address = settings?.addressLine ?? SITE.city;
  const socials = readSocials(settings?.socials);
  const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.name} ${address}`)}`;

  // Today's hours, highlighted — the single most-asked question.
  const todayIndex = new Date().getDay();
  const today = hours.find((h) => h.dayOfWeek === todayIndex);

  return (
    <>
      <SiteHeader solid />

      <section className="daar-tex daar-tex-dark bg-daar-ink px-5 pb-20 pt-20 text-center text-daar-cream">
        <div className="mx-auto max-w-[820px]">
          <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
            Come in
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.5rem,9vw,5.5rem)] leading-[0.95] text-daar-bone">
            Visit
          </h1>
          {today && (
            <p className="mt-6 font-light text-daar-cream/85">
              {today.isClosed ? (
                <>Closed today</>
              ) : (
                <>
                  Open today{" "}
                  <span className="text-daar-tan tabular-nums">
                    {today.openTime} — {today.closeTime}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </section>

      <main className="flex-1 bg-daar-bone text-daar-ink">
        <section className="px-5 py-16">
          <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
            {/* ---------- details ---------- */}
            <Reveal>
              <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,4vw,2.25rem)] leading-none">
                Where to find us
              </h2>
              <p className="mt-4 text-[1.05rem] font-light">{address}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="#location"
                  className="inline-block rounded-full bg-daar-oxblood px-7 py-3.5 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:-translate-y-0.5 hover:bg-daar-ink"
                >
                  See location
                </a>
                <a
                  href="/reserve"
                  className="inline-block rounded-full border border-daar-oxblood px-7 py-3.5 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-oxblood transition hover:-translate-y-0.5 hover:bg-daar-oxblood hover:text-daar-cream"
                >
                  Reserve a table
                </a>
              </div>

              <h3 className="mt-12 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                Opening hours
              </h3>
              <dl className="mt-4">
                {hours.map((h) => {
                  const isToday = h.dayOfWeek === todayIndex;
                  return (
                    <div
                      key={h.id}
                      className={[
                        "flex justify-between gap-4 border-b border-daar-rule py-2.5 text-sm last:border-0",
                        isToday ? "font-medium text-daar-oxblood" : "",
                      ].join(" ")}
                    >
                      <dt>
                        {DAY_NAMES[h.dayOfWeek]}
                        {isToday && (
                          <span className="ml-2 font-[family-name:var(--font-label)] text-[10px] uppercase tracking-[0.18em] text-daar-tan">
                            Today
                          </span>
                        )}
                      </dt>
                      <dd className="tabular-nums">
                        {h.isClosed ? "Closed" : `${h.openTime} — ${h.closeTime}`}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <h3 className="mt-12 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                Get in touch
              </h3>
              <div className="mt-2 text-sm [&>a]:block [&>a]:py-2.5">
                {settings?.phone && (
                  <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="block hover:text-daar-oxblood">
                    {settings.phone}
                  </a>
                )}
                {settings?.whatsapp && (
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:text-daar-oxblood"
                  >
                    WhatsApp
                  </a>
                )}
                {settings?.email && (
                  <a href={`mailto:${settings.email}`} className="block hover:text-daar-oxblood">
                    {settings.email}
                  </a>
                )}
                {!settings?.phone && !settings?.email && (
                  <p className="text-daar-muted">Contact details coming soon.</p>
                )}
              </div>

              {socials.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-daar-rule px-5 py-2 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted transition hover:border-daar-tan hover:text-daar-ink"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </Reveal>

            {/* ---------- map or photograph ---------- */}
            <Reveal>
              {settings?.mapEmbedUrl ? (
                <div className="aspect-[4/5] overflow-hidden rounded-[3px] bg-daar-slate">
                  <iframe
                    src={settings.mapEmbedUrl}
                    title={`Map showing ${SITE.name}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-full w-full border-0"
                  />
                </div>
              ) : (
                // No map configured yet — show the room rather than an empty
                // grey box, and let the Maps button above do the navigating.
                <div className="daar-arch relative aspect-[4/5] bg-daar-slate">
                  <Image
                    src="/brand/interior-02.jpg"
                    alt="The dining room at Daar"
                    fill
                    sizes="(min-width: 1024px) 560px, 92vw"
                    className="object-cover"
                  />
                </div>
              )}
            </Reveal>
          </div>
        </section>

        {/* ---------- LOCATION ---------- */}
        <section id="location" className="scroll-mt-24 bg-daar-cream/40 px-5 py-20">
          <div className="mx-auto max-w-[1240px]">
            <Reveal className="mx-auto mb-10 max-w-[640px] text-center">
              <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-muted">
                Getting here
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,6vw,3.25rem)] leading-none">
                Location
              </h2>
              <p className="mt-5 font-light text-daar-muted">{address}</p>
              <div className="mx-auto mt-6 h-px w-16 bg-[linear-gradient(90deg,transparent,var(--daar-tan),transparent)]" />
            </Reveal>

            <Reveal>
              <div className="overflow-hidden rounded-[3px] border border-daar-rule bg-white">
                {settings?.mapEmbedUrl ? (
                  <iframe
                    src={settings.mapEmbedUrl}
                    title={`Map showing ${SITE.name}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-[420px] w-full border-0"
                  />
                ) : (
                  // No embed configured yet. Rather than an empty grey box,
                  // give the two things people actually want: an address they
                  // can copy and a button that opens their own maps app.
                  <div className="grid gap-8 p-8 sm:grid-cols-2 sm:p-12">
                    <div>
                      <p className="font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.18em] text-daar-muted">
                        Address
                      </p>
                      <p className="mt-3 text-[1.15rem] font-light">{address}</p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <a
                          href={mapsSearch}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-daar-oxblood px-7 py-3.5 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:bg-daar-ink"
                        >
                          Open in Google Maps
                        </a>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${SITE.name} ${address}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-daar-oxblood px-7 py-3.5 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-oxblood transition hover:bg-daar-oxblood hover:text-daar-cream"
                        >
                          Get directions
                        </a>
                      </div>
                      <p className="mt-6 text-xs text-daar-muted">
                        To show a live map here, paste a Google Maps embed link into
                        Admin → Settings → Map.
                      </p>
                    </div>

                    <div className="daar-arch relative min-h-[240px] bg-daar-slate">
                      <Image
                        src="/brand/counter.jpg"
                        alt="The entrance and counter at Daar"
                        fill
                        sizes="(min-width: 640px) 480px, 92vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-5 pb-24 pt-20 text-center">
          <Reveal>
            <div className="mx-auto h-px w-16 bg-[linear-gradient(90deg,transparent,var(--daar-tan),transparent)]" />
            <p className="mt-8 font-[family-name:var(--font-display)] text-[clamp(1.5rem,4vw,2.25rem)]">
              See what&apos;s baking today
            </p>
            <Link
              href="/menu"
              className="mt-6 inline-block rounded-full bg-gradient-to-br from-daar-tan to-daar-ochre px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-ink transition hover:-translate-y-0.5 hover:brightness-105"
            >
              View the menu
            </Link>
          </Reveal>
        </section>
      </main>

      <SiteFooter email={settings?.email} phone={settings?.phone} />
    </>
  );
}
