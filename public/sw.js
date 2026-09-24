// Minxray Data Tracker Service Worker for Background Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push events
self.addEventListener('push', (event) => {
  let data = {
    title: '🚨 New Fault Report Logged',
    body: 'A new equipment fault has been submitted.',
    url: '/',
    ticketId: '',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    tag: data.ticketId || 'fault-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      ticketId: data.ticketId,
    },
    actions: [
      { action: 'open', title: 'View Report' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click: Focus or open the portal window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if (client.url.includes(self.location.origin)) {
            return client.navigate(targetUrl);
          }
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
