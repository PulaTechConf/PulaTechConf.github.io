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
            userTableBody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Loading users...</td></tr>';
            
            // Get all users from Firestore
            const usersCollection = collection(db, "users");
            const querySnapshot = await getDocs(usersCollection);
            
            if (querySnapshot.empty) {
                userTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
                return;
            }
            
            // Build the table
            userTableBody.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                
                // Create table row
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <input type="checkbox" class="form-check-input showed-up-checkbox" data-user-id="${doc.id}" ${userData.showedUp ? 'checked' : ''}>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1 edit-name-btn" data-id="${doc.id}" data-first-name="${userData.firstName || ''}" data-last-name="${userData.lastName || ''}" data-name="${userData.firstName} ${userData.lastName}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${userData.firstName || ''} ${userData.lastName || ''}
                    </td>
                    <td>${userData.email || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1 edit-affiliation-btn" data-id="${doc.id}" data-name="${userData.firstName} ${userData.lastName}" data-current-affiliation="${userData.affiliation || ''}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${userData.affiliation || ''}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1 edit-accommodation-btn" data-id="${doc.id}" data-name="${userData.firstName} ${userData.lastName}" data-current-accommodation="${userData.accommodation || ''}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <span class="badge ${userData.accommodation ? 'bg-success' : 'bg-secondary'}">${userData.accommodation || 'Not provided'}</span>
                    </td>
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
            // Add event listeners to accommodation edit buttons
            addAccommodationEditListeners();
            // Add event listeners to affiliation edit buttons
            addAffiliationEditListeners();
            // Add event listeners to name edit buttons
            addNameEditListeners();
            // Add event listeners to showed up checkboxes
            addShowedUpListeners();
            
            console.log("Users loaded successfully for dashboard");
        } catch (error) {
            console.error("Error loading users:", error);
            if (userTableBody) {
                userTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading users</td></tr>';
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
    
    // Add listeners to accommodation edit buttons
    function addAccommodationEditListeners() {
        document.querySelectorAll('.edit-accommodation-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.dataset.id;
                const userName = this.dataset.name;
                const currentAccommodation = this.dataset.currentAccommodation;
                
                const newAccommodation = prompt(`Edit accommodation info for ${userName}:`, currentAccommodation);
                
                if (newAccommodation !== null) {  // User didn't cancel
                    updateUserAccommodation(userId, newAccommodation);
                }
            });
        });
    }
    
    // Update user accommodation
    async function updateUserAccommodation(userId, accommodation) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                accommodation: accommodation
            });
            
            // Reload users
            loadUsers();
            
            console.log('User accommodation updated successfully');
        } catch (error) {
            console.error("Error updating user accommodation:", error);
            alert("Error updating accommodation. Please try again.");
        }
    }
    
    // Add listeners to affiliation edit buttons
    function addAffiliationEditListeners() {
        document.querySelectorAll('.edit-affiliation-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.dataset.id;
                const userName = this.dataset.name;
                const currentAffiliation = this.dataset.currentAffiliation;
                
                const newAffiliation = prompt(`Edit affiliation for ${userName}:`, currentAffiliation);
                
                if (newAffiliation !== null) {  // User didn't cancel
                    updateUserAffiliation(userId, newAffiliation);
                }
            });
        });
    }
    
    // Update user affiliation
    async function updateUserAffiliation(userId, affiliation) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                affiliation: affiliation
            });
            
            // Reload users
            loadUsers();
            
            console.log('User affiliation updated successfully');
        } catch (error) {
            console.error("Error updating user affiliation:", error);
            alert("Error updating affiliation. Please try again.");
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
    
    // Add listeners to showed up checkboxes
    function addShowedUpListeners() {
        document.querySelectorAll('.showed-up-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const userId = this.dataset.userId;
                const showedUp = this.checked;
                
                updateUserShowedUp(userId, showedUp);
            });
        });
    }
    
    // Update user showed up status
    async function updateUserShowedUp(userId, showedUp) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                showedUp: showedUp
            });
            
            console.log(`User showed up status updated to ${showedUp}`);
        } catch (error) {
            console.error("Error updating user showed up status:", error);
            // Revert checkbox state on error
            const checkbox = document.querySelector(`[data-user-id="${userId}"]`);
            if (checkbox) {
                checkbox.checked = !showedUp;
            }
            alert("Error updating showed up status. Please try again.");        }
    }

    // Add listeners to name edit buttons
    function addNameEditListeners() {
        document.querySelectorAll('.edit-name-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.dataset.id;
                const firstName = this.dataset.firstName;
                const lastName = this.dataset.lastName;
                
                // Create a custom modal prompt for first name and last name
                const modalHtml = `
                    <div class="modal fade" id="editNameModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Edit User Name</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <form id="editNameForm">
                                        <div class="mb-3">
                                            <label for="firstName" class="form-label">First Name</label>
                                            <input type="text" class="form-control" id="firstName" value="${firstName}">
                                        </div>
                                        <div class="mb-3">
                                            <label for="lastName" class="form-label">Last Name</label>
                                            <input type="text" class="form-control" id="lastName" value="${lastName}">
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-primary" id="saveNameBtn">Save Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove any existing modal with the same ID
                const existingModal = document.getElementById('editNameModal');
                if (existingModal) {
                    existingModal.remove();
                }
                
                // Add modal to the page
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                // Get the modal element
                const modalElement = document.getElementById('editNameModal');
                
                // Show the modal
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
                
                // Add event listener for the save button
                document.getElementById('saveNameBtn').addEventListener('click', function() {
                    const newFirstName = document.getElementById('firstName').value.trim();
                    const newLastName = document.getElementById('lastName').value.trim();
                    
                    if (newFirstName !== "" || newLastName !== "") {
                        updateUserName(userId, newFirstName, newLastName);
                        modal.hide();
                    } else {
                        alert("Please enter at least one name field.");
                    }
                });
            });
        });
    }
    
    // Update user name
    async function updateUserName(userId, firstName, lastName) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                firstName: firstName,
                lastName: lastName
            });
            
            // Reload users
            loadUsers();
            
            console.log('User name updated successfully');
        } catch (error) {
            console.error("Error updating user name:", error);
            alert("Error updating name. Please try again.");
        }
    }
});
