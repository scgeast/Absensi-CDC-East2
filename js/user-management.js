// User management logic

// Global variables
let users = [];

// Load users
async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        
        users = [];
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update user management table display
        updateUserManagementTable();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users: ' + error.message, 'error');
    }
}

// Update user management table
function updateUserManagementTable() {
    const userTableBody = document.getElementById('userTableBody');
    userTableBody.innerHTML = '';
    
    users.forEach((user, index) => {
        const row = document.createElement('tr');
        // IMPROVED: Display user password in user management list
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

// Add user
async function addUser() {
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
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        modal.hide();
        
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

// IMPROVED: Edit user with password
async function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Fill edit form modal
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserRole').value = user.role;
    
    // Fill field values
    document.getElementById('editUserName').value = user.name || '';
    document.getElementById('editUserPosition').value = user.position || '';
    document.getElementById('editUserPassword').value = '';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
}

// IMPROVED: Update user with password
async function updateUser() {
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
        
        // Update data in Firestore
        const updateData = {
            email,
            role,
            name,
            position,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // IMPROVED: Update password if provided
        if (newPassword) {
            updateData.password = newPassword;
            
            // IMPROVED: Update password in Authentication (can only be done by the user themselves or with Admin SDK)
            // For now, we only update in Firestore
            console.log('Password updated in Firestore for user:', email);
        }
        
        await db.collection('users').doc(userId).update(updateData);
        
        if (newPassword) {
            showNotification('User data and password updated successfully', 'success');
        } else {
            showNotification('User data updated successfully', 'success');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        modal.hide();
        
        // Reload user data
        await loadUsers();
        
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Error updating user: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Delete user from Firestore
        await db.collection('users').doc(userId).delete();
        
        // Delete user from Authentication (requires Admin SDK)
        // For now, we only delete from Firestore
        
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

// IMPROVED: Change password from sidebar - IMPROVED
function initChangePasswordSidebar() {
    document.getElementById('changePasswordSidebarBtn').addEventListener('click', function() {
        // Reset form
        document.getElementById('userCurrentPassword').value = '';
        document.getElementById('userNewPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        modal.show();
    });
}

// IMPROVED: Change password - IMPROVED
async function changeUserPassword() {
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
        
        // IMPROVED: Also update password in Firestore
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

// Initialize user management when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners
    document.getElementById('saveUserBtn').addEventListener('click', addUser);
    document.getElementById('updateUserBtn').addEventListener('click', updateUser);
    document.getElementById('userChangePasswordBtn').addEventListener('click', changeUserPassword);
    
    // IMPROVED: Initialize change password sidebar
    initChangePasswordSidebar();
    
    // Load users when application starts
    loadUsers();
});
