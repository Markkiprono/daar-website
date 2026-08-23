import Image from "next/image";

export type Frame = {
  src: string;
  alt: string;
  blur?: string | null;
};

/**
 * Two bands of photographs drifting past in opposite directions.
 *
 * No JavaScript: the list is rendered twice and the track is translated by
 * exactly half its width, so the second copy is under the cursor at the moment
 * the first finishes and the loop is seamless. A scroll listener or a rAF loop
 * would do the same job and cost frames on a phone for it.
 *
 * The duplicate is aria-hidden — a screen reader should hear the plates once,
 * not twice.
 *
 * Reduce Motion stops the drift and leaves the bands scrollable by hand, so
 * the photographs are still all reachable rather than frozen half off-screen.
 */
function Band({ frames, reverse = false }: { frames: Frame[]; reverse?: boolean }) {
  if (frames.length === 0) return null;

  return (
    <div className="daar-marquee-wrap daar-noscrollbar overflow-x-auto">
      <div className={`daar-marquee flex gap-3 ${reverse ? "is-reverse" : ""}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-3" aria-hidden={copy === 1}>
            {frames.map((frame, i) => (
              <div
                key={`${copy}-${frame.src}-${i}`}
                className="relative h-[clamp(9rem,22vw,17rem)] w-[clamp(13rem,32vw,25rem)] shrink-0 overflow-hidden rounded-[3px] bg-daar-slate"
              >
                <Image
                  src={frame.src}
                  alt={copy === 0 ? frame.alt : ""}
                  fill
                  sizes="(min-width: 768px) 25rem, 60vw"
                  className="object-cover"
                  {...(frame.blur
                    ? { placeholder: "blur" as const, blurDataURL: frame.blur }
                    : {})}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Marquee({ top, bottom }: { top: Frame[]; bottom: Frame[] }) {
  return (
    <div className="space-y-3">
      <Band frames={top} />
      <Band frames={bottom} reverse />
    </div>
  );
}
