const CACHE_NAME = 'bamboo-shell-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/bamboo-icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// Install: precache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: cleanup stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: serve app shell offline, NEVER cache model API endpoints
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never intercept or cache non-GET requests (e.g. POST /v1/chat/completions)
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. Never cache any AI model inference requests or API routes
  if (
    url.pathname.includes('/v1/') ||
    url.pathname.includes('/chat/') ||
    url.pathname.includes('/models') ||
    url.pathname.includes('/api/')
  ) {
    return;
  }

  // 3. For navigation requests, fallback to index.html (SPA offline support)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 4. Stale-while-revalidate for local static assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
