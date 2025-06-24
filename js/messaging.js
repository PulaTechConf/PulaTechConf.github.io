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
    
    // Get user data from localStorage - use email if userId not available
    const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName') || 'Anonymous User';
    const userRole = localStorage.getItem('userRole') || 'general';
    
    // Debug log
    console.log("Current user:", userName, "with ID:", userId, "Role:", userRole);
    
    if (!userId) {
        console.error("No user identifier found. Using session ID instead.");
        // Generate a temporary session ID if no userId exists
        localStorage.setItem('sessionId', 'temp_' + Math.random().toString(36).substring(2, 15));
    }

    const userIdentifier = userId || localStorage.getItem('sessionId');
    
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
            
            // First make sure the parent document exists
            await setupChatCollection(currentChat);
            
            // Message object with all required fields
            const messageData = {
                text: message,
                senderId: userIdentifier,
                senderName: userName,
                email: localStorage.getItem('userEmail') || 'anonymous@example.com',
                role: userRole,
                timestamp: serverTimestamp(), // Use Firestore server timestamp
                clientTimestamp: new Date().toISOString() // Backup client timestamp
            };
            
            console.log("Saving message with data:", messageData);
            
            // Use the correct path to the messages subcollection
            const messagesCollection = collection(db, "chats", currentChat, "messages");
            const docRef = await addDoc(messagesCollection, messageData);
            
            console.log("Message sent with ID:", docRef.id);
            
            // Clear input
            messageInput.value = '';
            
            // Don't need to add to UI manually as the listener will update
            
        } catch (error) {
            console.error("Error sending message:", error);
            
            // Show error to user
            const errorMsg = document.createElement('div');
            errorMsg.className = 'alert alert-danger mt-3';
            errorMsg.textContent = `Failed to send message: ${error.message}`;
            chatMessages.appendChild(errorMsg);
            
            // Remove error after 3 seconds
            setTimeout(() => errorMsg.remove(), 3000);
        }
    });
    
    // Initialize all chat collections and load first channel
    await setupAllChatCollections();
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
            
            // Regular chat channels - ensure collection exists first
            await setupChatCollection(chatId);
            
            const messagesRef = collection(db, "chats", chatId, "messages");
            const q = query(
                messagesRef,
                orderBy("timestamp", "desc"), // Most recent first
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
                
                // Get messages as array and reverse to display oldest first
                const messages = [];
                snapshot.forEach(doc => {
                    messages.push(doc.data());
                });
                
                // Add messages in reverse order (oldest first)
                messages.reverse().forEach(message => {
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
        
        const isOwnMessage = message.senderId === userIdentifier;
        
        // Format timestamp
        let timeStr = "Just now";
        if (message.timestamp) {
            if (message.timestamp.toDate) {
                timeStr = message.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (message.timestamp.seconds) {
                timeStr = new Date(message.timestamp.seconds * 1000)
                    .toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (typeof message.timestamp === 'string') {
                timeStr = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        } else if (message.clientTimestamp) {
            timeStr = new Date(message.clientTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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

    // Function to ensure a chat collection exists and is set up correctly
    async function setupChatCollection(chatId) {
        try {
            // Create the chat document if it doesn't exist
            const chatDocRef = doc(db, "chats", chatId);
            
            // Use setDoc with merge:true to avoid overwriting existing data
            await setDoc(chatDocRef, {
                name: chatId,
                lastUpdated: new Date().toISOString(),
                updatedBy: userName
            }, { merge: true });
            
            console.log(`Chat collection ${chatId} is ready`);
            return true;
        } catch (error) {
            console.error(`Error setting up chat ${chatId}:`, error);
            throw error; // Propagate the error
        }
    }

    // Function to initialize all chat collections
    async function setupAllChatCollections() {
        try {
            const chatChannels = ['general', 'announcements', 'organizers', 'admin'];
            
            for (const channel of chatChannels) {
                await setupChatCollection(channel);
                
                // Check if the channel has any messages
                const messagesRef = collection(db, "chats", channel, "messages");
                const snapshot = await getDocs(query(messagesRef, limit(1)));
                
                // If no messages, add a welcome message
                if (snapshot.empty) {
                    console.log(`Adding welcome message to ${channel}`);
                    
                    await addDoc(messagesRef, {
                        text: `Welcome to the ${channel} chat! This is where all messages will appear.`,
                        senderId: 'system',
                        senderName: 'System',
                        timestamp: serverTimestamp(),
                        clientTimestamp: new Date().toISOString()
                    });
                }
            }
            
            console.log("All chat collections initialized");
        } catch (error) {
            console.error("Error initializing chat collections:", error);
        }
    }
});
