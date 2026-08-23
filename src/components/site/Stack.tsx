import Image from "next/image";
import Link from "next/link";

export type Panel = {
  /** The line that sits on this panel. */
  line: string;
  /** Small label above it. */
  eyebrow?: string;
  image: string;
  alt: string;
  links?: { label: string; href: string }[];
};

/**
 * Full-screen panels that slide up over one another as the page scrolls.
 *
 * Every panel is `sticky top-0` and a screen tall, so each one parks at the
 * top of the viewport while the next travels up and covers it. That is the
 * whole mechanism — no scroll listener, no transform maths, no library. The
 * browser's own sticky positioning does it, which is why it stays smooth on a
 * phone and costs nothing in JavaScript.
 *
 * Panels after the first carry a rounded top edge and a shadow so the moment
 * of covering reads as one card arriving over another rather than a photograph
 * abruptly changing.
 *
 * With scripting off it behaves identically: this is CSS, and every line and
 * photograph is in the markup.
 */
export function Stack({ panels }: { panels: Panel[] }) {
  return (
    <div className="relative">
      {panels.map((panel, i) => (
        <section
          key={panel.line}
          className={[
            "sticky top-0 grid h-screen place-items-center overflow-hidden bg-daar-ink px-5 text-center text-daar-cream",
            i > 0 ? "rounded-t-[1.75rem] shadow-[0_-24px_60px_rgba(18,16,15,.55)]" : "",
          ].join(" ")}
        >
          <Image
            src={panel.image}
            alt={panel.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className="daar-drift object-cover"
          />
          {/* Enough scrim that display type holds over any photograph. */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,15,.5),rgba(18,16,15,.3)_45%,rgba(18,16,15,.8))]" />

          <div className="relative z-10 mx-auto max-w-[1000px] py-24">
            {panel.eyebrow && (
              <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
                {panel.eyebrow}
              </p>
            )}
            <p className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,5rem)] leading-[1.02] text-daar-bone">
              {panel.line}
            </p>

            {panel.links && panel.links.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                {panel.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="border-b border-daar-tan/60 pb-1 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-cream transition hover:border-daar-cream"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
