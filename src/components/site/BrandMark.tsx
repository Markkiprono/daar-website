import { DaarMark } from "./DaarMark";
import type { ResolvedLogo } from "@/lib/logo";

/**
 * Renders the Daar logo: the owner's real artwork when available, otherwise
 * the hand-traced door mark.
 *
 * `logo` is resolved on the server (see src/lib/logo.ts) and passed down, so
 * this stays usable inside client components like the navbar.
 *
 * SVG artwork arrives as inline markup rather than a URL — that is what lets
 * `fill="currentColor"` pick up the surrounding text colour. Through an
 * <img> tag the SVG is an isolated document and would render black.
 *
 * Colour is set per placement with a Tailwind text-* class on `className`:
 * tan on the dark header and footer, oxblood on the light admin login.
 *
 * An uploaded raster logo (PNG/WebP) cannot be tinted — it renders at its own
 * colours. Only inlined SVG picks up `color`.
 */
export function BrandMark({
  logo,
  className,
  id = "brand",
}: {
  logo?: ResolvedLogo;
  className?: string;
  /** Unique per instance — the traced fallback uses an internal mask id. */
  id?: string;
}) {
  if (!logo) return <DaarMark id={id} className={className} />;

  if (logo.kind === "svg") {
    return (
      <span
        // The SVG takes its width from its own viewBox, never from the wrapper.
        // It used to be w-full inside a w-auto span, which is circular: the
        // span shrink-wraps to its content while the content asks for a
        // percentage of the span. Chrome resolved it from the aspect ratio,
        // Safari resolved it against the available width — so on iPhone the
        // wrapper stretched across the header and preserveAspectRatio centred
        // the artwork, leaving a large gap to the left of the logo.
        // max-w-full keeps a wide mark from overflowing a narrow parent, and
        // block removes the inline baseline gap under it.
        className={`inline-block ${className ?? ""} [&>svg]:block [&>svg]:h-full [&>svg]:w-auto [&>svg]:max-w-full`}
        aria-hidden
        // Markup is screened by isSafeSvg() before it reaches here, and comes
        // from the owner's own file — not from visitor input.
        dangerouslySetInnerHTML={{ __html: logo.markup }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logo.src} alt="" aria-hidden className={className} />;
}
