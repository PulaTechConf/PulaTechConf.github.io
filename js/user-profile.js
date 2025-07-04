import { db, storage } from './firebase-config.js';
import { 
    doc, 
    getDoc, 
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("User profile loaded");
    
    // Load user profile data
    loadUserProfile();
    
    // Load pizza selection
    loadPizzaSelection();
    
    // Set up file upload functionality
    setupFileUpload();
    
    // Check for existing presentation
    checkExistingPresentation();
    
    async function loadUserProfile() {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        
        try {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // Populate form fields
                document.getElementById('firstName').value = userData.firstName || '';
                document.getElementById('lastName').value = userData.lastName || '';
                document.getElementById('email').value = userData.email || '';
                document.getElementById('affiliation').value = userData.affiliation || '';
                
                // Format and display role
                const role = localStorage.getItem('userRole') || 'general';
                const roleDisplayNames = {
                    'general': 'General Participant',
                    'organizer': 'Organizer',
                    'admin': 'Administrator'
                };
                document.getElementById('userRole').value = roleDisplayNames[role] || role;
            }
        } catch (error) {
            console.error("Error loading user profile:", error);
            showAlert('Error loading profile data', 'danger');
        }
    }
    
    async function loadPizzaSelection() {
        const userId = localStorage.getItem('userId');
        const pizzaContainer = document.getElementById('pizzaSelectionSummary');
        
        if (!userId) return;
        
        try {
            const pizzaRef = doc(db, "pizzaSelections", userId);
            const pizzaSnap = await getDoc(pizzaRef);
            
            if (pizzaSnap.exists()) {
                const pizzaData = pizzaSnap.data();
                const pizzaNames = {
                    'margherita': 'Margherita',
                    'pepperoni': 'Pepperoni',
                    'vegetarian': 'Vegetarian',
                    'quattro-formaggi': 'Quattro Formaggi',
                    'prosciutto': 'Prosciutto',
                    'gluten-free': 'Gluten Free'
                };
                
                pizzaContainer.innerHTML = `
                    <div class="alert alert-success">
                        <h6><i class="bi bi-check-circle me-2"></i>Selection Confirmed</h6>
                        <p class="mb-0"><strong>${pizzaNames[pizzaData.pizzaType] || pizzaData.pizzaType}</strong></p>
                        <small class="text-muted">Selected on ${pizzaData.timestamp ? new Date(pizzaData.timestamp.seconds * 1000).toLocaleDateString() : 'Unknown'}</small>
                    </div>
                `;
            } else {
                pizzaContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <h6><i class="bi bi-exclamation-triangle me-2"></i>No Selection</h6>
                        <p class="mb-0">You haven't selected your pizza preference yet.</p>
                        <small class="text-muted">Please make your selection for Day 2 lunch.</small>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Error loading pizza selection:", error);
            pizzaContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="bi bi-exclamation-circle me-2"></i>Error</h6>
                    <p class="mb-0">Unable to load pizza selection.</p>
                </div>
            `;
        }
    }
    
    function setupFileUpload() {
        const fileInput = document.getElementById('presentationFile');
        const uploadBtn = document.getElementById('uploadBtn');
        const replaceBtn = document.getElementById('replaceBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        
        // Enable upload button when file is selected
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                // Validate file type
                if (file.type !== 'application/pdf') {
                    showAlert('Please select a PDF file only.', 'warning');
                    this.value = '';
                    uploadBtn.disabled = true;
                    return;
                }
                
                // Validate file size (10MB limit)
                if (file.size > 10 * 1024 * 1024) {
                    showAlert('File size must be less than 10MB.', 'warning');
                    this.value = '';
                    uploadBtn.disabled = true;
                    return;
                }
                
                uploadBtn.disabled = false;
            } else {
                uploadBtn.disabled = true;
            }
        });
        
        // Upload button click
        uploadBtn.addEventListener('click', uploadPresentation);
        
        // Replace button click
        replaceBtn.addEventListener('click', function() {
            document.getElementById('uploadedSection').classList.add('d-none');
            document.getElementById('uploadSection').classList.remove('d-none');
            fileInput.value = '';
            uploadBtn.disabled = true;
        });
        
        // Download button click
        downloadBtn.addEventListener('click', downloadPresentation);
    }
    
    async function uploadPresentation() {
        const userId = localStorage.getItem('userId');
        const fileInput = document.getElementById('presentationFile');
        const file = fileInput.files[0];
        
        if (!file || !userId) return;
        
        const uploadProgress = document.getElementById('uploadProgress');
        const progressBar = uploadProgress.querySelector('.progress-bar');
        
        try {
            // Show progress
            uploadProgress.classList.remove('d-none');
            progressBar.style.width = '0%';
            
            // Create file reference
            const fileName = `presentations/${userId}_${file.name}`;
            const storageRef = ref(storage, fileName);
            
            // Upload file
            progressBar.style.width = '50%';
            const snapshot = await uploadBytes(storageRef, file);
            
            progressBar.style.width = '75%';
            
            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            progressBar.style.width = '90%';
            
            // Save metadata to Firestore
            const presentationRef = doc(db, "presentations", userId);
            await setDoc(presentationRef, {
                fileName: file.name,
                fileSize: file.size,
                uploadDate: serverTimestamp(),
                downloadURL: downloadURL,
                storagePath: fileName,
                userId: userId
            });
            
            progressBar.style.width = '100%';
            
            // Hide progress and show success
            setTimeout(() => {
                uploadProgress.classList.add('d-none');
                showUploadSuccess(file.name, file.size, downloadURL);
                showAlert('Presentation uploaded successfully!', 'success');
            }, 500);
            
        } catch (error) {
            console.error("Error uploading presentation:", error);
            uploadProgress.classList.add('d-none');
            showAlert('Error uploading presentation: ' + error.message, 'danger');
        }
    }
    
    async function checkExistingPresentation() {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        
        try {
            const presentationRef = doc(db, "presentations", userId);
            const presentationSnap = await getDoc(presentationRef);
            
            if (presentationSnap.exists()) {
                const data = presentationSnap.data();
                showUploadSuccess(data.fileName, data.fileSize, data.downloadURL);
            }
        } catch (error) {
            console.error("Error checking existing presentation:", error);
        }
    }
    
    function showUploadSuccess(fileName, fileSize, downloadURL) {
        const uploadSection = document.getElementById('uploadSection');
        const uploadedSection = document.getElementById('uploadedSection');
        const uploadedFileInfo = document.getElementById('uploadedFileInfo');
        
        // Hide upload section, show uploaded section
        uploadSection.classList.add('d-none');
        uploadedSection.classList.remove('d-none');
        
        // Format file size
        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        // Update file info
        uploadedFileInfo.innerHTML = `
            <p class="mb-1"><strong>File:</strong> ${fileName}</p>
            <p class="mb-0"><strong>Size:</strong> ${formatFileSize(fileSize)}</p>
        `;
        
        // Store download URL for download button
        document.getElementById('downloadBtn').dataset.downloadUrl = downloadURL;
        document.getElementById('downloadBtn').dataset.fileName = fileName;
    }
    
    async function downloadPresentation() {
        const downloadBtn = document.getElementById('downloadBtn');
        const downloadURL = downloadBtn.dataset.downloadUrl;
        const fileName = downloadBtn.dataset.fileName;
        
        if (downloadURL) {
            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = downloadURL;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    // Show alert message
    function showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    }
});
