// Firebase Messaging Service Worker for Omochi Standalone App
// Handles background push notifications when the app is closed/minimized

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: 'AIzaSyDsWFPG9Lf5eynvksO_vB-wMa2SXSeBmi8',
    authDomain: 'omochi-f132a.firebaseapp.com',
    projectId: 'omochi-f132a',
    storageBucket: 'omochi-f132a.firebasestorage.app',
    messagingSenderId: '286977746401',
    appId: '1:286977746401:web:b377c96c2c8b0987095ea0',
    measurementId: 'G-WWQ8FG3JL1'
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages (app is closed or tab is in background)
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Background message received:', payload);

    var notification = payload.notification || {};
    var data = payload.data || {};

    var title = notification.title || 'Omochi';
    var options = {
        body: notification.body || '',
        icon: '/assets/icon-192.png',
        badge: '/assets/icon-72.png',
        tag: 'omochi-notification',
        requireInteraction: false,
        data: {
            clickAction: data.clickAction || data.route || '/my-collections.html'
        }
    };

    self.registration.showNotification(title, options);
});

// Handle notification click - open the app
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    var data = event.notification.data || {};
    var url = data.clickAction || '/my-collections.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // If a window is already open, focus it
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url.indexOf('my-collections') !== -1 && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
