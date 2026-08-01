"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";
import type { ResolvedLogo } from "@/lib/logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/story", label: "Story" },
  { href: "/visit", label: "Visit" },
];

/**
 * Transparent over the hero, then a blurred gradient once you scroll.
 * On pages with no hero behind it (`solid`), it starts opaque so the
 * links are never cream-on-cream and unreadable.
 *
 * `logo` is resolved on the server and passed in, because the database and
 * filesystem lookups for the owner's real artwork cannot run in a client
 * component.
 */
export function SiteNav({
  solid = false,
  wordmark,
}: {
  solid?: boolean;
  /** The "DAAR by izzi" lettering. The header shows this alone. */
  wordmark?: ResolvedLogo;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [solid]);

  // Lock the page behind the full-screen drawer, and always restore on unmount.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const opaque = solid || scrolled;

  return (
    <>
      <header
        className={[
          solid ? "sticky" : "fixed",
          "inset-x-0 top-0 z-50 border-b transition-[background,backdrop-filter,border-color] duration-500",
          opaque
            ? "border-daar-tan/20 bg-daar-ink/90 backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-5 px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-daar-cream"
            aria-label="Daar home"
          >
            {wordmark ? (
              /* Lettering only in the header — the door mark carries the
               * footer. Set from the designer's artwork, not type: no web
               * font matches the DAAR wordmark. */
              <BrandMark
                logo={wordmark}
                id="nav-word"
                className="h-[38px] w-auto shrink-0 text-daar-tan"
              />
            ) : (
              <span className="leading-none">
                <span className="block font-[family-name:var(--font-display)] text-2xl font-medium tracking-[0.06em]">
                  DAAR
                </span>
                <span className="mt-0.5 block font-[family-name:var(--font-label)] text-[0.6rem] font-light tracking-[0.34em] opacity-75">
                  by izzi
                </span>
              </span>
            )}
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-8">
              {LINKS.map((l) => {
                const current = pathname === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={current ? "page" : undefined}
                      className={[
                        "daar-underline relative py-2 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] transition-opacity",
                        current
                          ? "text-daar-tan opacity-100"
                          : "text-daar-cream opacity-90 hover:opacity-100",
                      ].join(" ")}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <Link
            href="/reserve"
            className="hidden rounded-full bg-gradient-to-br from-daar-tan to-daar-ochre px-6 py-2.5 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-ink transition hover:-translate-y-px hover:brightness-105 lg:inline-block"
          >
            Reserve
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="daar-drawer"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 place-items-center text-daar-cream lg:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span aria-hidden className="flex flex-col gap-[6px]">
              <span
                className={`block h-[1.5px] w-[22px] bg-current transition-transform duration-400 ${open ? "translate-y-[7.5px] rotate-45" : ""}`}
              />
              <span className={`block h-[1.5px] w-[22px] bg-current transition-opacity ${open ? "opacity-0" : ""}`} />
              <span
                className={`block h-[1.5px] w-[22px] bg-current transition-transform duration-400 ${open ? "-translate-y-[7.5px] -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </header>

      {/* Animated with opacity + visibility rather than the `hidden`
          attribute: display:none cannot be transitioned, so the panel
          snapped in. `invisible` still removes the links from the tab
          order when closed. */}
      <div
        id="daar-drawer"
        aria-hidden={!open}
        className={[
          "daar-tex daar-tex-dark fixed inset-0 z-40 grid place-items-center bg-daar-ink lg:hidden",
          "transition-[opacity,visibility] duration-500 ease-[cubic-bezier(.22,.61,.36,1)]",
          "motion-reduce:transition-none",
          open ? "visible opacity-100" : "invisible opacity-0",
        ].join(" ")}
      >
        <nav aria-label="Mobile">
          <ul className="text-center">
            {LINKS.map((l, i) => (
              <li
                key={l.href}
                // Links rise in one after another once the panel is up, and
                // leave together so closing feels immediate.
                style={{ transitionDelay: open ? `${140 + i * 70}ms` : "0ms" }}
                className={[
                  "mt-6 transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,.61,.36,1)] first:mt-0",
                  "motion-reduce:transition-none",
                  open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                ].join(" ")}
              >
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  className="font-[family-name:var(--font-display)] text-[clamp(2rem,9vw,3.25rem)] text-daar-cream transition-colors hover:text-daar-tan"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li
              style={{ transitionDelay: open ? `${140 + LINKS.length * 70}ms` : "0ms" }}
              className={[
                "mt-10 transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,.61,.36,1)]",
                "motion-reduce:transition-none",
                open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
              ].join(" ")}
            >
              <Link
                href="/reserve"
                onClick={() => setOpen(false)}
                tabIndex={open ? 0 : -1}
                className="inline-block rounded-full bg-gradient-to-br from-daar-tan to-daar-ochre px-9 py-4 font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-ink transition hover:brightness-105"
              >
                Reserve a table
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
