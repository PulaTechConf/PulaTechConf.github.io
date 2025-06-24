import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in - this should happen first
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.log("No user ID found, redirecting to login page");
        window.location.href = getLoginPagePath();
        return; // Stop execution if not logged in
    }

    const logoutBtn = document.getElementById('logoutBtn');
    const adminElements = document.querySelectorAll('.admin-only');
    const organizerElements = document.querySelectorAll('.organizer-only');
    
    // Show/hide elements based on role
    const userRole = localStorage.getItem('userRole') || 'general';
    if (userRole === 'admin') {
        adminElements.forEach(el => el.classList.remove('d-none'));
        organizerElements.forEach(el => el.classList.remove('d-none'));
    } else if (userRole === 'organizer') {
        organizerElements.forEach(el => el.classList.remove('d-none'));
    }
    
    // Improved logout functionality
    if (logoutBtn) {
        console.log("Logout button found, adding event listener");
        logoutBtn.addEventListener('click', handleLogout);
    } else {
        console.warn("Logout button not found in the page");
    }
    
    // Schedule notification reminders
    setupScheduleReminders();
});

// Separate function for logout to make it easier to debug
function handleLogout(e) {
    e.preventDefault();
    console.log("Logout button clicked");
    
    // Clear user data from localStorage
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    console.log("User data cleared from localStorage");
    
    // Redirect to login page with a small delay to ensure localStorage is cleared
    setTimeout(() => {
        const loginPath = getLoginPagePath();
        console.log("Redirecting to:", loginPath);
        window.location.href = loginPath;
    }, 100);
}

// Helper function to determine the correct path to the login page
function getLoginPagePath() {
    // If we're in an app subfolder, we need to go up one level
    if (window.location.pathname.includes('/app/')) {
        return '../index.html';
    }
    // If we're in the admin subfolder, we need to go up two levels
    if (window.location.pathname.includes('/admin/')) {
        return '../../index.html';
    }
    // Otherwise we're at the root
    return 'index.html';
}

// Function to setup schedule reminders
function setupScheduleReminders() {
    const scheduleItems = document.querySelectorAll('.schedule-item');
    
    scheduleItems.forEach(item => {
        const timeElement = item.querySelector('.fw-bold');
        if (timeElement) {
            const timeText = timeElement.textContent;
            const eventTitle = item.querySelector('p')?.textContent || 'Event';
            
            // Extract date and time
            const datePart = item.closest('.accordion-item').querySelector('.accordion-button').textContent.trim();
            const timePart = timeText.split('–')[0].trim();
            
            // Create event time
            const eventDate = parseScheduleDate(datePart, timePart);
            
            if (eventDate) {
                // Check if the event is in the future and less than 15 minutes away
                const reminderTime = new Date(eventDate.getTime() - 15 * 60000); // 15 minutes before
                const now = new Date();
                
                if (reminderTime > now) {
                    // Set timeout for the reminder
                    const timeUntilReminder = reminderTime.getTime() - now.getTime();
                    setTimeout(() => {
                        showEventReminder(eventTitle);
                    }, timeUntilReminder);
                }
            }
        }
    });
}

// Parse date from schedule text
function parseScheduleDate(dateText, timeText) {
    try {
        const year = 2025;
        const monthMap = { 'July': 6 }; // 0-based month index
        
        // Extract day from text like "Day 1 – Wednesday, July 16"
        const dayMatch = dateText.match(/July (\d+)/);
        if (!dayMatch) return null;
        
        const day = parseInt(dayMatch[1]);
        const month = monthMap['July'];
        
        // Parse time like "10:00"
        const [hours, minutes] = timeText.split(':').map(num => parseInt(num));
        
        return new Date(year, month, day, hours, minutes);
    } catch (error) {
        console.error("Error parsing date:", error);
        return null;
    }
}

// Show notification for upcoming events
function showEventReminder(eventTitle) {
    const notificationElement = document.createElement('div');
    notificationElement.classList.add('toast', 'notification', 'show');
    notificationElement.setAttribute('role', 'alert');
    notificationElement.setAttribute('aria-live', 'assertive');
    notificationElement.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">Event Reminder</strong>
            <small>Just now</small>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${eventTitle} starts in 15 minutes!
        </div>
    `;
    
    document.body.appendChild(notificationElement);
    
    // Remove after 10 seconds
    setTimeout(() => {
        notificationElement.remove();
    }, 10000);
}
