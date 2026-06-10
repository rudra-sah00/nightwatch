// Firebase Messaging Service Worker for background push notifications.
// This file must live at the public root so Firebase can register it.
// It handles push events when the app tab is not in the foreground.

importScripts(
  'https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js',
);

firebase.initializeApp({
  apiKey: 'AIzaSyC8_QhwL7yYc0a4eAWnNUXpLH5TaA46Kfg',
  projectId: 'nightwatch-prod',
  messagingSenderId: '99440023345',
  appId: '1:99440023345:web:44e4a2e31fa9b6a97b8210',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || 'Nightwatch', {
    body: body || '',
    icon: icon || '/logo.png',
    badge: '/logo.png',
    data,
    tag: data.type || 'default',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        return clients.openWindow(url);
      }),
  );
});
