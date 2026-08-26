"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function motionAllowed() {
  if (window.matchMedia(REDUCED).matches) return false;
  // Save-Data is a request not to pull megabytes over a metered connection,
  // which is most of this café's visitors on mobile.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !conn?.saveData;
}

/**
 * A full-bleed backdrop: a still photograph, with a silent loop over it when
 * one has been uploaded.
 *
 * Used by the hero, the sliding panels and the closing band. It was written
 * for the hero alone and generalised when the dashboard gained a slot for
 * every one of those sections — the careful part below is the same wherever
 * a film sits behind type, and having three copies of it would mean three
 * places to get autoplay, Reduce Motion and Save-Data subtly wrong.
 *
 * The photograph is always rendered and is always the element the browser
 * measures for largest-contentful-paint. The video is layered on top at zero
 * opacity and only fades in once it is genuinely playing, which means every
 * way this can fail degrades to the photograph rather than to a black
 * rectangle:
 *
 *   - no video uploaded            → photograph
 *   - autoplay blocked by the browser → photograph
 *   - still buffering on slow data → photograph until it isn't
 *   - decode error, codec refused  → photograph
 *   - Reduce Motion               → photograph, video never requested
 *
 * That last one matters beyond preference: a looping background is exactly
 * the kind of movement people turn that setting on to escape.
 */
export function MediaBackdrop({
  image,
  video,
  alt,
  priority = true,
  imageClassName = "object-cover",
  overlayClassName = "bg-[linear-gradient(180deg,rgba(18,16,15,.15),rgba(18,16,15,.55)_55%,rgba(18,16,15,.92))]",
  sizes = "100vw",
}: {
  image: string;
  video: string | null;
  alt: string;
  /** Only the first thing on screen should preload — see next/image docs. */
  priority?: boolean;
  imageClassName?: string;
  /** The scrim that keeps display type legible over any photograph. Pass "" where nothing sits on top. */
  overlayClassName?: string;
  /** Full-bleed by default; narrow it where the slot is not the whole width. */
  sizes?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  // Nothing is fetched until the section is nearly on screen.
  const [near, setNear] = useState(false);

  // Read as external state rather than copied into state from an effect: the
  // preference lives in the browser, can change while the page is open, and
  // the server has no opinion — so the server snapshot is "no", and the
  // markup matches on both sides.
  const mayPlay = useSyncExternalStore(subscribeToMotion, motionAllowed, () => false);
  const wanted = Boolean(video) && mayPlay;

  /**
   * Load and play only around the time it is seen.
   *
   * This section can sit at the foot of a long page, and the file is measured
   * in megabytes: fetching it for every visitor, including the ones who never
   * scroll that far, is somebody's mobile data spent on nothing. The observer
   * decides when it is worth having, and pauses it again on the way out —
   * a loop running under content nobody is looking at is just battery.
   */
  useEffect(() => {
    const el = box.current;
    if (!el || !wanted) return;

    // No observer: the film simply never loads and the photograph stands in,
    // which is where every other failure here lands too. Not worth a second
    // code path for browsers that predate the API.
    if (!("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setNear((was) => was || entry.isIntersecting);
        const video = ref.current;
        if (!video) return;
        if (entry.isIntersecting) {
          // Autoplay rejection is a promise rejection, not an error event, and
          // an unhandled one is console noise for something handled by design.
          void video.play().catch(() => setPlaying(false));
        } else {
          video.pause();
        }
      },
      // A screen of warning, so it is ready by the time it is looked at.
      { rootMargin: "100% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [wanted]);

  return (
    <div ref={box} className="absolute inset-0">
      {/* `preload`, not the deprecated `priority` — see the Next 16 notes in
          node_modules/next/dist/docs. Only what is actually on screen first
          should claim it; several competing preloads help nobody. */}
      <Image
        src={image}
        alt={alt}
        fill
        preload={priority}
        sizes={sizes}
        className={imageClassName}
      />

      {video && wanted && near && (
        <video
          ref={ref}
          src={video}
          muted
          loop
          playsInline
          // Autoplay, not a play() call from the observer. The element only
          // mounts once the section is near, so on that first crossing the ref
          // is still null and an observer-driven play() lands on nothing — the
          // film arrived and sat there on its first frame. The observer keeps
          // handling every crossing after this one.
          autoPlay
          preload="auto"
          aria-hidden
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          onError={() => setPlaying(false)}
          className={[
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
            playing ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      )}

      <div className={`absolute inset-0 ${overlayClassName}`} />
    </div>
  );
}
