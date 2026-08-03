import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getSettings } from "@/lib/menu";
import { SITE } from "@/lib/config";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${SITE.name} collects, uses and protects your personal data under Kenya's Data Protection Act, 2019.`,
  alternates: { canonical: "/privacy" },
  // A legal notice has no business in search results above the menu.
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

/**
 * Privacy notice.
 *
 * Everything here is written against what the code actually does, not a
 * template: the site sets no visitor cookies, stores no IP addresses and runs
 * no third-party analytics, so it can say so plainly. If the data the forms
 * collect ever changes, this page has to change with it.
 */
function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 font-[family-name:var(--font-display)] text-[clamp(1.4rem,3.5vw,1.9rem)] leading-tight">
      {children}
    </h2>
  );
}

export default async function PrivacyPage() {
  const settings = await getSettings().catch(() => null);
  const contactEmail = settings?.email;
  const contactPhone = settings?.phone;
  const address = settings?.addressLine ?? SITE.city;

  const updated = new Date("2026-08-03").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <SiteHeader solid />

      <section className="daar-tex daar-tex-dark bg-daar-ink px-5 pb-14 pt-20 text-center text-daar-cream">
        <div className="mx-auto max-w-[760px]">
          <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
            Legal
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,4rem)] leading-none text-daar-bone">
            Privacy
          </h1>
          <p className="mt-5 font-light text-daar-cream/80">
            What we collect, why, and what you can ask us to do about it.
          </p>
        </div>
      </section>

      <main className="flex-1 bg-daar-bone px-5 py-16 text-daar-ink">
        <div className="mx-auto max-w-[760px] text-[1.02rem] font-light leading-relaxed [&_a]:text-daar-oxblood [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-2 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
          <p className="text-sm text-daar-muted">Last updated {updated}</p>

          <p>
            This notice explains how {SITE.name} handles personal data, and your rights under
            Kenya&apos;s Data Protection Act, 2019. It covers this website only.
          </p>

          <H>Who is responsible</H>
          <p>
            {SITE.name} is the data controller for the information described here. We are at{" "}
            {address}. You can reach us about anything on this page
            {contactEmail ? (
              <>
                {" "}
                at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </>
            ) : null}
            {contactPhone ? (
              <>
                {" "}
                or on <a href={`tel:${contactPhone.replace(/\s/g, "")}`}>{contactPhone}</a>
              </>
            ) : null}
            .
          </p>

          <H>What we collect, and why</H>
          <p>We only collect what you type into a form. There are two:</p>
          <ul>
            <li>
              <strong>Booking a table.</strong> Your name, phone number, email address, party
              size, the date and time you want, and anything you add under occasion or notes. We
              use it to hold the table and to contact you about that booking.
            </li>
            <li>
              <strong>Sending us a message.</strong> Your name, email address, phone number if you
              give one, and your message. We use it to reply.
            </li>
          </ul>
          <p>
            Our lawful basis is that the information is necessary to provide the service you asked
            for. We do not use it for marketing, and we do not send newsletters.
          </p>

          <H>What we do not collect</H>
          <p>
            Worth stating plainly, because most sites cannot: this website sets no cookies on your
            device, stores no IP addresses, and runs no third-party analytics or advertising
            trackers. There is no Google Analytics, no advertising pixel and no fingerprinting.
          </p>
          <p>
            We do count how often a menu item is viewed, so we know what to bake more of. That
            record contains an item, a source and a timestamp — nothing that identifies who was
            looking.
          </p>

          <H>Who else sees it</H>
          <ul>
            <li>
              <strong>Our hosting provider,</strong> which stores the site and its database on our
              behalf.
            </li>
            <li>
              <strong>Google Maps.</strong> The Visit page embeds a Google map. When it loads,
              Google receives your IP address and may set its own cookies, under{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                Google&apos;s privacy policy
              </a>
              . We have no control over that and we receive nothing from it.
            </li>
            <li>
              <strong>Our email provider,</strong> which delivers booking and message alerts to us.
            </li>
          </ul>
          <p>
            We do not sell personal data, and we do not share it with anyone else unless the law
            requires it.
          </p>

          <H>How long we keep it</H>
          <p>
            Bookings and messages are kept while they are useful for looking after you and for our
            own records, and reviewed periodically — we aim not to hold either beyond{" "}
            <strong>24 months</strong>. You can ask us to delete yours sooner at any time and we
            will, unless we are required to keep it.
          </p>

          <H>Your rights</H>
          <p>Under the Data Protection Act, 2019 you can ask us to:</p>
          <ul>
            <li>tell you what personal data we hold about you, and give you a copy;</li>
            <li>correct anything that is wrong or incomplete;</li>
            <li>delete it, where we have no continuing reason to keep it;</li>
            <li>stop using it, or object to how we are using it.</li>
          </ul>
          <p>
            {contactEmail ? (
              <>
                Write to <a href={`mailto:${contactEmail}`}>{contactEmail}</a> and we will respond
                within a reasonable period.
              </>
            ) : (
              <>Contact us using the details above and we will respond within a reasonable period.</>
            )}{" "}
            If you are not satisfied, you can complain to the Office of the Data Protection
            Commissioner at{" "}
            <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer">
              odpc.go.ke
            </a>
            .
          </p>

          <H>Children</H>
          <p>
            This site is not aimed at children, and we do not knowingly collect data about them. A
            booking made for a family is treated as the adult&apos;s booking.
          </p>

          <H>Changes</H>
          <p>
            If we change what we collect or why, we will update this page and the date at the top.
          </p>

          <p className="mt-12 border-t border-daar-rule pt-8 text-sm text-daar-muted">
            Questions about a booking rather than privacy?{" "}
            <Link href="/visit">Get in touch</Link>.
          </p>
        </div>
      </main>

      <SiteFooter email={settings?.email} phone={settings?.phone} />
    </>
  );
}
