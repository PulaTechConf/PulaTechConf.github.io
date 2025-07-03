import { db } from '../firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard users.js loaded");
    
    // Check if user is admin
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        console.log("Non-admin access attempt to dashboard users");
        return;
    }
    
    // Get refresh button
    const refreshUserListBtn = document.getElementById('refreshUserList');
    
    // Add event listener
    if (refreshUserListBtn) {
        refreshUserListBtn.addEventListener('click', loadUsers);
    }
    
    // Load users on page load
    loadUsers();
    
    // Function to load all users for dashboard
    async function loadUsers() {
        console.log("Loading users for dashboard...");
        
        const userTableBody = document.getElementById('userTableBody');
        if (!userTableBody) {
            console.error("userTableBody element not found");
            return;
        }
        
        try {
            // Show loading message
            userTableBody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Loading users...</td></tr>';
            
            // Get all users from Firestore
            const usersCollection = collection(db, "users");
            const querySnapshot = await getDocs(usersCollection);
            
            if (querySnapshot.empty) {
                userTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
                return;
            }
            
            // Build the table
            userTableBody.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                
                // Create table row
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${userData.firstName || ''} ${userData.lastName || ''}</td>
                    <td>${userData.email || ''}</td>
                    <td>${userData.affiliation || ''}</td>
                    <td><span class="badge ${getRoleBadgeClass(userData.role)}">${userData.role || 'general'}</span></td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary change-role-btn" data-id="${doc.id}" data-name="${userData.firstName} ${userData.lastName}" data-current-role="${userData.role || 'general'}">
                                <i class="bi bi-person-gear"></i> Change Role
                            </button>
                        </div>
                    </td>
                `;
                
                userTableBody.appendChild(row);
            });
            
            // Add event listeners to role change buttons
            addRoleChangeListeners();
            
            console.log("Users loaded successfully for dashboard");
        } catch (error) {
            console.error("Error loading users:", error);
            if (userTableBody) {
                userTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading users</td></tr>';
            }
        }
    }
    
    // Helper function to get badge class based on role
    function getRoleBadgeClass(role) {
        switch(role) {
            case 'admin':
                return 'bg-danger';
            case 'organizer':
                return 'bg-warning text-dark';
            default:
                return 'bg-secondary';
        }
    }
    
    // Add listeners to role change buttons
    function addRoleChangeListeners() {
        document.querySelectorAll('.change-role-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.dataset.id;
                const userName = this.dataset.name;
                const currentRole = this.dataset.currentRole;
                
                // Set modal data
                document.getElementById('selectedUserName').textContent = userName;
                document.getElementById('roleSelect').value = currentRole;
                
                // Store user ID for the modal
                document.getElementById('changeRoleModal').dataset.userId = userId;
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('changeRoleModal'));
                modal.show();
            });
        });
    }
    
    // Handle role change confirmation
    const confirmRoleChangeBtn = document.getElementById('confirmRoleChange');
    if (confirmRoleChangeBtn) {
        confirmRoleChangeBtn.addEventListener('click', async function() {
            const modal = document.getElementById('changeRoleModal');
            const userId = modal.dataset.userId;
            const newRole = document.getElementById('roleSelect').value;
            
            if (!userId || !newRole) return;
            
            try {
                // Update user role in Firestore
                const userRef = doc(db, "users", userId);
                await updateDoc(userRef, {
                    role: newRole
                });
                
                // Close modal
                const modalInstance = bootstrap.Modal.getInstance(modal);
                modalInstance.hide();
                
                // Reload users
                loadUsers();
                
                // Show success message
                console.log(`User role updated to ${newRole}`);
                
            } catch (error) {
                console.error("Error updating user role:", error);
                alert("Error updating user role. Please try again.");
            }
        });
    }
});
