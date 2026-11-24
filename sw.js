// Keeps the app on the device so it opens without a connection.
// Your data never passes through here: it lives in the page's storage and your private repo.
const CACHE = 'budget-app-v13';   // = APP_VERSION in index.html
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Opening the app: the newest version if it answers within 2 seconds, otherwise the copy on the device.
// Everything else: from the device, refreshed in the background.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const page = e.request.mode === 'navigate';
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = (await cache.match(e.request, {ignoreSearch:true})) || (page ? await cache.match('index.html') : undefined);
    const fresh = fetch(page ? new Request(url.href, {cache:'no-cache'}) : e.request)
      .then(r => { if (!r.ok || r.redirected) return page ? null : r; cache.put(page ? 'index.html' : e.request, r.clone()); if (page) cache.put('./', r.clone()); return r; }).catch(() => null);
    if (page && hit) return (await Promise.race([fresh, new Promise(ok => setTimeout(ok, 2000, null))])) || hit;
    return hit || (await fresh) || cache.match('index.html');
  }));
});
