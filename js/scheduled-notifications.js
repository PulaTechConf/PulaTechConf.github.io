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
        
        // Create notification for July 16, 2026 at 11:00 AM
        const reminderDate = new Date('2026-07-16T11:00:00');
        
        const notificationData = {
            title: "Lunch Reminder",
            message: "Lunch break is approaching. Please check the conference schedule for the latest details.",
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

// Call this when the app loads (for admin users to set up notifications)
document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
});
