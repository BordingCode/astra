// sw.js — ASTRA service worker. Network-first for navigations & JS (fresh deploys),
// stale-while-revalidate for other assets. Bump CACHE when the asset list changes.
const CACHE = 'astra-v2';
const ASSETS = [
  './',
  './index.html',
  './css/style.css?v=1',
  './manifest.json',
  './assets/icon.svg',
  './assets/icon-maskable.svg',
  './js/main.js?v=2',
  './js/engine/loop.js',
  './js/engine/input.js',
  './js/engine/audio.js',
  './js/engine/save.js',
  './js/render/gl.js',
  './js/render/draw.js',
  './js/physics/sim.js',
  './js/data/stages.js',
  './js/ui/hud.js',
  './js/scenes/drift.js',
  './js/scenes/fall.js',
  './js/scenes/throw.js',
  './js/scenes/force.js',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin !== location.origin) return; // let fonts hit network directly

  if (req.mode === 'navigate' || url.pathname.endsWith('.js')) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(req).then(h => h || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
