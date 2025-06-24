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
    Timestamp
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
    
    // Add event listener to message form - SIMPLIFIED FOR DIRECT SAVE
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
            // Create direct-access message data
            const messageData = {
                text: message,
                senderId: userId || 'anonymous',
                senderName: userName || 'Anonymous User',
                timestamp: Timestamp.now(), // Using client-side timestamp for immediate availability
                createdAt: new Date().toISOString(),
                channel: currentChat
            };
            
            console.log("MESSAGE DATA TO SAVE:", messageData);
            
            // Save to a flat messages collection for easier debugging
            const flatMessagesCollection = collection(db, "all_messages");
            await addDoc(flatMessagesCollection, messageData);
            
            // Now also save to the channel-specific subcollection
            const channelMessagesCollection = collection(db, "chats", currentChat, "messages");
            await addDoc(channelMessagesCollection, messageData);
            
            console.log("Message saved successfully to both collections");
            
            // Remove sending indicator
            sendingMsg.remove();
            
            // Clear input
            messageInput.value = '';
            
            // Add message to UI immediately for better UX
            addMessageToUI(messageData);
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
        } catch (error) {
            console.error("Error sending message:", error);
            sendingMsg.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            
            // Add more debugging info
            console.error("Error details:", error);
            console.error("Message that failed:", message);
            console.error("Current chat:", currentChat);
        }
    });
    
    // Initialize by creating chat collections and loading messages
    await createChatCollections();
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
    
    // Function to create chat collections if they don't exist
    async function createChatCollections() {
        try {
            console.log("Creating chat collections...");
            const channels = ['general', 'announcements', 'organizers', 'admin'];
            
            for (const channelId of channels) {
                // Create the chat document if it doesn't exist
                const chatDocRef = doc(db, "chats", channelId);
                await setDoc(chatDocRef, {
                    name: channelId,
                    lastUpdated: new Date().toISOString(),
                    updatedBy: userName || 'system'
                }, { merge: true });
                
                console.log(`Chat collection created/updated: ${channelId}`);
            }
        } catch (error) {
            console.error("Error creating chat collections:", error);
        }
    }
    
    // Function to load messages for a chat channel - SIMPLIFIED FOR DIRECT ACCESS
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
            // Try to load from flat collection first (for debugging)
            const allMessagesRef = collection(db, "all_messages");
            const q = query(
                allMessagesRef,
                orderBy("createdAt", "asc"), // Sort by string timestamp for consistency
                limit(100)
            );
            
            console.log("Setting up message listener for:", chatId);
            
            messageListener = onSnapshot(q, (snapshot) => {
                console.log(`Received ${snapshot.size} messages from all_messages`);
                
                if (snapshot.empty) {
                    chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Be the first to say something!</div>';
                    return;
                }
                
                // Filter messages for this channel
                const channelMessages = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.channel === chatId) {
                        channelMessages.push(data);
                    }
                });
                
                console.log(`Found ${channelMessages.length} messages for channel ${chatId}`);
                
                if (channelMessages.length === 0) {
                    chatMessages.innerHTML = '<div class="text-center p-3">No messages in this channel yet. Be the first to say something!</div>';
                    return;
                }
                
                // Clear messages container and add filtered messages
                chatMessages.innerHTML = '';
                channelMessages.forEach(message => {
                    addMessageToUI(message);
                });
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
            }, (error) => {
                console.error("Error loading messages:", error);
                chatMessages.innerHTML = `<div class="alert alert-danger">Error loading messages: ${error.message}</div>`;
            });
            
        } catch (error) {
            console.error("Error setting up message listener:", error);
            chatMessages.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        }
    }
    
    // Function to add a message to the UI
    function addMessageToUI(message) {
        if (!message) return;
        
        const isOwnMessage = message.senderId === userId;
        
        // Format timestamp - simplify this for reliability
        let timeStr = "Just now";
        if (message.createdAt) {
            // Use the string timestamp for reliability
            timeStr = new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else if (message.timestamp) {
            if (message.timestamp.toDate) {
                timeStr = message.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (message.timestamp.seconds) {
                timeStr = new Date(message.timestamp.seconds * 1000)
                    .toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        }
        
        // Create message element with clear debug info
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
    
    // Clean up listener when navigating away
    window.addEventListener('beforeunload', function() {
        if (messageListener) {
            messageListener();
        }
    });
});