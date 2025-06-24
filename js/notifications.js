import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("Notifications.js loaded");
    
    // Find UI elements
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationBadge = document.querySelector('.notification-badge');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    
    if (!notificationsBtn || !notificationBadge) {
        console.log("Notification elements not found on page");
        return;
    }
    
    // Set up notifications listener
    setupNotificationsListener();
    
    // Stop dropdown from closing when clicking notification items
    document.addEventListener('click', function(e) {
        if (e.target && (e.target.closest('.notification-item') || e.target.closest('.notification-content'))) {
            e.stopPropagation(); // Stop event propagation to prevent dropdown from closing
        }
    }, true);
    
    // Improved click handler for notification items
    document.addEventListener('click', function(e) {
        // Find the notification item or its header that was clicked
        const notificationItem = e.target.closest('.notification-item') || e.target.closest('.notification-item-header');
        
        if (notificationItem) {
            // Find the content element within this notification
            const content = notificationItem.querySelector('.notification-content');
            
            if (content) {
                // Toggle the show class
                content.classList.toggle('show');
                
                // Stop event propagation to prevent dropdown from closing
                e.stopPropagation();
            }
        }
    });
    
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
                if (notificationsDropdown) {
                    notificationsDropdown.innerHTML = '<div class="dropdown-item text-center">No notifications</div>';
                }
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
            
            // Update notifications dropdown
            if (notificationsDropdown) {
                updateNotificationsDropdown(notifications);
            }
            
        }, (error) => {
            console.error("Error getting notifications:", error);
        });
    }
    
    // Function to update the notifications dropdown UI
    function updateNotificationsDropdown(notifications) {
        if (!notificationsDropdown) return;
        
        // Clear current list
        notificationsDropdown.innerHTML = '';
        
        if (notifications.length === 0) {
            notificationsDropdown.innerHTML = '<div class="dropdown-item text-center">No notifications</div>';
            return;
        }
        
        // Add each notification to the dropdown with improved structure
        notifications.forEach(notification => {
            // Format date
            let formattedDate = "Recent";
            if (notification.timestamp) {
                const date = notification.timestamp.toDate ? 
                    notification.timestamp.toDate() : 
                    new Date(notification.timestamp.seconds * 1000);
                
                // Format date to show only relevant info (today, yesterday, or specific date)
                const now = new Date();
                const isToday = date.toDateString() === now.toDateString();
                const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
                
                if (isToday) {
                    formattedDate = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                } else if (isYesterday) {
                    formattedDate = `Yesterday, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                } else {
                    formattedDate = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
                }
            }
            
            const notificationItem = document.createElement('div');
            notificationItem.className = 'notification-item dropdown-item';
            notificationItem.innerHTML = `
                <div class="notification-item-header">
                    <div class="d-flex justify-content-between align-items-start">
                        <strong>${notification.title}</strong>
                        <small class="text-muted ms-2">${formattedDate}</small>
                    </div>
                </div>
                <div class="notification-content">
                    ${notification.message}
                </div>
            `;
            
            notificationsDropdown.appendChild(notificationItem);
        });
    }
});
