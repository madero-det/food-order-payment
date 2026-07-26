const CACHE_NAME = 'food-order-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = e.data;
    self.registration.showNotification(title, {
      body,
      icon: icon || '/app_icon.png',
      badge: '/app_icon.png',
      tag: tag || 'food-order-notification',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: '/' },
    });
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const urlToOpen = (e.notification.data && e.notification.data.url) || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(urlToOpen).then(() => client.focus());
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});