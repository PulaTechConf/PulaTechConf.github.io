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

function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            console.log(`Image loaded successfully: ${src}`);
            resolve(img);
        };
        img.onerror = (e) => {
            console.error(`Error loading image: ${src}`, e);
            reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
    });
}

async function generateCertificate(userData) {
    console.log("Starting certificate generation for:", userData);
    // Show loading state
    certificatePreview.innerHTML = `
        <div class="certificate-loading">
            <div class="spinner-border" role="status"></div>
            <p>Generating your certificate...</p>
        </div>
    `;

    try {
        console.log("Loading external scripts...");
        // Load HTML2Canvas and jsPDF dynamically
        await loadScripts([
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        ]);
        console.log("External scripts loaded successfully");
        
        console.log("Loading font...");
        // Create a font loader
        const fontLoader = document.createElement('link');
        fontLoader.rel = 'stylesheet';
        fontLoader.href = 'https://fonts.googleapis.com/css2?family=Italianno&display=swap';
        document.head.appendChild(fontLoader);
        
        // Wait for font to load
        await new Promise(resolve => {
            fontLoader.onload = () => {
                console.log("Font loaded successfully");
                resolve();
            };
            // Fallback if onload doesn't fire
            setTimeout(() => {
                console.log("Font load timeout reached, continuing anyway");
                resolve();
            }, 1000);
        });

        console.log("Preloading certificate template image...");
        const certificateImagePath = '../icons/img/certifikat-01.jpg';
        const preloadedImage = await preloadImage(certificateImagePath).catch(err => {
            throw new Error(`Certificate template image could not be loaded. Please check the path: ${certificateImagePath}. Error: ${err.message}`);
        });
        console.log("Certificate template image preloaded successfully");
        
        // Create certificate canvas element
        const certificateCanvas = document.createElement('div');
        certificateCanvas.style.position = 'absolute';
        certificateCanvas.style.left = '-9999px';
        certificateCanvas.style.top = '-9999px';
        document.body.appendChild(certificateCanvas);
        
        // Use inline base64 data URL for the background image to avoid path issues
        certificateCanvas.innerHTML = `
            <div class="certificate-container" style="width: 1100px; height: 850px; background-image: url('${preloadedImage.src}'); background-size: cover; position: relative;">
                <!-- Name with Italianno font -->
                <div style="position: absolute; top: 350px; width: 100%; text-align: center;">
                    <h1 style="font-family: 'Italianno', cursive; font-size: 72px; color: #333; margin: 0; padding: 0;">${userData.firstName} ${userData.lastName}</h1>
                </div>
            </div>
        `;
        
        console.log("Generating PDF from canvas...");
        // Generate PDF from canvas
        const canvas = await html2canvas(certificateCanvas.querySelector('.certificate-container'), {
            allowTaint: true,
            useCORS: true,
            logging: true
        });
        console.log("Canvas created successfully");
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        console.log("Image data URL created");
        
        console.log("Creating PDF...");
        // Create PDF with proper dimensions for certificate
        const { jsPDF } = window.jspdf;
        console.log("jsPDF accessed:", !!jsPDF);
        const pdf = new jsPDF('landscape', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Add image to fill the page
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        console.log("PDF created successfully");
        
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
        console.error("Detailed error in certificate generation:", error);
        console.error("Error stack:", error.stack);
        certificatePreview.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error generating certificate: ${error.message}
            </div>
        `;
        return null;
    }
}

// Helper function to load external scripts
function loadScripts(urls) {
    const promises = urls.map(url => {
        return new Promise((resolve, reject) => {
            if (url.endsWith('.css')) {
                // Load CSS
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                link.onload = () => {
                    console.log(`Loaded CSS: ${url}`);
                    resolve();
                };
                link.onerror = (e) => {
                    console.error(`Failed to load CSS: ${url}`, e);
                    reject(new Error(`Failed to load stylesheet: ${url}`));
                };
                document.head.appendChild(link);
            } else {
                // Load JS
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    console.log(`Loaded script: ${url}`);
                    resolve();
                };
                script.onerror = (e) => {
                    console.error(`Failed to load script: ${url}`, e);
                    reject(new Error(`Failed to load script: ${url}`));
                };
                document.head.appendChild(script);
            }
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
        console.log("Starting certificate download process...");
        const pdf = await generateCertificate(userData);
        if (pdf) {
            console.log("PDF generated, attempting to save...");
            
            try {
                // Try the normal save method first
                pdf.save(`PulaTechConf2025_Certificate_${userData.lastName}_${userData.firstName}.pdf`);
                console.log("PDF saved successfully");
            } catch (saveError) {
                console.error("Error with pdf.save():", saveError);
                
                // Fallback: create a blob and use a download link
                try {
                    const blob = pdf.output('blob');
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `PulaTechConf2025_Certificate_${userData.lastName}_${userData.firstName}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    console.log("PDF saved using fallback method");
                } catch (fallbackError) {
                    console.error("Fallback save method failed:", fallbackError);
                    throw new Error("Unable to download PDF. Please try again.");
                }
            }
        } else {
            throw new Error("Failed to generate certificate PDF");
        }
    } catch (error) {
        console.error("Error in downloadCertificate:", error);
        // Show error in certificate preview
        certificatePreview.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error downloading certificate: ${error.message}
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

// Initialize certificate functionality immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCertificate);
} else {
    // DOM already loaded, run initialization directly
    console.log("DOM already loaded, initializing certificate directly");
    setTimeout(initCertificate, 0);
}

export { generateCertificate, downloadCertificate };