import { db } from './firebase-config.js';
import { 
    doc, 
    getDoc,
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("User profile loaded");
    
    // Load user profile data
    loadUserProfile();
    
    // Load pizza selection
    loadPizzaSelection();

    // Set up pizza edit form buttons
    const saveBtn = document.getElementById('profilePizzaSaveBtn');
    const cancelBtn = document.getElementById('profilePizzaCancelBtn');

    if (saveBtn) {
        saveBtn.addEventListener('click', savePizzaChange);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', hidePizzaEditForm);
    }
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Clear all localStorage data
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userRole');
            
            // Redirect to main index page
            window.location.href = '../index.html';
        });
    }
    
    async function loadUserProfile() {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        
        try {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // Populate profile fields with plain text
                document.getElementById('firstName').textContent = userData.firstName || 'Not provided';
                document.getElementById('lastName').textContent = userData.lastName || 'Not provided';
                document.getElementById('email').textContent = userData.email || 'Not provided';
                document.getElementById('affiliation').textContent = userData.affiliation || 'Not provided';
                
                // Format and display role
                const role = localStorage.getItem('userRole') || 'general';
                const roleDisplayNames = {
                    'general': 'General Participant',
                    'organizer': 'Organizer',
                    'admin': 'Administrator'
                };
                document.getElementById('userRole').textContent = roleDisplayNames[role] || role;
            }
        } catch (error) {
            console.error("Error loading user profile:", error);
            showAlert('Error loading profile data', 'danger');
        }
    }
    
    async function loadPizzaSelection() {
        const userId = localStorage.getItem('userId');
        const pizzaContainer = document.getElementById('pizzaSelectionSummary');
        
        if (!userId || !pizzaContainer) return;
        
        try {
            const pizzaRef = doc(db, "pizzaSelections", userId);
            const pizzaSnap = await getDoc(pizzaRef);
            
            if (!pizzaSnap.exists() || !pizzaSnap.data().day2) {
                pizzaContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <h6><i class="bi bi-exclamation-triangle me-2"></i>No Pizza Reservation</h6>
                        <p class="mb-0">You haven't selected a pizza yet.</p>
                        <small class="text-muted">Please choose your pizza preference in the Schedule tab.</small>
                    </div>
                `;
                return;
            }

            const pizzaData = pizzaSnap.data();
            const pizzaNames = {
                'margherita': '🍅 Margherita',
                'gluten-free-margherita': '🌾 Margherita (Gluten Free)',
                'vegetarian': '🥬 Vegetarian',
                'tuna': '🐟 Tuna',
                'mushroom': '🍄 Mushroom',
                'capricciosa': '🍕 Capricciosa'
            };

            const selectedPizza = pizzaNames[pizzaData.day2] || pizzaData.day2 || 'Unknown';
            const reservedAt = pizzaData.reservedAt ? new Date(pizzaData.reservedAt.seconds * 1000).toLocaleString() : 'Unknown';
            const isPickedUp = !!pizzaData.pickedUp;
            const pickupStatus = isPickedUp ? 'Picked up' : 'Ready for pickup';
            let pickupCode = pizzaData.pickupCode || '';

            // If pickup code is missing, generate one and save it
            if (!pickupCode) {
                pickupCode = generatePickupCode();
                try {
                    await updateDoc(pizzaRef, { pickupCode });
                    console.log('Generated and saved missing pickup code:', pickupCode);
                } catch (error) {
                    console.warn('Could not save pickup code:', error);
                }
            }

            const pickedUpAt = pizzaData.pickedUpAt ? new Date(pizzaData.pickedUpAt.seconds * 1000).toLocaleString() : null;
            const pickedUpByAdmin = pizzaData.pickedUpByAdmin || null;

            pizzaContainer.innerHTML = `
                <div class="alert alert-success">
                    <h6><i class="bi bi-check-circle me-2"></i>Pizza Reservation</h6>
                    <p class="mb-2"><strong>${selectedPizza}</strong></p>
                    <p class="mb-1"><strong>Status:</strong> ${pickupStatus}</p>
                    <p class="mb-1"><strong>Reserved:</strong> ${reservedAt}</p>
                    <p class="mb-1"><strong>Pickup Code:</strong> <code>${escapeHtml(pickupCode)}</code></p>
                    ${pickedUpAt ? `<p class="mb-0 text-success"><strong>Picked up at:</strong> ${pickedUpAt}${pickedUpByAdmin ? ` by ${escapeHtml(pickedUpByAdmin)}` : ''}</p>` : ''}
                </div>
            `;

            // Show edit button and set up edit form
            const editBtn = document.getElementById('profilePizzaEditBtn');
            if (editBtn) {
                editBtn.style.display = 'inline-block';
                editBtn.addEventListener('click', function() {
                    showPizzaEditForm(pizzaData.day2);
                });
            }
        } catch (error) {
            console.error("Error loading pizza selection:", error);
            pizzaContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="bi bi-exclamation-circle me-2"></i>Error</h6>
                    <p class="mb-0">Unable to load pizza reservation.</p>
                </div>
            `;
        }
    }
    
    // Show alert message
    function showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function generatePickupCode() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let code = 'PZ-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function showPizzaEditForm(currentPizza) {
        const form = document.getElementById('pizzaEditForm');
        const summary = document.getElementById('pizzaSelectionSummary');
        const editBtn = document.getElementById('profilePizzaEditBtn');
        const dropdown = document.getElementById('profilePizzaChoice');

        if (form && dropdown) {
            form.classList.remove('d-none');
            summary.style.display = 'none';
            editBtn.style.display = 'none';
            dropdown.value = currentPizza || '';
            dropdown.focus();
        }
    }

    function hidePizzaEditForm() {
        const form = document.getElementById('pizzaEditForm');
        const summary = document.getElementById('pizzaSelectionSummary');
        const editBtn = document.getElementById('profilePizzaEditBtn');
        const statusDiv = document.getElementById('profilePizzaStatus');

        if (form) {
            form.classList.add('d-none');
            summary.style.display = 'block';
            editBtn.style.display = 'inline-block';
            statusDiv.innerHTML = '';
        }
    }

    async function savePizzaChange() {
        const userId = localStorage.getItem('userId');
        const statusDiv = document.getElementById('profilePizzaStatus');
        const dropdown = document.getElementById('profilePizzaChoice');

        if (!userId || !dropdown) return;

        const newPizzaType = dropdown.value.trim();
        if (!newPizzaType) {
            if (statusDiv) {
                statusDiv.innerHTML = '<div class="alert alert-warning alert-sm py-2 mb-0">Please select a pizza.</div>';
            }
            return;
        }

        try {
            if (statusDiv) {
                statusDiv.innerHTML = '<div class="text-muted small">Saving...</div>';
            }

            const pizzaRef = doc(db, "pizzaSelections", userId);
            const pizzaSnap = await getDoc(pizzaRef);

            if (!pizzaSnap.exists()) {
                if (statusDiv) {
                    statusDiv.innerHTML = '<div class="alert alert-danger alert-sm py-2 mb-0">No reservation found. Please try again.</div>';
                }
                return;
            }

            const currentPizza = pizzaSnap.data().day2;

            // If changing to a different pizza, update counts
            if (currentPizza && currentPizza !== newPizzaType) {
                const summaryRef = doc(db, "pizzaSummary", "day2");
                await updateDoc(summaryRef, {
                    [currentPizza]: increment(-1),
                    [newPizzaType]: increment(1),
                    lastUpdated: serverTimestamp()
                });
            }

            // Update the user's selection
            await updateDoc(pizzaRef, {
                day2: newPizzaType,
                day2_timestamp: new Date()
            });

            if (statusDiv) {
                statusDiv.innerHTML = '<div class="alert alert-success alert-sm py-2 mb-0">Pizza selection updated!</div>';
            }

            // Reload the profile to show updated info
            setTimeout(() => {
                loadPizzaSelection();
            }, 500);
        } catch (error) {
            console.error("Error updating pizza selection:", error);
            if (statusDiv) {
                statusDiv.innerHTML = `<div class="alert alert-danger alert-sm py-2 mb-0">Error saving selection: ${error.message}</div>`;
            }
        }
    }
});
