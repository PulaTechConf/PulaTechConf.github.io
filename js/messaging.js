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
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    
    if (!userId) return;
    
    // References to DOM elements
    const chatMessages = document.getElementById('chatMessages');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const chatLinks = document.querySelectorAll('[data-chat]');
    
    // Current active chat
    let currentChat = 'general';
    
    // Listen for chat selection
    chatLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            currentChat = this.getAttribute('data-chat');
            loadMessages(currentChat);
        });
    });
    
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
    
    // Function to load messages
    async function loadMessages(chatId) {
        try {
            // Clear existing messages
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
            }
            
            // Set up listener for messages
            const messagesRef = collection(db, "chats", chatId, "messages");
            const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));
            
            onSnapshot(q, (snapshot) => {
                // Clear messages first
                chatMessages.innerHTML = '';
                
                if (snapshot.empty) {
                    chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Be the first to say hello!</div>';
                    return;
                }
                
                snapshot.forEach(doc => {
                    const messageData = doc.data();
                    addMessageToUI(messageData);
                });
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
            });
            
        } catch (error) {
            console.error("Error loading messages:", error);
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="text-center p-3 text-danger">Error loading messages. Please try again.</div>';
            }
        }
    }
    
    // Function to send a message
    async function sendMessage(text, chatId) {
        try {
            await addDoc(collection(db, "chats", chatId, "messages"), {
                text,
                senderId: userId,
                senderName: userName || 'Anonymous',
                timestamp: serverTimestamp()
            });
            
        } catch (error) {
            console.error("Error sending message:", error);
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.classList.add('text-center', 'p-2', 'text-danger');
            errorDiv.textContent = 'Error sending message. Please try again.';
            chatMessages.appendChild(errorDiv);
            
            // Remove error message after a few seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 3000);
        }
    }
    
    // Function to add a message to the UI
    function addMessageToUI(messageData) {
        if (!chatMessages) return;
        
        const isOwnMessage = messageData.senderId === userId;
        const messageDate = messageData.timestamp ? new Date(messageData.timestamp.toMillis()) : new Date();
        const formattedTime = messageDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
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
                    <h6 class="mb-0">${isOwnMessage ? 'You' : messageData.senderName}</h6>
                    <small class="text-muted">${formattedTime}</small>
                </div>
                <p class="mb-1">${messageData.text}</p>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
    }
});
