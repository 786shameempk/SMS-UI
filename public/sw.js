/*
 * School Sphere service worker.
 *
 * 1. Web Push (class reminders, "class is live", cancellations).
 * 2. A cached app shell so the app opens without a connection (needed to take attendance offline). It caches ONLY the
 *    static files of the app itself: the page, its hashed /assets/* bundles, the icon, the manifest and /config.js.
 *    It never caches API answers, requests that carry credentials, other sites, or anything under /services or /api,
 *    so a school app never shows yesterday's timetable or someone else's data from a cache. Data for offline
 *    attendance is kept by the app itself in IndexedDB, per signed-in user, and deleted on sign-out.
 */

const SHELL_CACHE = "shell-v1";
const ASSET_CACHE = "assets-v1";
const MAX_ASSETS = 150;
const KEEP = [SHELL_CACHE, ASSET_CACHE];
const STANDALONE_PAGE = /^\/(founder|product|privacy)\/?$|\.[a-z0-9]+$/i;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (!KEEP.includes(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);

/** Same-origin GET requests for the app's own static files; everything else goes straight to the network. */
function isShellRequest(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (request.headers.has("authorization")) return false;
  if (url.pathname.startsWith("/services/") || url.pathname.startsWith("/api/")) return false;
  return true;
}

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key);
}

/** Hashed bundles never change under the same name: serve from cache, fill it on first use. */
async function assetFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

/** Network first so a deploy shows up at once; the saved copy answers only when the network does not. */
async function networkFirst(request, cacheKey) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    const saved = await cache.match(cacheKey);
    if (saved) return saved;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (!isShellRequest(request, url)) return;

  // Every page of the single-page app is the same document. The standalone static pages (/founder, /product, /privacy, *.html)
  // are not, so they are left to the network.
  if (request.mode === "navigate") {
    if (STANDALONE_PAGE.test(url.pathname)) return;
    event.respondWith(networkFirst(request, "/index.html"));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(assetFirst(request));
    return;
  }
  if (url.pathname === "/config.js" || url.pathname === "/manifest.webmanifest" || url.pathname === "/favicon.svg") {
    event.respondWith(networkFirst(request, url.pathname));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "School Sphere", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "School Sphere";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/online-classes" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/online-classes", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an open School Sphere tab if there is one, otherwise open a new window.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
