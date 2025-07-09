import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { app } from "./firebase-config.js";

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const downloadCertificateBtn = document.getElementById('downloadCertificateBtn');
const certificatePreview = document.getElementById('certificatePreview');

// Certificate generation function
async function generateCertificate(userData) {
    // Show loading state
    certificatePreview.innerHTML = `
        <div class="certificate-loading">
            <div class="spinner-border" role="status"></div>
            <p>Generating your certificate...</p>
        </div>
    `;

    try {
        // Load HTML2Canvas and jsPDF dynamically
        await loadScripts([
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        ]);
        
        // Create a font loader
        const fontLoader = document.createElement('link');
        fontLoader.rel = 'stylesheet';
        fontLoader.href = 'https://fonts.googleapis.com/css2?family=Italianno&display=swap';
        document.head.appendChild(fontLoader);
        
        // Wait for font to load
        await new Promise(resolve => {
            fontLoader.onload = resolve;
            // Fallback if onload doesn't fire
            setTimeout(resolve, 1000);
        });
    
        // Create certificate canvas element
        const certificateCanvas = document.createElement('div');
        certificateCanvas.style.position = 'absolute';
        certificateCanvas.style.left = '-9999px';
        certificateCanvas.style.top = '-9999px';
        certificateCanvas.style.fontFamily = "'Italianno', cursive";
        document.body.appendChild(certificateCanvas);
        
        // Create certificate HTML with just the name in Italianno font
        certificateCanvas.innerHTML = `
            <div class="certificate-container" style="width: 1100px; height: 850px; background-image: url('../icons/img/certifikat-01.jpg'); background-size: cover; position: relative;">
                <!-- Name with Italianno font -->
                <div style="position: absolute; top: 350px; width: 100%; text-align: center;">
                    <h1 style="font-family: 'Italianno', cursive; font-size: 72px; color: #333; margin: 0; padding: 0;">${userData.firstName} ${userData.lastName}</h1>
                </div>
            </div>
        `;
        
        // Generate PDF from canvas
        const canvas = await html2canvas(certificateCanvas.querySelector('.certificate-container'), {
            allowTaint: true,
            useCORS: true
        });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Create PDF with proper dimensions for certificate
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Add image to fill the page
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        
        // Generate preview with responsive class
        certificatePreview.innerHTML = `
            <img src="${imgData}" alt="Certificate Preview" class="img-fluid certificate-thumbnail">
            <p class="text-muted mt-2 small">Preview of your personalized certificate</p>
        `;
        
        // Clean up canvas
        document.body.removeChild(certificateCanvas);
        
        // Return the PDF for download
        return pdf;
        
    } catch (error) {
        console.error("Error generating certificate:", error);
        certificatePreview.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error generating certificate. Please try again later.
            </div>
        `;
        return null;
    }
}

// Helper function to load external scripts
function loadScripts(urls) {
    const promises = urls.map(url => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    });
    return Promise.all(promises);
}

// Download certificate as PDF
async function downloadCertificate(userData) {
    // Show loading indicator on button
    const originalBtnContent = downloadCertificateBtn.innerHTML;
    downloadCertificateBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Generating...`;
    downloadCertificateBtn.disabled = true;
    
    try {
        const pdf = await generateCertificate(userData);
        if (pdf) {
            pdf.save(`PulaTechConf2025_Certificate_${userData.lastName}_${userData.firstName}.pdf`);
        }
    } catch (error) {
        console.error("Error downloading certificate:", error);
        // Show error in certificate preview instead of alert
        certificatePreview.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error downloading certificate. Please try again later.
            </div>
        `;
    } finally {
        // Restore button
        downloadCertificateBtn.innerHTML = originalBtnContent;
        downloadCertificateBtn.disabled = false;
    }
}

// Initialize certificate functionality
function initCertificate() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Get user data from Firestore
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    // Generate certificate preview
                    await generateCertificate(userData);
                    
                    // Add click event to download button
                    downloadCertificateBtn.addEventListener('click', () => downloadCertificate(userData));
                } else {
                    certificatePreview.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            User profile not found. Please contact support.
                        </div>
                    `;
                }
            } catch (error) {
                console.error("Error loading user data:", error);
                certificatePreview.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Error loading certificate. Please try again later.
                    </div>
                `;
            }
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initCertificate);

// Add window resize listener to handle responsiveness
window.addEventListener('resize', () => {
    const certificateImg = certificatePreview.querySelector('img');
    if (certificateImg) {
        // Keep aspect ratio but ensure it fits in container
        certificateImg.style.maxWidth = '100%';
    }
});

export { generateCertificate, downloadCertificate };