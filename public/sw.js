/**
 * Offline support for the menu.
 *
 * The café's wifi is unreliable and guests read the menu on their phones, so
 * a menu that fails to load is the whole problem. This keeps the last version
 * each visitor saw and serves it only when the network actually fails.
 *
 * NETWORK-FIRST for pages, deliberately. A menu is not static: items sell out
 * through the morning, and a cache-first worker would cheerfully show someone
 * a pastry that went hours ago. Online visitors always get live data; the
 * cache is a fallback, never a shortcut.
 *
 * CACHE-FIRST only for build assets and images, whose URLs are content-hashed
 * or content-addressed — a changed file is a changed URL, so a stale hit is
 * impossible and a new deploy cannot be served old CSS.
 *
 * Never touches /admin or the API: the dashboard must always be live, and a
 * cached POST response would be a bug with teeth.
 */

const VERSION = "daar-v3";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;

// Pre-cached at install so the very first offline visit still has something.
const PRECACHE = ["/menu", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      // Individually, so one 404 cannot fail the whole install.
      .then((cache) => Promise.allSettled(PRECACHE.map((p) => cache.add(p))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Serve from the network, fall back to whatever we saved last time. */
async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Redirect rather than serving the fallback's HTML under the requested
    // URL. Handing back other markup makes the App Router hydrate, notice the
    // address doesn't match, try to fetch the real route and render its own
    // error instead of ours. The fallback is a plain file rather than a route
    // for the same reason: a Next page needs script chunks that are exactly
    // what a cold offline visit does not have. The guard stops it redirecting
    // to itself forever if it was somehow never cached.
    const url = new URL(request.url);
    if (url.pathname !== "/offline.html") {
      return Response.redirect(new URL("/offline.html", url.origin).href, 302);
    }
    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

/** Immutable by URL, so a cache hit is always correct. */
async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The dashboard and every API call stay live, always.
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/")) return;

  // Content-hashed build output and brand artwork.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/brand/")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Page navigations: menu first, but any page benefits from the fallback.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});
