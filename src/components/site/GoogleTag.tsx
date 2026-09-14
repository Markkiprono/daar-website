"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";

const GOOGLE_ADS_ID = "AW-18416615159";

/**
 * Google Ads tag (gtag.js) — how the ad account sees what its campaigns bring
 * to the site.
 *
 * Public site only. The dashboard shares the root layout, and a third-party
 * script has no business running beside the owner's session. The check reads
 * the matched route, not the address bar: src/proxy.ts rewrites
 * admin.daarbyizzi.com onto /admin/*, so the browser shows "/menu" there while
 * this segment reads "admin". usePathname() would get that wrong.
 *
 * Production only, like the service worker, so development traffic never
 * lands in the ad account.
 *
 * The privacy notice names this tag. Remove it, or add another, and
 * src/app/privacy/page.tsx has to change with it.
 */
export function GoogleTag() {
  const segment = useSelectedLayoutSegment();
  const pathname = usePathname();
  const enabled = process.env.NODE_ENV === "production" && segment !== "admin";

  /**
   * Report every page a visitor reaches, not only the one they land on.
   *
   * Google's snippet was written for sites where each click loads a fresh
   * page, so its one gtag('config') call records every page. This site moves
   * between pages without reloading, so that call runs once per visit: someone
   * who arrived from an ad on the home page and clicked through to /reserve
   * was recorded as having seen the home page and nothing else. Measured in a
   * real browser before this existed — a click to /menu sent Google nothing
   * at all — which left a "looked at the booking page" audience empty of
   * almost everyone who had.
   *
   * The first run is skipped because it is the landing page, which the config
   * call below has already reported; sending it here too would count every
   * visit twice. The previous path is recorded inside the effect rather than
   * taken from the first render on purpose: with a Proxy in front, the
   * server's idea of the pathname can differ from the browser's, and a
   * comparison against the server's value would log a page nobody moved to.
   *
   * Pathname only. A filter or a query string is not a new page, and reading
   * search params here would need a Suspense boundary around the whole site.
   */
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (lastPath.current === null || lastPath.current === pathname) {
      lastPath.current = pathname;
      return;
    }
    lastPath.current = pathname;

    const { gtag } = window as Window & { gtag?: (...args: unknown[]) => void };
    // Undefined only if a visitor manages to click before the tag has run at
    // all. Nothing is lost that queueing could save: an event ahead of the
    // config call has no destination and Google discards it.
    if (typeof gtag !== "function") return;
    gtag("event", "page_view", {
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} />
      <Script id="google-tag">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
      </Script>
    </>
  );
}
