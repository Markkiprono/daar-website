"use client";

import { useEffect } from "react";

/**
 * Fires one view ping per item, per browser tab.
 *
 * sessionStorage — not a cookie — holds only the slugs already counted in
 * this tab. It is cleared when the tab closes, is never sent to the server,
 * and identifies nobody. It exists so a refresh or a back-navigation doesn't
 * inflate the count.
 *
 * Renders nothing and never blocks: a failed ping is simply a lost view.
 */
export function ViewTracker({ slug, source = "MENU" }: { slug: string; source?: string }) {
  useEffect(() => {
    const key = `daar:viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode or storage disabled — count it anyway.
    }

    // A short delay filters out instant bounces and lets the page settle.
    const timer = window.setTimeout(() => {
      void fetch("/api/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, source }),
        // Survives the request if the visitor navigates away immediately.
        keepalive: true,
      }).catch(() => {
        /* analytics must never surface an error to a guest */
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [slug, source]);

  return null;
}
