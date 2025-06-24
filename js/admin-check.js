document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.log("No user ID found, redirecting to login page");
        window.location.href = '../../index.html';
        return;
    }
    
    // Check if user is admin
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        console.log("User is not an admin, redirecting to home page");
        window.location.href = '../home.html';
        return;
    }
    
    console.log("Admin verification successful");
});
