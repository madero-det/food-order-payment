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
  const url = (e.notification.data && e.notification.data.url) || '/';
  const origin = self.location.origin;

  e.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.startsWith(origin)) {
          try { await client.navigate(url); } catch {}
          return client.focus();
        }
      }
      return clients.openWindow(origin + url);
    })()
  );
});