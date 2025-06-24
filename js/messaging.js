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
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Messaging.js loaded");
    
    // Get user data from localStorage
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole') || 'general';
    
    // Debug log
    console.log("Current user:", userId, userName, userRole);
    
    if (!userId) {
        console.error("No userId found in localStorage");
        return;
    }
    
    // Verify Firebase connection
    try {
        // Test the database connection
        const testCollection = collection(db, "test");
        console.log("Firebase initialized:", db ? "Yes" : "No");
        console.log("Test collection reference:", testCollection ? "Valid" : "Invalid");
    } catch (error) {
        console.error("Error accessing Firebase:", error);
    }
    
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
    setupChatChannels(userRole);
    
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
            const chatName = this.querySelector('h6').textContent;
            const chatDesc = this.querySelector('small').textContent;
            document.getElementById('chatTitle').textContent = chatName;
            document.getElementById('chatDescription').textContent = chatDesc;
            
            // Switch to this chat
            currentChat = chatId;
            loadMessages(chatId);
        });
    });
    
    // Add event listener to message form
    messageForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        try {
            console.log(`Sending message to ${currentChat} chat:`, message);
            
            // Create message object with proper structure
            const messageData = {
                text: message,
                senderId: userId,
                senderName: userName || 'Anonymous',
                timestamp: serverTimestamp(),
                created: new Date().toISOString() // Backup timestamp in ISO format
            };
            
            // Important: Use setDoc approach that worked for other features
            // Make sure the collection path exists first
            await ensureChatCollectionExists(currentChat);
            
            // Add to Firestore using same pattern as working features
            const messagesCollection = collection(db, "chats", currentChat, "messages");
            const docRef = await addDoc(messagesCollection, messageData);
            
            console.log("Message sent with ID:", docRef.id);
            
            // Clear input
            messageInput.value = '';
            
        } catch (error) {
            console.error("Error sending message:", error);
            
            // Show error notification
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger m-2';
            errorAlert.textContent = `Error sending message: ${error.message}`;
            chatMessages.appendChild(errorAlert);
            
            setTimeout(() => {
                errorAlert.remove();
            }, 3000);
        }
    });
    
    // Initialize - load first channel
    loadMessages(currentChat);
    
    // Function to set up chat channels based on user role
    function setupChatChannels(role) {
        if (role === 'admin') {
            // Admins can access all channels
            document.querySelectorAll('.admin-only, .organizer-only').forEach(el => {
                el.classList.remove('d-none');
            });
        } else if (role === 'organizer') {
            // Organizers can access organizer channels
            document.querySelectorAll('.organizer-only').forEach(el => {
                el.classList.remove('d-none');
            });
        }
        
        console.log(`Chat channels set up for ${role} role`);
    }
    
    // Function to load messages for a chat channel
    async function loadMessages(chatId) {
        try {
            console.log(`Loading messages for ${chatId} chat`);
            
            // Show loading indicator
            chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
            
            // Clean up previous listener
            if (messageListener) {
                messageListener();
                messageListener = null;
            }
            
            // Special case for announcements channel - use notifications collection
            if (chatId === 'announcements') {
                const notificationsRef = collection(db, "notifications");
                const q = query(
                    notificationsRef,
                    orderBy("timestamp", "desc"),
                    limit(100)
                );
                
                // Set up real-time listener for notifications
                messageListener = onSnapshot(q, (snapshot) => {
                    // Clear messages container
                    chatMessages.innerHTML = '';
                    
                    if (snapshot.empty) {
                        chatMessages.innerHTML = '<div class="text-center p-3">No announcements yet.</div>';
                        return;
                    }
                    
                    // Add each notification as a message
                    snapshot.forEach(doc => {
                        const notification = doc.data();
                        
                        // Create a message-like object from notification
                        const messageData = {
                            text: notification.message,
                            senderId: 'system',
                            senderName: notification.title || 'Announcement',
                            timestamp: notification.timestamp
                        };
                        
                        addMessageToUI(messageData);
                    });
                    
                    // Scroll to bottom
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                });
                
                return;
            }
            
            // Regular chat channels
            const messagesRef = collection(db, `chats/${chatId}/messages`);
            const q = query(
                messagesRef,
                orderBy("timestamp", "asc"),
                limit(100)
            );
            
            // Set up real-time listener
            messageListener = onSnapshot(q, (snapshot) => {
                console.log(`Received ${snapshot.size} messages for ${chatId}`);
                
                // Clear messages container
                chatMessages.innerHTML = '';
                
                if (snapshot.empty) {
                    chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Be the first to say something!</div>';
                    return;
                }
                
                // Add each message to the UI
                snapshot.forEach(doc => {
                    const message = doc.data();
                    addMessageToUI(message);
                });
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
            }, (error) => {
                console.error("Error loading messages:", error);
                chatMessages.innerHTML = `<div class="text-center p-3 text-danger">Error loading messages: ${error.message}</div>`;
            });
            
        } catch (error) {
            console.error("Error setting up message listener:", error);
            chatMessages.innerHTML = `<div class="text-center p-3 text-danger">Error loading messages: ${error.message}</div>`;
        }
    }
    
    // Function to add a message to the UI
    function addMessageToUI(message) {
        if (!message) return;
        
        const isOwnMessage = message.senderId === userId;
        
        // Format timestamp
        let timeStr = "Just now";
        if (message.timestamp) {
            if (message.timestamp.toDate) {
                timeStr = message.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (message.timestamp.seconds) {
                timeStr = new Date(message.timestamp.seconds * 1000)
                    .toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        }
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = 'd-flex mb-3';
        messageEl.innerHTML = `
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
                <p class="mb-1">${message.text}</p>
            </div>
        `;
        
        // Add to chat container
        chatMessages.appendChild(messageEl);
    }

    // Create chat collections if they don't exist (initialization)
    async function ensureChatCollectionsExist() {
        try {
            const chatChannels = ['general', 'announcements', 'organizers', 'admin'];
            
            for (const channel of chatChannels) {
                // Try to get messages from this channel
                const messagesRef = collection(db, `chats/${channel}/messages`);
                const snapshot = await getDocs(query(messagesRef, limit(1)));
                
                // If no messages, add a system message
                if (snapshot.empty) {
                    console.log(`Creating initial message for ${channel} chat`);
                    
                    await addDoc(messagesRef, {
                        text: `Welcome to the ${channel} chat channel!`,
                        senderId: 'system',
                        senderName: 'System',
                        timestamp: serverTimestamp()
                    });
                }
            }
            
            console.log("Chat collections initialized");
            
        } catch (error) {
            console.error("Error initializing chat collections:", error);
        }
    }
    
    // Make sure collection exists before saving
    async function ensureChatCollectionExists(chatId) {
        try {
            // This will create the collection path if it doesn't exist
            const docRef = doc(db, "chats", chatId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                // Initialize the chat document with metadata
                await setDoc(docRef, {
                    name: chatId,
                    created: new Date().toISOString(),
                    lastActivity: serverTimestamp()
                });
                console.log(`Created chat collection: ${chatId}`);
            }
        } catch (error) {
            console.error(`Error ensuring chat collection exists: ${error}`);
            throw error; // Propagate the error
        }
    }

    // Initialize chat collections
    ensureChatCollectionsExist();
});
