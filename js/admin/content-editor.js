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
    
    console.log("Admin user detected, initializing content editor");
    
    // Add admin indicator class to body
    document.body.classList.add('admin-mode');
    
    // Initialize edit buttons for sections
    initializeEditButtons();
    
    // Initialize accordion header editing
    initializeAccordionHeaderEditing();
    
    // Initialize edit modal handlers
    const editModal = document.getElementById('contentEditModal');
    if (editModal) {
        const saveButton = editModal.querySelector('#saveContentBtn');
        if (saveButton) {
            saveButton.addEventListener('click', saveContent);
        }
        
        // Initialize rich text editor when modal is shown
        editModal.addEventListener('shown.bs.modal', initializeRichTextEditor);
    }
    
    // Load saved content from Firebase
    loadContent();
});

function isScheduleSection(section) {
    return Boolean(section && section.id && section.id.includes('ScheduleSection'));
}

function ensureScheduleSafeEditor() {
    let scheduleSafeEditor = document.getElementById('scheduleSafeEditor');
    if (scheduleSafeEditor) return scheduleSafeEditor;

    const modalBody = document.querySelector('#contentEditModal .modal-body');
    const richEditorRow = document.getElementById('richTextEditor')?.closest('.row');
    if (!modalBody) return null;

    scheduleSafeEditor = document.createElement('div');
    scheduleSafeEditor.id = 'scheduleSafeEditor';
    scheduleSafeEditor.className = 'safe-schedule-editor d-none';

    if (richEditorRow) {
        richEditorRow.insertAdjacentElement('afterend', scheduleSafeEditor);
    } else {
        modalBody.appendChild(scheduleSafeEditor);
    }

    return scheduleSafeEditor;
}

function setEditorMode(mode) {
    const toolbar = document.querySelector('.editor-toolbar');
    const richEditorRow = document.getElementById('richTextEditor')?.closest('.row');
    const scheduleSafeEditor = ensureScheduleSafeEditor();
    const isScheduleMode = mode === 'schedule';

    toolbar?.classList.toggle('d-none', isScheduleMode);
    richEditorRow?.classList.toggle('d-none', isScheduleMode);
    scheduleSafeEditor?.classList.toggle('d-none', !isScheduleMode);
}

// ============================================
// EDIT BUTTONS FOR EDITABLE SECTIONS
// ============================================

function initializeEditButtons() {
    const editableSections = document.querySelectorAll('.editable-section');
    
    editableSections.forEach(section => {
        // Skip if already has edit button
        if (section.querySelector('.edit-button')) return;
        
        // Create edit button
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.innerHTML = '<i class="bi bi-pencil"></i> <span>Edit</span>';
        editButton.dataset.sectionId = section.id;
        
        // Add click handler
        editButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openEditModal(section);
        });
        
        // Append to section
        section.appendChild(editButton);
    });
}

// ============================================
// ACCORDION HEADER EDITING (Day titles)
// ============================================

function initializeAccordionHeaderEditing() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    const contentNamespace = document.body.dataset.contentNamespace || 'default';
    
    accordionHeaders.forEach((header, index) => {
        // Create unique ID for saving
        const headerId = `${contentNamespace}_accordionHeader_${index}`;
        header.dataset.headerId = headerId;
        
        // Create edit button for header
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.innerHTML = '<i class="bi bi-pencil"></i>';
        editButton.title = 'Edit day title';
        
        // Add click handler
        editButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openHeaderEditModal(header);
        });
        
        // Append to header
        header.appendChild(editButton);
    });
}

// Open inline edit for accordion header
function openHeaderEditModal(header) {
    const accordionButton = header.querySelector('.accordion-button');
    if (!accordionButton) return;
    
    const currentText = accordionButton.textContent.trim();
    const headerId = header.dataset.headerId;
    
    // Create inline edit input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'form-control header-inline-edit';
    input.style.cssText = `
        position: absolute;
        top: 50%;
        left: 20px;
        right: 80px;
        transform: translateY(-50%);
        z-index: 100;
        font-weight: 600;
        font-size: 1.1rem;
        padding: 10px 16px;
        border-radius: 8px;
        border: 2px solid #356FBE;
        box-shadow: 0 4px 12px rgba(53, 111, 190, 0.2);
    `;
    
    // Hide original button text
    accordionButton.style.color = 'transparent';
    
    // Add input to header
    header.style.position = 'relative';
    header.appendChild(input);
    input.focus();
    input.select();
    
    // Save on Enter or blur
    const saveEdit = async () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
            accordionButton.textContent = newText;
            
            // Save to Firebase
            try {
                const contentRef = doc(db, "siteContent", headerId);
                await setDoc(contentRef, {
                    content: newText,
                    type: 'accordionHeader',
                    updatedAt: serverTimestamp(),
                    updatedBy: localStorage.getItem('userId')
                }, { merge: true });
                
                showAlert('Day title updated!', 'success');
            } catch (error) {
                console.error("Error saving header:", error);
                showAlert('Error saving: ' + error.message, 'danger');
            }
        }
        
        // Cleanup
        accordionButton.style.color = '';
        input.remove();
    };
    
    // Cancel on Escape
    const cancelEdit = () => {
        accordionButton.style.color = '';
        input.remove();
    };
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
    
    input.addEventListener('blur', saveEdit);
}

// ============================================
// EDIT MODAL FOR SECTIONS
// ============================================

function openEditModal(section) {
    const modalElement = document.getElementById('contentEditModal');
    const modal = new bootstrap.Modal(modalElement);
    const modalTitle = document.getElementById('editModalLabel');
    const mode = isScheduleSection(section) ? 'schedule' : 'rich';
    
    // Set modal title
    modalTitle.textContent = `Edit: ${section.dataset.title || section.id}`;
    modalElement.dataset.editorMode = mode;
    setEditorMode(mode);
    
    // Store section ID for saving
    document.getElementById('currentSectionId').value = section.id;
    
    // Show modal
    modal.show();
    
    // Set content after modal is shown
    setTimeout(() => {
        if (mode === 'schedule') {
            populateScheduleSafeEditor(section);
        } else {
            populateRichTextEditor(section);
        }
    }, 100);
}

function populateRichTextEditor(section) {
    const richTextEditor = document.getElementById('richTextEditor');
    const livePreview = document.getElementById('livePreview');

    if (richTextEditor && livePreview) {
        // Clone section and remove edit button
        const sectionClone = section.cloneNode(true);
        const editButton = sectionClone.querySelector('.edit-button');
        if (editButton) editButton.remove();

        const content = sectionClone.innerHTML;
        richTextEditor.innerHTML = content;
        livePreview.innerHTML = content;
    }
}

function populateScheduleSafeEditor(section) {
    const scheduleSafeEditor = ensureScheduleSafeEditor();
    if (!scheduleSafeEditor) return;

    const headings = getScheduleHeadings(section);
    const scheduleItems = Array.from(section.querySelectorAll('.schedule-item')).map(getScheduleItemSnapshot);

    const headingHtml = headings.map(heading => `
        <div class="schedule-edit-card schedule-heading-card" data-heading-index="${heading.index}">
            <label class="form-label fw-bold">Section heading</label>
            <input type="text" class="form-control" data-field="text" data-original="${escapeHtml(heading.text)}" value="${escapeHtml(heading.text)}">
        </div>
    `).join('');

    const itemHtml = scheduleItems.map(item => `
        <div class="schedule-edit-card" data-item-index="${item.index}">
            <div class="row g-3">
                <div class="col-md-3">
                    <label class="form-label fw-bold">Time</label>
                    <input type="text" class="form-control" data-field="time" data-original="${escapeHtml(item.time)}" value="${escapeHtml(item.time)}">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold">Badge</label>
                    <input type="text" class="form-control" data-field="badge" data-original="${escapeHtml(item.badge)}" value="${escapeHtml(item.badge)}">
                </div>
                <div class="col-md-6">
                    <label class="form-label fw-bold">Event text</label>
                    <textarea class="form-control" data-field="body" data-original="${escapeHtml(item.body)}" rows="2">${escapeHtml(item.body)}</textarea>
                </div>
            </div>
        </div>
    `).join('');

    scheduleSafeEditor.innerHTML = `
        <div class="alert alert-warning py-2 small mb-3">
            Protected schedule editor: saves text fields only, while buttons, links, calendar data, and embedded controls stay intact.
        </div>
        ${headingHtml}
        ${itemHtml || '<div class="text-muted">No schedule items found.</div>'}
    `;
}

// ============================================
// RICH TEXT EDITOR
// ============================================

function initializeRichTextEditor() {
    const richTextEditor = document.getElementById('richTextEditor');
    const livePreview = document.getElementById('livePreview');
    const toolbar = document.querySelector('.editor-toolbar');
    
    if (!richTextEditor || !livePreview || !toolbar) return;
    if (richTextEditor.dataset.initialized === 'true') return;
    richTextEditor.dataset.initialized = 'true';
    
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
            
            richTextEditor.focus();
            document.execCommand(command, false, null);
            livePreview.innerHTML = richTextEditor.innerHTML;
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
            
            livePreview.innerHTML = richTextEditor.innerHTML;
            updateToolbarStates();
        });
    }
    
    // Hyperlink button handler
    const hyperlinkBtn = document.getElementById('hyperlinkBtn');
    if (hyperlinkBtn) {
        hyperlinkBtn.addEventListener('click', function() {
            richTextEditor.focus();
            
            const selection = window.getSelection();
            const selectedText = selection.toString();
            
            let url = prompt('Enter the URL:', 'https://');
            if (url && url.trim()) {
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                
                if (selectedText) {
                    document.execCommand('createLink', false, url);
                } else {
                    const linkHtml = `<a href="${url}" target="_blank">${url}</a>`;
                    document.execCommand('insertHTML', false, linkHtml);
                }
                
                livePreview.innerHTML = richTextEditor.innerHTML;
                updateToolbarStates();
            }
        });
    }
    
    // Update toolbar states
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
    
    // Keyboard shortcuts
    richTextEditor.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
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
    
    // Handle paste - clean up content
    richTextEditor.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
        
        setTimeout(() => {
            livePreview.innerHTML = richTextEditor.innerHTML;
        }, 10);
    });
    
    updateToolbarStates();
}

// ============================================
// PROTECTED SCHEDULE EDITING
// ============================================

function getScheduleHeadings(section) {
    return Array.from(section.children)
        .filter(child => /^H[1-6]$/.test(child.tagName))
        .map((heading, index) => ({
            index,
            text: heading.textContent.trim()
        }));
}

function getScheduleItemSnapshot(item, index) {
    const timeElement = item.querySelector('.fw-bold');
    const badgeElement = item.querySelector('.badge');
    const bodyElement = item.querySelector('p');

    return {
        index,
        time: getOwnText(timeElement),
        badge: badgeElement?.textContent.trim() || '',
        body: bodyElement?.textContent.trim() || ''
    };
}

function getOwnText(element) {
    if (!element) return '';
    return Array.from(element.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function setOwnText(element, value) {
    if (!element) return;

    const newValue = String(value || '').trim();
    const textNode = Array.from(element.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());

    if (textNode) {
        textNode.textContent = newValue;
    } else {
        element.insertBefore(document.createTextNode(newValue), element.firstChild);
    }
}

function collectScheduleEditorPatches() {
    const scheduleSafeEditor = document.getElementById('scheduleSafeEditor');
    const scheduleItems = [];
    const scheduleHeadings = [];

    if (!scheduleSafeEditor) {
        return { scheduleItems, scheduleHeadings };
    }

    scheduleSafeEditor.querySelectorAll('.schedule-heading-card').forEach(card => {
        const input = card.querySelector('[data-field="text"]');
        if (!input) return;

        const value = input.value.trim();
        const original = input.dataset.original || '';
        if (value !== original) {
            scheduleHeadings.push({
                index: Number(card.dataset.headingIndex),
                text: value
            });
        }
    });

    scheduleSafeEditor.querySelectorAll('.schedule-edit-card[data-item-index]').forEach(card => {
        const patch = { index: Number(card.dataset.itemIndex) };

        card.querySelectorAll('[data-field]').forEach(field => {
            const value = field.value.trim();
            const original = field.dataset.original || '';
            if (value !== original) {
                patch[field.dataset.field] = value;
            }
        });

        if (Object.keys(patch).length > 1) {
            scheduleItems.push(patch);
        }
    });

    return { scheduleItems, scheduleHeadings };
}

function mergeSchedulePatches(existingPatches = [], newPatches = []) {
    const patchesByIndex = new Map();

    if (Array.isArray(existingPatches)) {
        existingPatches.forEach(patch => {
            if (Number.isInteger(patch.index)) {
                patchesByIndex.set(patch.index, { ...patch });
            }
        });
    }

    if (Array.isArray(newPatches)) {
        newPatches.forEach(patch => {
            if (Number.isInteger(patch.index)) {
                patchesByIndex.set(patch.index, {
                    ...(patchesByIndex.get(patch.index) || { index: patch.index }),
                    ...patch
                });
            }
        });
    }

    return Array.from(patchesByIndex.values()).sort((a, b) => a.index - b.index);
}

function applySchedulePatches(section, data = {}) {
    const headings = getScheduleHeadings(section);
    const scheduleItems = Array.from(section.querySelectorAll('.schedule-item'));

    if (Array.isArray(data.scheduleHeadings)) {
        data.scheduleHeadings.forEach(headingPatch => {
            const heading = headings[headingPatch.index];
            if (heading && typeof headingPatch.text === 'string') {
                Array.from(section.children)
                    .filter(child => /^H[1-6]$/.test(child.tagName))[headingPatch.index]
                    .textContent = headingPatch.text;
            }
        });
    }

    if (Array.isArray(data.scheduleItems)) {
        data.scheduleItems.forEach(itemPatch => {
            const item = scheduleItems[itemPatch.index];
            if (!item) return;

            if (typeof itemPatch.time === 'string') {
                setOwnText(item.querySelector('.fw-bold'), itemPatch.time);
                updateCalendarTime(item, itemPatch.time);
            }

            if (typeof itemPatch.badge === 'string') {
                const badge = item.querySelector('.badge');
                if (badge) badge.textContent = itemPatch.badge;
            }

            if (typeof itemPatch.body === 'string') {
                const body = item.querySelector('p');
                if (body) body.textContent = itemPatch.body;
                updateCalendarDescription(item, itemPatch.body);
            }
        });
    }
}

function updateCalendarDescription(scheduleItem, bodyText) {
    const calendarButton = scheduleItem.querySelector('.add-to-calendar-btn');
    const cleanBodyText = String(bodyText || '').trim();

    if (!calendarButton || !cleanBodyText) return;

    calendarButton.dataset.eventDescription = cleanBodyText;
    calendarButton.dataset.eventTitle = `TFPU 2026 - ${cleanBodyText.substring(0, 120)}`;
}

function updateCalendarTime(scheduleItem, timeText) {
    const calendarButton = scheduleItem.querySelector('.add-to-calendar-btn');
    if (!calendarButton) return;

    const parsedTime = parseTimeRange(timeText);
    if (!parsedTime) return;

    const currentStartDate = (calendarButton.dataset.eventStart || '').split('T')[0];
    const currentEndDate = (calendarButton.dataset.eventEnd || calendarButton.dataset.eventStart || '').split('T')[0];
    if (!currentStartDate || !currentEndDate) return;

    calendarButton.dataset.eventStart = `${currentStartDate}T${parsedTime.start}:00`;
    calendarButton.dataset.eventEnd = `${currentEndDate}T${parsedTime.end}:00`;
}

function parseTimeRange(timeText) {
    const match = String(timeText || '').match(/(\d{1,2}:\d{2})\s*(?:-|–|—)\s*(\d{1,2}:\d{2})/);
    if (!match) return null;

    return {
        start: normalizeTime(match[1]),
        end: normalizeTime(match[2])
    };
}

function normalizeTime(time) {
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
}

// ============================================
// SAVE CONTENT
// ============================================

async function saveContent() {
    const sectionId = document.getElementById('currentSectionId').value;
    const section = document.getElementById(sectionId);
    const richTextEditor = document.getElementById('richTextEditor');
    
    if (!section) return;

    const editModal = document.getElementById('contentEditModal');
    if (isScheduleSection(section) || editModal?.dataset.editorMode === 'schedule') {
        await saveScheduleContent(sectionId, section);
        return;
    }

    if (!richTextEditor) return;
    
    const content = richTextEditor.innerHTML;
    
    try {
        // Save to Firebase
        const contentRef = doc(db, "siteContent", sectionId);
        await setDoc(contentRef, {
            content: content,
            type: 'section',
            updatedAt: serverTimestamp(),
            updatedBy: localStorage.getItem('userId')
        }, { merge: true });
        
        // Update section content
        updateSectionContent(section, content);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('contentEditModal'));
        modal.hide();
        
        showAlert('Content updated successfully!', 'success');
        
    } catch (error) {
        console.error("Error saving content:", error);
        showAlert('Error saving content: ' + error.message, 'danger');
    }
}

async function saveScheduleContent(sectionId, section) {
    const schedulePatches = collectScheduleEditorPatches();
    const hasChanges = schedulePatches.scheduleItems.length > 0 || schedulePatches.scheduleHeadings.length > 0;

    if (!hasChanges) {
        showAlert('No schedule changes to save.', 'info');
        return;
    }

    try {
        const contentRef = doc(db, "siteContent", sectionId);
        const existingSnap = await getDoc(contentRef);
        const existingData = existingSnap.exists() ? existingSnap.data() : {};

        const scheduleItems = mergeSchedulePatches(existingData.scheduleItems, schedulePatches.scheduleItems);
        const scheduleHeadings = mergeSchedulePatches(existingData.scheduleHeadings, schedulePatches.scheduleHeadings);

        await setDoc(contentRef, {
            content: null,
            type: 'scheduleSection',
            scheduleItems,
            scheduleHeadings,
            updatedAt: serverTimestamp(),
            updatedBy: localStorage.getItem('userId')
        }, { merge: true });

        applySchedulePatches(section, { scheduleItems, scheduleHeadings });

        const modal = bootstrap.Modal.getInstance(document.getElementById('contentEditModal'));
        modal.hide();

        showAlert('Schedule updated safely.', 'success');
    } catch (error) {
        console.error("Error saving schedule content:", error);
        showAlert('Error saving schedule: ' + error.message, 'danger');
    }
}

// ============================================
// UPDATE SECTION CONTENT
// ============================================

function updateSectionContent(section, newContent) {
    if (isScheduleSection(section)) {
        console.warn(`Ignoring legacy HTML content update for protected schedule section: ${section.id}`);
        return;
    }

    // Check for functional elements that need preserving
    const hasFunctionalElements = section.querySelector('#lunchTitle, #pizzaChoice, #clearPizzaBtn, #massageTimeSlot, #bookMassageBtn');
    
    if (hasFunctionalElements) {
        console.log('Updating section with functional elements:', section.id);
        
        // Parse new content
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${newContent}</div>`, 'text/html');
        const newContentDiv = doc.body.firstChild;
        
        // Remove non-functional children
        const children = Array.from(section.children);
        children.forEach(child => {
            if (!child.classList.contains('edit-button') && 
                !child.id?.includes('lunch') && 
                !child.id?.includes('pizza') &&
                !child.id?.includes('massage')) {
                child.remove();
            }
        });
        
        // Add new content
        Array.from(newContentDiv.children).forEach(child => {
            if (!child.classList.contains('edit-button')) {
                section.insertBefore(child.cloneNode(true), section.querySelector('.edit-button'));
            }
        });
        
        // Reinitialize functional elements
        setTimeout(() => {
            if (window.reinitializePizzaSelection) {
                window.reinitializePizzaSelection();
            }
        }, 100);
        
    } else {
        // Simple content replacement
        section.innerHTML = newContent;
    }
    
    // Re-add edit button if missing
    if (!section.querySelector('.edit-button')) {
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.innerHTML = '<i class="bi bi-pencil"></i> <span>Edit</span>';
        editButton.dataset.sectionId = section.id;
        editButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openEditModal(section);
        });
        section.appendChild(editButton);
    }
}

// ============================================
// LOAD CONTENT FROM FIREBASE
// ============================================

async function loadContent() {
    // Load editable sections
    const editableSections = document.querySelectorAll('.editable-section');
    
    for (const section of editableSections) {
        try {
            const contentRef = doc(db, "siteContent", section.id);
            const contentSnap = await getDoc(contentRef);
            
            if (contentSnap.exists()) {
                const contentData = contentSnap.data();

                if (isScheduleSection(section)) {
                    if (Array.isArray(contentData.scheduleItems) || Array.isArray(contentData.scheduleHeadings)) {
                        applySchedulePatches(section, contentData);
                    } else if (contentData.content) {
                        console.warn(`Legacy full-HTML schedule content ignored for protected section: ${section.id}`);
                    }
                    continue;
                }

                if (contentData.content) {
                    updateSectionContent(section, contentData.content);
                }
            }
        } catch (error) {
            console.error(`Error loading content for section ${section.id}:`, error);
        }
    }
    
    // Load accordion headers
    const accordionHeaders = document.querySelectorAll('.accordion-header[data-header-id]');
    
    for (const header of accordionHeaders) {
        try {
            const headerId = header.dataset.headerId;
            const contentRef = doc(db, "siteContent", headerId);
            const contentSnap = await getDoc(contentRef);
            
            if (contentSnap.exists() && contentSnap.data().content) {
                const accordionButton = header.querySelector('.accordion-button');
                if (accordionButton) {
                    accordionButton.textContent = contentSnap.data().content;
                }
            }
        } catch (error) {
            console.error(`Error loading header ${header.dataset.headerId}:`, error);
        }
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        // Create alert container if missing
        const container = document.createElement('div');
        container.id = 'alertContainer';
        container.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 9999; max-width: 350px;';
        document.body.appendChild(container);
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.style.cssText = 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 12px;';
    alert.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}"></i>
            <span>${escapeHtml(message)}</span>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    (document.getElementById('alertContainer') || document.body).appendChild(alert);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 3000);
}

// Export for external use
window.contentEditor = {
    openEditModal,
    openHeaderEditModal,
    loadContent,
    showAlert
};
