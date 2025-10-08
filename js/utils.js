import { SHIFT_MATRIX } from '../config/constants.js';

// Date formatting functions
export const formatDate = (date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export const formatDateForShift = (date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export const formatDateForHeader = (date) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    return `${dayName} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const parseDateFromString = (dateStr) => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
};

// Shift color management
export const updateShiftColor = (input) => {
    const value = input.value.toUpperCase();
    const td = input.parentElement;

    // Remove all shift classes
    td.className = td.className.replace(/\bshift-\S+/g, '');
    
    // Add appropriate class
    if (value === "1") td.classList.add("shift-1");
    else if (value === "2") td.classList.add("shift-2");
    else if (value === "3") td.classList.add("shift-3");
    else if (value === "11") td.classList.add("shift-11");
    else if (value === "22") td.classList.add("shift-22");
    else if (value === "C") td.classList.add("shift-C");
    else if (value === "O") td.classList.add("shift-O");
};

// Time calculations
export const formatMinutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const calculateOvertimeDuration = (startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (end < start) {
        end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
};

// Notification system
export const showNotification = (message, type = 'info') => {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
};

// Loading spinner
export const showLoading = (show) => {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
};

// Connection status
export const checkConnection = () => {
    const statusElement = document.getElementById('connectionStatus');
    const loginOfflineMessage = document.getElementById('loginOfflineMessage');
    const appOfflineMessage = document.getElementById('appOfflineMessage');
    
    if (navigator.onLine) {
        statusElement.textContent = 'Online';
        statusElement.className = 'connection-status connection-online';
        loginOfflineMessage.style.display = 'none';
        appOfflineMessage.style.display = 'none';
    } else {
        statusElement.textContent = 'Offline';
        statusElement.className = 'connection-status connection-offline';
        loginOfflineMessage.style.display = 'block';
        if (window.currentUser) {
            appOfflineMessage.style.display = 'block';
        }
    }
    statusElement.style.display = 'block';
};
