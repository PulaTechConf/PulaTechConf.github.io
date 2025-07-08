import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";

console.log("Loading Firebase config module...");

let app;
let db;
let storage;
let messaging;
let analytics;

try {
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCNCs7raFLKp4pN3j1cyKZ114BhJASIAgY",
    authDomain: "pulatechcon.firebaseapp.com",
    projectId: "pulatechcon",
    storageBucket: "pulatechcon.firebasestorage.app",
    messagingSenderId: "907952848681",
    appId: "1:907952848681:web:78bdfef97159beee6a0138",
    measurementId: "G-N3BQE5FLXP"
  };

  // Add logging for current environment
  console.log("Current hosting environment:", window.location.hostname);
  
  // Initialize Firebase
  console.log("Initializing Firebase...");
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  messaging = getMessaging(app);
  analytics = getAnalytics(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { app, db, storage, messaging, analytics, getToken, onMessage };
