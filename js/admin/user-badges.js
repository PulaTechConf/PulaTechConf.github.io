import { db } from '../firebase-config.js';
import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("User badges script loaded");
    
    // Check if user is admin
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        console.warn("Non-admin tried to access badge printing");
        return;
    }

    // DOM Elements
    const printSelectedBtn = document.getElementById('printSelectedBtn');
    const printAllBtn = document.getElementById('printAllBtn');
    const selectAllCheckbox = document.getElementById('selectAll');
    const userSearch = document.getElementById('userSearch');
    const badgeContainer = document.getElementById('badgeContainer');
    const badgePrintArea = document.getElementById('badgePrintArea');
    
    // Event Listeners
    if (printSelectedBtn) {
        printSelectedBtn.addEventListener('click', printSelectedBadges);
    }
    
    if (printAllBtn) {
        printAllBtn.addEventListener('click', printAllBadges);
    }
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            document.querySelectorAll('.user-select').forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        });
    }
    
    // Add event listeners to individual print buttons
    document.querySelectorAll('.print-badge').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.dataset.id;
            printUserBadge(userId);
        });
    });
    
    // Function to print selected user badges
    async function printSelectedBadges() {
        const selectedCheckboxes = document.querySelectorAll('.user-select:checked');
        
        if (selectedCheckboxes.length === 0) {
            alert('Please select at least one user');
            return;
        }
        
        // Prepare badge container
        badgeContainer.innerHTML = '';
        badgePrintArea.classList.remove('d-none');
        
        // Get selected users' data and create badges
        for (const checkbox of selectedCheckboxes) {
            const userId = checkbox.dataset.id;
            await createBadgeElement(userId);
        }
        
        // Print the badges
        setTimeout(() => {
            window.print();
            
            // Hide the print area after printing
            setTimeout(() => {
                badgePrintArea.classList.add('d-none');
            }, 500);
        }, 300);
    }
    
    // Function to print all user badges
    async function printAllBadges() {
        try {
            // Prepare badge container
            badgeContainer.innerHTML = '';
            badgePrintArea.classList.remove('d-none');
            
            // Get all users
            const usersRef = collection(db, "users");
            const snapshot = await getDocs(usersRef);
            
            if (snapshot.empty) {
                alert("No users found");
                badgePrintArea.classList.add('d-none');
                return;
            }
            
            // Create badges for all users
            for (const doc of snapshot.docs) {
                const userData = doc.data();
                createBadgeFromData(userData);
            }
            
            // Print the badges
            setTimeout(() => {
                window.print();
                
                // Hide the print area after printing
                setTimeout(() => {
                    badgePrintArea.classList.add('d-none');
                }, 500);
            }, 300);
            
        } catch (error) {
            console.error("Error printing all badges:", error);
            alert("Error printing badges: " + error.message);
            badgePrintArea.classList.add('d-none');
        }
    }
    
    // Function to print a single user badge
    async function printUserBadge(userId) {
        try {
            // Prepare badge container
            badgeContainer.innerHTML = '';
            badgePrintArea.classList.remove('d-none');
            
            // Create badge for the user
            await createBadgeElement(userId);
            
            // Print the badge
            setTimeout(() => {
                window.print();
                
                // Hide the print area after printing
                setTimeout(() => {
                    badgePrintArea.classList.add('d-none');
                }, 500);
            }, 300);
            
        } catch (error) {
            console.error("Error printing badge:", error);
            alert("Error printing badge: " + error.message);
            badgePrintArea.classList.add('d-none');
        }
    }
    
    // Function to create a badge element from user ID
    async function createBadgeElement(userId) {
        try {
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                console.error("User not found:", userId);
                return;
            }
            
            const userData = userDoc.data();
            createBadgeFromData(userData);
            
        } catch (error) {
            console.error("Error creating badge:", error);
            throw error;
        }
    }
    
    // Function to create a badge element from user data
    function createBadgeFromData(userData) {
        const badge = document.createElement('div');
        badge.className = 'badge-print-card';
        
        // Format name
        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        
        // Create badge content
        badge.innerHTML = `
            <div class="text-center">
                <div class="badge-logo mb-2">
                    <h4>PulaTechConf 2025</h4>
                </div>
                <h3 class="badge-name">${fullName}</h3>
                <p class="badge-affiliation">${userData.affiliation || ''}</p>
                <p class="badge-country">${userData.country || ''}</p>
                <p class="badge-role text-muted">${userData.role || 'attendee'}</p>
            </div>
        `;
        
        // Add badge to container
        badgeContainer.appendChild(badge);
    }
    
    // Function to filter users
    if (userSearch) {
        userSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            document.querySelectorAll('#usersList tr').forEach(row => {
                const rowData = row.textContent.toLowerCase();
                if (rowData.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Add print styles to make badges print nicely
    function addPrintStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @media print {
                body * {
                    visibility: hidden;
                }
                #badgePrintArea, #badgePrintArea * {
                    visibility: visible;
                }
                #badgePrintArea {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
                .badge-print-card {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add print styles
    addPrintStyles();
});
