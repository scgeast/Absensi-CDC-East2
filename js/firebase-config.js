import { FIREBASE_CONFIG } from '../config/constants.js';

// Initialize Firebase
export const initializeFirebase = () => {
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Enable offline persistence
    db.enablePersistence()
      .catch((err) => {
          console.log('Persistence failed: ', err);
      });
    
    return { auth, db };
};

// Firebase error handler
export const handleFirebaseError = (error, operation = 'operation') => {
    console.error(`Firebase error during ${operation}:`, error);
    
    if (error.code === 'failed-precondition') {
        alert('Multiple tabs open. Please close other tabs and refresh this page.');
    } else if (error.code === 'unavailable') {
        if (navigator.onLine) {
            alert('Service unavailable. Please check your connection.');
        }
    } else {
        alert(`Error: ${error.message}`);
    }
    
    return false;
};
