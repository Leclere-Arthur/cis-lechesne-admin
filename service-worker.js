/* CIS Le Chesne Admin : mises à jour réseau prioritaire, hors-ligne en secours. */
const CACHE="cis-admin-2026-10-10-v3.16";
const ASSETS=["./","./index.html","./manifest.json"];
self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await Promise.allSettled(ASSETS.map(asset=>cache.add(new Request(asset,{cache:"reload"}))));
  }));
});
self.addEventListener("activate",event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith("cis-admin-")&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  // Le document HTML et les contrôles de version doivent toujours interroger le réseau.
  if(request.mode==="navigate"||url.pathname.endsWith("/index.html")||url.searchParams.has("_version")||url.searchParams.has("_maj")){
    event.respondWith((async()=>{
      try{
        const response=await fetch(new Request(request,{cache:"no-store"}));
        if(response.ok){const cache=await caches.open(CACHE);await cache.put("./index.html",response.clone());}
        return response;
      }catch(err){return await caches.match("./index.html")||Response.error();}
    })());
    return;
  }
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok&&response.type==="basic"){
        const cache=await caches.open(CACHE);
        await cache.put(request,response.clone());
      }
      return response;
    }catch(err){return await caches.match(request)||Response.error();}
  })());
});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();});
