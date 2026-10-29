/* Service worker : application utilisable hors connexion, mises à jour en douceur. */

const VERSION = "gt-2.9.4";
const SHELL = `${VERSION}-shell`;
const MEDIA = `${VERSION}-media`;

const PRECACHE = [
  "/", "/index.html", "/cloud.html", "/timer.html", "/fin.html", "/progression.html", "/suivi.html", "/conseils.html",
  "/assets/suivi.js", "/assets/messages.js", "/assets/bodychart.js", "/assets/nerfs-data.js", "/assets/nerfs-ui.js", "/assets/evolution.js", "/assets/questionnaires.js", "/assets/conseils-data.js",
  "/historique.html", "/mes_programmes.html", "/reglages.html", "/respir/index.html",
  "/manifest.json", "/logo.png", "/icon-192.png", "/icon-512.png",
  "/assets/app.css", "/assets/app.js", "/assets/icons.js", "/assets/config.js", "/assets/cloud.js",
  "/assets/patient.js", "/assets/library.js", "/assets/classement.js", "/assets/settings.js", "/assets/rappels.js", "/assets/chart.js", "/assets/programmes-view.js",
  "/assets/pages/home.css", "/assets/pages/home.js", "/assets/pages/cloud.js", "/assets/pages/timer.css",
  "/assets/pages/timer.js", "/assets/pages/fin.js", "/assets/pages/progression.js", "/assets/pages/local.js",
  "/images/eva/0.png", "/images/eva/1.png", "/images/eva/2.png", "/images/eva/3.png", "/images/eva/4.png", "/images/eva/5.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL).then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting()) // la nouvelle version prend la main tout de suite
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

/* Rappels de séance : notification envoyée par le cabinet (voir assets/rappels.js) */
self.addEventListener("push", event => {
  let d = {};
  try{ d = event.data ? event.data.json() : {}; }catch(e){ d = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "Votre séance du jour", {
    body: d.body || "Votre séance d'exercices vous attend.",
    icon: "/icon-192.png", badge: "/icon-192.png",
    tag: d.tag || "seance", renotify: false,
    data: { url: d.url || "/index.html" }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/index.html", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(list => {
    const win = list.find(c => c.url.startsWith(self.location.origin));
    if(win){ return win.focus().then(w => (w || win).navigate ? (w || win).navigate(url).catch(() => null) : null); }
    return self.clients.openWindow(url);
  }));
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

  if(request.mode === "navigate" || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/exercises/data/") || url.pathname.endsWith(".html") || url.pathname === "/manifest.json"){
    event.respondWith(networkFirst(request, SHELL));
    return;
  }
  if(/\.(png|jpe?g|webp|gif|svg|wav|mp3|pdf)$/i.test(url.pathname)){
    event.respondWith(staleWhileRevalidate(request, MEDIA));
  }
});
