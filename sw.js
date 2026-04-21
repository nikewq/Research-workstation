// PhD Workstation Service Worker
// Caches index.html for offline use and faster loads

const CACHE_NAME = 'phd-workstation-v20';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/tab_icon.png',
  './icons/logo.png'
];
// CDN assets cached on first use (cache-first after that)
const CDN_CACHE = 'phd-cdn-v1';

// Install: pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches (keep CDN cache)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== CDN_CACHE).map(k => caches.delete(k)))
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
    // Stale-while-revalidate: serve cache immediately (fast), fetch update in background
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          }).catch(()=>{});
          return cached || fetchPromise; // instant if cached, network fallback if not
        })
      )
    );
  } else if (url.origin.includes('cdnjs.cloudflare.com') || url.origin.includes('cdn.jsdelivr.net')) {
    // CDN assets: cache-first, so they work offline after first load
    event.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
  } else {
    // Cache-first for static assets (icons, manifest)
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
