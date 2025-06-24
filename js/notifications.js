import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    orderBy,
    limit,
    onSnapshot,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("Notifications.js loaded");
    
    // Find UI elements
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationBadge = document.querySelector('.notification-badge');
    const notificationsList = document.getElementById('notificationsList');
    
    if (!notificationsBtn || !notificationBadge || !notificationsList) {
        console.log("Notification elements not found on page");
        return;
    }
    
    // Listen for notifications button click
    notificationsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Notifications button clicked");
        
        // Show notifications modal
        const notificationsModal = new bootstrap.Modal(document.getElementById('notificationsModal'));
        notificationsModal.show();
        
        // Mark as read when opened
        notificationBadge.classList.add('d-none');
        notificationBadge.textContent = '0';
    });
    
    // Set up notifications listener
    setupNotificationsListener();
    
    function setupNotificationsListener() {
        console.log("Setting up notifications listener");
        
        // Create a query for notifications, sorted by timestamp
        const notificationsRef = collection(db, "notifications");
        const q = query(
            notificationsRef,
            orderBy("timestamp", "desc"),
            limit(10)
        );
        
        // Listen for notifications in real time
        onSnapshot(q, (snapshot) => {
            console.log(`Received ${snapshot.size} notifications`);
            let unreadCount = 0;
            let notifications = [];
            
            if (snapshot.empty) {
                notificationsList.innerHTML = '<div class="list-group-item text-center">No notifications</div>';
                notificationBadge.classList.add('d-none');
                return;
            }
            
            // Process all notifications
            snapshot.forEach(doc => {
                const data = doc.data();
                notifications.push({
                    id: doc.id,
                    title: data.title || 'Notification',
                    message: data.message || '',
                    timestamp: data.timestamp
                });
                
                // Check if notification is recent (less than 24 hours old)
                if (data.timestamp) {
                    const notificationTime = data.timestamp.toDate ? 
                        data.timestamp.toDate() : 
                        new Date(data.timestamp.seconds * 1000);
                    
                    const hoursSinceNotification = (new Date() - notificationTime) / (1000 * 60 * 60);
                    
                    if (hoursSinceNotification < 24) {
                        unreadCount++;
                    }
                }
            });
            
            // Update badge
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount;
                notificationBadge.classList.remove('d-none');
            } else {
                notificationBadge.classList.add('d-none');
            }
            
            // Update notifications list if modal is visible
            updateNotificationsList(notifications);
            
        }, (error) => {
            console.error("Error getting notifications:", error);
        });
    }
    
    // Function to update the notifications list UI
    function updateNotificationsList(notifications) {
        if (!notificationsList) return;
        
        // Clear current list
        notificationsList.innerHTML = '';
        
        if (notifications.length === 0) {
            notificationsList.innerHTML = '<div class="list-group-item text-center">No notifications</div>';
            return;
        }
        
        // Add each notification to the list
        notifications.forEach(notification => {
            // Format date
            let formattedDate = "Recent";
            if (notification.timestamp) {
                const date = notification.timestamp.toDate ? 
                    notification.timestamp.toDate() : 
                    new Date(notification.timestamp.seconds * 1000);
                
                formattedDate = date.toLocaleString();
            }
            
            const notificationItem = document.createElement('div');
            notificationItem.className = 'list-group-item';
            notificationItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-1">${notification.title}</h6>
                    <small class="text-muted">${formattedDate}</small>
                </div>
                <p class="mb-1">${notification.message}</p>
            `;
            
            notificationsList.appendChild(notificationItem);
        });
    }
});
