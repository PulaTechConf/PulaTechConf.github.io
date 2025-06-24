import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc,
    getDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Input validation function
function validateInput(data) {
    const errors = [];
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Valid email is required');
    }
    
    if (!data.password || data.password.length < 6) {
        errors.push('Password must be at least 6 characters');
    }
    
    if (data.firstName && data.firstName.trim().length < 2) {
        errors.push('First name must be at least 2 characters');
    }
    
    if (data.lastName && data.lastName.trim().length < 2) {
        errors.push('Last name must be at least 2 characters');
    }
    
    return errors;
}

// Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');

// Add debug logging
console.log("Auth.js loaded");

// Check if user is already logged in
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, checking login state");
    const userId = localStorage.getItem('userId');
    if (userId) {
        // Redirect to home page if already logged in
        window.location.href = 'app/home.html';
    }
});

// Login functionality
if (loginForm) {
    console.log("Login form found, adding event listener");
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        console.log("Login attempt with email:", email);
        
        // Validate input
        const validationErrors = validateInput({ email, password });
        if (validationErrors.length > 0) {
            showMessage(validationErrors.join('. '), 'danger');
            return;
        }
        
        try {
            // Find user by email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            console.log("Querying for user with email:", email);
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.log("No user found with email:", email);
                showMessage('No user found with this email', 'danger');
                return;
            }
            
            // Get the first matching user
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            console.log("User found:", userDoc.id);
            
            // Check password (Note: This is not secure, just for demonstration)
            if (userData.password !== password) {
                console.log("Password incorrect");
                showMessage('Incorrect password', 'danger');
                return;
            }
            
            // Store user info in localStorage
            localStorage.setItem('userId', userDoc.id);
            localStorage.setItem('userRole', userData.role || 'general');
            localStorage.setItem('userName', `${userData.firstName} ${userData.lastName}`);
            localStorage.setItem('userEmail', userData.email);
            localStorage.setItem('userCountry', userData.country || '');
            localStorage.setItem('userAffiliation', userData.affiliation || '');
            localStorage.setItem('userFirstName', userData.firstName);
            localStorage.setItem('userLastName', userData.lastName);
            
            console.log("Login successful, redirecting...");
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = 'app/home.html';
            }, 1000);
            
        } catch (error) {
            console.error("Login error:", error);
            showMessage(`Login error: ${error.message}`, 'danger');
        }
    });
}

// Register functionality
if (registerForm) {
    console.log("Register form found, adding event listener");
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const affiliation = document.getElementById('affiliation').value;
        const country = document.getElementById('country').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        console.log("Registration attempt for:", email);
        
        // Validate input
        const validationErrors = validateInput({ firstName, lastName, email, password, country });
        if (validationErrors.length > 0) {
            showMessage(validationErrors.join('. '), 'danger');
            return;
        }
        
        try {
            // Check if email already exists
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            console.log("Checking if email exists:", email);
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                console.log("Email already exists");
                showMessage('A user with this email already exists', 'danger');
                return;
            }
            
            // Create a new document with auto-generated id
            const userRef = doc(collection(db, "users"));
            
            const userData = {
                firstName,
                lastName,
                affiliation,
                country,
                email,
                password, // Note: In a real app, passwords should be hashed
                role: "general", // Default role for new users
                createdAt: new Date().toISOString()
            };
            
            console.log("Saving user data:", userData);
            
            // Store user data in Firestore
            await setDoc(userRef, userData);
            
            console.log("Registration successful!");
            showMessage('Registration successful! You can now log in.', 'success');
            
            // Clear form and switch to login tab
            registerForm.reset();
            document.getElementById('login-tab').click();
            
        } catch (error) {
            console.error("Registration error:", error);
            showMessage(`Registration error: ${error.message}`, 'danger');
        }
    });
}

// Helper function to show messages
function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `alert alert-${type}`;
    authMessage.classList.remove('d-none');
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            authMessage.classList.add('d-none');
        }, 3000);
    }
}
