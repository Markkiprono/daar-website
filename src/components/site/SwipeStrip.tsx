"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Whether we are running in the browser yet.
 *
 * Read as external state rather than set from an effect: the server has no
 * opinion, so its snapshot is "no", the markup matches on both sides, and
 * nothing calls setState during an effect — which is the cascading-render
 * trap the react-hooks rule warns about. Same shape as the motion check in
 * MediaBackdrop.
 */
const NEVER_CHANGES = () => () => {};

/**
 * A horizontally scrolling strip of cards, at every screen size.
 *
 * The scrolling itself is still the browser's: `overflow-x-auto` with
 * `snap-x snap-mandatory` on the container and a snap point on each child.
 * A finger drag, a trackpad swipe, shift-wheel and the arrow keys all work
 * because they are the platform's own gestures, and none of that needs this
 * component. THE JAVASCRIPT HERE ONLY ADDS THE ARROWS.
 *
 * The arrows exist because a desktop mouse is the one input that cannot
 * scroll sideways. A wheel scrolls the page, there is no swipe, and the
 * scrollbar is hidden — so without them a strip on a laptop looks like four
 * cards and a lot of empty space, with no sign that a fifth exists. They are
 * deliberately absent on touch, where swiping is the obvious thing to do and
 * a pair of buttons is clutter over the photograph.
 *
 * Everything degrades: the arrows render only after mount, so with scripting
 * off there are no dead controls, and the strip is still scrollable by every
 * other means. They hide themselves entirely when the content already fits,
 * because an arrow that cannot move anything is worse than no arrow.
 */
export function SwipeStrip({
  label,
  className = "",
  children,
}: {
  /** Names the scrollable region for screen readers. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Rendered only once mounted, so scripting-off gets no useless buttons.
  const ready = useSyncExternalStore(NEVER_CHANGES, () => true, () => false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // A pixel of slack: sub-pixel layout means scrollLeft rarely lands
    // exactly on the maximum, and without it the right arrow never disables.
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /**
     * Every measurement goes through a frame, never straight into setState.
     *
     * Two reasons. It keeps state out of the effect body, which is what stops
     * the cascading re-render the lint rule is about. And it means the first
     * measurement happens after layout rather than during it — measuring a
     * strip whose photographs have not been laid out yet reads a scrollWidth
     * that is about to change, and the arrows would settle into the wrong
     * state on a cold load.
     */
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    schedule();
    el.addEventListener("scroll", schedule, { passive: true });

    // The strip can start fitting and stop fitting without anyone scrolling —
    // a window resize, or the photographs finishing loading and changing the
    // scroll width. Both have to re-run the measurement.
    const ro = "ResizeObserver" in window ? new ResizeObserver(schedule) : null;
    ro?.observe(el);
    for (const child of Array.from(el.children)) ro?.observe(child);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", schedule);
      ro?.disconnect();
    };
  }, [measure]);

  const nudge = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // Most of a screenful, not all of it: leaving the last card visible keeps
    // the reader's place instead of teleporting to unfamiliar content.
    const step = Math.max(240, el.clientWidth * 0.8) * direction;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: step, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        // Focusable on purpose. A region that scrolls but cannot be reached
        // from the keyboard is a WCAG failure — this is what makes the arrow
        // keys work here the way they already do for a trackpad.
        tabIndex={0}
        className={`daar-swipe flex snap-x snap-mandatory overflow-x-auto ${className}`}
      >
        {children}
      </div>

      {ready && (canLeft || canRight) && (
        <>
          <Arrow direction="left" disabled={!canLeft} onClick={() => nudge(-1)} />
          <Arrow direction="right" disabled={!canRight} onClick={() => nudge(1)} />
        </>
      )}
    </div>
  );
}

function Arrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const left = direction === "left";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={left ? "Show previous cards" : "Show more cards"}
      className={[
        // Hidden on touch, where the swipe is the gesture and these would
        // only sit on top of the photographs.
        "absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full md:grid",
        "border border-daar-bone/25 bg-daar-ink/70 text-daar-bone backdrop-blur-sm transition",
        "hover:bg-daar-ink hover:border-daar-bone/50",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-daar-tan",
        // Faded rather than removed at the ends: a control that vanishes
        // moves everything next to it, and the eye reads that as a glitch.
        "disabled:pointer-events-none disabled:opacity-0",
        left ? "-left-2 lg:-left-5" : "-right-2 lg:-right-5",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={left ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"} />
      </svg>
    </button>
  );
}
