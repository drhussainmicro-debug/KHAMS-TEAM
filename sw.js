/* KHAMS service worker — auto-updating.
   HOW TO SHIP AN UPDATE: change your files, then bump the number in VERSION
   below (e.g. v3 -> v4) and push. Devices pick up the new version on next open. */
const VERSION = "khams-v2";
const CORE = ["./", "./index.html", "./manifest.json"];

// Install: pre-cache the core files and activate immediately.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE).catch(() => {}))
  );
});

// Activate: delete old version caches, then take control of open pages.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//  - Page loads (navigations): network-first so the newest app shows when online,
//    falling back to cache when offline.
//  - Everything else: cache-first, refreshed in the background.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
