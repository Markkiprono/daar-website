"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/options", label: "Options" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/sections", label: "Sections" },
  { href: "/admin/business", label: "For Business" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/security", label: "Security" },
];

/**
 * The dashboard's row of tabs. It scrolls sideways when there are more tabs
 * than fit: swipe on a phone, or use the mouse wheel or the arrow buttons on
 * a computer. Faded edges show there is more to see, and the open tab is
 * always scrolled into view. The active tab is marked in the brand oxblood.
 */
export function AdminNav({ counts }: { counts?: { messages?: number; reservations?: number } }) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    // A normal mouse wheel scrolls up and down; turn that into sideways
    // movement here so the row can be scrolled without a trackpad.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, [update]);

  // Bring the open tab into view, e.g. Security on a narrow screen.
  useEffect(() => {
    const el = listRef.current;
    const current = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !current) return;
    const left = current.offsetLeft - el.clientWidth / 2 + current.clientWidth / 2;
    el.scrollTo({ left, behavior: "smooth" });
  }, [pathname]);

  const nudge = (dir: -1 | 1) => {
    const el = listRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 grid h-8 w-8 -translate-y-[calc(50%+4px)] place-items-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:text-[#481819]";

  return (
    <nav aria-label="Dashboard" className="relative mx-auto max-w-5xl px-4">
      {/* Faded edges, shown only when there is more in that direction. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-4 z-[5] w-14 bg-gradient-to-r from-white to-transparent transition-opacity duration-300 ${canLeft ? "opacity-100" : "opacity-0"}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-4 z-[5] w-14 bg-gradient-to-l from-white to-transparent transition-opacity duration-300 ${canRight ? "opacity-100" : "opacity-0"}`}
      />

      {canLeft && (
        <button type="button" onClick={() => nudge(-1)} aria-label="Scroll tabs left" className={`${arrow} left-3`}>
          ‹
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => nudge(1)} aria-label="Scroll tabs right" className={`${arrow} right-3`}>
          ›
        </button>
      )}

      <ul
        ref={listRef}
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {LINKS.map((l) => {
          // /admin must not light up for every nested route.
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          const badge =
            l.href === "/admin/messages"
              ? counts?.messages
              : l.href === "/admin/reservations"
                ? counts?.reservations
                : undefined;

          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm transition",
                  active
                    ? "bg-[#481819] font-medium text-[#f2e4d4]"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                ].join(" ")}
              >
                {l.label}
                {badge ? (
                  <span
                    className={[
                      "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-medium tabular-nums",
                      active ? "bg-[#f2e4d4] text-[#481819]" : "bg-[#481819] text-[#f2e4d4]",
                    ].join(" ")}
                  >
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
