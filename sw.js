// sw.js — offline support for Building the Bridge.
// Bump CACHE_VERSION whenever any precached file changes so clients pick up the update.
const CACHE_VERSION = 'btb-v1';
const PRECACHE = `${CACHE_VERSION}-shell`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

// Paths are relative to this file's own scope, so this works whether the app
// is hosted at a domain root or under a GitHub Pages project subpath.
const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'js/data.js',
  'js/storage.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== PRECACHE && key !== RUNTIME)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    // App shell: cache-first, falling back to network, falling back to the
    // cached index page for navigations (so deep refreshes still work offline).
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(PRECACHE).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('index.html');
        return undefined;
      })),
    );
    return;
  }

  // Cross-origin (Google Fonts): stale-while-revalidate so fonts still work
  // offline after the first successful load, but stay fresh when online.
  event.respondWith(
    caches.open(RUNTIME).then((cache) => cache.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        cache.put(request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })),
  );
});
