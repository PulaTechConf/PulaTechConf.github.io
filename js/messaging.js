import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("Messaging.js loaded");
    
    // Debug Firebase connection
    console.log("Firebase db object:", db);
    
    // Get user data from localStorage
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
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
    
    // Add event listener to message form - SIMPLIFIED VERSION FOR DEBUGGING
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        console.log(`Attempting to send message to ${currentChat}:`, message);
        
        // Prepare the message data - simple structure
        const messageData = {
            text: message,
            senderId: userId || 'anonymous',
            senderName: userName || 'Anonymous User',
            timestamp: serverTimestamp()
        };
        
        // Create message collection reference
        const messagesCollection = collection(db, "messages");
        
        // Save to Firestore - in a simple, flat collection for debugging
        addDoc(messagesCollection, {
            ...messageData,
            channel: currentChat,
            clientTime: new Date().toISOString()
        })
        .then(docRef => {
            console.log("Message saved with ID:", docRef.id);
            
            // Clear input
            messageInput.value = '';
            
            // Display the message in UI
            addMessageToUI({
                ...messageData,
                timestamp: new Date() // Use current date for immediate display
            });
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        })
        .catch(error => {
            console.error("Error saving message:", error);
            alert(`Failed to save message: ${error.message}`);
        });
        
        // Also try to save to the chat-specific collection
        const chatMessagesCollection = collection(db, "chats", currentChat, "messages");
        addDoc(chatMessagesCollection, messageData)
            .then(() => console.log("Message also saved to chat-specific collection"))
            .catch(err => console.error("Failed to save to chat-specific:", err));
    });
    
    // Initialize by loading the general chat
    createChannels().then(() => {
        loadMessages('general');
    });
    
    // Function to create initial channels if needed
    async function createChannels() {
        try {
            const channels = ['general', 'announcements', 'organizers', 'admin'];
            
            for (const channelName of channels) {
                const channelRef = doc(db, "chats", channelName);
                await setDoc(channelRef, { 
                    name: channelName,
                    createdAt: serverTimestamp()
                }, { merge: true });
            }
            console.log("Chat channels created/updated");
        } catch (error) {
            console.error("Error creating channels:", error);
        }
    }
    
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
    function loadMessages(chatId) {
        console.log(`Loading messages for ${chatId}`);
        
        // Show loading state
        chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
        
        // Clear any previous listener
        if (messageListener) {
            messageListener();
            messageListener = null;
        }
        
        try {
            // First try: Load from chat-specific collection
            const chatMessagesRef = collection(db, "chats", chatId, "messages");
            const q = query(chatMessagesRef, orderBy("timestamp", "asc"), limit(50));
            
            messageListener = onSnapshot(q, (snapshot) => {
                console.log(`Received ${snapshot.size} messages from ${chatId} collection`);
                
                // Clear container
                chatMessages.innerHTML = '';
                
                if (snapshot.empty) {
                    // If no messages in chat-specific collection, try the general collection
                    const allMessagesRef = collection(db, "messages");
                    const filteredQ = query(
                        allMessagesRef, 
                        // where("channel", "==", chatId),
                        orderBy("timestamp", "asc"),
                        limit(50)
                    );
                    
                    onSnapshot(filteredQ, (allSnapshot) => {
                        if (allSnapshot.empty) {
                            chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Be the first to say something!</div>';
                            return;
                        }
                        
                        chatMessages.innerHTML = '';
                        allSnapshot.forEach(doc => {
                            const messageData = doc.data();
                            if (messageData.channel === chatId) {
                                addMessageToUI(messageData);
                            }
                        });
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    });
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
