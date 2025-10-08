// Utility functions used throughout the application

// Format date to DD/MM/YYYY
function formatDate(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

// Format date for shift (DD/MM/YYYY)
function formatDateForShift(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

// Format date for header (Day DD/MM)
function formatDateForHeader(date) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    return `${dayName} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Parse date from string (DD/MM/YYYY)
function parseDateFromString(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
}

// Calculate duration between two dates
function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 because inclusive
    return diffDays;
}

// Calculate overtime duration with overnight support
function calculateOvertimeDuration(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    // If end time is on the next day (after midnight)
    if (end < start) {
        end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
}

// Format minutes to HH:MM time string
function formatMinutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Sort employees by default order
function sortEmployeesByDefaultOrder(employees) {
    const nameOrder = ["Fahmi Ardiansah", "Agung Setyawan", "Drajat Triono", "Wiyanto", "Nur Fauziah"];
    const sorted = [...employees];
    sorted.sort((a, b) => {
        const orderA = nameOrder.indexOf(a.name);
        const orderB = nameOrder.indexOf(b.name);
        return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });
    return sorted;
}

// Show notification
function showNotification(message, type = 'info') {
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
}

// Show/hide loading spinner
function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }
}

// Handle Firebase error
function handleFirebaseError(error, operation = 'operation') {
    console.error(`Firebase error during ${operation}:`, error);
    
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
    
    return false;
}
