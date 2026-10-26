/* Service worker : application utilisable hors connexion, mises à jour en douceur. */

const VERSION = "gt-2.1.3";
const SHELL = `${VERSION}-shell`;
const MEDIA = `${VERSION}-media`;

const PRECACHE = [
  "/", "/index.html", "/cloud.html", "/timer.html", "/fin.html", "/progression.html",
  "/historique.html", "/mes_programmes.html", "/reglages.html", "/respir/index.html",
  "/manifest.json", "/logo.png", "/icon-192.png", "/icon-512.png",
  "/assets/app.css", "/assets/app.js", "/assets/icons.js", "/assets/config.js", "/assets/cloud.js",
  "/assets/patient.js", "/assets/library.js", "/assets/chart.js", "/assets/programmes-view.js",
  "/assets/pages/home.css", "/assets/pages/home.js", "/assets/pages/cloud.js", "/assets/pages/timer.css",
  "/assets/pages/timer.js", "/assets/pages/fin.js", "/assets/pages/progression.js", "/assets/pages/local.js",
  "/images/eva/0.png", "/images/eva/1.png", "/images/eva/2.png", "/images/eva/3.png", "/images/eva/4.png", "/images/eva/5.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL).then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => null))))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if(event.data === "skipWaiting") self.skipWaiting();
});

const isImmutableCdn = url =>
  url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/") ||
  url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com";

async function networkFirst(request, cacheName){
  const cache = await caches.open(cacheName);
  try{
    const response = await fetch(request);
    if(response && response.ok) cache.put(request, response.clone());
    return response;
  }catch(err){
    const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if(cached) return cached;
    if(request.mode === "navigate") return (await cache.match("/index.html")) || Response.error();
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName){
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request).then(response => {
    if(response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fresh;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;
  const url = new URL(request.url);

  if(url.origin !== self.location.origin){
    if(isImmutableCdn(url)) event.respondWith(staleWhileRevalidate(request, SHELL));
    return; // Firestore, vidéos… : directement sur le réseau
  }
  if(url.pathname.startsWith("/musimix/")) return;

  if(request.mode === "navigate" || url.pathname.startsWith("/assets/") || url.pathname.endsWith(".html") || url.pathname === "/manifest.json"){
    event.respondWith(networkFirst(request, SHELL));
    return;
  }
  if(/\.(png|jpe?g|webp|gif|svg|wav|mp3|pdf)$/i.test(url.pathname) || url.pathname.startsWith("/exercises/data/")){
    event.respondWith(staleWhileRevalidate(request, MEDIA));
  }
});
