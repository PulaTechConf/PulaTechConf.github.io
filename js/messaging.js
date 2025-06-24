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
    
    if (!userId) return;
    
    // References to DOM elements
    const chatMessages = document.getElementById('chatMessages');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    
    // Current active chat
    let currentChat = 'general';
    
    // Set up chat access based on user role
    setupChatAccess(userRole);
    
    // Setup chat channel click events
    document.querySelectorAll('[data-chat]').forEach(channel => {
        if (!channel.classList.contains('d-none')) {
            channel.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get the chat ID
                const chatId = this.getAttribute('data-chat');
                
                // Update active chat
                document.querySelectorAll('[data-chat]').forEach(el => {
                    el.classList.remove('active');
                });
                this.classList.add('active');
                
                // Update current chat and UI
                currentChat = chatId;
                document.getElementById('chatTitle').textContent = this.querySelector('h6').textContent;
                document.getElementById('chatDescription').textContent = this.querySelector('small').textContent;
                
                // Load messages for this chat
                loadMessages(chatId);
            });
        }
    });
    
    // Handle message submission
    messageForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        
        if (messageText) {
            // Send message to Firebase
            sendMessage(messageText, currentChat, userId, userName);
            
            // Clear input
            messageInput.value = '';
        }
    });
    
    // Load initial messages
    loadMessages('general');
    
    // Function to set up chat access based on user role
    function setupChatAccess(role) {
        console.log("Setting up chat access for role:", role);
        
        // Show appropriate channels based on role
        if (role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
            document.querySelectorAll('.organizer-only').forEach(el => el.classList.remove('d-none'));
        } else if (role === 'organizer') {
            document.querySelectorAll('.organizer-only').forEach(el => el.classList.remove('d-none'));
        }
    }
    
    // Function to load messages
    function loadMessages(chatId) {
        if (!chatMessages) return;
        
        // Clear current messages
        chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
        
        console.log(`Loading messages for chat: ${chatId}`);
        
        // Create reference to messages collection for this chat
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
        
        // Listen for messages
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Clear loading message
            chatMessages.innerHTML = '';
            
            if (snapshot.empty) {
                chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Be the first to say something!</div>';
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
            chatMessages.innerHTML = '<div class="text-center p-3 text-danger">Error loading messages. Please try again.</div>';
        });
        
        // Store unsubscribe function to clean up when switching chats
        if (window.currentUnsubscribe) {
            window.currentUnsubscribe();
        }
        window.currentUnsubscribe = unsubscribe;
    }
    
    // Function to send a message
    async function sendMessage(text, chatId, senderId, senderName) {
        try {
            console.log(`Sending message to ${chatId}`);
            
            // Add to Firestore
            await addDoc(collection(db, "chats", chatId, "messages"), {
                text,
                senderId,
                senderName,
                timestamp: serverTimestamp()
            });
            
            console.log("Message sent");
        } catch (error) {
            console.error("Error sending message:", error);
            
            // Show error
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger m-2';
            errorDiv.textContent = 'Failed to send message. Please try again.';
            chatMessages.appendChild(errorDiv);
            
            // Auto remove after 3 seconds
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
                    isSystem: true
                });
            }
            
            // Set up query for messages
            const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
            
            // Set up real-time listener for messages
            currentListener = onSnapshot(q, (snapshot) => {
                console.log(`Got ${snapshot.docs.length} messages for ${chatId}`);
                
                if (snapshot.empty) {
                    chatMessages.innerHTML = '<div class="text-center p-3">No messages yet. Start the conversation!</div>';
                    return;
                }
                
                // Clear chat container
                chatMessages.innerHTML = '';
                
                // Render each message
                snapshot.forEach(doc => {
                    const messageData = doc.data();
                    renderMessage(messageData, doc.id);
                });
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, (error) => {
                console.error(`Error in messages listener for ${chatId}:`, error);
                chatMessages.innerHTML = `
                    <div class="alert alert-danger m-3">
                        Error loading messages: ${error.message}
                    </div>
                `;
            });
            
        } catch (error) {
            console.error("Error loading messages:", error);
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="alert alert-danger m-3">
                        Error loading messages: ${error.message}
                    </div>
                `;
            }
        }
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
