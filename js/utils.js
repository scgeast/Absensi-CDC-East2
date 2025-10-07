// Utility Functions
import { auth, db } from './firebase-config.js';

// Global Variables
export let currentUser = null;
export let isOnline = navigator.onLine;

// Data matrik untuk shift
export const shiftMatrix = {
    "Dispatcher": {
        "1": { name: "Morning", checkIn: "07:00", checkOut: "15:00", hours: "07:00" },
        "2": { name: "Afternoon", checkIn: "15:00", checkOut: "23:00", hours: "07:00" },
        "3": { name: "Night", checkIn: "23:00", checkOut: "07:00", hours: "08:00" },
        "11": { name: "Morning Part", checkIn: "07:00", checkOut: "12:00", hours: "05:00" },
        "22": { name: "Afternoon Part", checkIn: "15:00", checkOut: "20:00", hours: "05:00" },
        "C": { name: "Leave", checkIn: "", checkOut: "", hours: "" },
        "O": { name: "Off", checkIn: "", checkOut: "", hours: "" }
    },
    "Booking": {
        "1": { name: "Morning", checkIn: "08:00", checkOut: "16:00", hours: "07:00" },
        "2": { name: "Afternoon", checkIn: "16:00", checkOut: "24:00", hours: "08:00" },
        "3": { name: "Night", checkIn: "00:00", checkOut: "08:00", hours: "08:00" },
        "11": { name: "Morning Part", checkIn: "08:00", checkOut: "13:00", hours: "05:00" },
        "22": { name: "Afternoon Part", checkIn: "16:00", checkOut: "21:00", hours: "05:00" },
        "C": { name: "Leave", checkIn: "", checkOut: "", hours: "" },
        "O": { name: "Off", checkIn: "", checkOut: "", hours: "" }
    }
};

// Data awal karyawan
export const initialEmployees = [
    { area: "CDC East", name: "Fahmi Ardiansah", position: "Dispatcher" },
    { area: "CDC East", name: "Agung Setyawan", position: "Dispatcher" },
    { area: "CDC East", name: "Drajat Triono", position: "Dispatcher" },
    { area: "CDC East", name: "Wiyanto", position: "Dispatcher" },
    { area: "CDC East", name: "Nur Fauziah", position: "Booking" }
];

// Format tanggal
export function formatDate(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function formatDateForShift(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function formatDateForHeader(date) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    return `${dayName} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Parse tanggal dari string
export function parseDateFromString(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
}

// Fungsi untuk menampilkan notifikasi
export function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Fungsi untuk menampilkan loading
export function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Fungsi untuk check koneksi
export function checkConnection() {
    const statusElement = document.getElementById('connectionStatus');
    const loginOfflineMessage = document.getElementById('loginOfflineMessage');
    const appOfflineMessage = document.getElementById('appOfflineMessage');
    
    if (isOnline) {
        statusElement.textContent = 'Online';
        statusElement.className = 'connection-status connection-online';
        loginOfflineMessage.style.display = 'none';
        appOfflineMessage.style.display = 'none';
    } else {
        statusElement.textContent = 'Offline';
        statusElement.className = 'connection-status connection-offline';
        loginOfflineMessage.style.display = 'block';
        if (currentUser) {
            appOfflineMessage.style.display = 'block';
        }
    }
    statusElement.style.display = 'block';
}

// Update current user
export function setCurrentUser(user) {
    currentUser = user;
}

// Update online status
export function setOnlineStatus(status) {
    isOnline = status;
}
