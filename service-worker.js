```javascript
const CACHE_NAME = "workout-timer-v1";

const urlsToCache = [
"/",
"/index.html",
"/timer.html",
"/manifest.json",
"/logo.png"
];

self.addEventListener("install", event => {

event.waitUntil(

caches.open(CACHE_NAME)
.then(cache => cache.addAll(urlsToCache))

);

});

self.addEventListener("fetch", event => {

event.respondWith(

caches.match(event.request)
.then(response => response || fetch(event.request))

);

});
```
