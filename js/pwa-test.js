// Test functions for PWA features
window.testPWAFeatures = {
    // Test push notification
    async testPushNotification() {
        if (!('Notification' in window)) {
            alert('This browser does not support notifications');
            return;
        }

        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            new Notification('Test Notification', {
                body: 'This is a test notification from PulaTech Conference app!',
                icon: '../icons/icon.svg',
                tag: 'test-notification'
            });
            console.log('Test notification sent');
        } else {
            alert('Notification permission denied');
        }
    },

    // Test service worker
    testServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                    console.log('Service Worker is registered:', registration);
                    alert('Service Worker is working!');
                } else {
                    console.log('Service Worker not registered');
                    alert('Service Worker not found');
                }
            });
        } else {
            alert('Service Worker not supported');
        }
    },

    // Test offline storage
    async testOfflineStorage() {
        if (window.offlineStorage) {
            try {
                await window.offlineStorage.saveNotification({
                    id: 'test-' + Date.now(),
                    title: 'Test Offline Notification',
                    message: 'This notification was saved offline',
                    timestamp: new Date()
                });
                
                const notifications = await window.offlineStorage.getNotifications();
                console.log('Offline notifications:', notifications);
                alert(`Offline storage working! Found ${notifications.length} notifications.`);
            } catch (error) {
                console.error('Offline storage test failed:', error);
                alert('Offline storage test failed');
            }
        } else {
            alert('Offline storage not initialized');
        }
    },

    // Test schedule notifications
    testScheduleNotifications() {
        if (window.scheduleNotifications) {
            // Force check for upcoming events
            window.scheduleNotifications.checkUpcomingEvents();
            alert('Schedule notifications check triggered');
        } else {
            alert('Schedule notifications not initialized');
        }
    },

    // Show all test buttons
    showTestPanel() {
        const panel = document.createElement('div');
        panel.id = 'pwa-test-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
            background: white;
            border: 2px solid #2c3e50;
            border-radius: 8px;
            padding: 15px;
            z-index: 1070;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            min-width: 200px;
        `;
        
        panel.innerHTML = `
            <h6>PWA Test Panel</h6>
            <button class="btn btn-sm btn-primary mb-2 w-100" onclick="testPWAFeatures.testPushNotification()">Test Notification</button>
            <button class="btn btn-sm btn-secondary mb-2 w-100" onclick="testPWAFeatures.testServiceWorker()">Test Service Worker</button>
            <button class="btn btn-sm btn-info mb-2 w-100" onclick="testPWAFeatures.testOfflineStorage()">Test Offline Storage</button>
            <button class="btn btn-sm btn-warning mb-2 w-100" onclick="testPWAFeatures.testScheduleNotifications()">Test Schedule Notifications</button>
            <button class="btn btn-sm btn-danger w-100" onclick="document.getElementById('pwa-test-panel').remove()">Close Panel</button>
        `;
        
        document.body.appendChild(panel);
    }
};

// Add test button to page (only in development)
document.addEventListener('DOMContentLoaded', () => {
    // Only show test features if on localhost or specific test environment
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.search.includes('test=true')) {
        const testButton = document.createElement('button');
        testButton.textContent = 'PWA Tests';
        testButton.className = 'btn btn-sm btn-outline-secondary position-fixed';
        testButton.style.cssText = `
            top: 10px;
            right: 10px;
            z-index: 1060;
        `;
        testButton.onclick = () => window.testPWAFeatures.showTestPanel();
        
        document.body.appendChild(testButton);
    }
});
