const CACHE='eduboss-cache-v14';
const ASSETS=['/','/index.html','/students.html','/tasks.html','/docs.html','/online.html','/kasa.html','/dukkan.html','/whatsapp.html','/settings.html','/style.css','/app.js','/manifest.json','/icons/icon-192.png','/icons/icon-512.png','/student.html'];
self.addEventListener('install',e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{}))); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ const ks=await caches.keys(); await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('fetch',e=>{
  const req=e.request;
  const isDoc = req.mode==='navigate' || (req.headers.get('accept')||'').includes('text/html');
  if(isDoc){
    e.respondWith((async()=>{ try{ const net=await fetch(req,{cache:'no-store'}); return net; }catch(err){ const res=await caches.match(req); return res||caches.match('/index.html'); } })());
  }else{
    e.respondWith((async()=>{ const res=await caches.match(req); if(res) return res; try{ const net=await fetch(req); return net; }catch(err){ return res||Response.error(); } })());
  }
});