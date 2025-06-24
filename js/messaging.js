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
    setDoc
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
    
    // SUPER SIMPLE MESSAGE SENDING - MOST RELIABLE APPROACH
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
        
        // Use only the simplest data structure
        const messageData = {
            text: message,
            senderId: userId || 'anonymous',
            senderName: userName || 'Anonymous User',
            channel: currentChat,
            timestamp: new Date().toISOString() // Use string timestamp for reliability
        };
        
        console.log("MESSAGE DATA:", messageData);
        
        // Save directly to a simple collection
        addDoc(collection(db, "messages"), messageData)
            .then(docRef => {
                console.log("Message saved with ID:", docRef.id);
                messageInput.value = '';
                sendingMsg.remove();
                
                // Show immediate confirmation
                const confirmMsg = document.createElement('div');
                confirmMsg.className = 'text-center text-success mb-2';
                confirmMsg.innerHTML = '<small>Message sent ✓</small>';
                chatMessages.appendChild(confirmMsg);
                setTimeout(() => confirmMsg.remove(), 2000);
                
                // Try loading messages again
                loadMessages(currentChat);
            })
            .catch(error => {
                console.error("ERROR SAVING MESSAGE:", error);
                sendingMsg.innerHTML = `<div class="alert alert-danger">Error sending: ${error.message}</div>`;
                
                // Add more detailed logging
                console.log("Failed message:", messageData);
                console.log("Current channel:", currentChat);
                console.log("DB reference:", db);
            });
    });
    
    // Initialize by loading messages
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
    
    // SIMPLIFIED MESSAGE LOADING
    function loadMessages(chatId) {
        console.log("Loading messages for channel:", chatId);
        
        // Show loading indicator
        chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
        
        // Clear previous listener
        if (messageListener) {
            messageListener();
            messageListener = null;
        }
        
        // Get all messages from the flat collection
        const messagesRef = collection(db, "messages");
        
        // Create a simple query that doesn't need indexes
        const q = query(
            messagesRef,
            orderBy("timestamp"),
            limit(100)
        );
        
        console.log("Setting up message listener");
        
        // Set up real-time listener with error handling
        try {
            messageListener = onSnapshot(q, (snapshot) => {
                console.log(`Received ${snapshot.size} total messages`);
                
                // Filter messages on the client side
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
                
                // Sort by timestamp
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
    
    // Function to add a message to the UI
    function addMessageToUI(message) {
        if (!message) return;
        
        const isOwnMessage = message.senderId === userId;
        
        // Format timestamp - just use the string directly
        const timeStr = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Just now";
        
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
                <small class="text-muted">${message.id ? `Message ID: ${message.id.substring(0, 6)}...` : ''}</small>
            </div>
        `;
        
        // Add to chat container
        chatMessages.appendChild(messageElement);
    }
    
    // Clean up listener when page is closed
    window.addEventListener('beforeunload', function() {
        if (messageListener) {
            messageListener();
        }
    });
});