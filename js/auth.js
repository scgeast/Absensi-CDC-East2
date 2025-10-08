// auth.js - Firebase Authentication Module

// Initialize Firebase with the provided configuration
const firebaseConfig = {
    apiKey: "AIzaSyCs_65P_SLx529UwLcQO8cF69yD1yLOgKY",
    authDomain: "blueiiifirebase.firebaseapp.com",
    projectId: "blueiiifirebase",
    storageBucket: "blueiiifirebase.firebasestorage.app",
    messagingSenderId: "194236727932",
    appId: "1:194236727932:web:6b10d6302d5c56ebac3ff9"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase services
const auth = firebase.auth();
let db; // Will be initialized after auth state is confirmed

// Function to initialize Firestore with error handling
function initializeFirestore() {
    try {
        db = firebase.firestore();
        
        // Enable offline persistence
        return db.enablePersistence()
            .then(() => {
                console.log("Offline persistence enabled");
                return db;
            })
            .catch((err) => {
                console.error('Persistence failed: ', err);
                if (err.code === 'failed-precondition') {
                    // Multiple tabs open, persistence can only be enabled in one tab at a time
                    console.log('Multiple tabs open, persistence disabled');
                } else if (err.code === 'unimplemented') {
                    // The current browser does not support persistence
                    console.log('Browser does not support persistence');
                }
                return db;
            });
    } catch (error) {
        console.error("Error initializing Firestore:", error);
        throw error;
    }
}

// Authentication state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        console.log('User is signed in');
        
        try {
            // Initialize Firestore if not already initialized
            if (!db) {
                await initializeFirestore();
            }
            
            // Get user data from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            let userData = {
                uid: user.uid,
                email: user.email,
                role: "user",
                name: user.email.split('@')[0],
                position: ''
            };
            
            if (userDoc.exists) {
                const data = userDoc.data();
                userData.role = data.role || "user";
                userData.name = data.name || userData.name;
                userData.position = data.position || '';
            } else {
                // Create default user data if doesn't exist
                await db.collection('users').doc(user.uid).set({
                    email: userData.email,
                    role: userData.role,
                    name: userData.name,
                    position: userData.position,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Call the handleUserLoggedIn function with user data
            if (typeof handleUserLoggedIn === 'function') {
                handleUserLoggedIn(userData);
            } else {
                console.error('handleUserLoggedIn function not found');
            }
            
        } catch (error) {
            console.error('Error handling logged in user:', error);
            handleAuthError(error);
        }
    } else {
        // User is signed out
        console.log('User is signed out');
        if (typeof handleUserLoggedOut === 'function') {
            handleUserLoggedOut();
        }
    }
});

// Function to handle user login
async function loginUser(email, password) {
    try {
        if (typeof showLoading === 'function') {
            showLoading(true);
        }
        
        // Clear previous errors
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.style.display = 'none';
        }
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // The user state observer will handle the rest
        return userCredential.user;
        
    } catch (error) {
        console.error('Login error:', error);
        
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
        }
        
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        
        throw error;
    }
}

// Function to handle user logout
async function logoutUser() {
    try {
        await auth.signOut();
        // The user state observer will handle the rest
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// Function to handle authentication errors
function handleAuthError(error) {
    console.error('Authentication error:', error);
    
    if (error.code === 'failed-precondition') {
        alert('Multiple tabs open. Please close other tabs and refresh this page.');
    } else if (error.code === 'unavailable') {
        if (navigator.onLine) {
            alert('Service unavailable. Please check your connection.');
        }
        // If offline, no need to show alert
    } else {
        alert(`Error: ${error.message}`);
    }
    
    if (typeof showLoading === 'function') {
        showLoading(false);
    }
}

// Function to check connection status
function checkConnection() {
    const statusElement = document.getElementById('connectionStatus');
    const loginOfflineMessage = document.getElementById('loginOfflineMessage');
    const appOfflineMessage = document.getElementById('appOfflineMessage');
    
    if (navigator.onLine) {
        if (statusElement) {
            statusElement.textContent = 'Online';
            statusElement.className = 'connection-status connection-online';
        }
        if (loginOfflineMessage) {
            loginOfflineMessage.style.display = 'none';
        }
        if (appOfflineMessage) {
            appOfflineMessage.style.display = 'none';
        }
    } else {
        if (statusElement) {
            statusElement.textContent = 'Offline';
            statusElement.className = 'connection-status connection-offline';
        }
        if (loginOfflineMessage) {
            loginOfflineMessage.style.display = 'block';
        }
        if (appOfflineMessage && window.currentUser) {
            appOfflineMessage.style.display = 'block';
        }
    }
    if (statusElement) {
        statusElement.style.display = 'block';
    }
}

// Event listeners for connection status
window.addEventListener('online', () => {
    checkConnection();
    console.log('Connection restored');
    // Sync data when connection is restored
    if (window.currentUser && typeof saveDataToFirestore === 'function') {
        saveDataToFirestore();
    }
});

window.addEventListener('offline', () => {
    checkConnection();
    console.log('Connection lost');
});

// Function to get the current Firestore instance
function getDb() {
    if (!db) {
        throw new Error('Firestore database not initialized. Please ensure user is authenticated.');
    }
    return db;
}

// Initialize connection status check when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkConnection();
});

// Export functions for use in other scripts
window.authService = {
    loginUser,
    logoutUser,
    getDb,
    auth,
    checkConnection
};
