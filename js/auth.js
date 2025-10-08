// Authentication logic

// Global variables
let currentUser = null;
let isOnline = navigator.onLine;

// Initialize Firebase
function initializeFirebase() {
    // Check if Firebase is already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Enable offline persistence
    db.enablePersistence()
      .catch((err) => {
          console.log('Persistence failed: ', err);
      });
      
    // Setup auth state listener
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            handleUserLoggedIn(user);
        } else {
            // User is signed out
            handleUserLoggedOut();
        }
    });
}

// Handle user logged in
async function handleUserLoggedIn(user) {
    currentUser = {
        uid: user.uid,
        email: user.email
    };
    
    try {
        // Try to get user data from Firestore
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentUser.role = userData.role;
            currentUser.name = userData.name || userData.email.split('@')[0];
            currentUser.position = userData.position || '';
        } else {
            // Create default user data if doesn't exist
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
        
        // Update UI
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('sidebar').style.display = 'block';
        document.getElementById('userPasswordSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'block';
        document.querySelector('.futuristic-header').style.display = 'block';
        
        // Update header subtitle
        document.querySelector('.header-subtitle').innerHTML = 
            `Modern and Efficient Attendance Management | Logged in as: ${currentUser.name || currentUser.email} (${currentUser.role})`;
        
        // Setup menu and filter based on role
        setupMenuByRole(currentUser.role);
        setupFilterByRole(currentUser.role);
        
        // Load initial data
        await loadInitialData();
        
    } catch (error) {
        console.error('Error handling user login:', error);
        // Use default values if Firestore is unavailable
        currentUser.role = "user";
        currentUser.name = currentUser.email.split('@')[0];
        currentUser.position = '';
    }
    
    checkConnection();
}

// Handle user logged out
function handleUserLoggedOut() {
    currentUser = null;
    
    // Reset UI to login state
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('userPasswordSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.querySelector('.futuristic-header').style.display = 'none';
    
    // Clear form fields
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').style.display = 'none';
}

// Login function
async function login(email, password) {
    showLoading(true);
    
    try {
        // Clear previous errors
        document.getElementById('loginError').style.display = 'none';
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // User is handled in onAuthStateChanged
        
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginError').textContent = error.message;
        document.getElementById('loginError').style.display = 'block';
        showLoading(false);
    }
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        // User is handled in onAuthStateChanged
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

// Setup menu based on role
function setupMenuByRole(role) {
    // Hide all menus first
    document.querySelectorAll('.sidebar-menu a').forEach(menu => {
        menu.style.display = 'none';
    });
    
    document.querySelectorAll('.sidebar-folder').forEach(folder => {
        folder.style.display = 'none';
    });
    
    // Show General menu for all roles
    document.getElementById('generalFolder').style.display = 'block';
    document.querySelectorAll('#generalFolder .sidebar-menu a').forEach(menu => {
        menu.style.display = 'flex';
    });
    
    // Show Main and Settings for admin
    if (role === 'admin') {
        document.getElementById('mainFolder').style.display = 'block';
        document.querySelectorAll('#mainFolder .sidebar-menu a').forEach(menu => {
            menu.style.display = 'flex';
        });
        document.querySelector('[data-tab="setting"]').style.display = 'flex';
    }
    
    // Show logout for all roles
    document.getElementById('logoutBtn').style.display = 'flex';
}

// Setup filter based on role
function setupFilterByRole(role) {
    const employeeFilterContainerMain = document.getElementById('employeeFilterContainerMain');
    const employeeFilterContainerOvertimeOutput = document.getElementById('employeeFilterContainerOvertimeOutput');
    const employeeFilterContainerAbsenTabel = document.getElementById('employeeFilterContainerAbsenTabel');
    
    // Hide employee filter for all roles
    employeeFilterContainerMain.style.display = 'none';
    employeeFilterContainerOvertimeOutput.style.display = 'none';
    employeeFilterContainerAbsenTabel.style.display = 'none';
}

// Check connection status
function checkConnection() {
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

// Event listeners for connection
window.addEventListener('online', () => {
    isOnline = true;
    checkConnection();
    console.log('Connection restored');
    // Sync data when connection is restored
    if (currentUser) {
        saveDataToFirestore();
    }
});

window.addEventListener('offline', () => {
    isOnline = false;
    checkConnection();
    console.log('Connection lost');
});

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeFirebase();
    
    // Setup login button
    document.getElementById('loginBtn').addEventListener('click', function() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            alert('Email and password must be filled!');
            return;
        }
        
        login(email, password);
    });
    
    // Enter key for login
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginBtn').click();
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Check initial connection
    checkConnection();
});
