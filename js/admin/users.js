import { db } from '../firebase-config.js';
import { 
    collection,
    doc,
    getDoc, 
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    // Check if user has admin rights
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        alert('You do not have permission to access this page.');
        window.location.href = '../home.html';
        return;
    }
    
    // Load users on page load
    loadUsers();
    
    // Setup refresh button
    document.getElementById('refreshUserList')?.addEventListener('click', loadUsers);
    
    // Setup role change confirmation
    document.getElementById('confirmRoleChange')?.addEventListener('click', confirmRoleChange);
});

// Load all users from Firestore
async function loadUsers() {
    try {
        const userTableBody = document.getElementById('userTableBody');
        userTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading users...</td></tr>';
        
        const querySnapshot = await getDocs(collection(db, "users"));
        
        if (querySnapshot.empty) {
            userTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
            return;
        }
        
        // Clear the table
        userTableBody.innerHTML = '';
        
        // Add each user to the table
        querySnapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${userData.firstName} ${userData.lastName}</td>
                <td>${userData.email}</td>
                <td>${userData.affiliation || 'N/A'}</td>
                <td>
                    <span class="badge ${getRoleBadgeClass(userData.role)}">${userData.role || 'general'}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary change-role-btn" data-user-id="${userId}" data-user-name="${userData.firstName} ${userData.lastName}" data-current-role="${userData.role || 'general'}">
                        Change Role
                    </button>
                </td>
            `;
            
            userTableBody.appendChild(row);
        });
        
        // Add event listeners to change role buttons
        document.querySelectorAll('.change-role-btn').forEach(btn => {
            btn.addEventListener('click', openChangeRoleModal);
        });
        
    } catch (error) {
        console.error("Error loading users:", error);
        const userTableBody = document.getElementById('userTableBody');
        userTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading users: ${error.message}</td></tr>`;
    }
}

// Open the change role modal
function openChangeRoleModal(event) {
    const userId = event.currentTarget.getAttribute('data-user-id');
    const userName = event.currentTarget.getAttribute('data-user-name');
    const currentRole = event.currentTarget.getAttribute('data-current-role');
    
    // Set values in the modal
    document.getElementById('selectedUserName').textContent = userName;
    
    const roleSelect = document.getElementById('roleSelect');
    roleSelect.value = currentRole;
    
    // Store the user ID for use when confirming
    document.getElementById('confirmRoleChange').setAttribute('data-user-id', userId);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('changeRoleModal'));
    modal.show();
}

// Confirm and apply role change
async function confirmRoleChange() {
    const userId = this.getAttribute('data-user-id');
    const newRole = document.getElementById('roleSelect').value;
    
    try {
        // Update the user's role in Firestore
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            role: newRole
        });
        
        // Hide the modal
        bootstrap.Modal.getInstance(document.getElementById('changeRoleModal')).hide();
        
        // Show success message
        alert(`User role updated successfully to ${newRole}`);
        
        // Refresh the user list
        loadUsers();
        
    } catch (error) {
        console.error("Error updating user role:", error);
        alert(`Error updating role: ${error.message}`);
    }
}

// Helper function to get badge class based on role
function getRoleBadgeClass(role) {
    switch (role) {
        case 'admin':
            return 'bg-danger';
        case 'organizer':
            return 'bg-warning text-dark';
        default:
            return 'bg-secondary';
    }
}
