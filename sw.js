const CACHE_NAME = "kine-v1.3";

const FILES = [
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
"/logo.png",
"/respir/index.html"
];

/* INSTALL */
self.addEventListener("install", e=>{

self.skipWaiting();

e.waitUntil(

caches.open(CACHE_NAME).then(cache=>{

return cache.addAll(FILES);

})

);

});

/* ACTIVATE */
self.addEventListener("activate", e=>{

e.waitUntil(

caches.keys().then(keys=>{

return Promise.all(

keys.map(k=>{

if(k !== CACHE_NAME){

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

/* HTML toujours réseau d'abord */

if(e.request.destination === "document"){

e.respondWith(

fetch(e.request)

.then(res=>{

let clone = res.clone();

caches.open(CACHE_NAME).then(cache=>{

cache.put(e.request, clone);

});

return res;

})

.catch(()=>caches.match(e.request))

);

return;

}

/* autres fichiers */

e.respondWith(

caches.match(e.request).then(res=>{

return res || fetch(e.request);

})

);

});