/* Sales OS service worker: shows CRM notifications pushed by the API (Web Push, VAPID).
   Payload: { id, title, body, link, critical, tag } from fud-farmer-crm-be crm-push.service.ts. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Sales OS', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Sales OS';
  const options = {
    body: data.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || data.id,
    renotify: Boolean(data.critical),
    requireInteraction: Boolean(data.critical),
    data: { link: data.link || '/', id: data.id },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  const target = new URL(link, self.location.origin);
  // Only ever open pages on this site.
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          w.navigate(target.href);
          return w.focus();
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
