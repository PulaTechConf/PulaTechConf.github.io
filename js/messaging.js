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
    
    if (!userId) return;
    
    // References to DOM elements
    const chatMessages = document.getElementById('chatMessages');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const chatLinks = document.querySelectorAll('[data-chat]');
    
    // Current active chat
    let currentChat = 'general';
    
    // Enable appropriate chat channels based on role
    setupAccessControl(userRole);
    
    // Listen for chat selection
    chatLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            // Skip if this chat is hidden
            if (this.classList.contains('d-none')) return;
            
            currentChat = this.getAttribute('data-chat');
            console.log(`Switching to chat channel: ${currentChat}`);
            updateActiveChatUI(this);
            loadMessages(currentChat);
        });
    });
    
    // Send message
    messageForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = messageInput.value.trim();
        
        if (message) {
            sendMessage(message, currentChat, userId, userName);
            messageInput.value = '';
        }
    });
    
    // Load initial messages for general chat
    loadMessages('general');
    
    // Function to control access to chat channels based on role
    function setupAccessControl(role) {
        console.log("Setting up chat access for role:", role);
        
        // Show/hide appropriate chats based on role
        if (role === 'admin') {
            // Admin can see all chats
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
            document.querySelectorAll('.organizer-only').forEach(el => el.classList.remove('d-none'));
        } else if (role === 'organizer') {
            // Organizer can see organizer chats
            document.querySelectorAll('.organizer-only').forEach(el => el.classList.remove('d-none'));
        }
    }
    
    // Function to load messages
    async function loadMessages(chatId) {
        try {
            if (!chatMessages) return;
            
            // Clear existing messages
            chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
            
            console.log(`Loading messages for chat: ${chatId}`);
            
            // Set up query for this chat's messages, ordered by timestamp
            const messagesRef = collection(db, "chats", chatId, "messages");
            const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
            
            // Get existing messages
            const querySnapshot = await getDocs(q);
            
            // Clear loading message
            chatMessages.innerHTML = '';
            
            if (querySnapshot.empty) {
                chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Be the first to say hello!</div>';
                return;
            }
            
            // Add each message to the UI
            querySnapshot.forEach(doc => {
                const messageData = doc.data();
                addMessageToUI(messageData);
            });
            
            // Set up real-time listener for new messages
            onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === "added") {
                        // Only add messages that weren't added in the initial load
                        if (!document.querySelector(`[data-message-id="${change.doc.id}"]`)) {
                            addMessageToUI(change.doc.data(), change.doc.id);
                        }
                    }
                });
                
                // Scroll to bottom on new messages
                chatMessages.scrollTop = chatMessages.scrollHeight;
            });
            
            // Initial scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
        } catch (error) {
            console.error("Error loading messages:", error);
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="text-center p-3 text-danger">Error loading messages. Please try again.</div>';
            }
        }
    }
    
    // Function to update the active chat in the UI
    function updateActiveChatUI(activeLink) {
        // Update active state
        document.querySelectorAll('[data-chat]').forEach(el => {
            el.classList.remove('active');
        });
        activeLink.classList.add('active');
        
        // Update chat title and description
        const chatName = activeLink.querySelector('h6').textContent;
        document.getElementById('chatTitle').textContent = chatName;
        
        const chatDescription = activeLink.querySelector('small').textContent;
        document.getElementById('chatDescription').textContent = chatDescription;
    }
    
    // Function to send a message
    async function sendMessage(text, chatId, senderId, senderName) {
        try {
            console.log(`Sending message to chat ${chatId}`);
            
            const messageData = {
                text,
                senderId,
                senderName,
                timestamp: serverTimestamp()
            };
            
            // Add to Firestore
            await addDoc(collection(db, "chats", chatId, "messages"), messageData);
            
            console.log("Message sent successfully");
            
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
    function addMessageToUI(messageData, messageId) {
        if (!chatMessages) return;
        
        const isOwnMessage = messageData.senderId === userId;
        
        // Handle timestamp (it could be a server timestamp or a JS Date)
        let formattedTime;
        if (messageData.timestamp) {
            if (messageData.timestamp.toDate) {
                // It's a Firestore timestamp
                formattedTime = messageData.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else {
                // It's already a Date or something else
                formattedTime = new Date(messageData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        } else {
            formattedTime = "Just now";
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = 'd-flex mb-3';
        if (messageId) {
            messageElement.setAttribute('data-message-id', messageId);
        }
        
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
