document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        console.log("Not an admin, massage tracking features disabled");
        return;
    }
    
    console.log("Massage tracking admin module loaded");
    
    // Get refresh button
    const refreshMassageBtn = document.getElementById('refreshMassageBookings');
    
    // Add event listener
    refreshMassageBtn?.addEventListener('click', loadMassageBookings);
    
    // Load data on page load
    loadMassageBookings();
});

// Load massage bookings
async function loadMassageBookings() {
    try {
        const { collection, getDocs, orderBy, query } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js");
        const { db } = await import("../firebase-config.js");
        
        const massageBookingsContainer = document.getElementById('massageBookingsContainer');
        if (!massageBookingsContainer) {
            console.error("massageBookingsContainer element not found");
            return;
        }
        
        // Show loading state
        massageBookingsContainer.innerHTML = '<div class="text-center p-3"><i class="bi bi-hourglass-split"></i> Loading massage bookings...</div>';
        
        // Get massage bookings
        const bookingsQuery = query(collection(db, "massageBookings"), orderBy("timeSlot"));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        if (bookingsSnapshot.empty) {
            massageBookingsContainer.innerHTML = `
                <div class="text-center p-3">
                    <i class="bi bi-calendar-x fs-1 text-muted"></i>
                    <p class="text-muted">No massage bookings yet</p>
                </div>
            `;
            return;
        }
        
        // Process bookings data
        const bookings = [];
        bookingsSnapshot.forEach(doc => {
            const data = doc.data();
            bookings.push({
                id: doc.id,
                ...data
            });
        });
        
        // Group bookings by time slot
        const groupedBookings = {};
        bookings.forEach(booking => {
            if (!groupedBookings[booking.timeSlot]) {
                groupedBookings[booking.timeSlot] = [];
            }
            groupedBookings[booking.timeSlot].push(booking);
        });
        
        // Generate HTML
        let html = `
            <div class="row mb-3">
                <div class="col-12">
                    <h6><i class="bi bi-heart-pulse"></i> Massage Appointments Summary</h6>
                    <p class="small text-muted">Total bookings: ${bookings.length}</p>
                </div>
            </div>
        `;
        
        // Time slots table
        html += `
            <div class="table-responsive">
                <table class="table table-sm table-striped">
                    <thead>
                        <tr>
                            <th>Time Slot</th>
                            <th>Participant</th>
                            <th>User ID</th>
                            <th>Booked At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        Object.keys(groupedBookings).sort().forEach(timeSlot => {
            groupedBookings[timeSlot].forEach(booking => {
                const bookedAt = booking.bookedAt ? new Date(booking.bookedAt.seconds * 1000).toLocaleString() : 'Unknown';
                html += `
                    <tr>
                        <td><strong>${timeSlot}</strong></td>
                        <td>${booking.userName || 'Unknown User'}</td>
                        <td><small class="text-muted">${booking.userId}</small></td>
                        <td><small>${bookedAt}</small></td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteMassageBooking('${booking.id}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `;
            });
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        // Statistics
        html += `
            <div class="row mt-3">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">Booking Statistics</h6>
                            <ul class="list-unstyled small">
                                <li><strong>Total Appointments:</strong> ${bookings.length}</li>
                                <li><strong>Available Slots:</strong> 28 (14 time slots × 2 chairs)</li>
                                <li><strong>Remaining Slots:</strong> ${28 - bookings.length}</li>
                                <li><strong>Utilization:</strong> ${Math.round((bookings.length / 28) * 100)}%</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">Service Details</h6>
                            <ul class="list-unstyled small">
                                <li><strong>Duration:</strong> 10 minutes per session</li>
                                <li><strong>Service:</strong> Targeted physio massage</li>
                                <li><strong>Date:</strong> July 17, 2025</li>
                                <li><strong>Location:</strong> Coworking Pula</li>
                                <li><strong>Chairs:</strong> 2 simultaneous appointments per slot</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        massageBookingsContainer.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading massage bookings:", error);
        const massageBookingsContainer = document.getElementById('massageBookingsContainer');
        if (massageBookingsContainer) {
            massageBookingsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error loading massage bookings: ${error.message}
                </div>
            `;
        }
    }
}

// Function to delete a massage booking
async function deleteMassageBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this massage booking?')) {
        return;
    }
    
    try {
        const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js");
        const { db } = await import("../firebase-config.js");
        
        await deleteDoc(doc(db, "massageBookings", bookingId));
        
        console.log("Massage booking deleted:", bookingId);
        
        // Reload the bookings
        loadMassageBookings();
        
        alert('Massage booking deleted successfully');
    } catch (error) {
        console.error("Error deleting massage booking:", error);
        alert(`Error deleting booking: ${error.message}`);
    }
}

// Make delete function available globally
window.deleteMassageBooking = deleteMassageBooking;

export { loadMassageBookings };
