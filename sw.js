const CACHE = 'showup-v4.5.28';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css?v=4.5.28',
  './css/planner.css?v=4.5.28',
  './css/mascot.css?v=4.5.28',
  './js/mascot.js?v=4.5.28',
  './js/plates.js?v=4.5.28',
  './js/plate-canvas.js?v=4.5.28',
  './css/plates.css?v=4.5.28',
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
  './js/core.js?v=4.5.28',
  './js/derive.js?v=4.5.28',
  './js/util.js?v=4.5.28',
  './js/realset.js?v=4.5.28',
  './js/reprange.js?v=4.5.28',
  './js/verdict.js?v=4.5.28',
  './js/header.js?v=4.5.28',
  './js/report.js?v=4.5.28',
  './js/today.js?v=4.5.28',
  './js/progression.js?v=4.5.28',
  './js/lift.js?v=4.5.28',
  './js/writer.js?v=4.5.28',
  './js/planner.js?v=4.5.28',
  './js/stats.js?v=4.5.28',
  './js/history.js?v=4.5.28',
  './js/settings.js?v=4.5.28',
  './js/stats-story.js?v=4.5.28',
  './js/app.js?v=4.5.28',
  './assets/status-flat.png',
  './assets/status-up.png',
  './app-icon-blue-192.png',
  './app-icon-blue-512.png',
  './app-icon-blue-maskable-512.png',
  './apple-touch-icon-blue.png',
  './favicon-blue-32.png'
];
self.addEventListener('install', e => {
  /* v4.5.25: EVERY SHELL ENTRY IS FETCHED FROM THE NETWORK, NOT THE HTTP CACHE.
     Half the shell carries no ?v= stamp -- the dynamically imported modules
     (mascot-renderer, plate-gif, plate-video), the vendored three.js, the fonts and
     every mascot PNG. Their URLs never change, so a plain addAll() could be
     satisfied out of the browser's own cache and a brand new CACHE would be filled
     with the PREVIOUS release's bytes. That is how a shipped dark-faced mascot and
     a shipped renderer fix both kept rendering the old white face: the deploy was
     correct and the install quietly re-cached what was already there.
     cache:'reload' makes install mean install. */
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))));
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
