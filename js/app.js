// Main Application File - Complete Version
import { auth, db } from './firebase-config.js';
import { 
    currentUser, isOnline, setCurrentUser, setOnlineStatus, 
    showLoading, showNotification, checkConnection, initialEmployees
} from './utils.js';
import { login, logout } from './auth.js';
import { refreshOvertimeData, loadOvertimeCalculationData } from './overtime-calculation.js';
import { initOvertimeForm } from './overtime-form.js';
import { loadCutiData, generateCutiDetailData } from './leave-management.js';
import { loadUsers } from './user-management.js';
import { applyDateFilterMain, applyDateFilterAbsenTabel, absensiData } from './attendance-entry.js';

// Global variables
export let currentTab = "entry";
export let users = [];
export let cutiData = [];

// Realtime listeners
let overtimeListener = null;
let overtimeFormListener = null;
let usersListener = null;
let cutiListener = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing application...');
    initializeApp();
});

function initializeApp() {
    console.log('Initializing application...');
    
    // Check connection status awal
    checkConnection();
    
    // Setup event listeners untuk resize
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Setup event listeners untuk online/offline
    window.addEventListener('online', () => {
        console.log('Browser is online');
        setOnlineStatus(true);
        checkConnection();
    });

    window.addEventListener('offline', () => {
        console.log('Browser is offline');
        setOnlineStatus(false);
        checkConnection();
    });
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize UI components
    initSidebar();
    initCollapsible();
    initMobileMenu();
    
    // Expose global functions for HTML onclick
    exposeGlobalFunctions();
    
    console.log('Application initialized successfully');
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                alert('Email and password must be filled!');
                return;
            }
            
            console.log('Attempting login for:', email);
            login(email, password);
        });
    } else {
        console.error('Login button not found');
    }
    
    // Enter key untuk login
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.click();
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Refresh overtime data
    const refreshOvertimeBtn = document.getElementById('refreshOvertimeData');
    if (refreshOvertimeBtn) {
        refreshOvertimeBtn.addEventListener('click', async function() {
            await refreshOvertimeData();
        });
    }
    
    // Filter buttons
    const applyFilterMain = document.getElementById('applyFilterMain');
    if (applyFilterMain) {
        applyFilterMain.addEventListener('click', applyDateFilterMain);
    }
    
    const applyFilterAbsenTabel = document.getElementById('applyFilterAbsenTabel');
    if (applyFilterAbsenTabel) {
        applyFilterAbsenTabel.addEventListener('click', applyDateFilterAbsenTabel);
    }
    
    console.log('Event listeners setup completed');
}

// Initialize sidebar
export function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('expanded');
            
            const mainContent = document.getElementById('mainContent');
            if (mainContent) mainContent.classList.toggle('expanded');
            
            document.body.classList.toggle('header-expanded');
            
            const userPasswordSection = document.getElementById('userPasswordSection');
            if (userPasswordSection) userPasswordSection.classList.toggle('expanded');
        });
    }
    
    // Folder toggle
    document.querySelectorAll('.sidebar-folder-header').forEach(header => {
        header.addEventListener('click', function() {
            this.parentElement.classList.toggle('expanded');
        });
    });
    
    // Menu item clicks
    document.querySelectorAll('.sidebar-menu a[data-tab]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active menu
            document.querySelectorAll('.sidebar-menu a').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab
            const tabName = this.getAttribute('data-tab');
            currentTab = tabName;
            
            document.querySelectorAll('.tab-pane').forEach(tab => {
                tab.classList.remove('show', 'active');
            });
            
            const targetTab = document.getElementById(tabName);
            if (targetTab) {
                targetTab.classList.add('show', 'active');
            }
            
            // Tampilkan/sembunyikan filter yang sesuai
            updateFilterVisibility(tabName);
            
            // Load data berdasarkan tab
            handleTabChange(tabName);
        });
    });
}

// Update filter visibility based on tab
function updateFilterVisibility(tabName) {
    const filterSectionMain = document.getElementById('filterSectionMain');
    const filterSectionOvertimeOutput = document.getElementById('filterSectionOvertimeOutput');
    const filterSectionAbsenTabel = document.getElementById('filterSectionAbsenTabel');
    
    if (filterSectionMain && filterSectionOvertimeOutput && filterSectionAbsenTabel) {
        if (tabName === 'entry' || tabName === 'cuti' || tabName === 'summary-overtime') {
            filterSectionMain.style.display = 'block';
            filterSectionOvertimeOutput.style.display = 'none';
            filterSectionAbsenTabel.style.display = 'none';
        } else if (tabName === 'output' || tabName === 'overtime' || tabName === 'form-rekap-lembur') {
            filterSectionMain.style.display = 'none';
            filterSectionOvertimeOutput.style.display = 'block';
            filterSectionAbsenTabel.style.display = 'none';
        } else if (tabName === 'absen-tabel' || tabName === 'cuti-detail') {
            filterSectionMain.style.display = 'none';
            filterSectionOvertimeOutput.style.display = 'none';
            filterSectionAbsenTabel.style.display = 'block';
        } else if (tabName === 'setting') {
            filterSectionMain.style.display = 'none';
            filterSectionOvertimeOutput.style.display = 'none';
            filterSectionAbsenTabel.style.display = 'none';
        }
    }
}

// Handle tab change
function handleTabChange(tabName) {
    switch(tabName) {
        case 'absen-tabel':
            if (window.loadAbsenTabelData) {
                window.loadAbsenTabelData();
            }
            if (window.updateAttendanceSummaryTable) {
                window.updateAttendanceSummaryTable();
            }
            break;
        case 'summary-overtime':
            if (window.updateOvertimeSummaryTable) {
                window.updateOvertimeSummaryTable();
            }
            break;
        case 'output':
            if (window.generateOutputAndOvertimeData) {
                window.generateOutputAndOvertimeData();
            }
            if (window.updateOutputTable) {
                window.updateOutputTable();
            }
            break;
        case 'overtime':
            if (window.generateOutputAndOvertimeData) {
                window.generateOutputAndOvertimeData();
            }
            if (window.updateOvertimeTable) {
                window.updateOvertimeTable();
            }
            break;
        case 'cuti-detail':
            if (window.generateCutiDetailData) {
                window.generateCutiDetailData();
            }
            break;
        case 'cuti':
            if (window.updateCutiTable) {
                window.updateCutiTable();
            }
            break;
        case 'form-rekap-lembur':
            if (window.initOvertimeForm) {
                window.initOvertimeForm();
            }
            break;
    }
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
    const generalFolder = document.getElementById('generalFolder');
    if (generalFolder) {
        generalFolder.style.display = 'block';
        document.querySelectorAll('#generalFolder .sidebar-menu a').forEach(menu => {
            menu.style.display = 'flex';
        });
    }
    
    // Tampilkan menu Main dan Settings untuk admin
    if (role === 'admin') {
        const mainFolder = document.getElementById('mainFolder');
        if (mainFolder) {
            mainFolder.style.display = 'block';
            document.querySelectorAll('#mainFolder .sidebar-menu a').forEach(menu => {
                menu.style.display = 'flex';
            });
        }
        
        const settingTab = document.querySelector('[data-tab="setting"]');
        if (settingTab) settingTab.style.display = 'flex';
    }
    
    // Tampilkan logout untuk semua role
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'flex';
}

// Setup filter berdasarkan role
export function setupFilterByRole(role) {
    const employeeFilterContainerMain = document.getElementById('employeeFilterContainerMain');
    const employeeFilterContainerOvertimeOutput = document.getElementById('employeeFilterContainerOvertimeOutput');
    const employeeFilterContainerAbsenTabel = document.getElementById('employeeFilterContainerAbsenTabel');
    
    if (employeeFilterContainerMain) employeeFilterContainerMain.style.display = 'none';
    if (employeeFilterContainerOvertimeOutput) employeeFilterContainerOvertimeOutput.style.display = 'none';
    if (employeeFilterContainerAbsenTabel) employeeFilterContainerAbsenTabel.style.display = 'none';
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

    // Users listener
    usersListener = db.collection('users')
        .onSnapshot((snapshot) => {
            console.log('Users data updated:', snapshot.size, 'documents');
            
            users = [];
            snapshot.forEach(doc => {
                users.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            if (currentTab === "setting" && window.updateUserManagementTable) {
                window.updateUserManagementTable();
            }
        }, (error) => {
            console.error('Error in users realtime listener:', error);
        });

    // Cuti listener
    cutiListener = db.collection('cuti')
        .onSnapshot((snapshot) => {
            console.log('Cuti data updated:', snapshot.size, 'documents');
            
            cutiData = [];
            snapshot.forEach(doc => {
                cutiData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            if (currentTab === "cuti" && window.updateCutiTable) {
                window.updateCutiTable();
            }
            if (currentTab === "cuti-detail" && window.generateCutiDetailData) {
                window.generateCutiDetailData();
            }
        }, (error) => {
            console.error('Error in cuti realtime listener:', error);
        });

    console.log('All realtime listeners setup completed');
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
            if (content) {
                content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
            }
        });
        
        if (i === 0) {
            coll[i].classList.add("active");
            const content = coll[i].nextElementSibling;
            if (content) {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        }
    }
}

// Initialize mobile menu
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    
    if (mobileMenuToggle && sidebar && sidebarBackdrop) {
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
                if (sidebar) sidebar.classList.remove('mobile-open');
                if (sidebarBackdrop) sidebarBackdrop.classList.remove('mobile-open');
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
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('mobile-open');
    }
}

// Expose global functions for HTML onclick
function exposeGlobalFunctions() {
    // Make functions available globally for HTML onclick attributes
    window.currentTab = currentTab;
    window.absensiData = absensiData;
    window.initialEmployees = initialEmployees;
    window.isOnline = isOnline;
    
    // Import and expose functions from other modules
    import('./attendance-entry.js').then(module => {
        window.makeEditable = module.makeEditable;
        window.deleteRow = module.deleteRow;
        window.updateShiftColor = module.updateShiftColor;
        window.addRow = module.addRow;
        window.applyHeaderSize = module.applyHeaderSize;
        window.saveDataToFirestore = module.saveDataToFirestore;
    }).catch(error => {
        console.error('Error importing attendance-entry module:', error);
    });
    
    import('./overtime-calculation.js').then(module => {
        window.editOvertimeCalculationRow = module.editOvertimeCalculationRow;
        window.deleteOvertimeCalculationRow = module.deleteOvertimeCalculationRow;
    }).catch(error => {
        console.error('Error importing overtime-calculation module:', error);
    });
    
    import('./overtime-form.js').then(module => {
        window.editOvertimeDetailRecord = module.editOvertimeDetailRecord;
        window.deleteOvertimeDetailRecord = module.deleteOvertimeDetailRecord;
    }).catch(error => {
        console.error('Error importing overtime-form module:', error);
    });
    
    import('./leave-management.js').then(module => {
        window.addCuti = module.addCuti;
        window.deleteCutiRow = module.deleteCutiRow;
        window.viewLeaveDetails = module.viewLeaveDetails;
        window.saveCutiDataToFirestore = module.saveCutiDataToFirestore;
    }).catch(error => {
        console.error('Error importing leave-management module:', error);
    });
    
    import('./user-management.js').then(module => {
        window.editUser = module.editUser;
        window.deleteUser = module.deleteUser;
        window.updateUser = module.updateUser;
        window.addNewUser = module.addNewUser;
    }).catch(error => {
        console.error('Error importing user-management module:', error);
    });
    
    import('./auth.js').then(module => {
        window.changeUserPassword = module.changeUserPassword;
    }).catch(error => {
        console.error('Error importing auth module:', error);
    });
}
