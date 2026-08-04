"use client";

import { useEffect } from "react";

/**
 * Registers the offline worker.
 *
 * Registered after load so it never competes with the first paint, and only in
 * production: a worker sitting in front of the dev server makes hot reload
 * behave strangely and is a poor way to spend an afternoon.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a bonus; failing to register must never be
        // visible to a guest reading the menu.
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
