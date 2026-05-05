const CACHE_STATIC = "kine-static-v1";
const CACHE_DYNAMIC = "kine-dynamic-v1";

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
"/logo.png",

/* EVA */
"/images/eva/0.png",
"/images/eva/1.png",
"/images/eva/2.png",
"/images/eva/3.png",
"/images/eva/4.png",
"/images/eva/5.png"
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
if(k !== CACHE_STATIC && k !== CACHE_DYNAMIC){
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

/* images → cache dynamique */
if(e.request.url.includes("/images/")){

e.respondWith(
caches.open(CACHE_DYNAMIC).then(cache=>{
return cache.match(e.request).then(res=>{
return res || fetch(e.request).then(fetchRes=>{
cache.put(e.request, fetchRes.clone());
return fetchRes;
});
});
})
);

return;
}

/* reste */
e.respondWith(
caches.match(e.request).then(res=>{
return res || fetch(e.request);
})
);

});