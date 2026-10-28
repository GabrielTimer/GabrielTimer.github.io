// MusiMix — service worker : l'appli fonctionne hors ligne une fois ouverte.
// Les morceaux sont stockés dans l'appareil (IndexedDB), pas dans ce cache.
const VERSION = 'musimix-4.1.1';
const SHELL = [
  './',
  'assets/fonts/Atkinson.ttf',
  'assets/fonts/Fraunces.ttf',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'css/app.css',
  'data/guitar.json',
  'index.html',
  'ancienne.html',
  'js/db.js',
  'js/diagrams.js',
  'js/engine.js',
  'js/main.js',
  'js/midi.js',
  'js/synth.js',
  'js/wav.js',
  'js/zoom.js',
  'js/pitch-worklet.js',
  'js/print.js',
  'js/render.js',
  'js/sheet.js',
  'js/songs.js',
  'js/studio.js',
  'js/theory.js',
  'js/ui.js',
  'js/views/editor.js',
  'js/views/library.js',
  'js/views/player.js',
  'js/zip.js',
  'manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                 // Studio, LRCLIB : jamais en cache
  if (/\.(mp3|wav|flac|m4a|ogg)$/i.test(url.pathname)) return; // audio de démo : réseau
  if (url.pathname.includes('/api/') || url.pathname.endsWith('/bridge')) return;
  // réseau d'abord (mises à jour immédiates), cache si hors ligne
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
