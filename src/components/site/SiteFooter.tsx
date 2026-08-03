import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { getLogo } from "@/lib/logo";
import { SITE } from "@/lib/config";

export async function SiteFooter({ email, phone }: { email?: string | null; phone?: string | null }) {
  // The designer's single stacked lockup — mark and lettering already spaced
  // as intended. Far better than stacking two separate files by eye.
  const [lockup, mark, full] = await Promise.all([
    getLogo("lockup"),
    getLogo("mark"),
    getLogo("full"),
  ]);

  const links = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/story", label: "Story" },
    { href: "/visit", label: "Visit" },
  ];

  return (
    <footer className="daar-tex daar-tex-dark bg-daar-ink py-16 text-center text-daar-cream">
      <div className="mx-auto max-w-[1240px] px-5">
        {lockup ? (
          <BrandMark logo={lockup} id="footer" className="mx-auto h-24 w-auto text-daar-tan" />
        ) : (
          <>
            <BrandMark logo={mark} id="footer" className="mx-auto h-12 w-auto text-daar-tan" />
            {full && (
              <BrandMark logo={full} id="footer-word" className="mx-auto mt-4 h-8 w-auto text-daar-tan" />
            )}
          </>
        )}

        {/* Generous vertical padding so every link clears the 44px minimum
            touch target — these were 18px tall and hard to hit on a phone. */}
        <ul className="mt-6 flex flex-wrap justify-center gap-x-4">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-block px-3 py-3 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] opacity-80 transition hover:text-daar-tan hover:opacity-100"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {(email || phone) && (
          <div className="mt-4 flex flex-wrap justify-center gap-x-2 text-sm opacity-70">
            {email && (
              <a href={`mailto:${email}`} className="inline-block px-2 py-4 hover:text-daar-tan">
                {email}
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="inline-block px-2 py-4 hover:text-daar-tan"
              >
                {phone}
              </a>
            )}
          </div>
        )}

        {/* No staff entry point here by choice: this is a customer-facing
            page and the admin is reached at its own host, which staff
            bookmark. Removing the link is presentation, not security —
            admin.daarbyizzi.com is discoverable through certificate
            transparency logs the moment its TLS certificate is issued. The
            real protection is the password, two-factor and the DAL checks.
            The admin links out to the site; nothing links back in. */}

        {/* Kept out of the nav row above and sat with the copyright: required
            to be reachable, but it should not compete with Menu and Visit. */}
        <p className="mt-6 font-[family-name:var(--font-label)] text-[0.7rem] uppercase tracking-[0.18em] opacity-50">
          © {new Date().getFullYear()} {SITE.name} · {SITE.city} ·{" "}
          <Link href="/privacy" className="underline underline-offset-4 transition hover:text-daar-tan">
            Privacy
          </Link>
        </p>
      </div>
    </footer>
  );
}
