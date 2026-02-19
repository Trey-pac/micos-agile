import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Activate new service worker immediately — don't wait for old tabs to close
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Clean up old precache entries from previous versions
cleanupOutdatedCaches();

// Precache all built assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Firestore API — network first
registerRoute(
  ({ url }) => url.hostname === 'firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firestore-api',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 })],
  })
);

// Firebase Auth — network first
registerRoute(
  ({ url }) => url.hostname === 'identitytoolkit.googleapis.com',
  new NetworkFirst({
    cacheName: 'firebase-auth',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 })],
  })
);

// Google Fonts stylesheets — cache first
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-stylesheets',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// Google Fonts webfonts — cache first
registerRoute(
  ({ url }) => url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Images — cache first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// ── Firebase Cloud Messaging — background push notifications ─────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    // FCM sends { notification: { title, body, icon }, data: { ... } }
    const notif = payload.notification || {};
    const data = payload.data || {};
    const title = notif.title || data.title || 'Mico\'s Micro Farm';
    const body = notif.body || data.body || '';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: notif.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag || 'micos-notification',
        data: { url: data.url || '/', ...data },
      })
    );
  } catch (err) {
    console.error('[sw] Push parse error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if found
      for (const client of clients) {
        if (new URL(client.url).pathname === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});
