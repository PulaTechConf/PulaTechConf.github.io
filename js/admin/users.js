import { db } from '../firebase-config.js';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("Admin users.js loaded");
    console.log("Firebase db object:", db);
    
    // Check if user is admin
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        alert('Access denied. Admin rights required.');
        window.location.href = '../home.html';
        return;
    }
    
    // DOM Elements
    const usersList = document.getElementById('usersList');
    const refreshBtn = document.getElementById('refreshUsersBtn');
    
    if (!usersList) {
        console.error("usersList element not found");
        return;
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadUsers);
    }
    
    // Load users on page load
    loadUsers();
    
    // Function to load all users (simplified version)
    function loadUsers() {
        console.log("Loading users...");
        
        if (!usersList) {
            console.error("usersList element not found");
            return;
        }
        
        // Show loading state
        usersList.innerHTML = '<tr><td colspan="7" class="text-center">Loading users...</td></tr>';
        
        // Get the users collection reference
        const usersRef = collection(db, "users");
        
        // Get all users
        getDocs(usersRef)
            .then(querySnapshot => {
                console.log(`Found ${querySnapshot.size} users`);
                
                if (querySnapshot.empty) {
                    usersList.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
                    return;
                }
                
                // Clear and build list
                usersList.innerHTML = '';
                
                querySnapshot.forEach(doc => {
                    const userData = doc.data();
                    console.log("User data:", userData);
                    
                    // Create table row
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><input type="checkbox" class="user-select" data-id="${doc.id}"></td>
                        <td>${userData.firstName || ''} ${userData.lastName || ''}</td>
                        <td>${userData.email || ''}</td>
                        <td>${userData.affiliation || ''}</td>
                        <td>${userData.country || ''}</td>
                        <td>${userData.role || 'general'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-user" data-id="${doc.id}">Edit</button>
                            <button class="btn btn-sm btn-outline-danger delete-user" data-id="${doc.id}">Delete</button>
                        </td>
                    `;
                    
                    usersList.appendChild(row);
                });
                
                // Add event listeners for action buttons
                document.querySelectorAll('.edit-user').forEach(btn => {
                    btn.addEventListener('click', () => editUser(btn.dataset.id));
                });
                
                document.querySelectorAll('.delete-user').forEach(btn => {
                    btn.addEventListener('click', () => deleteUser(btn.dataset.id));
                });
                
            })
            .catch(error => {
                console.error("Error loading users:", error);
                usersList.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading users: ${error.message}</td></tr>`;
            });
    }
    
    // Function to edit a user
    function editUser(userId) {
        console.log("Editing user:", userId);
        // Implementation would go here
        alert("Edit functionality coming soon"); 
    }
    
    // Function to delete a user
    function deleteUser(userId) {
        if (!confirm("Are you sure you want to delete this user?")) return;
        
        console.log("Deleting user:", userId);
        
        deleteDoc(doc(db, "users", userId))
            .then(() => {
                console.log("User deleted successfully");
                loadUsers(); // Refresh the list
            })
            .catch(error => {
                console.error("Error deleting user:", error);
                alert(`Error deleting user: ${error.message}`);
            });
    }
});
    
    // Function to toggle all checkboxes
    function toggleSelectAll() {
        const isChecked = selectAll.checked;
        document.querySelectorAll('.user-select').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
    }
    
    // Function to edit user
    async function editUser(userId) {
        try {
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                alert('User not found.');
                return;
            }
            
            const userData = userDoc.data();
            
            // Populate edit form
            document.getElementById('editUserId').value = userId;
            document.getElementById('editFirstName').value = userData.firstName || '';
            document.getElementById('editLastName').value = userData.lastName || '';
            document.getElementById('editAffiliation').value = userData.affiliation || '';
            document.getElementById('editCountry').value = userData.country || '';
            document.getElementById('editEmail').value = userData.email || '';
            document.getElementById('editRole').value = userData.role || 'general';
            
            // Show modal
            editUserModal.show();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            alert(`Error loading user data: ${error.message}`);
        }
    }
    
    // Function to save user changes
    async function saveUserChanges() {
        try {
            const userId = document.getElementById('editUserId').value;
            const firstName = document.getElementById('editFirstName').value;
            const lastName = document.getElementById('editLastName').value;
            const affiliation = document.getElementById('editAffiliation').value;
            const country = document.getElementById('editCountry').value;
            const email = document.getElementById('editEmail').value;
            const role = document.getElementById('editRole').value;
            
            if (!userId) return;
            
            const userRef = doc(db, "users", userId);
            
            await updateDoc(userRef, {
                firstName,
                lastName,
                affiliation,
                country,
                email,
                role
            });
            
            // Close modal and refresh list
            editUserModal.hide();
            loadUsers();
            
            alert('User updated successfully.');
            
        } catch (error) {
            console.error('Error saving user data:', error);
            alert(`Error saving user data: ${error.message}`);
        }
    }
    
    // Function to delete user
    async function deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        try {
            await deleteDoc(doc(db, "users", userId));
            loadUsers();
            alert('User deleted successfully.');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(`Error deleting user: ${error.message}`);
        }
    }
    
    // Function to print selected badges
    async function printSelectedBadges() {
        const selectedUsers = document.querySelectorAll('.user-select:checked');
        
        if (selectedUsers.length === 0) {
            alert('Please select at least one user.');
            return;
        }
        
        try {
            // Clear badge container
            badgeContainer.innerHTML = '';
            
            for (const checkbox of selectedUsers) {
                const userId = checkbox.dataset.id;
                const userRef = doc(db, "users", userId);
                const userDoc = await getDoc(userRef);
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    createBadgeElement(userData);
                }
            }
            
            // Show print dialog
            printBadges();
            
        } catch (error) {
            console.error('Error printing badges:', error);
            alert(`Error printing badges: ${error.message}`);
        }
    }
    
    // Function to print all badges
    async function printAllBadges() {
        try {
            // Clear badge container
            badgeContainer.innerHTML = '';
            
            const usersRef = collection(db, "users");
            const querySnapshot = await getDocs(usersRef);
            
            if (querySnapshot.empty) {
                alert('No users found.');
                return;
            }
            
            querySnapshot.forEach(doc => {
                const userData = doc.data();
                createBadgeElement(userData);
            });
            
            // Show print dialog
            printBadges();
            
        } catch (error) {
            console.error('Error printing all badges:', error);
            alert(`Error printing all badges: ${error.message}`);
        }
    }
    
    // Function to print a single badge
    async function printSingleBadge(userId) {
        try {
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                alert('User not found.');
                return;
            }
            
            // Clear badge container
            badgeContainer.innerHTML = '';
            
            const userData = userDoc.data();
            createBadgeElement(userData);
            
            // Show print dialog
            printBadges();
            
        } catch (error) {
            console.error('Error printing badge:', error);
            alert(`Error printing badge: ${error.message}`);
        }
    }
    
    // Function to create badge element
    function createBadgeElement(userData) {
        const badge = document.createElement('div');
        badge.className = 'badge-print-card';
        badge.innerHTML = `
            <div class="text-center">
                <h3 class="badge-name">${userData.firstName} ${userData.lastName}</h3>
                <p class="badge-affiliation">${userData.affiliation || ''}</p>
                <p class="badge-country">${userData.country || ''}</p>
                <p class="badge-role text-muted">${userData.role || 'attendee'}</p>
            </div>
        `;
        
        badgeContainer.appendChild(badge);
    }
    
    // Function to print badges
    function printBadges() {
        // Show the print area
        badgePrintArea.classList.remove('d-none');
        
        // Print the badges
        setTimeout(() => {
            window.print();
            
            // Hide the print area after printing
            setTimeout(() => {
                badgePrintArea.classList.add('d-none');
            }, 500);
        }, 500);
    }
