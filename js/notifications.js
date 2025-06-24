import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationBadge = document.querySelector('.notification-badge');
    const notificationsList = document.getElementById('notificationsList');
    
    if (notificationsBtn && notificationBadge && notificationsList) {
        // Open notifications modal
        notificationsBtn.addEventListener('click', () => {
            const notificationsModal = new bootstrap.Modal(document.getElementById('notificationsModal'));
            notificationsModal.show();
        });
        
        // Listen for new notifications
        listenForNotifications();
    }
});

function listenForNotifications() {
    // Define query to get all notifications sorted by timestamp
    const notificationsQuery = query(
        collection(db, "notifications"),
        orderBy("timestamp", "desc")
    );
    
    // Listen for notifications
    onSnapshot(notificationsQuery, (snapshot) => {
        const notifications = [];
        let unreadCount = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            notifications.push({
                id: doc.id,
                ...data
            });
            
            // If the notification is new (less than 24 hours old), count it as unread
            const notificationTime = data.timestamp.toDate();
            const currentTime = new Date();
            const hoursDifference = (currentTime - notificationTime) / (1000 * 60 * 60);
            
            if (hoursDifference < 24) {
                unreadCount++;
            }
        });
        
        // Update badge with unread count
        const notificationBadge = document.querySelector('.notification-badge');
        if (notificationBadge) {
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount;
                notificationBadge.classList.remove('d-none');
            } else {
                notificationBadge.classList.add('d-none');
            }
        }
        
        // Update notification list if modal is open
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList && document.getElementById('notificationsModal').classList.contains('show')) {
            renderNotifications(notifications, notificationsList);
        }
    });
}

function renderNotifications(notifications, container) {
    container.innerHTML = '';
    
    if (notifications.length === 0) {
        container.innerHTML = '<div class="list-group-item">No notifications</div>';
        return;
    }
    
    notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('list-group-item');
        
        // Format date
        const date = new Date(notification.timestamp.toDate());
        const formattedDate = date.toLocaleString();
        
        notificationElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-1">${notification.title}</h6>
                <small>${formattedDate}</small>
            </div>
            <p class="mb-1">${notification.message}</p>
        `;
        
        container.appendChild(notificationElement);
    });
}

function markAllAsRead() {
    // Implementation would involve updating the "readBy" array in each notification
    // to include the current user's ID, but we'll leave this as a placeholder
    console.log("Marking all notifications as read");
}
