import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    onSnapshot,
    serverTimestamp,
    getDocs,
    doc,
    setDoc,
    where
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Messaging.js loaded");
    
    // VERIFY FIREBASE CONNECTION
    if (!db) {
        console.error("Firebase db object is not available!");
        document.body.innerHTML = '<div class="alert alert-danger m-5">Error: Could not connect to Firebase. Please check your connection and reload.</div>';
        return;
    }
    
    console.log("Firebase db object available:", !!db);
    
    // Get user data from localStorage
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName') || 'Anonymous User';
    const userRole = localStorage.getItem('userRole') || 'general';
    
    console.log("Current user:", userName, "with ID:", userId, "Role:", userRole);
    
    // DOM Elements
    const chatMessages = document.getElementById('chatMessages');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const refreshChannelsBtn = document.getElementById('refreshChannelsBtn');
    
    if (!chatMessages || !messageForm || !messageInput) {
        console.error("Required DOM elements not found");
        return;
    }
    
    // Current active chat channel
    let currentChat = 'general';
    let messageListener = null;
    
    // Show/hide chat channels based on user role
    setupAccessRights();
    
    // Add event listener to the refresh button
    refreshChannelsBtn?.addEventListener('click', function() {
        loadMessages(currentChat);
    });
    
    // Add event listeners to chat channel links
    document.querySelectorAll('[data-chat]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Skip if channel is hidden (not authorized)
            if (this.classList.contains('d-none')) return;
            
            const chatId = this.getAttribute('data-chat');
            
            // Set this channel as active
            document.querySelectorAll('[data-chat]').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            
            // Update header
            const chatName = this.querySelector('h6')?.textContent || 'General';
            const chatDesc = this.querySelector('small')?.textContent || 'Chat';
            document.getElementById('chatTitle').textContent = chatName;
            document.getElementById('chatDescription').textContent = chatDesc;
            
            // Switch to this chat
            currentChat = chatId;
            loadMessages(chatId);
        });
    });
    
    // FIX: Direct write to messages collection without nested structure
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        console.log("SENDING MESSAGE:", message, "TO CHANNEL:", currentChat);
        
        // Show sending status
        const sendingMsg = document.createElement('div');
        sendingMsg.className = 'text-center text-muted mb-2';
        sendingMsg.innerHTML = '<small>Sending message...</small>';
        chatMessages.appendChild(sendingMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Create message data with all required fields
        const messageData = {
            text: message,
            senderId: userId || 'anonymous',
            senderName: userName || 'Anonymous User',
            channel: currentChat,
            timestamp: new Date().toISOString(), // Use string timestamp for better debugging
            created: serverTimestamp() // Also include server timestamp
        };
        
        // DIRECT PATH: Simple collection with explicit channel field
        const messagesCollection = collection(db, "all_messages"); 
        
        // Save message to Firestore
        addDoc(messagesCollection, messageData)
            .then(docRef => {
                console.log("SUCCESS: Message saved with ID:", docRef.id);
                
                // Remove sending indicator and clear input
                sendingMsg.remove();
                messageInput.value = '';
                
                // Check database immediately for diagnostic purposes
                checkMessages(currentChat);
            })
            .catch(error => {
                console.error("FIREBASE ERROR:", error);
                sendingMsg.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
                
                // Log environment info for debugging
                console.log("DEBUG INFO:", {
                    environment: window.location.hostname,
                    dbExists: !!db,
                    userId,
                    currentChat
                });
            });
    });
    
    // Initialize
    loadMessages('general');
    
    // Function to set up user access rights
    function setupAccessRights() {
        if (userRole === 'admin') {
            document.querySelectorAll('.admin-only, .organizer-only').forEach(el => {
                el.classList.remove('d-none');
            });
        } else if (userRole === 'organizer') {
            document.querySelectorAll('.organizer-only').forEach(el => {
                el.classList.remove('d-none');
            });
        }
        
        console.log(`Chat channels set up for ${userRole} role`);
    }
    
    // SIMPLE QUERY: Get messages from flat collection
    function loadMessages(chatId) {
        console.log("Loading messages for channel:", chatId);
        
        // Show loading indicator
        chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
        
        // Clear previous listener
        if (messageListener) {
            messageListener();
            messageListener = null;
        }
        
        try {
            // Query the flat messages collection without complicated filters
            const messagesRef = collection(db, "all_messages");
            const q = query(messagesRef, orderBy("timestamp"), limit(100));
            
            console.log("Setting up message listener");
            
            messageListener = onSnapshot(q, (snapshot) => {
                console.log(`Received ${snapshot.size} total messages`);
                
                // Filter by channel on client side
                const channelMessages = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.channel === chatId) {
                        channelMessages.push({
                            id: doc.id,
                            ...data
                        });
                    }
                });
                
                console.log(`Filtered ${channelMessages.length} messages for channel ${chatId}`);
                
                // Display messages
                chatMessages.innerHTML = '';
                
                if (channelMessages.length === 0) {
                    chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Be the first to say something!</div>';
                    return;
                }
                
                // Sort messages by timestamp
                channelMessages.sort((a, b) => {
                    const timeA = new Date(a.timestamp);
                    const timeB = new Date(b.timestamp);
                    return timeA - timeB;
                });
                
                // Add messages to UI
                channelMessages.forEach(message => {
                    addMessageToUI(message);
                });
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
            }, error => {
                console.error("Error in message listener:", error);
                chatMessages.innerHTML = `<div class="alert alert-danger">Error loading messages: ${error.message}</div>`;
            });
        } catch (error) {
            console.error("Failed to set up listener:", error);
            chatMessages.innerHTML = `<div class="alert alert-danger">Failed to load messages: ${error.message}</div>`;
        }
    }
    
    function addMessageToUI(message) {
        if (!message) return;
        
        const isOwnMessage = message.senderId === userId;
        
        // Format timestamp 
        let timeStr = "Just now";
        if (message.timestamp) {
            timeStr = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'd-flex mb-3';
        messageElement.innerHTML = `
            <div class="flex-shrink-0">
                <div class="${isOwnMessage ? 'bg-primary text-white' : 'bg-light'} rounded-circle p-2 text-center" style="width: 40px; height: 40px;">
                    <i class="bi bi-person"></i>
                </div>
            </div>
            <div class="flex-grow-1 ms-3">
                <div class="d-flex justify-content-between">
                    <h6 class="mb-0">${isOwnMessage ? 'You' : message.senderName || 'Anonymous'}</h6>
                    <small class="text-muted">${timeStr}</small>
                </div>
                <p class="mb-1">${message.text || ''}</p>
                <small class="text-muted">ID: ${message.id?.substring(0,6) || ''}...</small>
            </div>
        `;
        
        // Add to chat container
        chatMessages.appendChild(messageElement);
    }
    
    // Debug function to directly check database
    function checkMessages(chatId) {
        const messagesRef = collection(db, "all_messages");
        const q = query(messagesRef, where("channel", "==", chatId), limit(5));
        
        getDocs(q).then((snapshot) => {
            console.log(`DIRECT CHECK: Found ${snapshot.size} messages for ${chatId}`);
            snapshot.forEach(doc => {
                console.log("- Message:", doc.id, doc.data());
            });
        }).catch(err => {
            console.error("DIRECT CHECK ERROR:", err);
        });
    }
    
    // Clean up listener when page is closed
    window.addEventListener('beforeunload', function() {
        if (messageListener) {
            messageListener();
        }
    });
});