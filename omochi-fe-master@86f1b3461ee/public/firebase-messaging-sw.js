// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

// Initialize the Firebase app in the service worker by passing the generated config
const firebaseConfig = {
  apiKey: "AIzaSyDsWFPG9Lf5eynvksO_vB-wMa2SXSeBmi8",
  authDomain: "omochi-f132a.firebaseapp.com",
  projectId: "omochi-f132a",
  storageBucket: "omochi-f132a.firebasestorage.app",
  messagingSenderId: "286977746401",
  appId: "1:286977746401:web:b377c96c2c8b0987095ea0",
  measurementId: "G-WWQ8FG3JL1",
};

firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("Received background message ", payload);

  // const notificationTitle = payload.notification.title;
  
  // // Get any custom route from the data field
  // const data = payload.data || {};
  // const clickAction = data.clickAction || data.route || '/';
  
  // const notificationOptions = {
  //   body: payload.notification.body,
  //   icon: "/favicon/android-chrome-192x192.png",
  //   badge: "/favicon/favicon-32x32.png",
  //   tag: "omochi-notification",
  //   requireInteraction: true,
  //   // Include the custom route in the notification data
  //   data: {
  //     clickAction: clickAction,
  //     route: clickAction,
  //     ...data
  //   },
  //   actions: [
  //     {
  //       action: "view",
  //       title: "開く",
  //     },
  //     {
  //       action: "dismiss",
  //       title: "閉じる",
  //     },
  //   ],
  // };

  // self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener("notificationclick", function (event) {
  console.log("Notification click received.");

  event.notification.close();

  console.log("Notification action:", event);
  
  // Get the notification data which might contain a custom route
  const notificationData = event.notification.data || {};
  const customRoute = notificationData.clickAction || notificationData.route || '/';

  if (event.action === "view") {
    // Handle view action - navigate to the custom route if available
    event.waitUntil(clients.openWindow(customRoute));
  } else if (event.action === "dismiss") {
    // Handle dismiss action
    console.log("Notification dismissed");
  } else {
    // Handle default notification click - navigate to the custom route if available
    event.waitUntil(clients.openWindow(customRoute));
  }
});
