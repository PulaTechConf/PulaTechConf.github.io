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
        
        // Initialize rich text editor when modal is shown
        editModal.addEventListener('shown.bs.modal', initializeRichTextEditor);
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
        
        // Set modal title
        modalTitle.textContent = `Edit: ${section.dataset.title || section.id}`;
        
        // Store section ID for saving
        document.getElementById('currentSectionId').value = section.id;
        
        // Show modal (rich text editor will be initialized when modal is shown)
        modal.show();
        
        // Set the content after modal is shown
        setTimeout(() => {
            const richTextEditor = document.getElementById('richTextEditor');
            const livePreview = document.getElementById('livePreview');
            
            if (richTextEditor && livePreview) {
                // Get content without the edit button
                const sectionClone = section.cloneNode(true);
                const editButton = sectionClone.querySelector('.edit-button');
                if (editButton) {
                    editButton.remove();
                }
                
                const content = sectionClone.innerHTML;
                richTextEditor.innerHTML = content;
                livePreview.innerHTML = content;
            }
        }, 100);
    }
    
    // Initialize rich text editor functionality
    function initializeRichTextEditor() {
        const richTextEditor = document.getElementById('richTextEditor');
        const livePreview = document.getElementById('livePreview');
        const toolbar = document.querySelector('.editor-toolbar');
        
        if (!richTextEditor || !livePreview || !toolbar) return;
        
        // Update live preview when editor content changes
        richTextEditor.addEventListener('input', function() {
            livePreview.innerHTML = richTextEditor.innerHTML;
        });
        
        // Toolbar button handlers
        toolbar.addEventListener('click', function(e) {
            const button = e.target.closest('button[data-command]');
            if (button) {
                e.preventDefault();
                const command = button.dataset.command;
                
                // Focus editor before executing command
                richTextEditor.focus();
                
                // Execute formatting command
                document.execCommand(command, false, null);
                
                // Update live preview
                livePreview.innerHTML = richTextEditor.innerHTML;
                
                // Update button states
                updateToolbarStates();
            }
        });
        
        // Heading select handler
        const headingSelect = document.getElementById('headingSelect');
        if (headingSelect) {
            headingSelect.addEventListener('change', function() {
                const value = this.value;
                richTextEditor.focus();
                
                if (value) {
                    document.execCommand('formatBlock', false, value);
                } else {
                    document.execCommand('formatBlock', false, 'div');
                }
                
                // Update live preview
                livePreview.innerHTML = richTextEditor.innerHTML;
                updateToolbarStates();
            });
        }
        
        // Update toolbar button states based on current selection
        richTextEditor.addEventListener('keyup', updateToolbarStates);
        richTextEditor.addEventListener('mouseup', updateToolbarStates);
        
        function updateToolbarStates() {
            const commands = ['bold', 'italic', 'underline'];
            
            commands.forEach(command => {
                const button = toolbar.querySelector(`[data-command="${command}"]`);
                if (button) {
                    if (document.queryCommandState(command)) {
                        button.classList.add('active');
                    } else {
                        button.classList.remove('active');
                    }
                }
            });
            
            // Update heading select
            const headingSelect = document.getElementById('headingSelect');
            if (headingSelect) {
                const block = document.queryCommandValue('formatBlock');
                if (block && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(block.toLowerCase())) {
                    headingSelect.value = block.toLowerCase();
                } else {
                    headingSelect.value = '';
                }
            }
        }
        
        // Prevent default browser shortcuts that might interfere
        richTextEditor.addEventListener('keydown', function(e) {
            // Handle common keyboard shortcuts
            if (e.ctrlKey) {
                switch(e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        document.execCommand('bold');
                        livePreview.innerHTML = richTextEditor.innerHTML;
                        updateToolbarStates();
                        break;
                    case 'i':
                        e.preventDefault();
                        document.execCommand('italic');
                        livePreview.innerHTML = richTextEditor.innerHTML;
                        updateToolbarStates();
                        break;
                    case 'u':
                        e.preventDefault();
                        document.execCommand('underline');
                        livePreview.innerHTML = richTextEditor.innerHTML;
                        updateToolbarStates();
                        break;
                }
            }
        });
        
        // Handle paste events to clean up content
        richTextEditor.addEventListener('paste', function(e) {
            e.preventDefault();
            
            // Get plain text from clipboard
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            
            // Insert as plain text
            document.execCommand('insertText', false, text);
            
            // Update live preview
            setTimeout(() => {
                livePreview.innerHTML = richTextEditor.innerHTML;
            }, 10);
        });
        
        // Initialize toolbar states
        updateToolbarStates();
    }
    
    // Function to save edited content
    async function saveContent() {
        const sectionId = document.getElementById('currentSectionId').value;
        const section = document.getElementById(sectionId);
        const richTextEditor = document.getElementById('richTextEditor');
        
        if (!section || !richTextEditor) return;
        
        const content = richTextEditor.innerHTML;
        
        try {
            // Save to Firebase
            const contentRef = doc(db, "siteContent", sectionId);
            await setDoc(contentRef, {
                content: content,
                updatedAt: serverTimestamp(),
                updatedBy: localStorage.getItem('userId')
            }, { merge: true });
            
            // Update section content while preserving functional elements
            updateSectionContent(section, content);
            
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
    
    // Function to update section content while preserving functional elements
    function updateSectionContent(section, newContent) {
        const sectionId = section.id;
        
        // Check if this is a section with functional elements (like schedule)
        const hasFunctionalElements = section.querySelector('#lunchTitle, #pizzaChoice, #clearPizzaBtn');
        
        if (hasFunctionalElements) {
            console.log('Updating section with functional elements:', sectionId);
            
            // For sections with functional elements, update more carefully
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${newContent}</div>`, 'text/html');
            const newContentDiv = doc.body.firstChild;
            
            // Update the section content but preserve functional elements
            const children = Array.from(section.children);
            children.forEach(child => {
                if (!child.classList.contains('edit-button') && 
                    !child.id.includes('lunch') && 
                    !child.id.includes('pizza')) {
                    child.remove();
                }
            });
            
            // Add new content elements
            Array.from(newContentDiv.children).forEach(child => {
                if (!child.classList.contains('edit-button')) {
                    section.insertBefore(child.cloneNode(true), section.querySelector('.edit-button'));
                }
            });
            
            // Reinitialize pizza selection functionality
            setTimeout(() => {
                if (window.reinitializePizzaSelection) {
                    window.reinitializePizzaSelection();
                }
            }, 100);
            
        } else {
            // For regular sections, simple content replacement
            section.innerHTML = newContent;
        }
        
        // Add edit button back
        if (!section.querySelector('.edit-button')) {
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.innerHTML = '<i class="bi bi-pencil"></i> Edit';
            editButton.dataset.sectionId = section.id;
            editButton.addEventListener('click', function() {
                openEditModal(section);
            });
            section.appendChild(editButton);
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
                    updateSectionContent(section, contentSnap.data().content);
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
