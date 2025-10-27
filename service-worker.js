// Simple precache service worker
const CACHE = 'wg-cache-v1';
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './Opinion and argument.json',
  './Doubt, guessing and certainty.json',
  './Discussion and agreement.json',
  './Personal%20Qualities.json',
  './Feelings.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(request, copy));
      return resp;
    }).catch(() => cached))
  );
});
