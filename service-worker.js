const CACHE='phd-teaching-load-variant-shell-v1-20261020';
const SHELL=['./','./index.html','./styles.css?v=1-variant','./data.js?v=1-variant','./app.js?v=1-variant','./faculty-report.js?v=1-variant','./manifest.webmanifest?v=1-variant','./nubip-logo.png','./icon.svg?v=1-variant','./icon-192.png?v=1-variant','./icon-512.png?v=1-variant','./icon-maskable-512.png?v=1-variant','./apple-touch-icon.png?v=1-variant'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('phd-teaching-load-variant-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const navigation=request.mode==='navigate',key=navigation?'./index.html':request;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request,{cache:'no-store'});
   if(response.ok){await cache.put(key,response.clone());return response;}
   return (await cache.match(key))||response;
  }catch{return (await cache.match(key))||Response.error();}
 })());
});




































