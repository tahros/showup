const CACHE = 'showup-v3.3.38';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css?v=3.3.38',
  './js/core.js?v=3.3.38',
  './js/derive.js?v=3.3.38',
  './js/util.js?v=3.3.38',
  './js/header.js?v=3.3.38',
  './js/report.js?v=3.3.38',
  './js/today.js?v=3.3.38',
  './js/lift.js?v=3.3.38',
  './js/stats.js?v=3.3.38',
  './js/history.js?v=3.3.38',
  './js/settings.js?v=3.3.38',
  './js/app.js?v=3.3.38',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
/* stale-while-revalidate: answer instantly from cache, refresh it in the
   background. Combined with skipWaiting + the app's reload-on-controllerchange,
   a deployed update goes live within seconds of the next launch — no more
   versions stuck behind a cache-first index.html. */
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(res => {
        if (res && res.ok) c.put(e.request, res.clone());
        return res;
      }).catch(() => null);
      return hit || net.then(r => r || new Response('', {status: 504}));
    })
  );
});
