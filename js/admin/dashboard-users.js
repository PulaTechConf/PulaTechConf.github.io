import { db } from '../firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// STATE MANAGEMENT (global)

let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let perPage = 10;

// HELPER FUNCTIONS (global)

function getRoleBadgeClass(role) {
    switch(role) {
        case 'admin': return 'bg-danger';
        case 'organizer': return 'bg-warning text-dark';
        default: return 'bg-secondary';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// FILTER LOGIC (global)

function applyFilters() {
    const searchTerm = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
    const roleFilter = document.getElementById('userRoleFilter')?.value || '';
    const showedUpFilter = document.getElementById('userShowedUpFilter')?.value || '';
    const accommodationFilter = document.getElementById('userAccommodationFilter')?.value || '';
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            (user.firstName || '').toLowerCase().includes(searchTerm) ||
            (user.lastName || '').toLowerCase().includes(searchTerm) ||
            (user.email || '').toLowerCase().includes(searchTerm) ||
            (user.affiliation || '').toLowerCase().includes(searchTerm) ||
            (user.accommodation || '').toLowerCase().includes(searchTerm);
        
        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesShowedUp = !showedUpFilter || String(user.showedUp) === showedUpFilter;
        const matchesAccommodation = !accommodationFilter || 
            (accommodationFilter === 'provided' && user.accommodation) ||
            (accommodationFilter === 'not-provided' && !user.accommodation);
        
        return matchesSearch && matchesRole && matchesShowedUp && matchesAccommodation;
    });
    
    currentPage = 1;
    renderPaginatedUsers();
}

// RENDER FUNCTIONS (global)

function renderPaginatedUsers() {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageData = filteredUsers.slice(start, end);
    
    const noResults = document.getElementById('noUsersFound');
    const mobileContainer = document.getElementById('mobileUserCards');
    
    if (filteredUsers.length === 0) {
        noResults?.classList.remove('d-none');
        document.getElementById('userTableBody').innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';
    } else {
        noResults?.classList.add('d-none');
        renderDesktopTable(pageData);
        renderMobileCards(pageData);
    }
    
    renderPagination();
}

function renderDesktopTable(data) {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No users to display</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(user => `
        <tr>
            <td class="text-center">
                <input type="checkbox" 
                       class="form-check-input showed-up-checkbox" 
                       data-user-id="${user.id}" 
                       ${user.showedUp ? 'checked' : ''}>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1 edit-name-btn" 
                        data-id="${user.id}" 
                        data-first-name="${escapeHtml(user.firstName)}" 
                        data-last-name="${escapeHtml(user.lastName)}">
                    <i class="bi bi-pencil"></i>
                </button>
                ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}
            </td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1 edit-affiliation-btn" 
                        data-id="${user.id}" 
                        data-name="${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}" 
                        data-current-affiliation="${escapeHtml(user.affiliation)}">
                    <i class="bi bi-pencil"></i>
                </button>
                ${escapeHtml(user.affiliation) || '<span class="text-muted">-</span>'}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1 edit-accommodation-btn" 
                        data-id="${user.id}" 
                        data-name="${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}" 
                        data-current-accommodation="${escapeHtml(user.accommodation)}">
                    <i class="bi bi-pencil"></i>
                </button>
                <span class="badge ${user.accommodation ? 'bg-success' : 'bg-secondary'}">
                    ${user.accommodation ? escapeHtml(user.accommodation) : 'Not provided'}
                </span>
            </td>
            <td>
                <span class="badge ${getRoleBadgeClass(user.role)}">${user.role || 'general'}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary change-role-btn" 
                        data-id="${user.id}" 
                        data-name="${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}" 
                        data-current-role="${user.role || 'general'}">
                    <i class="bi bi-person-gear"></i><span class="btn-text ms-1">Role</span>
                </button>
            </td>
        </tr>
    `).join('');
    
    addTableEventListeners();
}

function renderMobileCards(data) {
    const container = document.getElementById('mobileUserCards');
    if (!container) return;
    
    if (data.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-4">No users to display</div>';
        return;
    }
    
    container.innerHTML = data.map(user => `
        <div class="mobile-user-card" data-user-id="${user.id}">
            <div class="card-header-row" onclick="toggleUserCard('${user.id}')">
                <button class="expand-btn" id="expandBtn-${user.id}" type="button">
                    <i class="bi bi-chevron-down"></i>
                </button>
                <div class="card-preview">
                    <div class="name">${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</div>
                    <div class="subtitle">${escapeHtml(user.email)}</div>
                </div>
                <div class="card-badge">
                    <span class="badge ${getRoleBadgeClass(user.role)}">${user.role || 'general'}</span>
                </div>
            </div>
            
            <div class="card-details" id="details-${user.id}">
                <div class="detail-row">
                    <span class="detail-label">Showed Up</span>
                    <span class="detail-value">
                        <input type="checkbox" 
                               class="form-check-input showed-up-checkbox" 
                               data-user-id="${user.id}" 
                               ${user.showedUp ? 'checked' : ''}>
                        <span class="ms-2">${user.showedUp ? 'Yes' : 'No'}</span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Name</span>
                    <span class="detail-value">
                        ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}
                        <button class="btn btn-sm btn-link p-0 ms-2 edit-name-btn" 
                                data-id="${user.id}" 
                                data-first-name="${escapeHtml(user.firstName)}" 
                                data-last-name="${escapeHtml(user.lastName)}">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${escapeHtml(user.email)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Affiliation</span>
                    <span class="detail-value">
                        ${escapeHtml(user.affiliation) || '<span class="text-muted">Not provided</span>'}
                        <button class="btn btn-sm btn-link p-0 ms-2 edit-affiliation-btn" 
                                data-id="${user.id}" 
                                data-name="${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}" 
                                data-current-affiliation="${escapeHtml(user.affiliation)}">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Accommodation</span>
                    <span class="detail-value">
                        <span class="badge ${user.accommodation ? 'bg-success' : 'bg-secondary'}">
                            ${user.accommodation ? escapeHtml(user.accommodation) : 'Not provided'}
                        </span>
                        <button class="btn btn-sm btn-link p-0 ms-2 edit-accommodation-btn" 
                                data-id="${user.id}" 
                                data-name="${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}" 
                                data-current-accommodation="${escapeHtml(user.accommodation)}">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Role</span>
                    <span class="detail-value">
                        <span class="badge ${getRoleBadgeClass(user.role)}">${user.role || 'general'}</span>
                        <button class="btn btn-sm btn-outline-primary ms-2 change-role-btn" 
                                data-id="${user.id}" 
                                data-name="${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}" 
                                data-current-role="${user.role || 'general'}">
                            <i class="bi bi-person-gear"></i> Change
                        </button>
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    addMobileEventListeners();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredUsers.length / perPage);
    const container = document.getElementById('userPaginationControls');
    const countEl = document.getElementById('userTotalCount');
    
    if (countEl) {
        countEl.textContent = filteredUsers.length;
    }
    
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = `
        <button class="btn btn-sm btn-outline-primary" 
                onclick="goToUserPage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="bi bi-chevron-left"></i>
        </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}" 
                        onclick="goToUserPage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="px-2 text-muted">...</span>`;
        }
    }
    
    html += `
        <button class="btn btn-sm btn-outline-primary" 
                onclick="goToUserPage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="bi bi-chevron-right"></i>
        </button>
    `;
    
    container.innerHTML = html;
}

// GLOBAL FUNCTIONS (for onclick handlers in HTML)

window.goToUserPage = function(page) {
    const totalPages = Math.ceil(filteredUsers.length / perPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderPaginatedUsers();
};

window.toggleUserCard = function(id) {
    const details = document.getElementById(`details-${id}`);
    const btn = document.getElementById(`expandBtn-${id}`);
    
    // Close all other cards (accordion behavior)
    document.querySelectorAll('.card-details.show').forEach(el => {
        if (el.id !== `details-${id}`) {
            el.classList.remove('show');
            const otherId = el.id.replace('details-', '');
            const otherBtn = document.getElementById(`expandBtn-${otherId}`);
            if (otherBtn) otherBtn.classList.remove('expanded');
        }
    });
    
    // Toggle current card
    if (details) details.classList.toggle('show');
    if (btn) btn.classList.toggle('expanded');
};

// UPDATE FUNCTIONS (global)

async function updateShowedUp(userId, showedUp) {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { showedUp: showedUp });
        
        const user = allUsers.find(u => u.id === userId);
        if (user) user.showedUp = showedUp;
        
        console.log(`User ${userId} showed up: ${showedUp}`);
    } catch (error) {
        console.error("Error updating showed up:", error);
        alert("Error updating status. Please try again.");
        document.querySelectorAll(`.showed-up-checkbox[data-user-id="${userId}"]`).forEach(cb => {
            cb.checked = !showedUp;
        });
    }
}

async function updateUserField(userId, field, value) {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { [field]: value });
        
        const user = allUsers.find(u => u.id === userId);
        if (user) user[field] = value;
        
        applyFilters();
        console.log(`User ${userId} ${field} updated`);
    } catch (error) {
        console.error(`Error updating ${field}:`, error);
        alert(`Error updating ${field}. Please try again.`);
    }
}

// EVENT LISTENER FUNCTIONS (global)

function addTableEventListeners() {
    document.querySelectorAll('.user-table .showed-up-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            updateShowedUp(this.dataset.userId, this.checked);
        });
    });
    
    document.querySelectorAll('.user-table .edit-name-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openNameEditModal(this.dataset.id, this.dataset.firstName, this.dataset.lastName);
        });
    });
    
    document.querySelectorAll('.user-table .edit-affiliation-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const newValue = prompt(`Edit affiliation for ${this.dataset.name}:`, this.dataset.currentAffiliation || '');
            if (newValue !== null) {
                updateUserField(this.dataset.id, 'affiliation', newValue);
            }
        });
    });
    
    document.querySelectorAll('.user-table .edit-accommodation-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const newValue = prompt(`Edit accommodation for ${this.dataset.name}:`, this.dataset.currentAccommodation || '');
            if (newValue !== null) {
                updateUserField(this.dataset.id, 'accommodation', newValue);
            }
        });
    });
    
    document.querySelectorAll('.user-table .change-role-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openRoleChangeModal(this.dataset.id, this.dataset.name, this.dataset.currentRole);
        });
    });
}

function addMobileEventListeners() {
    document.querySelectorAll('#mobileUserCards .showed-up-checkbox').forEach(cb => {
        cb.addEventListener('change', function(e) {
            e.stopPropagation();
            updateShowedUp(this.dataset.userId, this.checked);
        });
    });
    
    document.querySelectorAll('#mobileUserCards .edit-name-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openNameEditModal(this.dataset.id, this.dataset.firstName, this.dataset.lastName);
        });
    });
    
    document.querySelectorAll('#mobileUserCards .edit-affiliation-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const newValue = prompt(`Edit affiliation:`, this.dataset.currentAffiliation || '');
            if (newValue !== null) {
                updateUserField(this.dataset.id, 'affiliation', newValue);
            }
        });
    });
    
    document.querySelectorAll('#mobileUserCards .edit-accommodation-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const newValue = prompt(`Edit accommodation:`, this.dataset.currentAccommodation || '');
            if (newValue !== null) {
                updateUserField(this.dataset.id, 'accommodation', newValue);
            }
        });
    });
    
    document.querySelectorAll('#mobileUserCards .change-role-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openRoleChangeModal(this.dataset.id, this.dataset.name, this.dataset.currentRole);
        });
    });
}

// MODAL FUNCTIONS (global)

function openNameEditModal(userId, firstName, lastName) {
    const existingModal = document.getElementById('editNameModal');
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
        <div class="modal fade" id="editNameModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit User Name</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" id="editFirstName" value="${firstName || ''}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" id="editLastName" value="${lastName || ''}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="saveNameBtn">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modalEl = document.getElementById('editNameModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    document.getElementById('saveNameBtn').addEventListener('click', async function() {
        const newFirstName = document.getElementById('editFirstName').value.trim();
        const newLastName = document.getElementById('editLastName').value.trim();
        
        if (newFirstName || newLastName) {
            try {
                const userRef = doc(db, "users", userId);
                await updateDoc(userRef, {
                    firstName: newFirstName,
                    lastName: newLastName
                });
                
                const user = allUsers.find(u => u.id === userId);
                if (user) {
                    user.firstName = newFirstName;
                    user.lastName = newLastName;
                }
                
                modal.hide();
                applyFilters();
            } catch (error) {
                console.error("Error updating name:", error);
                alert("Error updating name. Please try again.");
            }
        } else {
            alert("Please enter at least one name.");
        }
    });
    
    modalEl.addEventListener('hidden.bs.modal', function() {
        modalEl.remove();
    });
}

function openRoleChangeModal(userId, userName, currentRole) {
    document.getElementById('selectedUserName').textContent = userName;
    document.getElementById('roleSelect').value = currentRole;
    document.getElementById('changeRoleModal').dataset.userId = userId;
    
    const modal = new bootstrap.Modal(document.getElementById('changeRoleModal'));
    modal.show();
}

async function handleRoleChangeConfirm() {
    const modal = document.getElementById('changeRoleModal');
    const userId = modal.dataset.userId;
    const newRole = document.getElementById('roleSelect').value;
    
    if (!userId || !newRole) return;
    
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { role: newRole });
        
        const user = allUsers.find(u => u.id === userId);
        if (user) user.role = newRole;
        
        bootstrap.Modal.getInstance(modal).hide();
        applyFilters();
    } catch (error) {
        console.error("Error updating role:", error);
        alert("Error updating role. Please try again.");
    }
}

// LOAD USERS FROM FIREBASE (global)

async function loadUsers() {
    console.log("Loading users from Firebase...");
    
    const userTableBody = document.getElementById('userTableBody');
    const mobileCards = document.getElementById('mobileUserCards');
    
    if (userTableBody) {
        userTableBody.innerHTML = `
            <tr><td colspan="7" class="text-center">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Loading users...
            </td></tr>`;
    }
    if (mobileCards) {
        mobileCards.innerHTML = `
            <div class="text-center p-4">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Loading users...
            </div>`;
    }
    
    try {
        const usersCollection = collection(db, "users");
        const querySnapshot = await getDocs(usersCollection);
        
        if (querySnapshot.empty) {
            allUsers = [];
            filteredUsers = [];
            renderPaginatedUsers();
            return;
        }
        
        allUsers = [];
        querySnapshot.forEach((docSnapshot) => {
            allUsers.push({
                id: docSnapshot.id,
                ...docSnapshot.data()
            });
        });
        
        allUsers.sort((a, b) => {
            const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
            const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        console.log(`Loaded ${allUsers.length} users from Firebase`);
        applyFilters();
        
    } catch (error) {
        console.error("Error loading users:", error);
        if (userTableBody) {
            userTableBody.innerHTML = `
                <tr><td colspan="7" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error loading users: ${error.message}
                </td></tr>`;
        }
    }
}

// DEBOUNCE HELPER

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// DOM CONTENT LOADED

document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard users.js loaded");
    
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        console.log("Non-admin access attempt");
        return;
    }
    
    // Event listeners
    document.getElementById('refreshUserList')?.addEventListener('click', loadUsers);
    document.getElementById('userSearchInput')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('userRoleFilter')?.addEventListener('change', applyFilters);
    document.getElementById('userShowedUpFilter')?.addEventListener('change', applyFilters);
    document.getElementById('userAccommodationFilter')?.addEventListener('change', applyFilters);
    document.getElementById('userPerPageSelect')?.addEventListener('change', function() {
        perPage = parseInt(this.value);
        currentPage = 1;
        renderPaginatedUsers();
    });
    document.getElementById('confirmRoleChange')?.addEventListener('click', handleRoleChangeConfirm);
    
    // Initial load
    loadUsers();
});