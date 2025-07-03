import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    getDoc,
    updateDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Pizza selection script loaded');
    
    // Debug: Check localStorage contents
    console.log('Debug - localStorage contents:');
    console.log('userId:', localStorage.getItem('userId'));
    console.log('userName:', localStorage.getItem('userName'));
    console.log('userRole:', localStorage.getItem('userRole'));
    
    // Set up lunch expandable
    const lunchTitle = document.getElementById('lunchTitle');
    const lunchDetails = document.getElementById('lunchDetails');
    const lunchIcon = document.getElementById('lunchIcon');
    
    if (lunchTitle && lunchDetails && lunchIcon) {
        lunchTitle.style.cursor = 'pointer';
        lunchTitle.addEventListener('click', function() {
            console.log('Lunch title clicked');
            
            if (lunchDetails.style.display === 'none') {
                lunchDetails.style.display = 'block';
                lunchIcon.classList.remove('bi-chevron-down');
                lunchIcon.classList.add('bi-chevron-up');
                console.log('Lunch details expanded');
            } else {
                lunchDetails.style.display = 'none';
                lunchIcon.classList.remove('bi-chevron-up');
                lunchIcon.classList.add('bi-chevron-down');
                console.log('Lunch details collapsed');
            }
        });
        console.log('Lunch expandable set up successfully');
    } else {
        console.log('Lunch elements not found');
    }
    
    // Set up pizza selection
    const pizzaChoice = document.getElementById('pizzaChoice');
    const clearPizzaBtn = document.getElementById('clearPizzaBtn');
    
    if (pizzaChoice) {
        pizzaChoice.addEventListener('change', function() {
            console.log('Pizza choice changed:', this.value);
            if (this.value) {
                savePizzaChoice(this.value);
            }
        });
    }
    
    if (clearPizzaBtn) {
        clearPizzaBtn.addEventListener('click', function() {
            console.log('Clear pizza button clicked');
            clearPizzaChoice();
        });
    }
    
    // Load existing selection
    loadExistingSelection();
});

// Save pizza choice
async function savePizzaChoice(pizzaType) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showStatus('Please log in to save your pizza selection.', 'warning');
        console.log('No userId found in localStorage');
        return;
    }

    try {
        console.log('Saving pizza choice:', pizzaType, 'for user:', userId);
        
        // Get user's profile data to save name along with selection
        const userProfileRef = doc(db, "users", userId);
        const userProfileSnap = await getDoc(userProfileRef);
        
        let firstName = '';
        let lastName = '';
        
        if (userProfileSnap.exists()) {
            const userData = userProfileSnap.data();
            firstName = userData.firstName || '';
            lastName = userData.lastName || '';
            console.log('Retrieved user data:', { firstName, lastName, userData });
        } else {
            console.log('User profile not found in database for userId:', userId);
            // Try to get name from localStorage as fallback
            const userName = localStorage.getItem('userName');
            if (userName) {
                const nameParts = userName.split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
                console.log('Using fallback name from localStorage:', { firstName, lastName });
            }
        }
        
        // Get current selection to handle count properly
        const userSelectionRef = doc(db, "pizzaSelections", userId);
        const userSelectionSnap = await getDoc(userSelectionRef);
        
        let currentSelection = null;
        if (userSelectionSnap.exists()) {
            currentSelection = userSelectionSnap.data().day2;
            console.log('Current selection:', currentSelection);
        }
        
        // If user already has a selection and it's different, we need to decrement the old one
        if (currentSelection && currentSelection !== pizzaType) {
            const summaryRef = doc(db, "pizzaSummary", "day2");
            await setDoc(summaryRef, {
                [currentSelection]: increment(-1),
                lastUpdated: serverTimestamp()
            }, { merge: true });
            console.log('Decremented old selection:', currentSelection);
        }
        
        // Prepare data to save
        const dataToSave = {
            day2: pizzaType,
            day2_timestamp: serverTimestamp(),
            userId: userId,
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`.trim()
        };
        
        console.log('Data being saved:', dataToSave);
        
        // Save user's new pizza selection with name
        await setDoc(userSelectionRef, dataToSave, { merge: true });

        // Only increment the count if it's a new selection or different from current
        if (!currentSelection || currentSelection !== pizzaType) {
            const summaryRef = doc(db, "pizzaSummary", "day2");
            await setDoc(summaryRef, {
                [pizzaType]: increment(1),
                lastUpdated: serverTimestamp()
            }, { merge: true });
            console.log('Incremented new selection:', pizzaType);
        }

        showStatus(`✅ ${getPizzaName(pizzaType)} selected!`, 'success');
        console.log('Pizza selection saved successfully with user name:', firstName, lastName);
        
    } catch (error) {
        console.error('Error saving pizza selection:', error);
        showStatus('❌ Error saving selection. Please try again.', 'danger');
    }
}

// Clear pizza choice
async function clearPizzaChoice() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showStatus('Please log in to clear your selection.', 'warning');
        return;
    }

    try {
        console.log('Clearing pizza choice');
        
        // Get current selection to decrement count
        const userSelectionRef = doc(db, "pizzaSelections", userId);
        const userSelectionSnap = await getDoc(userSelectionRef);
        
        if (userSelectionSnap.exists()) {
            const currentSelection = userSelectionSnap.data().day2;
            if (currentSelection) {
                // Decrement the count
                const summaryRef = doc(db, "pizzaSummary", "day2");
                await setDoc(summaryRef, {
                    [currentSelection]: increment(-1),
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            }
        }

        // Clear selection
        await updateDoc(userSelectionRef, {
            day2: "",
            day2_timestamp: serverTimestamp()
        });

        // Clear the dropdown
        const pizzaChoice = document.getElementById('pizzaChoice');
        if (pizzaChoice) {
            pizzaChoice.value = "";
        }

        showStatus('🗑️ Pizza selection cleared.', 'info');
        console.log('Pizza selection cleared successfully');
        
    } catch (error) {
        console.error('Error clearing pizza selection:', error);
        showStatus('❌ Error clearing selection. Please try again.', 'danger');
    }
}

// Load existing selection
async function loadExistingSelection() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        console.log('Loading existing pizza selection');
        
        const userSelectionRef = doc(db, "pizzaSelections", userId);
        const userSelectionSnap = await getDoc(userSelectionRef);
        
        if (userSelectionSnap.exists()) {
            const selections = userSelectionSnap.data();
            
            if (selections.day2) {
                const pizzaChoice = document.getElementById('pizzaChoice');
                if (pizzaChoice) {
                    pizzaChoice.value = selections.day2;
                    showStatus(`Current selection: ${getPizzaName(selections.day2)}`, 'info');
                    console.log('Loaded existing selection:', selections.day2);
                }
            }
        }
    } catch (error) {
        console.error('Error loading existing selection:', error);
    }
}

// Show status message
function showStatus(message, type) {
    const statusElement = document.getElementById('pizzaSelectionStatus');
    if (statusElement) {
        statusElement.innerHTML = `<div class="alert alert-${type} alert-sm py-2">${message}</div>`;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusElement.innerHTML = '';
        }, 3000);
    }
}

// Get pizza display name
function getPizzaName(pizzaType) {
    const names = {
        'margherita': '🍅 Margherita',
        'pepperoni': '🍕 Pepperoni',
        'vegetarian': '🥬 Vegetarian',
        'quattro-formaggi': '🧀 Quattro Formaggi',
        'prosciutto': '🥓 Prosciutto',
        'gluten-free': '🌾 Gluten Free'
    };
    return names[pizzaType] || pizzaType;
}
