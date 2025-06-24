import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection,
    Timestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    const selectPizzaBtns = document.querySelectorAll('.select-pizza-btn');
    const daySelect = document.getElementById('daySelect');
    const confirmPizzaBtn = document.getElementById('confirmPizzaBtn');
    
    // Load user's current selections
    loadUserSelections(userId);
    
    // Add event listeners to pizza selection buttons
    selectPizzaBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const pizzaId = this.getAttribute('data-pizza-id');
            const pizzaName = this.closest('.card').querySelector('.card-title').textContent;
            const dayValue = daySelect.value;
            const dayText = daySelect.options[daySelect.selectedIndex].text;
            
            // Show confirmation modal
            const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
            document.getElementById('selectedPizzaName').textContent = pizzaName;
            document.getElementById('selectedDay').textContent = dayText;
            
            // Set up the confirm button
            confirmPizzaBtn.onclick = function() {
                savePizzaSelection(userId, dayValue, pizzaId, pizzaName);
                modal.hide();
            };
            
            modal.show();
        });
    });
});

// Load user's current pizza selections
async function loadUserSelections(userId) {
    try {
        const userSelectionRef = doc(db, "pizzaSelections", userId);
        const docSnap = await getDoc(userSelectionRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Update UI with current selections
            if (data.day1) {
                document.querySelector('#day1Selection span').textContent = data.day1.name;
            }
            
            if (data.day2) {
                document.querySelector('#day2Selection span').textContent = data.day2.name;
            }
            
            if (data.day3) {
                document.querySelector('#day3Selection span').textContent = data.day3.name;
            }
        }
    } catch (error) {
        console.error("Error loading pizza selections:", error);
    }
}

// Save the user's pizza selection
async function savePizzaSelection(userId, day, pizzaId, pizzaName) {
    try {
        const userSelectionRef = doc(db, "pizzaSelections", userId);
        const docSnap = await getDoc(userSelectionRef);
        
        let userData = {};
        if (docSnap.exists()) {
            userData = docSnap.data();
        }
        
        // Update the selection for the specified day
        userData[day] = {
            id: pizzaId,
            name: pizzaName,
            selectedAt: Timestamp.now()
        };
        
        // Save to Firestore
        await setDoc(userSelectionRef, userData, { merge: true });
        
        // Use transaction to safely update pizza counts
        await runTransaction(db, async (transaction) => {
            const summaryRef = doc(db, "pizzaSummary", day);
            const summaryDoc = await transaction.get(summaryRef);
            
            const currentCount = summaryDoc.exists() ? 
                (summaryDoc.data()[pizzaId] || 0) : 0;
            
            transaction.set(summaryRef, {
                [pizzaId]: currentCount + 1
            }, { merge: true });
        });
        
        // Update UI
        document.querySelector(`#${day}Selection span`).textContent = pizzaName;
        
        // Show success message
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            <strong>Success!</strong> Your ${pizzaName} selection for ${day.replace('day', 'Day ')} has been saved.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.querySelector('.container').insertBefore(alert, document.querySelector('.container').firstChild);
        
        // Auto-remove alert after 3 seconds
        setTimeout(() => {
            alert.remove();
        }, 3000);
        
    } catch (error) {
        console.error("Error saving pizza selection:", error);
        
        // Show error message
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            <strong>Error!</strong> Could not save your selection. Please try again.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.querySelector('.container').insertBefore(alert, document.querySelector('.container').firstChild);
    }
}
