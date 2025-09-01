
const CACHE_NAME = 'eduboss-cache-v1';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js', '/manifest.json',
  '/icons/icon-192.png', '/icons/icon-512.png', '/online.html'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  // Network-first for html, cache-first for others
  if(url.pathname.endsWith('.html') || url.pathname==='/' ){
    e.respondWith(fetch(e.request).then(r=>{
      const copy = r.clone();
      caches.open(CACHE_NAME).then(c=>c.put(e.request, copy));
      return r;
    }).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(caches.match(e.request).then(res=>res || fetch(e.request)));
  }
});
