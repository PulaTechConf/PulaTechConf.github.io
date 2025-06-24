import { db } from '../firebase-config.js';
import { 
    doc, 
    getDoc, 
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log("Content editor loaded");
    
    // Check if user is admin
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        console.log("Non-admin user, content editing disabled");
        return;
    }
    
    // Add edit buttons to editable sections
    initializeEditButtons();
    
    // Initialize edit modal handlers
    const editModal = document.getElementById('contentEditModal');
    if (editModal) {
        const saveButton = editModal.querySelector('#saveContentBtn');
        saveButton.addEventListener('click', saveContent);
    }
    
    // Function to initialize edit buttons
    function initializeEditButtons() {
        const editableSections = document.querySelectorAll('.editable-section');
        
        editableSections.forEach(section => {
            // Create edit button
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.innerHTML = '<i class="bi bi-pencil"></i> Edit';
            editButton.dataset.sectionId = section.id;
            
            // Add click handler
            editButton.addEventListener('click', function() {
                openEditModal(section);
            });
            
            // Append to section
            section.appendChild(editButton);
        });
    }
    
    // Function to open edit modal for a section
    function openEditModal(section) {
        const modal = new bootstrap.Modal(document.getElementById('contentEditModal'));
        const modalTitle = document.getElementById('editModalLabel');
        const contentEditor = document.getElementById('contentEditor');
        
        // Set modal title
        modalTitle.textContent = `Edit: ${section.dataset.title || section.id}`;
        
        // Populate editor with current content
        contentEditor.value = section.innerHTML;
        
        // Store section ID for saving
        document.getElementById('currentSectionId').value = section.id;
        
        // Show modal
        modal.show();
    }
    
    // Function to save edited content
    async function saveContent() {
        const sectionId = document.getElementById('currentSectionId').value;
        const section = document.getElementById(sectionId);
        const content = document.getElementById('contentEditor').value;
        
        if (!section || !content) return;
        
        try {
            // Save to Firebase
            const contentRef = doc(db, "siteContent", sectionId);
            await setDoc(contentRef, {
                content: content,
                updatedAt: serverTimestamp(),
                updatedBy: localStorage.getItem('userId')
            }, { merge: true });
            
            // Update section in UI
            section.innerHTML = content;
            
            // Add edit button back
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.innerHTML = '<i class="bi bi-pencil"></i> Edit';
            editButton.dataset.sectionId = section.id;
            editButton.addEventListener('click', function() {
                openEditModal(section);
            });
            section.appendChild(editButton);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('contentEditModal'));
            modal.hide();
            
            // Show success message
            showAlert('Content updated successfully!', 'success');
            
        } catch (error) {
            console.error("Error saving content:", error);
            showAlert('Error saving content: ' + error.message, 'danger');
        }
    }
    
    // Load content from Firebase
    async function loadContent() {
        const editableSections = document.querySelectorAll('.editable-section');
        
        for (const section of editableSections) {
            try {
                const contentRef = doc(db, "siteContent", section.id);
                const contentSnap = await getDoc(contentRef);
                
                if (contentSnap.exists() && contentSnap.data().content) {
                    section.innerHTML = contentSnap.data().content;
                    
                    // Re-add edit button
                    const editButton = document.createElement('button');
                    editButton.className = 'edit-button';
                    editButton.innerHTML = '<i class="bi bi-pencil"></i> Edit';
                    editButton.dataset.sectionId = section.id;
                    editButton.addEventListener('click', function() {
                        openEditModal(section);
                    });
                    section.appendChild(editButton);
                }
            } catch (error) {
                console.error(`Error loading content for section ${section.id}:`, error);
            }
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
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 3000);
    }
    
    // Load initial content
    loadContent();
});
