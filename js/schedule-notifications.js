import { db } from './firebase-config.js';
import { 
    collection,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

class ScheduleNotifications {    constructor() {
        // Check if we're in test mode (for demo purposes)
        this.testMode = location.search.includes('test=true') || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        this.scheduleEvents = [
            {
                id: 'day1-opening',
                title: 'Conference Opening',
                time: '09:00',
                date: this.testMode ? this.getTodayDate() : '2025-07-16',
                notifyBefore: [30, 10], // minutes
                message: 'Conference opening ceremony is starting soon! Welcome to PulaTech Conference 2025!'
            },
            {
                id: 'day1-keynote',
                title: 'Keynote: The Future of Croatian Tech',
                time: '09:30',
                date: this.testMode ? this.getTodayDate() : '2025-07-16',
                notifyBefore: [15, 5],
                message: 'Keynote presentation is starting soon!'
            },
            {
                id: 'test-immediate',
                title: 'Test Event (Immediate)',
                time: this.testMode ? this.getTimeInMinutes(2) : '10:30', // 2 minutes from now in test mode
                date: this.testMode ? this.getTodayDate() : '2025-07-16',
                notifyBefore: [1], // 1 minute before
                message: 'This is a test notification that should appear soon!'
            },
            {
                id: 'day1-coffee1',
                title: 'Coffee Break',
                time: '10:30',
                date: this.testMode ? this.getTodayDate() : '2025-07-16',
                notifyBefore: [5],
                message: 'Coffee break is starting now!'
            },            {
                id: 'day1-panel1',
                title: 'Panel: AI and Machine Learning in Croatia',
                time: '11:00',
                date: this.testMode ? this.getTodayDate() : '2025-07-16',
                notifyBefore: [10, 2],
                message: 'AI and Machine Learning panel is starting soon!'
            },
            {
                id: 'day1-lunch',
                title: 'Lunch Break',
                time: '12:30',
                date: this.testMode ? this.getTodayDate() : '2025-07-16',
                notifyBefore: [10],
                message: 'Lunch break is starting now!'
            },
            {
                id: 'day1-workshop1',
                title: 'Workshop: Modern Web Development',
                time: '14:00',
                date: this.testMode ? this.getTodayDate() : '2025-07-16',
                notifyBefore: [15, 5],
                message: 'Modern Web Development workshop is starting soon!'
            },
            {
                id: 'day1-coffee2',
                title: 'Afternoon Coffee',
                time: '15:30',
                date: this.testMode ? this.getTodayDate() : '2025-07-16',
                notifyBefore: [5],
                message: 'Afternoon coffee break is starting now!'
            },
            {
                id: 'day1-networking',
                title: 'Networking Session',
                time: '16:00',
                date: this.testMode ? this.getTodayDate() : '2025-07-16',
                notifyBefore: [10],
                message: 'Networking session is starting now!'
            },
            // Day 2
            {
                id: 'day2-opening',
                title: 'Day 2 Opening',
                time: '09:00',
                date: this.testMode ? this.getTomorrowDate() : '2025-07-17',
                notifyBefore: [30, 10],
                message: 'Day 2 is starting! Welcome back to PulaTech Conference!'
            },
            {
                id: 'day2-startup',
                title: 'Startup Pitch Session',
                time: '09:30',
                date: this.testMode ? this.getTomorrowDate() : '2025-07-17',
                notifyBefore: [15, 5],
                message: 'Startup pitch session is starting soon!'
            },
            {
                id: 'day2-coffee1',
                title: 'Morning Coffee',
                time: '10:30',
                date: this.testMode ? this.getTomorrowDate() : '2025-07-17',
                notifyBefore: [5],
                message: 'Morning coffee break is starting now!'
            },
            {
                id: 'day2-panel2',
                title: 'Panel: Cybersecurity in the Digital Age',
                time: '11:00',
                date: this.testMode ? this.getTomorrowDate() : '2025-07-17',
                notifyBefore: [10, 2],
                message: 'Cybersecurity panel is starting soon!'
            },
            {
                id: 'day2-lunch-pizza',
                title: 'Lunch Break (Pizza Selection)',
                time: '12:30',
                date: this.testMode ? this.getTomorrowDate() : '2025-07-17',
                notifyBefore: [15, 5],
                message: 'Lunch break is starting soon! Don\'t forget to select your pizza if you haven\'t already!'
            },
            {
                id: 'day2-workshop2',
                title: 'Workshop: Cloud Computing Strategies',
                time: '14:00',
                date: this.testMode ? this.getTomorrowDate() : '2025-07-17',
                notifyBefore: [15, 5],
                message: 'Cloud Computing workshop is starting soon!'
            },
            {
                id: 'day2-coffee2',
                title: 'Afternoon Coffee',
                time: '15:30',
                date: this.testMode ? this.getTomorrowDate() : '2025-07-17',
                notifyBefore: [5],
                message: 'Afternoon coffee break is starting now!'
            },
            {
                id: 'day2-closing',
                title: 'Closing Ceremony',
                time: '16:00',
                date: this.testMode ? this.getTomorrowDate() : '2025-07-17',
                notifyBefore: [15, 5],
                message: 'Closing ceremony is starting soon. Thank you for joining PulaTech Conference 2025!'
            }
        ];
        
        console.log('Schedule notifications initialized with test mode:', this.testMode);
        this.init();
    }

    getTodayDate() {
        const today = new Date();
        return today.getFullYear() + '-' + 
               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
               String(today.getDate()).padStart(2, '0');
    }

    getTomorrowDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.getFullYear() + '-' + 
               String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
               String(tomorrow.getDate()).padStart(2, '0');
    }

    getTimeInMinutes(minutesFromNow) {
        const future = new Date();
        future.setMinutes(future.getMinutes() + minutesFromNow);
        return String(future.getHours()).padStart(2, '0') + ':' + 
               String(future.getMinutes()).padStart(2, '0');
    }

    init() {
        this.setupNotificationScheduling();
        this.requestNotificationPermission();
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
            
            if (permission === 'granted') {
                this.registerServiceWorker();
            }
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                this.swRegistration = registration;
                
                // Request push notification permission
                if ('PushManager' in window) {
                    this.setupPushNotifications(registration);
                }
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    async setupPushNotifications(registration) {
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    // You'll need to replace this with your actual VAPID public key
                    'BEl62iUYgUivxIkv69yViEuiBIa40HI8oYK_RFIY9C0Q-dNAZEiO9P4I5Xt-EgV0F_H0gZ8z7mf5U9y8JhQ8b4g'
                )
            });
            
            console.log('Push subscription:', subscription);
            
            // Save subscription to Firebase for later use
            const userId = localStorage.getItem('userId');
            if (userId) {
                await setDoc(doc(db, "pushSubscriptions", userId), {
                    subscription: subscription.toJSON(),
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Push subscription failed:', error);
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    setupNotificationScheduling() {
        // Check for upcoming events every minute
        setInterval(() => {
            this.checkUpcomingEvents();
        }, 60000); // 1 minute

        // Also check immediately
        this.checkUpcomingEvents();
    }    async checkUpcomingEvents() {
        const now = new Date();
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        console.log('Checking upcoming events at:', now.toLocaleString());

        for (const event of this.scheduleEvents) {
            for (const minutesBefore of event.notifyBefore) {
                // Create event date in local timezone 
                const eventDateTime = new Date(`${event.date}T${event.time}:00`);
                const notificationTime = new Date(eventDateTime.getTime() - (minutesBefore * 60000));

                // Check if we should send notification now (within 2 minute window for reliability)
                const timeDiff = Math.abs(now.getTime() - notificationTime.getTime());
                
                console.log(`Event: ${event.title}, ${minutesBefore}min before, Time diff: ${Math.round(timeDiff/1000)}s`);
                
                if (timeDiff < 120000) { // Within 2 minutes
                    const notificationId = `${event.id}-${minutesBefore}min`;
                    
                    // Check if we already sent this notification
                    const sent = await this.hasNotificationBeenSent(notificationId);
                    if (!sent) {
                        console.log(`Sending notification for ${event.title} (${minutesBefore} min before)`);
                        await this.sendScheduleNotification(event, minutesBefore, notificationId);
                    } else {
                        console.log(`Notification already sent: ${notificationId}`);
                    }
                }
            }
        }
    }

    async hasNotificationBeenSent(notificationId) {
        try {
            const userId = localStorage.getItem('userId');
            const docRef = doc(db, "sentNotifications", `${userId}_${notificationId}`);
            const docSnap = await getDoc(docRef);
            return docSnap.exists();
        } catch (error) {
            console.error('Error checking sent notifications:', error);
            return false;
        }
    }

    async sendScheduleNotification(event, minutesBefore, notificationId) {
        try {
            const userId = localStorage.getItem('userId');
            
            // Mark as sent
            await setDoc(doc(db, "sentNotifications", `${userId}_${notificationId}`), {
                eventId: event.id,
                minutesBefore: minutesBefore,
                sentAt: serverTimestamp(),
                userId: userId
            });

            // Create notification message
            let message = event.message;
            if (minutesBefore > 0) {
                message = `${event.title} starts in ${minutesBefore} minute${minutesBefore > 1 ? 's' : ''}!`;
            }

            // Add to Firebase notifications collection
            await setDoc(doc(db, "notifications", notificationId), {
                title: event.title,
                message: message,
                timestamp: serverTimestamp(),
                type: 'schedule',
                eventId: event.id
            });

            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
                this.showBrowserNotification(event.title, message);
            }

            console.log(`Schedule notification sent for ${event.title} (${minutesBefore} min before)`);
            
        } catch (error) {
            console.error('Error sending schedule notification:', error);
        }
    }

    showBrowserNotification(title, message) {
        if ('serviceWorker' in navigator && this.swRegistration) {
            // Use service worker to show notification (works even when app is closed)
            this.swRegistration.showNotification(title, {
                body: message,
                icon: '/icons/ikona(svitla).png',
                badge: '/favicon.ico',
                tag: 'schedule-notification',
                requireInteraction: false,
                actions: [
                    {
                        action: 'open',
                        title: 'Open App'
                    }
                ]
            });
        } else {
            // Fallback to regular notification
            new Notification(title, {
                body: message,
                icon: '/icons/ikona(svitla).png'
            });
        }
    }
}

// Initialize schedule notifications when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Schedule notifications initializing...');
    window.scheduleNotifications = new ScheduleNotifications();
});
