/* MusiMix — service worker
   Réseau d'abord pour l'appli (les mises à jour s'affichent tout de suite),
   cache en secours pour fonctionner hors ligne. */
const CACHE_NAME = 'musimix-v3';
const CORE = ['./', './index.html', './chords.js', './chords-db.json', './chords-db-piano.json',
              './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // gros fichiers audio de la démo et API externes : pas de cache
  if (/\.(mp3|wav|flac|m4a|ogg)$/i.test(url.pathname) || url.hostname === 'lrclib.net') return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && (url.origin === location.origin || /cdn\.jsdelivr|cdnjs\.cloudflare/.test(url.hostname))) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
