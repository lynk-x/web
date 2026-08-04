/**
 * Firebase Messaging Service Worker for Lynk-X Web App
 *
 * Required for Firebase Cloud Messaging (FCM) Web Push Notifications to work
 * when the web app tab is in the background or closed.
 */

// Import Firebase App + Messaging SDKs (compat versions for SW context)
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

try {
  const firebaseConfig = {
    apiKey: 'AIzaSyDju1jIcIjZMvW31gxMlaMkYVxxrhftQFY',
    authDomain: 'lynk-x-firebase.firebaseapp.com',
    projectId: 'lynk-x-firebase',
    storageBucket: 'lynk-x-firebase.appspot.com',
    messagingSenderId: '632799565510',
    appId: '1:632799565510:web:78327f319b4f3be791e9c7',
  };

  if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Handle background push messages (tab not focused or closed)
    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title || payload.data?.title || 'Lynk-X';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: '/lynk-x-combined-logo.png',
        badge: '/lynk-x-combined-logo.png',
        data: payload.data,
        tag: payload.data?.action_url || 'default',
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (e) {
  console.warn('[firebase-messaging-sw] Firebase initialization skipped:', e);
}

// Handle notification click — focus existing tab or open target route
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.action_url || '/';
  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
