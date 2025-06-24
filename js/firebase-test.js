import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Function to test Firestore connection
export async function testFirestoreConnection() {
    try {
        console.log("Testing Firestore connection...");
        
        // Try to add a test document
        const testDoc = await addDoc(collection(db, "test"), {
            message: "Test connection",
            timestamp: new Date()
        });
        
        console.log("Test document added with ID:", testDoc.id);
        
        // Try to read from the collection
        const querySnapshot = await getDocs(collection(db, "test"));
        console.log("Read test successful. Documents in test collection:", querySnapshot.size);
        
        return true;
    } catch (error) {
        console.error("Firebase connection test failed:", error);
        return false;
    }
}

// Function to test user lookup (simulates login)
export async function testUserLookup(email) {
    try {
        console.log("Testing user lookup for:", email);
        
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        console.log("User lookup results:", querySnapshot.size);
        return querySnapshot.size > 0;
    } catch (error) {
        console.error("User lookup test failed:", error);
        return false;
    }
}
