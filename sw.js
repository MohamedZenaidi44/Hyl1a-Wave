/* Hyl1a Wave — cache de l'interface pour un démarrage hors-ligne.
   Les données JSON restent réseau d'abord, avec la dernière version en secours. */

const CACHE = "hyl1a-wave-v1";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => {
          caches.open(CACHE).then(c => c.put("./index.html", r.clone()));
          return r;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  if (url.pathname.endsWith(".json")) {
    e.respondWith(
      fetch(req)
        .then(r => {
          caches.open(CACHE).then(c => c.put(req, r.clone()));
          return r;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
        return r;
      })
      .catch(() => caches.match(req))
  );
});
