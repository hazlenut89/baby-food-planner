// Latest UI first. User records remain in IndexedDB/localStorage, never in this cache.
const CACHE='bamsongi-ui-v2-6-1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./manifest.webmanifest'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.open(CACHE).then(cache=>cache.match(event.request))));});
