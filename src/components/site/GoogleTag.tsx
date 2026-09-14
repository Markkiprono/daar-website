"use client";

import Script from "next/script";
import { useSelectedLayoutSegment } from "next/navigation";

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
  if (process.env.NODE_ENV !== "production" || segment === "admin") return null;

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
