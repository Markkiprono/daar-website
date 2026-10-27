"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A thin gold bar across the top of the screen that starts the moment a link
 * is tapped and finishes when the new page arrives.
 *
 * Without it, tapping a link on a slow connection looks like nothing
 * happened until the next page appears — people tap again, or think the site
 * is broken. The bar answers the tap at once.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "start" | "loading" | "done">("idle");
  /** The page the tap happened on; once the address changes, we've arrived. */
  const [from, setFrom] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Start on a tap of any link that leaves this page for another one here.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page (maybe a different #section): nothing to wait for.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      clearTimers();
      // Reset to empty first, then let it grow on the next frame.
      setFrom(window.location.pathname);
      setPhase("start");
      timers.current.push(window.setTimeout(() => setPhase("loading"), 30));
      // Never leave a bar hanging if something goes wrong.
      timers.current.push(window.setTimeout(() => setPhase("done"), 15000));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The new page is here once the address has moved on: run the bar to the
  // end, then fade it away.
  const arrived = (phase === "start" || phase === "loading") && from !== null && pathname !== from;
  const shown = arrived ? "done" : phase;

  useEffect(() => {
    if (shown !== "done") return;
    const t = window.setTimeout(() => {
      clearTimers();
      setPhase("idle");
      setFrom(null);
    }, 450);
    return () => window.clearTimeout(t);
  }, [shown]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      // Appears at once on a tap; only the fade-out is eased.
      style={{
        opacity: shown === "idle" ? 0 : 1,
        transition: shown === "idle" ? "opacity 300ms ease 150ms" : "none",
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-daar-tan via-daar-ochre to-daar-tan shadow-[0_0_10px_rgba(232,162,43,0.7)]"
        style={{
          width: shown === "start" ? "0%" : shown === "loading" ? "85%" : "100%",
          // Rushes to a third, then creeps towards 85% while waiting.
          transition:
            shown === "loading"
              ? "width 8s cubic-bezier(0.1, 0.8, 0.2, 1)"
              : shown === "done"
                ? "width 250ms ease-out"
                : "none",
        }}
      />
    </div>
  );
}
