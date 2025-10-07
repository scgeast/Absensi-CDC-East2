// Authentication Functions
import { auth, db } from './firebase-config.js';
import { setCurrentUser, showLoading, showNotification } from './utils.js';
import { setupRealtimeListeners, cleanupRealtimeListeners } from './app.js';
import { setupMenuByRole, setupFilterByRole } from './app.js';

export async function login(email, password) {
    showLoading(true);
    
    try {
        document.getElementById('loginError').style.display = 'none';
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = {
            uid: userCredential.user.uid,
            email: userCredential.user.email
        };
        
        // Get user data from Firestore
        let userData;
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                userData = userDoc.data();
                user.role = userData.role;
                user.name = userData.name || userData.email.split('@')[0];
                user.position = userData.position || '';
            } else {
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
        
        document.querySelector('.header-subtitle').innerHTML = `Modern and Efficient Attendance Management | Logged in as: ${user.name || user.email} (${user.role})`;
        
        setupMenuByRole(user.role);
        setupFilterByRole(user.role);
        
        // Setup realtime listeners
        setupRealtimeListeners();
        
        showLoading(false);
        checkConnection();
        
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginError').textContent = error.message;
        document.getElementById('loginError').style.display = 'block';
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
        document.querySelector('.futuristic-header').style.display = 'none';
        
        // Clear form fields
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        document.getElementById('loginError').style.display = 'none';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

// Change password function
export async function changeUserPassword() {
    const currentPassword = document.getElementById('userCurrentPassword').value;
    const newPassword = document.getElementById('userNewPassword').value;
    const confirmPassword = document.getElementById('userConfirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill all password fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New password and confirm password do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('New password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Re-authenticate user
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        
        await user.reauthenticateWithCredential(credential);
        
        // Update password
        await user.updatePassword(newPassword);
        
        // Update password di Firestore juga
        await db.collection('users').doc(user.uid).update({
            password: newPassword,
            passwordUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Password changed successfully', 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
        modal.hide();
        
        // Reset form
        document.getElementById('userCurrentPassword').value = '';
        document.getElementById('userNewPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';
        
    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password') {
            showNotification('Current password is incorrect', 'error');
        } else {
            showNotification('Error changing password: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}
