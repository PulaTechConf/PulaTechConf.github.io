import { db } from '../firebase-config.js';
import { 
    collection, 
    doc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// STATE

let allPizzaSelections = [];
let filteredPizzaSelections = [];

// PIZZA DISPLAY NAMES

const pizzaTypes = {
    'margherita': 'Margherita',
    'gluten-free-margherita': 'Margherita (gluten free)',
    'vegetarian': 'Vegetarian',
    'tuna': 'Tuna',
    'mushroom': 'Mushroom',
    'capricciosa': 'Capricciosa'
};

const pizzaEmojis = {
    'margherita': '🍅',
    'gluten-free-margherita': '🌾',
    'vegetarian': '🥬',
    'tuna': '🐟',
    'mushroom': '🍄',
    'capricciosa': '🍕'
};

let cameraStream = null;
let cameraScanActive = false;
let barcodeDetector = null;
let cameraScanTimer = null;

// HELPER FUNCTIONS

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getPizzaDisplay(pizzaId) {
    if (!pizzaId) return { name: 'Not selected', emoji: '❌', class: 'bg-secondary' };
    const emoji = pizzaEmojis[pizzaId] || '🍕';
    const name = pizzaTypes[pizzaId] || pizzaId;
    return { name, emoji, class: 'bg-success' };
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Show barcode preview modal
function showBarcodePreview(code, userName) {
    const modal = document.getElementById('barcodeModal');
    if (!modal) {
        console.warn('Barcode modal not found');
        return;
    }
    
    // Update modal content
    document.getElementById('barcodeModalTitle').textContent = `Barcode for ${userName}`;
    const barcodeSvg = document.getElementById('barcodeSvg');
    barcodeSvg.innerHTML = ''; // Clear previous barcode
    
    try {
        JsBarcode("#barcodeSvg", code, {
            format: "CODE128",
            width: 2,
            height: 120,
            displayValue: true,
            fontSize: 14
        });
    } catch (error) {
        console.error('Error generating barcode:', error);
        barcodeSvg.innerHTML = '<p class="text-danger">Error generating barcode</p>';
    }
    
    // Show modal using Bootstrap
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// FILTER LOGIC

function applyPizzaFilters() {
    const searchTerm = (document.getElementById('pizzaSearchInput')?.value || '').toLowerCase().trim();
    
    filteredPizzaSelections = allPizzaSelections.filter(selection => {
        if (!searchTerm) return true;
        return (selection.userName || '').toLowerCase().includes(searchTerm);
    });
    
    renderPizzaSelections();
}

// RENDER FUNCTIONS

function renderPizzaSelections() {
    const noResults = document.getElementById('noPizzaSelectionsFound');
    
    if (filteredPizzaSelections.length === 0) {
        noResults?.classList.remove('d-none');
        document.getElementById('userPizzasTableBody').innerHTML = '';
        document.getElementById('mobilePizzaCards').innerHTML = '';
    } else {
        noResults?.classList.add('d-none');
        renderPizzaDesktopTable(filteredPizzaSelections);
        renderPizzaMobileCards(filteredPizzaSelections);
    }
}

function renderPizzaDesktopTable(data) {
    const tbody = document.getElementById('userPizzasTableBody');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No selections</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(selection => {
        const pizza = getPizzaDisplay(selection.day2);
        const pickedUpBadge = selection.pickedUp 
            ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Picked up</span>' 
            : '<span class="badge bg-warning"><i class="bi bi-clock me-1"></i>Pending</span>';
        return `
            <tr>
                <td>${escapeHtml(selection.userName)}</td>
                <td>
                    <span class="badge ${pizza.class}">
                        ${pizza.emoji} ${escapeHtml(pizza.name)}
                    </span>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px; font-size: 0.85rem;">${escapeHtml(selection.pickupCode)}</code>
                        <button class="btn btn-sm btn-outline-secondary" onclick="showBarcodePreview('${escapeHtml(selection.pickupCode)}', '${escapeHtml(selection.userName)}')" title="Show barcode">
                            <i class="bi bi-barcode"></i>
                        </button>
                    </div>
                </td>
                <td>${pickedUpBadge}</td>
            </tr>
        `;
    }).join('');
}

function renderPizzaMobileCards(data) {
    const container = document.getElementById('mobilePizzaCards');
    if (!container) return;
    
    if (data.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-4">No selections</div>';
        return;
    }
    
    container.innerHTML = data.map(selection => {
        const pizza = getPizzaDisplay(selection.day2);
        const pickedUpBadge = selection.pickedUp 
            ? '<span class="badge bg-success w-100 mt-2"><i class="bi bi-check-circle me-1"></i>Picked up</span>' 
            : '<span class="badge bg-warning w-100 mt-2"><i class="bi bi-clock me-1"></i>Pending</span>';
        return `
            <div class="mobile-pizza-card" style="border: 1px solid #ddd; padding: 12px; margin-bottom: 12px; border-radius: 6px;">
                <div class="pizza-card-content">
                    <div class="pizza-user-info">
                        <div class="pizza-user-name">${escapeHtml(selection.userName)}</div>
                    </div>
                    <div class="pizza-selection">
                        <span class="badge ${pizza.class}">
                            ${pizza.emoji} ${escapeHtml(pizza.name)}
                        </span>
                    </div>
                    <div style="margin-top: 8px; font-size: 0.85rem;">
                        <small class="text-muted">Code: </small><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${escapeHtml(selection.pickupCode)}</code>
                        <button class="btn btn-sm btn-outline-secondary ms-1" onclick="showBarcodePreview('${escapeHtml(selection.pickupCode)}', '${escapeHtml(selection.userName)}')" title="Show barcode">
                            <i class="bi bi-barcode"></i>
                        </button>
                    </div>
                    ${pickedUpBadge}
                </div>
            </div>
        `;
    }).join('');
}

// LOAD FUNCTIONS

async function loadPizzaSummaries() {
    try {
        const summaryElem = document.getElementById('day2Summary');
        if (!summaryElem) return;
        
        summaryElem.innerHTML = '<tr><td colspan="2" class="text-center">Loading...</td></tr>';
        
        const summaryRef = doc(db, "pizzaSummary", "day2");
        const summarySnap = await getDoc(summaryRef);
        
        if (summarySnap.exists()) {
            const data = summarySnap.data();
            let tableHtml = '';
            let totalCount = 0;
            
            Object.keys(pizzaTypes).forEach(pizzaId => {
                const count = data[pizzaId] || 0;
                totalCount += count;
                const emoji = pizzaEmojis[pizzaId] || '🍕';
                
                tableHtml += `
                    <tr>
                        <td>${emoji} ${pizzaTypes[pizzaId]}</td>
                        <td><strong>${count}</strong></td>
                    </tr>
                `;
            });
            
            tableHtml += `
                <tr class="table-active">
                    <td><strong>Total</strong></td>
                    <td><strong>${totalCount}</strong></td>
                </tr>
            `;
            
            summaryElem.innerHTML = tableHtml;
        } else {
            summaryElem.innerHTML = '<tr><td colspan="2" class="text-center">No data available</td></tr>';
        }
        
    } catch (error) {
        console.error("Error loading pizza summaries:", error);
        const summaryElem = document.getElementById('day2Summary');
        if (summaryElem) {
            summaryElem.innerHTML = '<tr><td colspan="2" class="text-center text-danger">Error loading data</td></tr>';
        }
    }
}

async function loadUserPizzaSelections() {
    try {
        const tableBody = document.getElementById('userPizzasTableBody');
        const mobileCards = document.getElementById('mobilePizzaCards');
        
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="2" class="text-center"><div class="spinner-border spinner-border-sm me-2"></div>Loading...</td></tr>';
        }
        if (mobileCards) {
            mobileCards.innerHTML = '<div class="text-center p-4"><div class="spinner-border spinner-border-sm me-2"></div>Loading...</div>';
        }
        
        const selectionsRef = collection(db, "pizzaSelections");
        const selectionsSnap = await getDocs(selectionsRef);
        
        if (selectionsSnap.empty) {
            allPizzaSelections = [];
            filteredPizzaSelections = [];
            renderPizzaSelections();
            return;
        }
        
        allPizzaSelections = [];
        selectionsSnap.forEach(selectionDoc => {
            const data = selectionDoc.data();
            
            let userName = 'Unknown User';
            if (data.fullName && data.fullName.trim()) {
                userName = data.fullName;
            } else if (data.firstName || data.lastName) {
                userName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            }
            
            allPizzaSelections.push({
                id: selectionDoc.id,
                userName: userName,
                day2: data.day2 || null,
                pickupCode: data.pickupCode || '',
                pickedUp: data.pickedUp || false
            });
        });
        
        // Sort by name
        allPizzaSelections.sort((a, b) => a.userName.localeCompare(b.userName));
        
        console.log(`Loaded ${allPizzaSelections.length} pizza selections`);
        applyPizzaFilters();
        
    } catch (error) {
        console.error("Error loading user pizza selections:", error);
        const tableBody = document.getElementById('userPizzasTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="2" class="text-center text-danger">Error loading selections</td></tr>';
        }
    }
}

async function checkPizzaPickupCode() {
    const resultContainer = document.getElementById('pizzaPickupResult');
    const codeInput = document.getElementById('pizzaPickupCodeInput');
    if (!codeInput || !resultContainer) return;

    const code = codeInput.value.trim().toUpperCase();
    if (!code) {
        resultContainer.innerHTML = '<div class="alert alert-warning">Please enter a pickup code.</div>';
        return;
    }

    try {
        resultContainer.innerHTML = '<div class="text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Checking code...</div>';
        const selectionsRef = collection(db, 'pizzaSelections');
        const codeQuery = query(selectionsRef, where('pickupCode', '==', code));
        const querySnapshot = await getDocs(codeQuery);

        if (querySnapshot.empty) {
            resultContainer.innerHTML = '<div class="alert alert-danger">Invalid pickup code. Please try again.</div>';
            return;
        }

        const pizzaDoc = querySnapshot.docs[0];
        const pizzaData = pizzaDoc.data();
        const pizzaNames = {
            'margherita': 'Margherita',
            'gluten-free-margherita': 'Margherita (Gluten Free)',
            'vegetarian': 'Vegetarian',
            'tuna': 'Tuna',
            'mushroom': 'Mushroom',
            'capricciosa': 'Capricciosa'
        };
        const pizzaType = pizzaData.day2 || 'Unknown';
        const userName = pizzaData.fullName || `${pizzaData.firstName || ''} ${pizzaData.lastName || ''}`.trim() || 'Unknown attendee';
        const userEmail = pizzaData.email || pizzaData.userEmail || '';

        if (pizzaData.pickedUp) {
            const pickedUpAt = pizzaData.pickedUpAt ? new Date(pizzaData.pickedUpAt.seconds * 1000).toLocaleString() : 'Unknown time';
            resultContainer.innerHTML = `
                <div class="alert alert-warning">
                    <h6 class="mb-2">Already picked up</h6>
                    <p class="mb-1"><strong>${escapeHtml(userName)}</strong>${userEmail ? ` <small class="text-muted">(${escapeHtml(userEmail)})</small>` : ''}</p>
                    <p class="mb-1"><strong>Pizza:</strong> ${escapeHtml(pizzaNames[pizzaType] || pizzaType)}</p>
                    <p class="mb-0"><strong>Picked up at:</strong> ${pickedUpAt}</p>
                </div>
            `;
            return;
        }

        resultContainer.innerHTML = `
            <div class="alert alert-info">
                <h6 class="mb-2">Valid pickup code</h6>
                <p class="mb-1"><strong>${escapeHtml(userName)}</strong>${userEmail ? ` <small class="text-muted">(${escapeHtml(userEmail)})</small>` : ''}</p>
                <p class="mb-1"><strong>Pizza:</strong> ${escapeHtml(pizzaNames[pizzaType] || pizzaType)}</p>
                <button class="btn btn-success mt-2" id="confirmPickupBtn">Mark as Picked Up</button>
            </div>
        `;

        const confirmButton = document.getElementById('confirmPickupBtn');
        if (confirmButton) {
            confirmButton.addEventListener('click', async function() {
                await confirmPizzaPickup(pizzaDoc.id, pizzaData);
            });
        }
    } catch (error) {
        console.error('Error checking pickup code:', error);
        resultContainer.innerHTML = `<div class="alert alert-danger">Error checking pickup code: ${escapeHtml(error.message)}</div>`;
    }
}

async function confirmPizzaPickup(selectionId, pizzaData) {
    const resultContainer = document.getElementById('pizzaPickupResult');
    if (!resultContainer) return;

    try {
        const selectionRef = doc(db, 'pizzaSelections', selectionId);
        await updateDoc(selectionRef, {
            pickedUp: true,
            pickedUpAt: serverTimestamp(),
            pickedUpByAdmin: localStorage.getItem('userEmail') || localStorage.getItem('userId') || 'admin'
        });

        resultContainer.innerHTML = '<div class="alert alert-success">Pickup confirmed. The pizza has been marked as picked up.</div>';
        loadUserPizzaSelections();
    } catch (error) {
        console.error('Error confirming pizza pickup:', error);
        resultContainer.innerHTML = `<div class="alert alert-danger">Error confirming pickup: ${escapeHtml(error.message)}</div>`;
    }
}

// INIT

document.addEventListener('DOMContentLoaded', function() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        console.log("Not an admin, pizza tracking features disabled");
        return;
    }
    
    console.log("Pizza tracking admin module loaded");
    
    // Event listeners
    document.getElementById('refreshPizzaSummary')?.addEventListener('click', loadPizzaSummaries);
    document.getElementById('refreshUserPizzas')?.addEventListener('click', loadUserPizzaSelections);
    document.getElementById('pizzaPickupCheckBtn')?.addEventListener('click', checkPizzaPickupCode);
    document.getElementById('pizzaSearchInput')?.addEventListener('input', debounce(applyPizzaFilters, 300));
    
    // Barcode scanner input listener (auto-submit on scan)
    const barcodeInput = document.getElementById('pizzaBarcodeInput');
    const cameraScanBtn = document.getElementById('pizzaCameraScanBtn');
    const cameraStopBtn = document.getElementById('pizzaCameraStopBtn');

    if (barcodeInput) {
        barcodeInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                processBarcodeInput();
            }
        });

        // Also process after a short delay of inactivity (barcode scanner typically finishes within 100-200ms)
        let barcodeTimeout;
        barcodeInput.addEventListener('input', function() {
            clearTimeout(barcodeTimeout);
            if (this.value.length > 0) {
                barcodeTimeout = setTimeout(() => {
                    if (this.value.startsWith('PZ') && this.value.length >= 8) {
                        processBarcodeInput();
                    }
                }, 150);
            }
        });
    }

    if (cameraScanBtn) {
        cameraScanBtn.addEventListener('click', startCameraScan);
    }

    if (cameraStopBtn) {
        cameraStopBtn.addEventListener('click', stopCameraScan);
    }
    
    // Initial load
    loadPizzaSummaries();
    loadUserPizzaSelections();
});

// Process barcode scanner input
function processBarcodeInput() {
    const barcodeInput = document.getElementById('pizzaBarcodeInput');
    if (!barcodeInput) return;
    
    const code = barcodeInput.value.trim().toUpperCase();
    if (!code.startsWith('PZ') || code.length < 8) {
        return; // Not a valid barcode format, wait for more input
    }
    
    // Set the manual input field and check
    const manualInput = document.getElementById('pizzaPickupCodeInput');
    if (manualInput) {
        manualInput.value = code;
    }
    
    // Trigger the check
    checkPizzaPickupCode();
    
    // Clear the barcode input and keep focus for next scan
    barcodeInput.value = '';
}

async function startCameraScan() {
    const cameraContainer = document.getElementById('pizzaCameraContainer');
    const cameraStatus = document.getElementById('pizzaCameraStatus');
    const cameraPreview = document.getElementById('pizzaCameraPreview');
    const cameraScanBtn = document.getElementById('pizzaCameraScanBtn');
    const cameraStopBtn = document.getElementById('pizzaCameraStopBtn');

    if (!cameraContainer || !cameraStatus || !cameraPreview || !cameraScanBtn || !cameraStopBtn) {
        return;
    }

    if (cameraScanActive) {
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraStatus.textContent = 'Camera scanning is not supported by this browser.';
        cameraStatus.className = 'alert alert-danger mt-2 mb-0';
        return;
    }

    try {
        if ('BarcodeDetector' in window) {
            barcodeDetector = new BarcodeDetector({ formats: ['code_128', 'ean_13', 'qr_code', 'code_39', 'code_93', 'itf'] });
        } else {
            barcodeDetector = null;
        }

        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        cameraPreview.srcObject = cameraStream;
        await cameraPreview.play();

        cameraContainer.classList.remove('d-none');
        cameraScanBtn.classList.add('d-none');
        cameraStopBtn.classList.remove('d-none');
        cameraStatus.textContent = 'Scanning... Point your camera at the barcode.';
        cameraStatus.className = 'alert alert-info mt-2 mb-0';
        cameraScanActive = true;

        if (!barcodeDetector) {
            cameraStatus.textContent = 'Camera is active, but BarcodeDetector is not supported in this browser. Use a hardware scanner or manual lookup.';
            cameraStatus.className = 'alert alert-warning mt-2 mb-0';
            return;
        }

        scanCameraFrame();
    } catch (error) {
        console.error('Camera scan error:', error);
        cameraStatus.textContent = 'Could not start camera scan. Please allow camera access or use manual lookup.';
        cameraStatus.className = 'alert alert-danger mt-2 mb-0';
        stopCameraScan();
    }
}

function stopCameraScan() {
    const cameraContainer = document.getElementById('pizzaCameraContainer');
    const cameraPreview = document.getElementById('pizzaCameraPreview');
    const cameraScanBtn = document.getElementById('pizzaCameraScanBtn');
    const cameraStopBtn = document.getElementById('pizzaCameraStopBtn');
    const cameraStatus = document.getElementById('pizzaCameraStatus');

    if (cameraScanTimer) {
        clearTimeout(cameraScanTimer);
        cameraScanTimer = null;
    }

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    if (cameraPreview) {
        cameraPreview.srcObject = null;
    }

    if (cameraContainer) {
        cameraContainer.classList.add('d-none');
    }
    if (cameraScanBtn) {
        cameraScanBtn.classList.remove('d-none');
    }
    if (cameraStopBtn) {
        cameraStopBtn.classList.add('d-none');
    }
    if (cameraStatus) {
        cameraStatus.textContent = 'Camera scan stopped.';
        cameraStatus.className = 'alert alert-secondary mt-2 mb-0';
    }

    cameraScanActive = false;
}

async function scanCameraFrame() {
    if (!cameraScanActive || !barcodeDetector) {
        return;
    }

    const cameraPreview = document.getElementById('pizzaCameraPreview');
    const cameraStatus = document.getElementById('pizzaCameraStatus');
    if (!cameraPreview || !cameraStatus) {
        return;
    }

    try {
        const barcodes = await barcodeDetector.detect(cameraPreview);
        if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue.trim();
            if (rawValue) {
                stopCameraScan();
                cameraStatus.textContent = `Scanned code: ${rawValue}`;
                cameraStatus.className = 'alert alert-success mt-2 mb-0';

                const manualInput = document.getElementById('pizzaPickupCodeInput');
                if (manualInput) {
                    manualInput.value = rawValue;
                }
                checkPizzaPickupCode();
                return;
            }
        }
    } catch (error) {
        console.warn('Barcode detection error:', error);
        cameraStatus.textContent = 'Unable to detect barcode from the camera. Try pointing closer or using better lighting.';
        cameraStatus.className = 'alert alert-warning mt-2 mb-0';
    }

    cameraScanTimer = setTimeout(scanCameraFrame, 500);
}
