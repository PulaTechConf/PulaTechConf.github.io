import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc,
    getDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');

// Check if user is already logged in
document.addEventListener("DOMContentLoaded", () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
        // Redirect to home page if already logged in
        window.location.href = 'app/home.html';
    }
});

// Login functionality
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            // Find user by email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                showMessage('No user found with this email', 'danger');
                return;
            }
            
            // Get the first matching user
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            // Check password (Note: This is not secure, just for demonstration)
            if (userData.password !== password) {
                showMessage('Incorrect password', 'danger');
                return;
            }
            
            // Store user info in localStorage
            localStorage.setItem('userId', userDoc.id);
            localStorage.setItem('userRole', userData.role || 'general');
            localStorage.setItem('userName', `${userData.firstName} ${userData.lastName}`);
            
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
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const affiliation = document.getElementById('affiliation').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            // Check if email already exists
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                showMessage('A user with this email already exists', 'danger');
                return;
            }
            
            // Create a new document with auto-generated id
            const userRef = doc(collection(db, "users"));
            
            // Store user data in Firestore
            await setDoc(userRef, {
                firstName,
                lastName,
                affiliation,
                email,
                password, // Note: In a real app, passwords should be hashed
                role: "general", // Default role for new users
                createdAt: new Date().toISOString()
            });
            
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
