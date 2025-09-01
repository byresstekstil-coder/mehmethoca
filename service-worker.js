const CACHE_NAME='eduboss-cache-v10';
const ASSETS=['/','/index.html','/style.css','/app.js','/manifest.json','/icons/icon-192.png','/icons/icon-512.png','/online.html','/student.html'];
self.addEventListener('install',e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS).catch(()=>{}))); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('fetch',e=>{ const req=e.request; e.respondWith((async()=>{ const res=await caches.match(req); if(res) return res; try{ const net=await fetch(req); return net; }catch(err){ return res||Response.error(); } })()); });
