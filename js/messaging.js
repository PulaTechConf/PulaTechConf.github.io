import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    where,
    limit, 
    onSnapshot,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
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
    
    // Add event listener to message form - SIMPLIFIED VERSION TO AVOID INDEX ISSUES
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Show sending status
        const sendingMsg = document.createElement('div');
        sendingMsg.className = 'text-center text-muted mb-2';
        sendingMsg.innerHTML = '<small>Sending message...</small>';
        chatMessages.appendChild(sendingMsg);
        
        // Prepare message data
        const messageData = {
            text: message,
            senderId: userId || 'anonymous',
            senderName: userName || 'Anonymous User',
            timestamp: serverTimestamp()
        };
        
        console.log("Sending message:", message);
        
        // Save directly to the chat-specific collection
        const chatMessagesCollection = collection(db, `chats/${currentChat}/messages`);
        
        addDoc(chatMessagesCollection, messageData)
            .then(docRef => {
                console.log("Message saved with ID:", docRef.id);
                
                // Remove sending indicator
                sendingMsg.remove();
                
                // Clear input
                messageInput.value = '';
            })
            .catch(error => {
                console.error("Error saving message:", error);
                sendingMsg.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            });
    });
    
    // Initialize by loading messages
    setupAccessRights();
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
    
    // Set refresh button functionality
    refreshChannelsBtn?.addEventListener('click', () => loadMessages(currentChat));
    
    // Function to load messages for a chat channel
    function loadMessages(chatId) {
        console.log(`Loading messages for ${chatId} channel`);
        
        // Show loading indicator
        chatMessages.innerHTML = '<div class="text-center p-3">Loading messages...</div>';
        
        try {
            // SIMPLIFIED QUERY - AVOID INDEX REQUIREMENTS
            // Query messages directly from the nested collection instead
            const messagesRef = collection(db, `chats/${chatId}/messages`);
            const q = query(
                messagesRef,
                orderBy("timestamp", "desc"),
                limit(30)
            );
            
            // Set up real-time listener
            const unsubscribe = onSnapshot(q, (snapshot) => {
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
                    messages.push({...doc.data(), id: doc.id});
                });
                
                // Add messages in reverse order (oldest first)
                messages.reverse().forEach(message => {
                    addMessageToUI(message);
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
            
            // Store unsubscribe function for cleanup
            window.currentChatUnsubscribe = unsubscribe;
            
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
        
        // Create message element - fix variable declaration
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
                <p class="mb-1">${message.message || message.text || ''}</p>
            </div>
        `;
        
        // Add to chat container
        chatMessages.appendChild(messageElement);
    }
    
    // Clean up when leaving the page
    window.addEventListener('beforeunload', function() {
        if (window.currentChatUnsubscribe) {
            window.currentChatUnsubscribe();
        }
    });
    
    // Custom diagnostic function to check Firestore connection
    async function testFirestore() {
        try {
            console.log("TEST: Attempting to connect to Firestore...");
            
            // Create a test timestamp
            const timestamp = Timestamp.now();
            
            // Add a test document
            const testRef = collection(db, "connection_tests");
            const docRef = await addDoc(testRef, {
                message: "Connection test",
                timestamp: timestamp,
                browser: navigator.userAgent,
                host: window.location.host
            });
            
            console.log("TEST: Successfully added document with ID:", docRef.id);
            return true;
        } catch (error) {
            console.error("TEST: Firestore test failed:", error);
            return false;
        }
    }
    
    // Run test
    testFirestore().then(success => {
        console.log("Firestore connection test result:", success ? "SUCCESS" : "FAILED");
    });
});
    
    // Add to chat container
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
