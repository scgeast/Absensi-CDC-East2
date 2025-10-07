// Main Application File
import { auth, db } from './firebase-config.js';
import { 
    currentUser, isOnline, setCurrentUser, setOnlineStatus, 
    showLoading, showNotification, checkConnection 
} from './utils.js';
import { login, logout } from './auth.js';
import { refreshOvertimeData, loadOvertimeCalculationData } from './overtime-calculation.js';
import { initOvertimeForm } from './overtime-form.js';

// Global variables
let absensiData = [];
let absenTabelData = [];
let users = [];
let cutiData = [];

// Realtime listeners
let overtimeListener = null;
let overtimeFormListener = null;
let usersListener = null;
let cutiListener = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check connection status awal
    checkConnection();
    
    // Setup event listeners untuk resize
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize UI components
    initCollapsible();
    initMobileMenu();
    
    console.log('Application initialized successfully');
}

function setupEventListeners() {
    // Login
    document.getElementById('loginBtn').addEventListener('click', function() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            alert('Email and password must be filled!');
            return;
        }
        
        login(email, password);
    });
    
    // Enter key untuk login
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginBtn').click();
        }
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Refresh overtime data
    document.getElementById('refreshOvertimeData').addEventListener('click', async function() {
        await refreshOvertimeData();
    });
    
    // Online/offline events
    window.addEventListener('online', () => {
        setOnlineStatus(true);
        checkConnection();
        console.log('Connection restored');
    });

    window.addEventListener('offline', () => {
        setOnlineStatus(false);
        checkConnection();
        console.log('Connection lost');
    });
}

// Setup menu berdasarkan role
export function setupMenuByRole(role) {
    document.querySelectorAll('.sidebar-menu a').forEach(menu => {
        menu.style.display = 'none';
    });
    
    document.querySelectorAll('.sidebar-folder').forEach(folder => {
        folder.style.display = 'none';
    });
    
    // Tampilkan menu General untuk semua role
    document.getElementById('generalFolder').style.display = 'block';
    document.querySelectorAll('#generalFolder .sidebar-menu a').forEach(menu => {
        menu.style.display = 'flex';
    });
    
    // Tampilkan menu Main dan Settings untuk admin
    if (role === 'admin') {
        document.getElementById('mainFolder').style.display = 'block';
        document.querySelectorAll('#mainFolder .sidebar-menu a').forEach(menu => {
            menu.style.display = 'flex';
        });
        document.querySelector('[data-tab="setting"]').style.display = 'flex';
    }
    
    // Tampilkan logout untuk semua role
    document.getElementById('logoutBtn').style.display = 'flex';
}

// Setup filter berdasarkan role
export function setupFilterByRole(role) {
    const employeeFilterContainerMain = document.getElementById('employeeFilterContainerMain');
    const employeeFilterContainerOvertimeOutput = document.getElementById('employeeFilterContainerOvertimeOutput');
    const employeeFilterContainerAbsenTabel = document.getElementById('employeeFilterContainerAbsenTabel');
    
    employeeFilterContainerMain.style.display = 'none';
    employeeFilterContainerOvertimeOutput.style.display = 'none';
    employeeFilterContainerAbsenTabel.style.display = 'none';
}

// Setup realtime listeners
export function setupRealtimeListeners() {
    console.log('Setting up realtime listeners...');
    
    // Overtime calculation listener
    overtimeListener = db.collection('overtime')
        .onSnapshot((snapshot) => {
            console.log('Overtime calculation data updated:', snapshot.size, 'documents');
            
            // Update data dan tampilan
        }, (error) => {
            console.error('Error in overtime realtime listener:', error);
        });

    // ... (setup listeners lainnya) ...
}

// Cleanup realtime listeners
export function cleanupRealtimeListeners() {
    if (overtimeListener) {
        overtimeListener();
        overtimeListener = null;
    }
    if (overtimeFormListener) {
        overtimeFormListener();
        overtimeFormListener = null;
    }
    if (usersListener) {
        usersListener();
        usersListener = null;
    }
    if (cutiListener) {
        cutiListener();
        cutiListener = null;
    }
    console.log('All realtime listeners cleaned up');
}

// Initialize collapsible sections
function initCollapsible() {
    const coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
        });
        
        if (i === 0) {
            coll[i].classList.add("active");
            const content = coll[i].nextElementSibling;
            content.style.maxHeight = content.scrollHeight + "px";
        }
    }
}

// Initialize mobile menu
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
            sidebarBackdrop.classList.toggle('mobile-open');
        });
        
        sidebarBackdrop.addEventListener('click', function() {
            sidebar.classList.remove('mobile-open');
            this.classList.remove('mobile-open');
        });
    }
    
    document.querySelectorAll('.sidebar-menu a').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth < 992) {
                sidebar.classList.remove('mobile-open');
                sidebarBackdrop.classList.remove('mobile-open');
            }
        });
    });
}

// Handle resize
function handleResize() {
    const isMobile = window.innerWidth < 992;
    
    if (isMobile) {
        document.body.classList.add('mobile-view');
    } else {
        document.body.classList.remove('mobile-view');
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('sidebarBackdrop').classList.remove('mobile-open');
    }
}
