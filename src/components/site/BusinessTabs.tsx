"use client";

import { useEffect, useState } from "react";

/**
 * The strip of section tabs on the For Business page. It sticks under the
 * header while you scroll and lights up the section you are reading, with a
 * gold bar that slides between tabs.
 */
export function BusinessTabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [top, setTop] = useState(0);

  // Sit exactly under the site header, whatever height it is on this screen.
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const measure = () => setTop(header.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const sections = tabs
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          // The enquiry form is not a tab, so nothing is lit while you're there.
          setActive(tabs.some((t) => t.id === e.target.id) ? e.target.id : null);
        }
      },
      // A section counts as "being read" once it crosses the upper middle.
      { rootMargin: "-40% 0px -55% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    const enquire = document.getElementById("enquire");
    if (enquire) io.observe(enquire);

    // Above the first section, nothing is active.
    const onScroll = () => {
      if (window.scrollY < sections[0]!.offsetTop - window.innerHeight * 0.5) setActive(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [tabs]);

  const index = tabs.findIndex((t) => t.id === active);

  return (
    <nav
      aria-label="Services for business"
      style={{ top }}
      className="sticky z-30 border-y border-white/[0.08] bg-daar-ink/90 backdrop-blur-xl backdrop-saturate-150"
    >
      <ul
        className="relative mx-auto grid max-w-[1240px]"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => (
          <li key={t.id} className="border-white/[0.08] [&:not(:first-child)]:border-l">
            <a
              href={`#${t.id}`}
              aria-current={active === t.id ? "true" : undefined}
              className={[
                "block px-2 py-4 text-center font-[family-name:var(--font-display)] text-[clamp(0.95rem,2.6vw,1.3rem)] transition-colors duration-500 sm:py-5",
                active === t.id ? "text-daar-tan" : "text-daar-bone/80 hover:text-daar-bone",
              ].join(" ")}
            >
              {t.label}
            </a>
          </li>
        ))}
        {/* The gold bar slides to whichever tab is active. */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 h-[2px] bg-gradient-to-r from-daar-tan to-daar-ochre transition-[left,opacity] duration-700 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none"
          style={{
            width: `${100 / tabs.length}%`,
            left: `${(Math.max(index, 0) * 100) / tabs.length}%`,
            opacity: index === -1 ? 0 : 1,
          }}
        />
      </ul>
    </nav>
  );
}
