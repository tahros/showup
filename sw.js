const CACHE = 'showup-v4.5.17';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css?v=4.5.17',
  './css/planner.css?v=4.5.17',
  './css/mascot.css?v=4.5.17',
  './js/mascot.js?v=4.5.17',
  './js/plates.js?v=4.5.17',
  './js/plate-canvas.js?v=4.5.17',
  './css/plates.css?v=4.5.17',
  './js/mascot-renderer.js',
  './js/plate-gif.js',
  './js/plate-gif-worker.js',
  './js/plate-video.js',
  './vendor/gifenc-1.0.3.js',
  './vendor/three-r169.module.min.js',
  './assets/fonts/IBMPlexSans-Regular.ttf',
  './assets/fonts/IBMPlexSans-Medium.ttf',
  './assets/fonts/IBMPlexSans-SemiBold.ttf',
  './assets/fonts/IBMPlexSans-Bold.ttf',
  './assets/mascot-charcoal.png',
  './assets/mascot-chrome.png',
  './assets/mascot-white.png',
  './assets/mascot-blue.png',
  './assets/mascot-mark-charcoal.png',
  './assets/mascot-mark-white.png',
  './js/core.js?v=4.5.17',
  './js/derive.js?v=4.5.17',
  './js/util.js?v=4.5.17',
  './js/realset.js?v=4.5.17',
  './js/reprange.js?v=4.5.17',
  './js/verdict.js?v=4.5.17',
  './js/header.js?v=4.5.17',
  './js/report.js?v=4.5.17',
  './js/today.js?v=4.5.17',
  './js/progression.js?v=4.5.17',
  './js/lift.js?v=4.5.17',
  './js/writer.js?v=4.5.17',
  './js/planner.js?v=4.5.17',
  './js/stats.js?v=4.5.17',
  './js/history.js?v=4.5.17',
  './js/settings.js?v=4.5.17',
  './js/stats-story.js?v=4.5.17',
  './js/app.js?v=4.5.17',
  './assets/status-flat.png',
  './assets/status-up.png',
  './app-icon-blue-192.png',
  './app-icon-blue-512.png',
  './app-icon-blue-maskable-512.png',
  './apple-touch-icon-blue.png',
  './favicon-blue-32.png'
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
