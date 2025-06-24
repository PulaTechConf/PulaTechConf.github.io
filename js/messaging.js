import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("Messaging.js loaded");
    
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole') || 'general';
    
    if (!userId) {
        console.log("No user ID found in localStorage");
        return;
    }
    
    console.log("Current user:", userName, "with role:", userRole);
    
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
    
    // Set up chat channel click events
    document.querySelectorAll('[data-chat]').forEach(channel => {
        channel.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Skip if channel is hidden
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
            const chatDesc = this.querySelector('small').textContent;
            document.getElementById('chatTitle').textContent = chatName;
            document.getElementById('chatDescription').textContent = chatDesc;
            
            // Update current chat and load messages
            currentChat = chatId;
            loadMessages(chatId);
        });
    });
    
    // Handle message submission
    messageForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        
        if (messageText) {
            // Send message to Firebase
            sendMessage(messageText, currentChat);
            
            // Clear input
            messageInput.value = '';
        }
    });
    
    // Initial load of messages for the default channel
    loadMessages('general');
    
    // Function to load messages for a chat channel
    async function loadMessages(chatId) {
        try {
            if (!chatMessages) return;
            
            // Clear current messages and show loading
            chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
            
            console.log(`Loading messages for chat: ${chatId}`);
            
            // Clear previous listener if exists
            if (currentUnsubscribe) {
                currentUnsubscribe();
                currentUnsubscribe = null;
            }
            
            // Create messages collection reference for this chat
            const messagesRef = collection(db, "chats", chatId, "messages");
            const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
            
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
                console.error("Error listening for messages:", error);
                chatMessages.innerHTML = `<div class="text-center p-3 text-danger">Error loading messages: ${error.message}</div>`;
            });
            
            // Store unsubscribe function to clean up later
            currentUnsubscribe = unsubscribe;
            
        } catch (error) {
            console.error("Error setting up message listener:", error);
            chatMessages.innerHTML = `<div class="text-center p-3 text-danger">Error loading messages: ${error.message}</div>`;
        }
    }
    
    // Function to send a message
    async function sendMessage(text, chatId) {
        try {
            if (!text || !chatId) return;
            
            console.log(`Sending message to ${chatId}:`, text);
            
            // Prepare message data
            const messageData = {
                text,
                senderId: userId,
                senderName: userName || 'Anonymous',
                timestamp: serverTimestamp()
            };
            
            // Add to Firestore
            const messagesCollection = collection(db, "chats", chatId, "messages");
            await addDoc(messagesCollection, messageData);
            
            console.log("Message sent successfully");
            
        } catch (error) {
            console.error("Error sending message:", error);
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger m-2';
            errorDiv.textContent = `Failed to send message: ${error.message}`;
            chatMessages.appendChild(errorDiv);
            
            // Remove error after 3 seconds
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
                formattedTime = messageData.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (messageData.timestamp.seconds) {
                formattedTime = new Date(messageData.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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
});
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
