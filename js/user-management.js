// User Management Functions
import { auth, db } from './firebase-config.js';
import { currentUser, showLoading, showNotification } from './utils.js';

export let users = [];

// PERBAIKAN: Fungsi untuk memperbarui tampilan tabel user management
export function updateUserManagementTable() {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody) return;
    
    userTableBody.innerHTML = '';
    
    users.forEach((user, index) => {
        const row = document.createElement('tr');
        // PERBAIKAN: Tampilkan password user pada list user management
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.email}</td>
            <td>${user.name || '-'}</td>
            <td>${user.position || '-'}</td>
            <td>${user.role}</td>
            <td>${user.password || '-'}</td>
            <td>
                <button class="btn btn-warning btn-sm me-1" onclick="editUser('${user.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        userTableBody.appendChild(row);
    });
}

// PERBAIKAN: Fungsi untuk edit user dengan password
export function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Isi form modal edit
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserRole').value = user.role;
    
    // Isi nilai field
    document.getElementById('editUserName').value = user.name || '';
    document.getElementById('editUserPosition').value = user.position || '';
    document.getElementById('editUserPassword').value = '';
    
    // Show modal
    const modalElement = document.getElementById('editUserModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// PERBAIKAN: Fungsi untuk mengupdate user dengan password
export async function updateUser() {
    const userId = document.getElementById('editUserId').value;
    const email = document.getElementById('editUserEmail').value;
    const role = document.getElementById('editUserRole').value;
    const name = document.getElementById('editUserName').value;
    const position = document.getElementById('editUserPosition').value;
    const newPassword = document.getElementById('editUserPassword').value;
    
    if (!email || !role) {
        showNotification('Email and role must be filled', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Update data di Firestore
        const updateData = {
            email,
            role,
            name,
            position,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // PERBAIKAN: Update password jika ada
        if (newPassword) {
            updateData.password = newPassword;
            console.log('Password updated in Firestore for user:', email);
        }
        
        await db.collection('users').doc(userId).update(updateData);
        
        if (newPassword) {
            showNotification('User data and password updated successfully', 'success');
        } else {
            showNotification('User data updated successfully', 'success');
        }
        
        // Close modal
        const modalElement = document.getElementById('editUserModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        // Reload user data
        await loadUsers();
        
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Error updating user: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// PERBAIKAN: Fungsi untuk menghapus user
export async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Hapus user dari Firestore
        await db.collection('users').doc(userId).delete();
        
        // Hapus user dari Authentication (memerlukan Admin SDK)
        // Untuk sekarang, kita hanya hapus dari Firestore
        
        showNotification('User deleted successfully', 'success');
        
        // Reload user data
        await loadUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// PERBAIKAN: Fungsi untuk memuat data users
export async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        
        users = [];
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update tampilan tabel user management
        updateUserManagementTable();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users: ' + error.message, 'error');
    }
}

// PERBAIKAN: Fungsi untuk menambah user baru
export async function addNewUser() {
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const name = document.getElementById('newUserName').value;
    const position = document.getElementById('newUserPosition').value;
    const role = document.getElementById('newUserRole').value;
    
    if (!email || !password) {
        showNotification('Email and password must be filled', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Create user in Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;
        
        // Save user data to Firestore
        await db.collection('users').doc(userId).set({
            email,
            name,
            position,
            role,
            password, // Store password in plaintext (not recommended for production)
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('User created successfully', 'success');
        
        // Close modal
        const modalElement = document.getElementById('addUserModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        // Reset form
        document.getElementById('newUserEmail').value = '';
        document.getElementById('newUserPassword').value = '';
        document.getElementById('newUserName').value = '';
        document.getElementById('newUserPosition').value = '';
        document.getElementById('newUserRole').value = 'user';
        
        // Reload user data
        await loadUsers();
        
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Error creating user: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// PERBAIKAN: Fungsi untuk inisialisasi change password sidebar
export function initChangePasswordSidebar() {
    const changePasswordBtn = document.getElementById('changePasswordSidebarBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            // Reset form
            const userCurrentPassword = document.getElementById('userCurrentPassword');
            const userNewPassword = document.getElementById('userNewPassword');
            const userConfirmPassword = document.getElementById('userConfirmPassword');
            
            if (userCurrentPassword) userCurrentPassword.value = '';
            if (userNewPassword) userNewPassword.value = '';
            if (userConfirmPassword) userConfirmPassword.value = '';
            
            // Show modal
            const modalElement = document.getElementById('changePasswordModal');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            }
        });
    }
}
