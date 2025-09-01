
const CACHE='eduboss-v3';
const ASSETS=['/','/index.html','/style.css','/app.js','/manifest.json','/icons/icon-192.png','/icons/icon-512.png','/online.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);
  if(url.pathname.endsWith('.html')||url.pathname==='/'){e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request)));}
  else{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));}
});
