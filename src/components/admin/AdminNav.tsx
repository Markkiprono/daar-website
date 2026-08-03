"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/security", label: "Security" },
];

/**
 * Horizontal, scrollable on a phone — the owner's primary device. The active
 * tab is marked with the brand oxblood rather than a generic accent, so the
 * dashboard reads as part of Daar and not as a stock template.
 */
export function AdminNav({ counts }: { counts?: { messages?: number; reservations?: number } }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="mx-auto max-w-5xl px-4">
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
