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
    console.log("Firebase db object available:", !!db);
    
    // Get user data from localStorage
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName') || 'Anonymous User';
    const userEmail = localStorage.getItem('userEmail');
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
        
        console.log("Sending message:", message);
        
        // Show sending status
        const sendingMsg = document.createElement('div');
        sendingMsg.className = 'text-center text-muted mb-2';
        sendingMsg.innerHTML = '<small>Sending message...</small>';
        chatMessages.appendChild(sendingMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // Ensure chat collection exists
            await ensureChatCollection(currentChat);
            
            // Create message object
            const messageData = {
                text: message,
                senderId: userId || 'anonymous',
                senderName: userName || 'Anonymous User',
                timestamp: serverTimestamp(),
                clientTime: new Date().toISOString(),
                channel: currentChat
            };
            
            // Save message to the chat channel collection
            const messagesCollection = collection(db, "chats", currentChat, "messages");
            const docRef = await addDoc(messagesCollection, messageData);
            
            console.log("Message saved with ID:", docRef.id);
            
            // Remove sending indicator
            sendingMsg.remove();
            
            // Clear input
            messageInput.value = '';
            
        } catch (error) {
            console.error("Error sending message:", error);
            sendingMsg.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        }
    });
    
    // Initialize by loading messages
    await ensureAllChatCollections();
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
    
    // Function to load messages for a chat channel
    function loadMessages(chatId) {
        console.log(`Loading messages for ${chatId} channel`);
        
        // Show loading indicator
        chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
        
        // Clear any previous listener
        if (messageListener) {
            messageListener();
            messageListener = null;
        }
        
        try {
            const messagesRef = collection(db, `chats/${chatId}/messages`);
            const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
            
            messageListener = onSnapshot(q, (snapshot) => {
                console.log(`Received ${snapshot.size} messages for ${chatId}`);
                
                // Clear messages container
                chatMessages.innerHTML = '';
                
                if (snapshot.empty) {
                    chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Be the first to say something!</div>';
                    return;
                }
                
                // Add messages to UI
                snapshot.forEach(doc => {
                    const messageData = doc.data();
                    addMessageToUI(messageData);
                });
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
            }, (error) => {
                console.error("Error loading messages:", error);
                chatMessages.innerHTML = `
                    <div class="alert alert-danger">
                        Error loading messages: ${error.message}
                    </div>
                    <div class="text-center mt-3">
                        <button class="btn btn-outline-primary btn-sm" onclick="window.location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> Retry
                        </button>
                    </div>
                `;
            });
        } catch (error) {
            console.error("Exception setting up message listener:", error);
            chatMessages.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
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
            } else if (typeof message.timestamp === 'string') {
                timeStr = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        } else if (message.clientTime) {
            timeStr = new Date(message.clientTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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
            </div>
        `;
        
        // Add to chat container
        chatMessages.appendChild(messageElement);
    }
    
    // Ensure chat collection exists
    async function ensureChatCollection(chatId) {
        try {
            const chatDocRef = doc(db, "chats", chatId);
            await setDoc(chatDocRef, { 
                name: chatId,
                lastUpdated: new Date().toISOString(),
                updatedBy: userName
            }, { merge: true });
            
            return true;
        } catch(error) {
            console.error(`Error ensuring chat collection ${chatId}:`, error);
            throw error;
        }
    }
    
    // Ensure all chat collections exist
    async function ensureAllChatCollections() {
        const channels = ['general', 'announcements', 'organizers', 'admin'];
        for (const channel of channels) {
            try {
                await ensureChatCollection(channel);
            } catch (error) {
                console.error(`Failed to ensure collection for ${channel}:`, error);
            }
        }
    }
    
    // Clean up listener when navigating away
    window.addEventListener('beforeunload', function() {
        if (messageListener) {
            messageListener();
        }
    });
});
    chatMessages.appendChild(messageEl);

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
