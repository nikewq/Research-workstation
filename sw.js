// PhD Workstation Service Worker
// Caches index.html for offline use and faster loads

const CACHE_NAME = 'phd-workstation-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/tab_icon.png',
  './icons/logo.png'
];

// Install: pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for index.html (get latest), cache-first for other assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin or GitHub Pages requests
  if (!url.origin.includes('github.io') && url.origin !== self.location.origin) {
    return; // Let CDN / external requests (KaTeX, JSZip, AI APIs) pass through
  }

  if (url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    // Network-first: always try to get latest index.html
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets (icons, manifest)
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
