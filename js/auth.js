// Authentication Functions - FIXED VERSION
import { auth, db } from './firebase-config.js';
import { setCurrentUser, showLoading, showNotification, checkConnection } from './utils.js';
import { setupRealtimeListeners, cleanupRealtimeListeners, setupMenuByRole, setupFilterByRole } from './app.js';

export async function login(email, password) {
    showLoading(true);
    
    try {
        // Clear previous errors
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.style.display = 'none';
        }
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = {
            uid: userCredential.user.uid,
            email: userCredential.user.email
        };
        
        console.log('Login successful, getting user data...');
        
        // Try to get user data from Firestore
        let userData;
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                userData = userDoc.data();
                user.role = userData.role;
                user.name = userData.name || userData.email.split('@')[0];
                user.position = userData.position || '';
                console.log('User data loaded from Firestore:', user);
            } else {
                // Create default user data if doesn't exist
                user.role = "user";
                user.name = user.email.split('@')[0];
                user.position = '';
                
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    position: user.position,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Default user data created');
            }
        } catch (firestoreError) {
            console.warn('Firestore unavailable, using default values:', firestoreError);
            user.role = "user";
            user.name = user.email.split('@')[0];
            user.position = '';
        }
        
        setCurrentUser(user);
        
        // Update UI
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('sidebar').style.display = 'block';
        document.getElementById('userPasswordSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'block';
        document.querySelector('.futuristic-header').style.display = 'block';
        
        // Update header subtitle
        const headerSubtitle = document.querySelector('.header-subtitle');
        if (headerSubtitle) {
            headerSubtitle.innerHTML = `Modern and Efficient Attendance Management | Logged in as: ${user.name || user.email} (${user.role})`;
        }
        
        setupMenuByRole(user.role);
        setupFilterByRole(user.role);
        
        // Setup realtime listeners
        setupRealtimeListeners();
        
        showLoading(false);
        checkConnection();
        
        console.log('Login process completed successfully');
        
    } catch (error) {
        console.error('Login error:', error);
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
        }
        showLoading(false);
    }
}

export function logout() {
    cleanupRealtimeListeners();
    
    auth.signOut().then(() => {
        setCurrentUser(null);
        // Reset UI ke state login
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('sidebar').style.display = 'none';
        document.getElementById('userPasswordSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        
        const header = document.querySelector('.futuristic-header');
        if (header) {
            header.style.display = 'none';
        }
        
        // Clear form fields
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.style.display = 'none';
        }
        
        console.log('Logout successful');
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}
