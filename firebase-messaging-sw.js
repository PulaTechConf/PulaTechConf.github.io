// Import Firebase scripts for messaging
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyCNCs7raFLKp4pN3j1cyKZ114BhJASIAgY",
  authDomain: "pulatechcon.firebaseapp.com",
  projectId: "pulatechcon",
  storageBucket: "pulatechcon.firebasestorage.app",
  messagingSenderId: "907952848681",
  appId: "1:907952848681:web:78bdfef97159beee6a0138"
});

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'PulaTechConf Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: '/icons/ikona(svitla).png',
    badge: '/favicon.ico',
    tag: 'pulatech-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200], // For mobile devices
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ],
    data: {
      url: payload.data?.url || '/app/home.html',
      notificationId: payload.data?.notificationId,
      click_action: payload.data?.click_action || '/app/home.html'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the app
  const urlToOpen = event.notification.data?.url || '/app/home.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('pulatechconf.github.io') && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
