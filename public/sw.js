// CinemaVerse Pro Service Worker
const CACHE_NAME = 'cinemaverse-cache-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  // Pass through fetch requests for media and dynamic APIs
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Web Push event listener (delivers alerts even when mobile tab is closed)
self.addEventListener('push', (event) => {
  let data = { title: 'CinemaVerse Release Alert 🎬', body: 'A scheduled movie premiere is now live!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data = { title: 'CinemaVerse Alert 🎬', body: event.data.text() };
    }
  }
  const options = {
    body: data.body || 'Your upcoming movie is now available to stream in 4K!',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/vault' },
  };
  event.waitUntil(self.registration.showNotification(data.title || 'CinemaVerse Alert', options));
});

// Handle notification click to bring app to foreground
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data?.url || '/vault';
      for (const client of clientList) {
        if (client.url && client.url.includes('/vault') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
