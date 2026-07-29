const CACHE_NAME = 'aethertalk-v1.0.16';
const CACHE_PATHS = [
  '/walkietalkie/',
  '/walkietalkie/index.html',
  '/walkietalkie/icon.svg',
  '/walkietalkie/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_PATHS).catch(() => {
        // If cache.addAll fails, just continue - network will handle it
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
  // Tell all open clients that a new version is available
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
  });
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Network-first for JS/HTML to get updates
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return response;
        })
        .catch(() => {
          // If fetch fails and it's a navigation request, serve index.html for SPA routing
          if (event.request.mode === 'navigate') {
            return caches.match('/walkietalkie/index.html');
          }
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first for assets (CSS, Images)
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((res) => {
          // Only cache successful responses
          if (res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return res;
        }).catch(() => {
          // Return a fallback for failed assets
          return caches.match('/walkietalkie/index.html');
        });
      })
    );
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'AetherTalk', {
      body: data.body || 'New message on frequency',
      icon: './icon.svg',
      data: data
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
