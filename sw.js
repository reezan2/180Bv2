const CACHE_NAME = 'bars-v1';
const STATIC_ASSETS = [
  '/180Bv2/',
  '/180Bv2/index.html',
  '/180Bv2/js/script.js',
  '/180Bv2/data/bars.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Cache des tuiles Thunderforest (les images de la carte)
  if (url.hostname.includes('thunderforest.com') || url.hostname.includes('tile.openstreetmap')) {
    e.respondWith(
      caches.open('tiles-v1').then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(response => {
            cache.put(e.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Cache normal pour le reste
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});