import { db } from '../firebase-config.js';
import { 
    collection, 
    addDoc, 
    doc,
    deleteDoc,
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
    const notificationForm = document.getElementById('createNotificationForm');
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
        // Implementation for loading notifications would go here
        // This is a placeholder for the actual implementation
        console.log("Loading recent notifications...");
        // Fetch notifications from Firestore and display them
    } catch (error) {
        console.error("Error loading notifications:", error);
        document.getElementById('recentNotifications').innerHTML = `
            <div class="list-group-item text-center text-danger">
                Error loading notifications: ${error.message}
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
