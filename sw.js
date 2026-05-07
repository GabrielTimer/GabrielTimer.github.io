const CACHE_STATIC = "kine-static-v1.2";

/* fichiers essentiels */
const STATIC_FILES = [
"/",
"/index.html",
"/config.html",
"/timer.html",
"/fin.html",
"/historique.html",
"/folder.html",
"/mes_programmes.html",
"/pathologies.html",
"/liste_pathologies.html",
"/style.css",
"/logo.png"
];

/* INSTALL */
self.addEventListener("install", e=>{

self.skipWaiting();

e.waitUntil(

caches.open(CACHE_STATIC).then(cache=>{

return cache.addAll(STATIC_FILES);

})

);

});

/* ACTIVATE */
self.addEventListener("activate", e=>{

e.waitUntil(

caches.keys().then(keys=>{

return Promise.all(

keys.map(k=>{

if(k !== CACHE_STATIC){

return caches.delete(k);

}

})

);

})

);

self.clients.claim();

});

/* FETCH */

self.addEventListener("fetch", e=>{

/* HTML = toujours réseau d'abord */

if(e.request.destination === "document"){

e.respondWith(

fetch(e.request)

.then(res=>{

let clone = res.clone();

caches.open(CACHE_STATIC).then(cache=>{

cache.put(e.request, clone);

});

return res;

})

.catch(()=>caches.match(e.request))

);

return;

}

/* reste = cache */

e.respondWith(

caches.match(e.request).then(res=>{

return res || fetch(e.request);

})

);

});