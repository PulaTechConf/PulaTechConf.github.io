import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNCs7raFLKp4pN3j1cyKZ114BhJASIAgY",
  authDomain: "pulatechcon.firebaseapp.com",
  projectId: "pulatechcon",
  storageBucket: "pulatechcon.firebasestorage.app",
  messagingSenderId: "907952848681",
  appId: "1:907952848681:web:6b39c5378e84469b6a0138",
  measurementId: "G-KJ92ETTH92"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, db, analytics };
export { app, auth, db, messaging };
