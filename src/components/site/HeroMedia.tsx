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
 * The hero backdrop: a still photograph, with a silent loop over it when one
 * has been uploaded.
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
export function HeroMedia({
  image,
  video,
  alt,
}: {
  image: string;
  video: string | null;
  alt: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // Read as external state rather than copied into state from an effect: the
  // preference lives in the browser, can change while the page is open, and
  // the server has no opinion — so the server snapshot is "no", and the
  // markup matches on both sides.
  const mayPlay = useSyncExternalStore(subscribeToMotion, motionAllowed, () => false);
  const wanted = Boolean(video) && mayPlay;

  useEffect(() => {
    const el = ref.current;
    if (!el || !wanted) return;
    // Autoplay rejection is a promise rejection, not an error event, and an
    // unhandled one is noise in the console for something we handle by design.
    void el.play().catch(() => setPlaying(false));
  }, [wanted]);

  return (
    <div className="absolute inset-0">
      <Image
        src={image}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {video && wanted && (
        <video
          ref={ref}
          src={video}
          muted
          loop
          playsInline
          preload="metadata"
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

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,15,.15),rgba(18,16,15,.55)_55%,rgba(18,16,15,.92))]" />
    </div>
  );
}
