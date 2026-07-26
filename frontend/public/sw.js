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
    });
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const urlToOpen = '/';

  e.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          try {
            await client.navigate(urlToOpen);
          } catch {}
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })()
  );
});