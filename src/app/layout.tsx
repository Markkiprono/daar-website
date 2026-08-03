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
export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl: string | null = null;
  try {
    faviconUrl = (await getSettings())?.faviconUrl ?? null;
  } catch {
    /* fall back to the bundled default */
  }

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: `${SITE.name} — ${SITE.city}`,
      template: `%s — ${SITE.name}`,
    },
    description:
      "Daar Cafe & Bakery, Nairobi. Proved slowly, baked the same morning it's served. Patience tastes better.",
    icons: {
      icon: faviconUrl ?? "/favicon.svg",
      apple: faviconUrl ?? "/favicon.svg",
    },
    openGraph: {
      title: `${SITE.name} — ${SITE.city}`,
      description: SITE.tagline,
      type: "website",
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
