import { db } from '../firebase-config.js';
import { 
    collection, 
    doc,
    getDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    // Check if user has admin rights
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        console.log("Not an admin, pizza tracking features disabled");
        return;
    }
    
    console.log("Pizza tracking admin module loaded");
    
    // Get refresh buttons
    const refreshPizzaSummaryBtn = document.getElementById('refreshPizzaSummary');
    const refreshUserPizzasBtn = document.getElementById('refreshUserPizzas');
    
    // Add event listeners
    refreshPizzaSummaryBtn?.addEventListener('click', loadPizzaSummaries);
    refreshUserPizzasBtn?.addEventListener('click', loadUserPizzaSelections);
    
    // Load data on page load
    loadPizzaSummaries();
    loadUserPizzaSelections();
});

// Load pizza counts by day and type
async function loadPizzaSummaries() {
    try {
        const days = ['day1', 'day2', 'day3'];
        const pizzaTypes = {
            'margherita': 'Margherita',
            'pepperoni': 'Pepperoni',
            'vegetarian': 'Vegetarian',
            'quattro-formaggi': 'Quattro Formaggi',
            'prosciutto': 'Prosciutto',
            'gluten-free': 'Gluten Free'
        };
        
        // Process each day
        for (const day of days) {
            const summaryElem = document.getElementById(`${day}Summary`);
            if (!summaryElem) continue;
            
            // Show loading state
            summaryElem.innerHTML = '<tr><td colspan="2" class="text-center">Loading...</td></tr>';
            
            // Get pizza summary for this day
            const summaryRef = doc(db, "pizzaSummary", day);
            const summarySnap = await getDoc(summaryRef);
            
            if (summarySnap.exists()) {
                const data = summarySnap.data();
                
                // Build the summary table
                let tableHtml = '';
                let totalCount = 0;
                
                // Add each pizza type to the table
                Object.keys(pizzaTypes).forEach(pizzaId => {
                    const count = data[pizzaId] || 0;
                    totalCount += count;
                    
                    tableHtml += `
                        <tr>
                            <td>${pizzaTypes[pizzaId]}</td>
                            <td>${count}</td>
                        </tr>
                    `;
                });
                
                // Add total row
                tableHtml += `
                    <tr class="table-active">
                        <td><strong>Total</strong></td>
                        <td><strong>${totalCount}</strong></td>
                    </tr>
                `;
                
                summaryElem.innerHTML = tableHtml;
            } else {
                summaryElem.innerHTML = '<tr><td colspan="2" class="text-center">No data available</td></tr>';
            }
        }
        
    } catch (error) {
        console.error("Error loading pizza summaries:", error);
        
        // Show error in all summary tables
        for (const day of ['day1', 'day2', 'day3']) {
            const summaryElem = document.getElementById(`${day}Summary`);
            if (summaryElem) {
                summaryElem.innerHTML = `<tr><td colspan="2" class="text-center text-danger">Error loading data</td></tr>`;
            }
        }
    }
}

// Load all user pizza selections
async function loadUserPizzaSelections() {
    try {
        const tableBody = document.getElementById('userPizzasTableBody');
        if (!tableBody) return;
        
        // Show loading state
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading user selections...</td></tr>';
        
        // Get all pizza selections
        const selectionsRef = collection(db, "pizzaSelections");
        const selectionsSnap = await getDocs(selectionsRef);
        
        if (selectionsSnap.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No pizza selections found</td></tr>';
            return;
        }
        
        // Get all users to match names
        const usersRef = collection(db, "users");
        const usersSnap = await getDocs(usersRef);
        const users = {};
        
        usersSnap.forEach(userDoc => {
            const userData = userDoc.data();
            users[userDoc.id] = `${userData.firstName} ${userData.lastName}`;
        });
        
        // Build the table
        let tableHtml = '';
        
        selectionsSnap.forEach(selectionDoc => {
            const userId = selectionDoc.id;
            const data = selectionDoc.data();
            const userName = users[userId] || 'Unknown User';
            
            tableHtml += `
                <tr>
                    <td>${userName}</td>
                    <td>${data.day1?.name || 'Not selected'}</td>
                    <td>${data.day2?.name || 'Not selected'}</td>
                    <td>${data.day3?.name || 'Not selected'}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = tableHtml;
        
    } catch (error) {
        console.error("Error loading user pizza selections:", error);
        const tableBody = document.getElementById('userPizzasTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading user selections</td></tr>';
        }
    }
}
