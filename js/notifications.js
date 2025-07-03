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
    const notificationsPanel = document.getElementById('notificationsPanel');
    
    if (!notificationsBtn || !notificationBadge || !notificationsPanel) {
        console.log("Notification elements not found on page");
        return;
    }
      // Add manual dropdown toggle
    notificationsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (notificationsPanel.style.display === 'none') {
            notificationsPanel.style.display = 'block';
            console.log('Notifications panel opened');
            
            // Clear unread count when opening notifications
            setTimeout(() => {
                notificationBadge.classList.add('d-none');
                console.log('Notification badge cleared');
            }, 500);
            
        } else {
            notificationsPanel.style.display = 'none';
            console.log('Notifications panel closed');
        }
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
        if (!notificationsBtn.contains(e.target) && !notificationsPanel.contains(e.target)) {
            notificationsPanel.style.display = 'none';
        }
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
                if (notificationsPanel) {
                    notificationsPanel.innerHTML = '<div class="notifications-content"><div class="text-center p-3">No notifications</div></div>';
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
            
            // Update notifications panel
            if (notificationsPanel) {
                updateNotificationsPanel(notifications);
            }
            
        }, (error) => {
            console.error("Error getting notifications:", error);
        });
    }
    
    // Function to update the notifications panel UI
    function updateNotificationsPanel(notifications) {
        if (!notificationsPanel) return;
        
        // Clear current content
        notificationsPanel.innerHTML = '';
        
        if (notifications.length === 0) {
            notificationsPanel.innerHTML = '<div class="notifications-content"><div class="text-center p-3">No notifications</div></div>';
            return;
        }
        
        // Create container
        const container = document.createElement('div');
        container.className = 'notifications-content';
        
        // Add each notification
        notifications.forEach(notification => {
            // Format date
            let formattedDate = "Recent";
            if (notification.timestamp) {
                const date = notification.timestamp.toDate ? 
                    notification.timestamp.toDate() : 
                    new Date(notification.timestamp.seconds * 1000);
                
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
            notificationItem.className = 'notification-expandable';
            notificationItem.innerHTML = `
                <div class="notification-header" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #eee; background-color: #fff; color: #333;">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong style="color: #333;">${notification.title}</strong>
                        <small class="text-muted" style="color: #666;">${formattedDate}</small>
                    </div>
                    <i class="bi bi-chevron-down mt-1" style="color: #333;"></i>
                </div>
                <div class="notification-details" style="display: none; padding: 10px; background-color: #f8f9fa; border-bottom: 1px solid #eee; color: #555;">
                    <p class="mb-0" style="color: #555;">${notification.message}</p>
                </div>
            `;
            
            // Add click handler for expanding
            const header = notificationItem.querySelector('.notification-header');
            const details = notificationItem.querySelector('.notification-details');
            const icon = notificationItem.querySelector('i');
            
            header.addEventListener('click', function(e) {
                e.stopPropagation();
                
                if (details.style.display === 'none') {
                    details.style.display = 'block';
                    icon.classList.remove('bi-chevron-down');
                    icon.classList.add('bi-chevron-up');
                } else {
                    details.style.display = 'none';
                    icon.classList.remove('bi-chevron-up');
                    icon.classList.add('bi-chevron-down');
                }
            });
            
            container.appendChild(notificationItem);
        });
        
        notificationsPanel.appendChild(container);
    }
});
