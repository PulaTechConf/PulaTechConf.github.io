import { db } from '../firebase-config.js';
import { 
    collection, 
    addDoc, 
    doc,
    deleteDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Function to create a new notification (for admin use)
export async function createNotification(title, message) {
    try {
        console.log("Creating notification:", title);
        
        const notificationData = {
            title,
            message,
            timestamp: serverTimestamp(),
            createdBy: localStorage.getItem('userId') || 'system'
        };
        
        const notificationsRef = collection(db, "notifications");
        const docRef = await addDoc(notificationsRef, notificationData);
        
        console.log("Notification created with ID:", docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error creating notification:", error);
        return { success: false, error: error.message };
    }
}

// Function to delete a notification (for admin use)
export async function deleteNotification(notificationId) {
    try {
        console.log("Deleting notification:", notificationId);
        
        const notificationRef = doc(db, "notifications", notificationId);
        await deleteDoc(notificationRef);
        
        console.log("Notification deleted successfully");
        return { success: true };
    } catch (error) {
        console.error("Error deleting notification:", error);
        return { success: false, error: error.message };
    }
}

// Example usage (for testing)
document.addEventListener('DOMContentLoaded', function() {
    // Admin-only functionality
    if (localStorage.getItem('userRole') !== 'admin') return;
      // If on admin page, set up notification creation form
    const notificationForm = document.getElementById('sendNotificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const title = document.getElementById('notificationTitle').value.trim();
            const message = document.getElementById('notificationMessage').value.trim();
            
            if (!title || !message) {
                alert('Both title and message are required');
                return;
            }
            
            const result = await createNotification(title, message);
            
            if (result.success) {
                alert('Notification created successfully');
                notificationForm.reset();
                // Reload recent notifications if element exists
                loadRecentNotifications();
            } else {
                alert(`Error creating notification: ${result.error}`);
            }
        });
    }

    // Load recent notifications if applicable
    if (document.getElementById('recentNotifications')) {
        loadRecentNotifications();
    }
});

// Function to load recent notifications
async function loadRecentNotifications() {
    try {
        console.log("Loading recent notifications...");
        
        const recentNotificationsElement = document.getElementById('recentNotifications');
        if (!recentNotificationsElement) return;
        
        // Show loading state
        recentNotificationsElement.innerHTML = '<div class="list-group-item text-center">Loading notifications...</div>';
        
        // Create query to get recent notifications
        const notificationsRef = collection(db, "notifications");
        const q = query(
            notificationsRef,
            orderBy("timestamp", "desc"),
            limit(20)
        );
        
        // Get notifications
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            recentNotificationsElement.innerHTML = '<div class="list-group-item text-center text-muted">No notifications found</div>';
            return;
        }
        
        // Build notifications list
        let notificationsHtml = '';
        
        querySnapshot.forEach((doc) => {
            const notification = doc.data();
            const notificationId = doc.id;
            
            // Format timestamp
            let formattedDate = "Recent";
            if (notification.timestamp) {
                try {
                    const date = notification.timestamp.toDate();
                    formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                } catch (e) {
                    console.warn("Error formatting date:", e);
                }
            }
            
            // Truncate message for preview
            const messagePreview = notification.message.length > 100 
                ? notification.message.substring(0, 100) + '...' 
                : notification.message;
            
            notificationsHtml += `
                <div class="list-group-item notification-item" data-id="${notificationId}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="notification-header" style="cursor: pointer; flex-grow: 1;" onclick="toggleNotificationContent('${notificationId}')">
                            <h6 class="mb-1">${notification.title}</h6>
                            <p class="mb-1 text-muted notification-preview" id="preview-${notificationId}">${messagePreview}</p>
                            <small class="text-muted">${formattedDate}</small>
                        </div>
                        <div class="ms-2">
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteNotificationFromList('${notificationId}')" title="Delete notification">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="notification-full-content d-none mt-2" id="content-${notificationId}">
                        <div class="alert alert-light">
                            <strong>Full Message:</strong><br>
                            ${notification.message.replace(/\n/g, '<br>')}
                        </div>
                        <small class="text-muted">
                            <i class="bi bi-person"></i> Created by: ${notification.createdBy || 'Unknown'}
                        </small>
                    </div>
                </div>
            `;
        });
        
        recentNotificationsElement.innerHTML = notificationsHtml;
        
        console.log(`Loaded ${querySnapshot.size} notifications`);
        
    } catch (error) {
        console.error("Error loading notifications:", error);
        const recentNotificationsElement = document.getElementById('recentNotifications');
        if (recentNotificationsElement) {
            recentNotificationsElement.innerHTML = `
                <div class="list-group-item text-center text-danger">
                    Error loading notifications: ${error.message}
                </div>
            `;
        }
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
            sentBy: localStorage.getItem('userId') || 'unknown'
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

// Global functions for notification interaction
window.toggleNotificationContent = function(notificationId) {
    const previewElement = document.getElementById(`preview-${notificationId}`);
    const contentElement = document.getElementById(`content-${notificationId}`);
    
    if (contentElement.classList.contains('d-none')) {
        // Show full content
        contentElement.classList.remove('d-none');
        previewElement.style.display = 'none';
    } else {
        // Hide full content
        contentElement.classList.add('d-none');
        previewElement.style.display = 'block';
    }
};

window.deleteNotificationFromList = async function(notificationId) {
    if (!confirm('Are you sure you want to delete this notification?')) {
        return;
    }
    
    try {
        const result = await deleteNotification(notificationId);
        
        if (result.success) {
            // Remove from UI
            const notificationElement = document.querySelector(`[data-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.remove();
            }
            
            console.log('Notification deleted successfully');
        } else {
            alert(`Error deleting notification: ${result.error}`);
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        alert(`Error deleting notification: ${error.message}`);
    }
};
