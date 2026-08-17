const SHELL='homent-technician-shell-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(['/technician','/technician-icon.svg']))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||!new URL(event.request.url).pathname.startsWith('/technician'))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(response=>response||caches.match('/technician'))));});
