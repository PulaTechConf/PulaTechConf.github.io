import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    onSnapshot,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("Messaging.js loaded");
    
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole') || 'general';
    
    if (!userId) {
        console.log("User not logged in");
        return;
    }
    
    console.log("Current user role:", userRole);
    
    // References to DOM elements
    const chatMessages = document.getElementById('chatMessages');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const refreshBtn = document.getElementById('refreshChannelsBtn');
    
    // Current active chat
    let currentChat = 'general';
    let currentUnsubscribe = null;
    
    // Setup refresh button
    refreshBtn?.addEventListener('click', () => {
        console.log("Refreshing current chat:", currentChat);
        loadMessages(currentChat);
    });
    
    // Set up chat channels based on user role
    setupChatAccess(userRole);
    
    // Send message
    messageForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = messageInput.value.trim();
        
        if (message) {
            sendMessage(message, currentChat);
            messageInput.value = '';
        }
    });
    
    // Load initial messages
    loadMessages('general');
    
    // Function to control access to chat channels based on role
    function setupChatAccess(role) {
        console.log("Setting up chat access for role:", role);
        
        // Add click event listeners to all chat channels
        document.querySelectorAll('[data-chat]').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Skip if the chat is hidden by role
                if (this.classList.contains('d-none')) {
                    return;
                }
                
                const chatId = this.getAttribute('data-chat');
                console.log("Switching to chat:", chatId);
                
                // Update active chat
                document.querySelectorAll('[data-chat]').forEach(el => {
                    el.classList.remove('active');
                });
                this.classList.add('active');
                
                // Update chat title and description
                const chatName = this.querySelector('h6').textContent;
                document.getElementById('chatTitle').textContent = chatName;
                
                const chatDescription = this.querySelector('small').textContent;
                document.getElementById('chatDescription').textContent = chatDescription;
                
                // Update current chat and load messages
                currentChat = chatId;
                loadMessages(chatId);
            });
        });
    }
    
    // Function to load messages
    function loadMessages(chatId) {
        try {
            if (!chatMessages) return;
            
            // Clear existing messages and show loading
            chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
            
            console.log(`Loading messages for chat: ${chatId}`);
            
            // Clean up previous subscription if exists
            if (currentUnsubscribe) {
                currentUnsubscribe();
                currentUnsubscribe = null;
            }
            
            // Set up query for this chat's messages
            const messagesRef = collection(db, "chats", chatId, "messages");
            const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));
            
            // Set up real-time listener
            const unsubscribe = onSnapshot(q, (snapshot) => {
                // Clear loading message
                chatMessages.innerHTML = '';
                
                if (snapshot.empty) {
                    chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Start the conversation!</div>';
                    return;
                }
                
                // Add each message to the UI
                snapshot.forEach(doc => {
                    const messageData = doc.data();
                    addMessageToUI(messageData);
                });
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, (error) => {
                console.error("Error loading messages:", error);
                chatMessages.innerHTML = '<div class="text-center p-3 text-danger">Error loading messages</div>';
            });
            
            // Store unsubscribe function
            currentUnsubscribe = unsubscribe;
            
        } catch (error) {
            console.error("Error setting up message listener:", error);
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="text-center p-3 text-danger">Error loading messages</div>';
            }
        }
    }
    
    // Function to send a message
    async function sendMessage(text, chatId) {
        try {
            if (!text || !chatId) return;
            
            console.log(`Sending message to ${chatId}:`, text);
            
            // Add message to Firestore
            await addDoc(collection(db, "chats", chatId, "messages"), {
                text,
                senderId: userId,
                senderName: userName || 'Anonymous',
                timestamp: serverTimestamp()
            });
            
            console.log("Message sent successfully");
            
        } catch (error) {
            console.error("Error sending message:", error);
            
            // Show error message in chat
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = 'Failed to send message. Please try again.';
            chatMessages.appendChild(errorDiv);
            
            // Remove error message after 3 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 3000);
        }
    }
    
    // Function to add a message to the UI
    function addMessageToUI(messageData) {
        if (!chatMessages) return;
        
        const isOwnMessage = messageData.senderId === userId;
        
        // Format timestamp
        let formattedTime = "Just now";
        if (messageData.timestamp) {
            if (messageData.timestamp.toDate) {
                // Firestore timestamp
                formattedTime = messageData.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (messageData.timestamp.seconds) {
                // Serialized timestamp
                const date = new Date(messageData.timestamp.seconds * 1000);
                formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
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
                    <h6 class="mb-0">${isOwnMessage ? 'You' : messageData.senderName || 'Anonymous'}</h6>
                    <small class="text-muted">${formattedTime}</small>
                </div>
                <p class="mb-1">${messageData.text}</p>
            </div>
        `;
        
    chatMessages.appendChild(messageElement);
}

// Function to send a message
    async function sendMessage(text, chatId, senderId, senderName) {
        try {
            console.log(`Sending message to ${chatId}: ${text}`);
            
            // Get reference to the messages collection
            const messagesRef = collection(db, "chats", chatId, "messages");
            
            // Create message object
            const messageData = {
                text,
                senderId,
                senderName,
                timestamp: serverTimestamp()
            };
            
            // Add document to Firestore
            const docRef = await addDoc(messagesRef, messageData);
            console.log("Message sent successfully with ID:", docRef.id);
            
            return true;
        } catch (error) {
            console.error("Error sending message:", error);
            
            // Show error to user
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger m-2';
            errorAlert.textContent = `Failed to send message: ${error.message}`;
            chatMessages.appendChild(errorAlert);
            
            // Remove after 3 seconds
            setTimeout(() => errorAlert.remove(), 3000);
            
            return false;
        }
    }
    
    // Function to render a single message
    function renderMessage(messageData, messageId) {
        if (!chatMessages) return;
        
        const isOwnMessage = messageData.senderId === userId;
        const isSystemMessage = messageData.isSystem === true;
        
        // Format timestamp
        let formattedTime = "Just now";
        if (messageData.timestamp) {
            if (messageData.timestamp.toDate) {
                // Firestore timestamp
                formattedTime = messageData.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            } else if (messageData.timestamp.seconds) {
                // Serialized timestamp
                const date = new Date(messageData.timestamp.seconds * 1000);
                formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            }
        }
        
        const messageElem = document.createElement('div');
        messageElem.className = 'd-flex mb-3';
        messageElem.dataset.messageId = messageId;
        
        if (isSystemMessage) {
            // System message styling
            messageElem.innerHTML = `
                <div class="w-100 text-center">
                    <div class="badge bg-secondary text-light p-2">
                        ${messageData.text}
                    </div>
                </div>
            `;
        } else {
            // Normal message styling
            messageElem.innerHTML = `
                <div class="flex-shrink-0">
                    <div class="${isOwnMessage ? 'bg-primary text-white' : 'bg-light'} rounded-circle p-2 text-center" style="width: 40px; height: 40px;">
                        <i class="bi bi-person"></i>
                    </div>
                </div>
                <div class="flex-grow-1 ms-3">
                    <div class="d-flex justify-content-between">
                        <h6 class="mb-0">${isOwnMessage ? 'You' : messageData.senderName || 'Anonymous'}</h6>
                        <small class="text-muted">${formattedTime}</small>
                    </div>
                    <p class="mb-1">${messageData.text}</p>
                </div>
            `;
        }
        
        chatMessages.appendChild(messageElem);
    }
});
