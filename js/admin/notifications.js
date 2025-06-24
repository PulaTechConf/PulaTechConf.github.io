import { db } from '../firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    // Check if user has admin rights
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        return;
    }
    
    // Load recent notifications
    loadRecentNotifications();
    
    // Set up notification form
    const notificationForm = document.getElementById('sendNotificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', sendNotification);
    }
});

// Load recent notifications
async function loadRecentNotifications() {
    try {
        const notificationsContainer = document.getElementById('recentNotifications');
        if (!notificationsContainer) return;
        
        // Create query for 10 most recent notifications
        const q = query(
            collection(db, "notifications"),
            orderBy("timestamp", "desc"),
            limit(10)
        );
        
        // Get the notifications
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            notificationsContainer.innerHTML = `
                <div class="list-group-item text-center">
                    No notifications found
                </div>
            `;
            return;
        }
        
        // Clear container
        notificationsContainer.innerHTML = '';
        
        // Add each notification
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? new Date(data.timestamp.toMillis()) : new Date();
            const formattedDate = date.toLocaleString();
            
            const notificationEl = document.createElement('div');
            notificationEl.className = 'list-group-item';
            notificationEl.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-1">${data.title}</h6>
                    <small>${formattedDate}</small>
                </div>
                <p class="mb-1">${data.message}</p>
            `;
            
            notificationsContainer.appendChild(notificationEl);
        });
        
    } catch (error) {
        console.error("Error loading notifications:", error);
        document.getElementById('recentNotifications').innerHTML = `
            <div class="list-group-item text-center text-danger">
                Error loading notifications
            </div>
        `;
    }
}

// Send a new notification
async function sendNotification(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('notificationTitle');
    const messageInput = document.getElementById('notificationMessage');
    
    const title = titleInput.value.trim();
    const message = messageInput.value.trim();
    
    if (!title || !message) {
        alert("Please enter both a title and message");
        return;
    }
    
    try {
        // Add the notification to Firestore
        await addDoc(collection(db, "notifications"), {
            title,
            message,
            timestamp: serverTimestamp(),
            sentBy: localStorage.getItem('userId')
        });
        
        // Clear the form
        titleInput.value = '';
        messageInput.value = '';
        
        // Show success message
        alert("Notification sent successfully");
        
        // Refresh the notifications list
        loadRecentNotifications();
        
    } catch (error) {
        console.error("Error sending notification:", error);
        alert(`Error sending notification: ${error.message}`);
    }
}
