// Schedule functionality including Google Calendar integration and massage booking
import { doc, setDoc, getDoc, collection, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Schedule functionality loaded');
    
    // Initialize all expandable sections
    initializeExpandableSections();
    
    // Initialize Google Calendar integration
    initializeCalendarIntegration();
    
    // Initialize massage booking
    initializeMassageBooking();
    
    // Initialize schedule tracking
    initializeScheduleTracking();
    
    // Add tab switching handler to auto-scroll to current event
    const scheduleTab = document.getElementById('schedule-tab');
    if (scheduleTab) {
        scheduleTab.addEventListener('click', function() {
            // Small delay to ensure tab content is visible
            setTimeout(() => {
                const currentEvent = document.querySelector('.schedule-current-time');
                if (currentEvent) {
                    currentEvent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        });
    }
});

// Initialize expandable sections
function initializeExpandableSections() {
    // Coffee breaks
    document.querySelectorAll('.coffee-expandable').forEach(coffeeSection => {
        const title = coffeeSection.querySelector('.coffee-title');
        const details = coffeeSection.querySelector('.coffee-details');
        const icon = title.querySelector('i');
        
        title.addEventListener('click', () => {
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
    });
    
    // Massage service
    document.querySelectorAll('.massage-expandable').forEach(massageSection => {
        const title = massageSection.querySelector('.massage-title');
        const details = massageSection.querySelector('.massage-details');
        const icon = title.querySelector('i');
        
        title.addEventListener('click', () => {
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
    });
    
    // Round table discussion
    document.querySelectorAll('.roundtable-expandable').forEach(roundtableSection => {
        const title = roundtableSection.querySelector('.roundtable-title');
        const details = roundtableSection.querySelector('.roundtable-details');
        const icon = title.querySelector('i');
        
        title.addEventListener('click', () => {
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
    });
}

// Google Calendar integration
function initializeCalendarIntegration() {
    const addToCalendarBtn = document.getElementById('addToCalendarBtn');
    if (addToCalendarBtn) {
        addToCalendarBtn.addEventListener('click', addAllEventsToCalendar);
    }
}

function addAllEventsToCalendar() {
    const events = [
        {
            title: 'TFPU 2025 - Registration & Welcome',
            start: '2025-07-16T19:00:00',
            end: '2025-07-16T19:30:00',
            location: 'Campus Restaurant, Petra Preradovića 9a, Pula',
            description: 'Registration and Welcome desk'
        },
        {
            title: 'TFPU 2025 - Cocktail & Ice-breaking Event',
            start: '2025-07-16T20:00:00',
            end: '2025-07-16T21:30:00',
            location: 'Campus Restaurant, Petra Preradovića 9a, Pula',
            description: 'Refreshments and networking'
        },
        {
            title: 'TFPU 2025 - Opening Ceremony',
            start: '2025-07-17T10:00:00',
            end: '2025-07-17T10:35:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'Official welcome'
        },
        {
            title: 'TFPU 2025 - Invited Lecture 1',
            start: '2025-07-17T10:35:00',
            end: '2025-07-17T10:55:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'First invited lecture'
        },
        {
            title: 'TFPU 2025 - Coffee Break',
            start: '2025-07-17T11:00:00',
            end: '2025-07-17T11:10:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'Refreshments'
        },
        {
            title: 'TFPU 2025 - Invited Lecture 2',
            start: '2025-07-17T11:10:00',
            end: '2025-07-17T11:35:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'Second invited lecture'
        },
        {
            title: 'TFPU 2025 - Invited Lecture 3',
            start: '2025-07-17T11:35:00',
            end: '2025-07-17T12:00:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'Third invited lecture'
        },
        {
            title: 'TFPU 2025 - Round Table Discussion',
            start: '2025-07-17T12:00:00',
            end: '2025-07-17T12:40:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'Education and Opportunities in Dual Studies'
        },
        {
            title: 'TFPU 2025 - Lunch Break',
            start: '2025-07-17T12:40:00',
            end: '2025-07-17T13:30:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'Pizza lunch - remember to make your selection!'
        },
        {
            title: 'TFPU 2025 - Upping Zone Lecture',
            start: '2025-07-17T13:30:00',
            end: '2025-07-17T14:20:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'From Failure to Success'
        },
        {
            title: 'TFPU 2025 - Coffee Break',
            start: '2025-07-17T14:20:00',
            end: '2025-07-17T14:30:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'Refreshments'
        },
        {
            title: 'TFPU 2025 - Presentations',
            start: '2025-07-17T14:30:00',
            end: '2025-07-17T15:50:00',
            location: 'Coworking Pula, Marka Marulića 5, Pula',
            description: 'Engineering, Innovations, Industry & Technology / Medicine, Society & Innovations'
        },
        {
            title: 'TFPU 2025 - City Tour & Networking',
            start: '2025-07-17T18:00:00',
            end: '2025-07-17T20:00:00',
            location: 'Pula City Center',
            description: 'Self-organized city tour and networking'
        },
        {
            title: 'TFPU 2025 - Breakfast & Exhibition',
            start: '2025-07-18T10:00:00',
            end: '2025-07-18T12:00:00',
            location: 'Campus Restaurant, Petra Preradovića 9a, Pula',
            description: 'Breakfast with Participants + Opening of the Exhibition: Science, Technology and Art'
        },
        {
            title: 'TFPU 2025 - Transfer to Fratarski Island',
            start: '2025-07-18T13:30:00',
            end: '2025-07-18T14:30:00',
            location: 'Fratarski Island Student Camp',
            description: 'Transfer to island activities'
        },
        {
            title: 'TFPU 2025 - Island Lectures & Workshops',
            start: '2025-07-18T17:00:00',
            end: '2025-07-18T20:00:00',
            location: 'Fratarski Island Student Camp',
            description: 'Lectures and Workshops on the island'
        }
    ];
    
    // Create Google Calendar links for all events
    const calendarLinks = events.map(event => {
        const startTime = event.start.replace(/[-:]/g, '').replace('T', 'T');
        const endTime = event.end.replace(/[-:]/g, '').replace('T', 'T');
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: event.title,
            dates: `${startTime}/${endTime}`,
            location: event.location,
            details: event.description
        });
        
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    });
    
    // Open multiple calendar windows (browsers might block this)
    if (confirm('This will open multiple tabs to add all conference events to your Google Calendar. Continue?')) {
        calendarLinks.forEach((link, index) => {
            setTimeout(() => {
                window.open(link, '_blank');
            }, index * 500); // Stagger the opening to avoid popup blockers
        });
    }
}

// Massage booking functionality
function initializeMassageBooking() {
    populateMassageTimeSlots();
    
    const timeSlotSelect = document.getElementById('massageTimeSlot');
    const bookBtn = document.getElementById('bookMassageBtn');
    
    if (timeSlotSelect) {
        timeSlotSelect.addEventListener('change', function() {
            bookBtn.disabled = !this.value;
        });
    }
    
    if (bookBtn) {
        bookBtn.addEventListener('click', bookMassageAppointment);
    }
    
    // Load existing booking
    loadExistingMassageBooking();
}

function populateMassageTimeSlots() {
    const timeSlotSelect = document.getElementById('massageTimeSlot');
    if (!timeSlotSelect) return;
    
    // Generate time slots from 11:00 to 12:30 every 10 minutes
    const startTime = 11 * 60; // 11:00 in minutes
    const endTime = 12 * 60 + 30; // 12:30 in minutes
    const slotDuration = 10; // 10 minutes per slot
    
    for (let time = startTime; time <= endTime - 5; time += slotDuration) {
        const hours = Math.floor(time / 60);
        const minutes = time % 60;
        const endHours = Math.floor((time + 5) / 60);
        const endMinutes = (time + 5) % 60;
        
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const endTimeString = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = timeString;
        option.textContent = `${timeString} - ${endTimeString}`;
        timeSlotSelect.appendChild(option);
    }
}

async function bookMassageAppointment() {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const timeSlot = document.getElementById('massageTimeSlot').value;
    
    if (!userId || !timeSlot) {
        showMassageStatus('Please select a time slot', 'danger');
        return;
    }
    
    try {
        // Check if slot is already booked
        const bookingRef = doc(db, "massageBookings", `${timeSlot}-${userId}`);
        const existingBooking = await getDoc(bookingRef);
        
        if (existingBooking.exists()) {
            showMassageStatus('You already have a booking for this time slot', 'warning');
            return;
        }
        
        // Check if slot is taken by someone else
        const slotQuery = query(collection(db, "massageBookings"), where("timeSlot", "==", timeSlot));
        const slotBookings = await getDocs(slotQuery);
        
        if (!slotBookings.empty) {
            showMassageStatus('This time slot is already booked by someone else', 'warning');
            return;
        }
        
        // Create booking
        await setDoc(bookingRef, {
            userId: userId,
            userName: userName,
            timeSlot: timeSlot,
            date: '2025-07-17',
            service: 'physio_massage',
            bookedAt: serverTimestamp()
        });
        
        showMassageStatus(`Appointment booked for ${timeSlot}!`, 'success');
        document.getElementById('bookMassageBtn').disabled = true;
        document.getElementById('massageTimeSlot').disabled = true;
        
    } catch (error) {
        console.error('Error booking massage appointment:', error);
        showMassageStatus('Error booking appointment. Please try again.', 'danger');
    }
}

async function loadExistingMassageBooking() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    try {
        const userBookingsQuery = query(
            collection(db, "massageBookings"), 
            where("userId", "==", userId)
        );
        const userBookings = await getDocs(userBookingsQuery);
        
        if (!userBookings.empty) {
            const booking = userBookings.docs[0].data();
            document.getElementById('massageTimeSlot').value = booking.timeSlot;
            document.getElementById('massageTimeSlot').disabled = true;
            document.getElementById('bookMassageBtn').disabled = true;
            document.getElementById('bookMassageBtn').textContent = 'Booked';
            document.getElementById('bookMassageBtn').classList.remove('btn-success');
            document.getElementById('bookMassageBtn').classList.add('btn-secondary');
            
            showMassageStatus(`You have an appointment at ${booking.timeSlot}`, 'info');
        }
    } catch (error) {
        console.error('Error loading existing booking:', error);
    }
}

function showMassageStatus(message, type) {
    const statusDiv = document.getElementById('massageBookingStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
    }
}

// Real-time schedule tracking
function initializeScheduleTracking() {
    updateScheduleProgress();
    
    // Update every minute
    setInterval(updateScheduleProgress, 60000);
    
    // Scroll to current event on page load
    setTimeout(() => {
        const currentEvent = document.querySelector('.schedule-current-time');
        if (currentEvent) {
            currentEvent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 1000);
}

function updateScheduleProgress() {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
    
    // Define conference events with their times
    const conferenceEvents = [
        // Day 1 - July 16, 2025
        { date: '2025-07-16', startTime: 19 * 60, endTime: 19 * 60 + 30, id: 'day1-registration' },
        { date: '2025-07-16', startTime: 20 * 60, endTime: 21 * 60 + 30, id: 'day1-cocktail' },
        
        // Day 2 - July 17, 2025
        { date: '2025-07-17', startTime: 10 * 60, endTime: 10 * 60 + 35, id: 'day2-opening' },
        { date: '2025-07-17', startTime: 10 * 60 + 35, endTime: 10 * 60 + 55, id: 'day2-lecture1' },
        { date: '2025-07-17', startTime: 11 * 60, endTime: 11 * 60 + 10, id: 'day2-coffee1' },
        { date: '2025-07-17', startTime: 11 * 60 + 10, endTime: 11 * 60 + 35, id: 'day2-lecture2' },
        { date: '2025-07-17', startTime: 11 * 60 + 35, endTime: 12 * 60, id: 'day2-lecture3' },
        { date: '2025-07-17', startTime: 12 * 60, endTime: 12 * 60 + 40, id: 'day2-roundtable' },
        { date: '2025-07-17', startTime: 12 * 60 + 40, endTime: 13 * 60 + 30, id: 'day2-lunch' },
        { date: '2025-07-17', startTime: 13 * 60 + 30, endTime: 14 * 60 + 20, id: 'day2-upping' },
        { date: '2025-07-17', startTime: 14 * 60 + 20, endTime: 14 * 60 + 30, id: 'day2-coffee2' },
        { date: '2025-07-17', startTime: 14 * 60 + 30, endTime: 15 * 60 + 50, id: 'day2-presentations' },
        { date: '2025-07-17', startTime: 18 * 60, endTime: 20 * 60, id: 'day2-citytour' },
        
        // Day 3 - July 18, 2025
        { date: '2025-07-18', startTime: 10 * 60, endTime: 12 * 60, id: 'day3-breakfast' },
        { date: '2025-07-18', startTime: 13 * 60 + 30, endTime: 14 * 60 + 30, id: 'day3-transfer' },
        { date: '2025-07-18', startTime: 17 * 60, endTime: 20 * 60, id: 'day3-lectures' }
    ];
    
    // Clear all existing classes
    document.querySelectorAll('.schedule-item').forEach(item => {
        item.classList.remove('schedule-current-time', 'schedule-past-event', 'schedule-next-event');
    });
    
    // Find events for current date
    const todayEvents = conferenceEvents.filter(event => event.date === currentDate);
    
    if (todayEvents.length === 0) {
        return; // No events today
    }
    
    let currentEventIndex = -1;
    let nextEventIndex = -1;
    
    // Find current and next events
    for (let i = 0; i < todayEvents.length; i++) {
        const event = todayEvents[i];
        
        if (currentTime >= event.startTime && currentTime < event.endTime) {
            currentEventIndex = i;
            break;
        } else if (currentTime < event.startTime) {
            nextEventIndex = i;
            break;
        }
    }
    
    // Mark past events
    for (let i = 0; i < currentEventIndex; i++) {
        const scheduleItem = getScheduleItemByTime(todayEvents[i]);
        if (scheduleItem) {
            scheduleItem.classList.add('schedule-past-event');
        }
    }
    
    // Mark current event
    if (currentEventIndex >= 0) {
        const currentScheduleItem = getScheduleItemByTime(todayEvents[currentEventIndex]);
        if (currentScheduleItem) {
            currentScheduleItem.classList.add('schedule-current-time');
        }
    }
    
    // Mark next event
    if (nextEventIndex >= 0) {
        const nextScheduleItem = getScheduleItemByTime(todayEvents[nextEventIndex]);
        if (nextScheduleItem) {
            nextScheduleItem.classList.add('schedule-next-event');
        }
    } else if (currentEventIndex < 0 && todayEvents.length > 0) {
        // If no current event but there are events today, mark the first one as next
        const firstScheduleItem = getScheduleItemByTime(todayEvents[0]);
        if (firstScheduleItem) {
            firstScheduleItem.classList.add('schedule-next-event');
        }
    }
}

function getScheduleItemByTime(event) {
    const startHour = Math.floor(event.startTime / 60);
    const startMinute = event.startTime % 60;
    const endHour = Math.floor(event.endTime / 60);
    const endMinute = event.endTime % 60;
    
    const timeString = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} – ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    // Find the schedule item with this time
    const scheduleItems = document.querySelectorAll('.schedule-item');
    for (const item of scheduleItems) {
        const timeElement = item.querySelector('.fw-bold');
        if (timeElement && timeElement.textContent.includes(timeString)) {
            return item;
        }
    }
    
    return null;
}

export { initializeExpandableSections, initializeCalendarIntegration, initializeMassageBooking, initializeScheduleTracking };
