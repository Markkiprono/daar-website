import type { Metadata } from "next";
import { Bodoni_Moda, Jost, Montserrat } from "next/font/google";
import { SITE } from "@/lib/config";
import { getSettings } from "@/lib/menu";
import "./globals.css";

/**
 * The three families agreed in the Phase 0 style board:
 *   Bodoni Moda — display, closest Didone to the DAAR wordmark
 *   Jost        — nav and labels, echoes the geometric "by izzi"
 *   Montserrat  — body
 * next/font self-hosts these, so there is no render-blocking request to
 * Google and no layout shift on a slow mobile connection.
 */
const display = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

const label = Jost({
  variable: "--font-label",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500"],
});

const body = Montserrat({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

/**
 * Metadata is generated (not static) so the favicon can come from the
 * dashboard. It falls back to /favicon.svg — the door mark — when the owner
 * hasn't uploaded one. Wrapped so a database blip never breaks the <head>.
 */
const HOME_TITLE = `${SITE.name} — ${SITE.descriptor} in ${SITE.area}, ${SITE.city}`;
const HOME_DESCRIPTION =
  "Slow-proved bread and pastry, baked the same morning it's served. Café and bakery on the 4th floor of The Mandrake, Westlands, Nairobi.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const heroImage = new URL(
    settings?.heroImageUrl ?? "/brand/counter.jpg",
    SITE.url,
  ).toString();

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: HOME_TITLE,
      // Pages set a short title; this appends the brand.
      template: `%s — ${SITE.name}`,
    },
    description: HOME_DESCRIPTION,
    applicationName: SITE.name,
    keywords: [
      SITE.name,
      "bakery Westlands",
      "café Nairobi",
      "sourdough Nairobi",
      "brunch Westlands",
      "The Mandrake Westlands",
      "celebration cakes Nairobi",
    ],
    alternates: { canonical: "/" },
    icons: {
      icon: settings?.faviconUrl ?? "/favicon.svg",
      apple: settings?.faviconUrl ?? "/favicon.svg",
    },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: "en_KE",
      url: SITE.url,
      title: HOME_TITLE,
      description: SITE.tagline ? "Proved slowly. Baked the same morning it's served." : HOME_DESCRIPTION,
      images: [{ url: heroImage, alt: `The counter at ${SITE.name}, ${SITE.area} ${SITE.city}` }],
    },
    twitter: {
      // Was defaulting to a small card: this is why shared links looked bare.
      card: "summary_large_image",
      title: HOME_TITLE,
      description: "Proved slowly. Baked the same morning it's served.",
      images: [heroImage],
    },
    robots: {
      index: true,
      follow: true,
      // Lets Google show a full-width photo of the food rather than a thumbnail.
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${label.variable} ${body.variable} h-full antialiased`}
    >
      <head>
        {/* Marks JS as available so scroll-reveal can hide content safely.
            Without it the page still renders fully — just without animation. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js')`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
