import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Schedule the pizza reminder notification
export async function schedulePizzaReminder() {
    try {
        console.log("Scheduling pizza reminder notification");
        
        // Create notification for July 17, 2025 at 11:00 AM
        const reminderDate = new Date('2025-07-17T11:00:00');
        
        const notificationData = {
            title: "Pizza Selection Reminder",
            message: "Don't forget to select your pizza choice for today's lunch! Please make your selection as soon as possible to ensure we have your preferred option available.",
            timestamp: Timestamp.fromDate(reminderDate),
            scheduledFor: Timestamp.fromDate(reminderDate),
            type: 'pizza_reminder',
            createdBy: 'system',
            createdAt: serverTimestamp()
        };
        
        const notificationsRef = collection(db, "notifications");
        const docRef = await addDoc(notificationsRef, notificationData);
        
        console.log("Pizza reminder notification scheduled with ID:", docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error scheduling pizza reminder:", error);
        return { success: false, error: error.message };
    }
}

// Schedule initial notifications (call this once during setup)
export async function scheduleInitialNotifications() {
    try {
        // Schedule pizza reminder
        await schedulePizzaReminder();
        
        // Schedule welcome notification
        const welcomeData = {
            title: "Welcome to PulaTechConf 2025!",
            message: "Welcome to the Second Central and Mediterranean European Conference on New Technologies, Society, and Development. Check the schedule and don't forget to select your pizza preference for Day 2 lunch.",
            timestamp: serverTimestamp(),
            type: 'welcome',
            createdBy: 'system',
            createdAt: serverTimestamp()
        };
        
        const notificationsRef = collection(db, "notifications");
        await addDoc(notificationsRef, welcomeData);
        
        console.log("Initial notifications scheduled successfully");
        return { success: true };
    } catch (error) {
        console.error("Error scheduling initial notifications:", error);
        return { success: false, error: error.message };
    }
}

// Call this when the app loads (for admin users to set up notifications)
document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    
    // Only allow admins to schedule notifications
    if (userRole === 'admin') {
        // Add a button to schedule notifications (for testing/setup)
        const scheduleBtn = document.createElement('button');
        scheduleBtn.textContent = 'Schedule Initial Notifications';
        scheduleBtn.className = 'btn btn-outline-secondary btn-sm';
        scheduleBtn.style.position = 'fixed';
        scheduleBtn.style.bottom = '20px';
        scheduleBtn.style.right = '20px';
        scheduleBtn.style.zIndex = '1000';
        scheduleBtn.addEventListener('click', async () => {
            const result = await scheduleInitialNotifications();
            if (result.success) {
                alert('Notifications scheduled successfully!');
            } else {
                alert('Error scheduling notifications: ' + result.error);
            }
        });
        
        // Only show the button if we're on a dev/test environment
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            document.body.appendChild(scheduleBtn);
        }
    }
});
