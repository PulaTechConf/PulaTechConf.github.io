import { db } from './firebase-config.js';
import { 
    doc, 
    getDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("User profile loaded");
    
    // Load user profile data
    loadUserProfile();
    
    // Load pizza selection
    loadPizzaSelection();
    
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
            const pickupCode = pizzaData.pickupCode || 'Not available';
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
});
