// Firebase Configuration - COMPATIBLE VERSION
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyCs_65P_SLx529UwLcQO8cF69yD1yLOgKY",
    authDomain: "blueiiifirebase.firebaseapp.com",
    projectId: "blueiiifirebase",
    storageBucket: "blueiiifirebase.firebasestorage.app",
    messagingSenderId: "194236727932",
    appId: "1:194236727932:web:6b10d6302d5c56ebac3ff9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
      console.log('Firebase persistence failed: ', err);
  });

export { auth, db, serverTimestamp };
