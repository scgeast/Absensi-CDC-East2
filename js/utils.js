// Utility Functions - FIXED VERSION
import { auth, db } from './firebase-config.js';

// Global Variables
export let currentUser = null;
export let isOnline = navigator.onLine;

// ... (other functions remain the same)

// Fungsi untuk check koneksi - FIXED
export function checkConnection() {
    const statusElement = document.getElementById('connectionStatus');
    const loginOfflineMessage = document.getElementById('loginOfflineMessage');
    const appOfflineMessage = document.getElementById('appOfflineMessage');
    
    if (!statusElement) {
        console.warn('Connection status element not found');
        return;
    }
    
    if (isOnline) {
        statusElement.textContent = 'Online';
        statusElement.className = 'connection-status connection-online';
        if (loginOfflineMessage) loginOfflineMessage.style.display = 'none';
        if (appOfflineMessage) appOfflineMessage.style.display = 'none';
    } else {
        statusElement.textContent = 'Offline';
        statusElement.className = 'connection-status connection-offline';
        if (loginOfflineMessage) loginOfflineMessage.style.display = 'block';
        if (appOfflineMessage && currentUser) {
            appOfflineMessage.style.display = 'block';
        }
    }
    statusElement.style.display = 'block';
}

// Update current user
export function setCurrentUser(user) {
    currentUser = user;
    console.log('Current user set:', user);
}

// Update online status
export function setOnlineStatus(status) {
    isOnline = status;
    console.log('Online status changed to:', status);
    checkConnection();
}
