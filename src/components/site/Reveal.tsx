"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Scroll-triggered reveal. Restrained by design: a short rise and fade,
 * once, never replayed.
 *
 * Content is visible by default; only `.js .daar-reveal` hides it, and the
 * `js` class is set by an inline script in the root layout. If the script
 * never runs the page still reads perfectly — it just doesn't animate.
 * Also respects prefers-reduced-motion via CSS.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  rise = false,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  /** Further and slower — for photographs, which carry the movement. */
  rise?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => entry.target.classList.add("is-in"), delay);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    io.observe(el);

    // Safety net. IntersectionObserver relies on the page actually painting,
    // and there are environments where it exists but never fires. Since the
    // un-revealed state is opacity:0, a silent failure would leave the page
    // blank — so reveal unconditionally after a short grace period.
    const failsafe = window.setTimeout(() => el.classList.add("is-in"), 2500);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [delay]);

  return (
    <Tag ref={ref} className={`${rise ? "daar-rise" : "daar-reveal"} ${className}`}>
      {children}
    </Tag>
  );
}
