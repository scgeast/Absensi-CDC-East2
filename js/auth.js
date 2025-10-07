// Authentication Functions - COMPATIBLE VERSION
import { auth, db, serverTimestamp } from './firebase-config.js';
import { setCurrentUser, showLoading, showNotification, checkConnection } from './utils.js';
import { setupRealtimeListeners, cleanupRealtimeListeners, setupMenuByRole, setupFilterByRole } from './main.js';

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
                    createdAt: serverTimestamp()
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
        const loginContainer = document.getElementById('loginContainer');
        const sidebar = document.getElementById('sidebar');
        const userPasswordSection = document.getElementById('userPasswordSection');
        const mainContent = document.getElementById('mainContent');
        const header = document.querySelector('.futuristic-header');
        
        if (loginContainer) loginContainer.style.display = 'none';
        if (sidebar) sidebar.style.display = 'block';
        if (userPasswordSection) userPasswordSection.style.display = 'block';
        if (mainContent) mainContent.style.display = 'block';
        if (header) header.style.display = 'block';
        
        // Update header subtitle
        const headerSubtitle = document.querySelector('.header-subtitle');
        if (headerSubtitle) {
            headerSubtitle.innerHTML = `Modern and Efficient Attendance Management | Logged in as: ${user.name || user.email} (${user.role})`;
        }
        
        if (setupMenuByRole) setupMenuByRole(user.role);
        if (setupFilterByRole) setupFilterByRole(user.role);
        
        // Setup realtime listeners
        if (setupRealtimeListeners) setupRealtimeListeners();
        
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
    if (cleanupRealtimeListeners) cleanupRealtimeListeners();
    
    auth.signOut().then(() => {
        setCurrentUser(null);
        
        // Reset UI ke state login
        const loginContainer = document.getElementById('loginContainer');
        const sidebar = document.getElementById('sidebar');
        const userPasswordSection = document.getElementById('userPasswordSection');
        const mainContent = document.getElementById('mainContent');
        const header = document.querySelector('.futuristic-header');
        
        if (loginContainer) loginContainer.style.display = 'flex';
        if (sidebar) sidebar.style.display = 'none';
        if (userPasswordSection) userPasswordSection.style.display = 'none';
        if (mainContent) mainContent.style.display = 'none';
        if (header) header.style.display = 'none';
        
        // Clear form fields
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.style.display = 'none';
        }
        
        console.log('Logout successful');
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

// Export untuk global access
window.login = login;
window.logout = logout;
