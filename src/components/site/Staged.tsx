"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export type Beat = {
  /** The line that arrives with this frame. */
  line: string;
  /** The photograph behind it. */
  image: string;
  /** Described for anyone who cannot see it; the line is decoration over it. */
  alt: string;
};

/**
 * A section that holds still while photographs change behind a line of text.
 *
 * The panel is sticky and the scroll length comes from a stack of invisible
 * markers behind it, one per beat. An observer watches which marker is
 * crossing the middle of the screen and lights the matching frame and line —
 * no scroll listener and no measuring per frame, which is what keeps this
 * smooth on a phone.
 *
 * Classes are toggled on the nodes directly rather than held in React state,
 * matching Reveal. The live beat changes on almost every scroll frame near a
 * boundary, and re-rendering the section that often to move one class is work
 * for nothing.
 *
 * The first frame carries `is-active` in the server-rendered markup, so with
 * scripting off this is a photograph with a sentence on it rather than a blank
 * screen — and hydration finds the class exactly where it left it.
 */
export function Staged({
  eyebrow,
  beats,
  closing,
}: {
  eyebrow?: string;
  beats: Beat[];
  closing?: string;
}) {
  const markers = useRef<(HTMLDivElement | null)[]>([]);
  const frames = useRef<(HTMLDivElement | null)[]>([]);
  const lines = useRef<(HTMLParagraphElement | null)[]>([]);
  const closer = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const light = (i: number) => {
      frames.current.forEach((el, j) => el?.classList.toggle("is-active", j === i));
      lines.current.forEach((el, j) => el?.classList.toggle("is-active", j === i));
      closer.current?.classList.toggle("is-active", i === beats.length - 1);
    };

    const els = markers.current.filter(Boolean) as HTMLDivElement[];

    // No observer, or nothing mounted: leave the first frame up and light every
    // line rather than strand the passage at 16% opacity.
    if (els.length === 0 || !("IntersectionObserver" in window)) {
      lines.current.forEach((el) => el?.classList.add("is-active"));
      closer.current?.classList.add("is-active");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = Number((entry.target as HTMLElement).dataset.beat);
          if (!Number.isNaN(i)) light(i);
        }
      },
      // A band across the middle: a marker "arrives" as its centre passes the
      // centre of the screen.
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [beats.length]);

  return (
    <section
      className="relative bg-daar-ink text-daar-bone"
      // The height has to be stated. The markers below are absolutely
      // positioned so they add none of their own, and the sticky panel is only
      // one screen tall — without this the section is a single screen high,
      // there is nothing to scroll through, and the later beats never arrive.
      //
      // One screen more than there are beats. A sticky panel stops sticking a
      // screen before its section ends, so at exactly one screen per beat the
      // last one lit while the panel was already sliding away — it arrived and
      // left in the same movement. The spare screen holds the final frame
      // still for a moment before the section releases.
      style={{ height: `${(beats.length + 1) * 100}vh` }}
    >
      {/* Scroll length: one screen per beat. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {beats.map((_, i) => (
          <div
            key={i}
            data-beat={i}
            ref={(el) => {
              markers.current[i] = el;
            }}
            className="h-screen"
          />
        ))}
      </div>

      <div className="sticky top-0 h-screen overflow-hidden">
        {/* The photographs, cross-fading under the type. */}
        {beats.map((beat, i) => (
          <div
            key={beat.image + i}
            ref={(el) => {
              frames.current[i] = el;
            }}
            className={`daar-frame absolute inset-0 ${i === 0 ? "is-active" : ""}`}
          >
            <Image
              src={beat.image}
              alt={beat.alt}
              fill
              sizes="100vw"
              className="daar-drift object-cover"
            />
          </div>
        ))}

        {/* Enough scrim that display type stays legible over any photograph. */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,15,.55),rgba(18,16,15,.35)_45%,rgba(18,16,15,.75))]" />

        <div className="relative flex h-full items-center justify-center px-5">
          <div className="daar-staged mx-auto max-w-[1100px] text-center">
            {eyebrow && (
              <p className="font-[family-name:var(--font-label)] text-xs uppercase tracking-[0.18em] text-daar-tan">
                {eyebrow}
              </p>
            )}

            {/* Stacked, not flowed: each line occupies the same place so the
                passage reads as one sentence being replaced, not a list. */}
            <div className="relative mt-8 grid">
              {beats.map((beat, i) => (
                <p
                  key={beat.line}
                  ref={(el) => {
                    lines.current[i] = el;
                  }}
                  className="daar-beat col-start-1 row-start-1 font-[family-name:var(--font-display)] text-[clamp(2rem,7vw,5rem)] leading-[1.02]"
                >
                  {beat.line}
                </p>
              ))}
            </div>

            {closing && (
              <p
                ref={closer}
                className="daar-beat mx-auto mt-10 max-w-[52ch] text-[clamp(1rem,2.4vw,1.25rem)] font-light leading-relaxed text-daar-cream/85"
              >
                {closing}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
