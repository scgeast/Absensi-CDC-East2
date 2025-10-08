import { showLoading, showNotification } from './utils.js';
import { initializeFirebase } from './firebase-config.js';

const { auth, db } = initializeFirebase();

export const login = async (email, password) => {
    showLoading(true);
    
    try {
        document.getElementById('loginError').style.display = 'none';
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const currentUser = {
            uid: userCredential.user.uid,
            email: userCredential.user.email
        };
        
        // Get user data from Firestore
        let userData;
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            
            if (userDoc.exists) {
                userData = userDoc.data();
                currentUser.role = userData.role;
                currentUser.name = userData.name || userData.email.split('@')[0];
                currentUser.position = userData.position || '';
            } else {
                currentUser.role = "user";
                currentUser.name = currentUser.email.split('@')[0];
                currentUser.position = '';
                
                await db.collection('users').doc(currentUser.uid).set({
                    email: currentUser.email,
                    role: currentUser.role,
                    name: currentUser.name,
                    position: currentUser.position,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (firestoreError) {
            console.warn('Firestore unavailable, using default values:', firestoreError);
            currentUser.role = "user";
            currentUser.name = currentUser.email.split('@')[0];
            currentUser.position = '';
        }
        
        return currentUser;
        
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginError').textContent = error.message;
        document.getElementById('loginError').style.display = 'block';
        throw error;
    } finally {
        showLoading(false);
    }
};

export const logout = async () => {
    try {
        await auth.signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error during logout', 'error');
    }
};

export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('Please fill all password fields');
    }
    
    if (newPassword !== confirmPassword) {
        throw new Error('New password and confirm password do not match');
    }
    
    if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
    }
    
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPassword);
    
    // Update password in Firestore
    await db.collection('users').doc(user.uid).update({
        password: newPassword,
        passwordUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};

export const getCurrentUser = () => {
    return auth.currentUser;
};

// Auth state listener
export const onAuthStateChanged = (callback) => {
    return auth.onAuthStateChanged(callback);
};
