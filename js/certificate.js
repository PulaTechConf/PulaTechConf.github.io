import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { app } from "./firebase-config.js";

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const downloadCertificateBtn = document.getElementById('downloadCertificateBtn');
const certificatePreview = document.getElementById('certificatePreview');

// Certificate PDF template path
const CERTIFICATE_TEMPLATE_PATH = '../icons/img/certificat.pdf';

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

// Add this function near your other functions

// Function to test if the Italianno font is actually loaded
function checkFontLoaded() {
    // Create an element with the font
    const fontTest = document.createElement('span');
    fontTest.style.fontFamily = "'Italianno', cursive";
    fontTest.style.fontSize = "30px";
    fontTest.style.visibility = "hidden";
    fontTest.textContent = "Font Test";
    document.body.appendChild(fontTest);
    
    // Force a reflow
    const initialWidth = fontTest.offsetWidth;
    
    // Change to a common font
    fontTest.style.fontFamily = "Arial";
    
    // Force another reflow
    const afterWidth = fontTest.offsetWidth;
    
    // Clean up
    document.body.removeChild(fontTest);
    
    // If widths are different, custom font was loaded
    const fontLoaded = initialWidth !== afterWidth;
    console.log(`Font test: ${fontLoaded ? 'Italianno loaded' : 'Italianno NOT loaded'}`);
    console.log(`Initial width: ${initialWidth}, After width: ${afterWidth}`);
    
    return fontLoaded;
}

// Enhanced preloading function that handles fonts
function preloadResources() {
    return new Promise(async (resolve) => {
        console.log("Preloading fonts and resources...");
        
        // Load Italianno font
        const fontLoader = document.createElement('link');
        fontLoader.rel = 'stylesheet';
        fontLoader.href = 'https://fonts.googleapis.com/css2?family=Italianno&display=swap';
        document.head.appendChild(fontLoader);
        
        // Create a function to check if font is loaded
        const checkFontInterval = setInterval(() => {
            if (checkFontLoaded()) {
                console.log("Italianno font loaded successfully");
                clearInterval(checkFontInterval);
                resolve();
            }
        }, 100);
        
        // Fallback after 3 seconds if font doesn't load properly
        setTimeout(() => {
            clearInterval(checkFontInterval);
            console.warn("Font loading timeout reached, continuing anyway");
            resolve();
        }, 3000);
    });
}

// Enhanced certificate generation using PDF template
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
        // Load PDFLib and other necessary libraries
        await loadScripts([
            'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
            'https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'
        ]);
        console.log("External scripts loaded successfully");
        
        // Preload fonts before generating certificate
        await preloadResources();
        
        console.log("Loading PDF template...");
        // Fetch the PDF template
        const templateResponse = await fetch(CERTIFICATE_TEMPLATE_PATH);
        if (!templateResponse.ok) {
            throw new Error(`Failed to load PDF template: ${templateResponse.status} ${templateResponse.statusText}`);
        }
        
        const templateArrayBuffer = await templateResponse.arrayBuffer();
        console.log("PDF template loaded successfully");
        
        // Load PDF document with PDF-Lib
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const pdfDoc = await PDFDocument.load(templateArrayBuffer);
        
        // Register fontkit
        pdfDoc.registerFontkit(fontkit);
        
        // Load custom font for the name
        console.log("Loading Italianno font for PDF...");
        const fontResponse = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/italianno@5.0.17/files/italianno-latin-400-normal.woff');
        const fontBytes = await fontResponse.arrayBuffer();
        const italiannoFont = await pdfDoc.embedFont(fontBytes);
        
        // Get the first page of the PDF
        const page = pdfDoc.getPages()[0];
        const { width, height } = page.getSize();
        
        // Add recipient name to certificate
        const fontSize = 64;
        const text = `${userData.firstName} ${userData.lastName}`;
        
        // Calculate text width to center it
        const textWidth = italiannoFont.widthOfTextAtSize(text, fontSize);
        const textX = (width - textWidth) / 2;
        
        // Position for the name (adjust Y position based on your template)
        const textY = height / 2 + 30; // Adjust this based on your PDF template design
        
        // Add text to the page
        page.drawText(text, {
            x: textX,
            y: textY,
            size: fontSize,
            font: italiannoFont,
            color: rgb(0.1, 0.1, 0.1), // Dark gray color
        });
        
        // Save the modified PDF
        const pdfBytes = await pdfDoc.save();
        
        // Convert to base64 for preview
        const base64Data = await arrayBufferToBase64(pdfBytes);
        const pdfUrl = `data:application/pdf;base64,${base64Data}`;
        
        // Generate preview
        certificatePreview.innerHTML = `
            <object data="${pdfUrl}" type="application/pdf" class="certificate-pdf-preview">
                <div class="alert alert-warning">
                    <p>Your browser doesn't support PDF previews. 
                    <a href="${pdfUrl}" target="_blank">Open PDF</a></p>
                </div>
            </object>
            <p class="text-muted mt-2 small">Preview of your personalized certificate</p>
        `;
        
        // Return the PDF bytes for download
        return {
            bytes: pdfBytes,
            filename: `PulaTechConf2025_Certificate_${userData.lastName}_${userData.firstName}.pdf`
        };
        
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

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
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
        const result = await generateCertificate(userData);
        if (result && result.bytes) {
            console.log("PDF generated, attempting to save...");
            
            try {
                // Create a blob from the PDF bytes
                const blob = new Blob([result.bytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                
                // Create a link and trigger download
                const link = document.createElement('a');
                link.href = url;
                link.download = result.filename;
                document.body.appendChild(link);
                link.click();
                
                // Clean up
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                console.log("PDF saved successfully");
            } catch (saveError) {
                console.error("Error saving PDF:", saveError);
                throw new Error("Unable to download PDF. Please try again.");
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

// Simple test function to check if basic functionality works
function testCertificateGeneration() {
    console.log("Starting certificate test...");
    
    // Show a message in the preview area
    certificatePreview.innerHTML = `
        <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Running certificate test...
        </div>
    `;
    
    // Test data - doesn't require Firebase
    const testUserData = {
        firstName: "John",
        lastName: "Doe",
        affiliation: "Test Organization",
        email: "test@example.com"
    };
    
    // First check if we can load the PDF template
    try {
        // First verify we can access the PDF template
        fetch(CERTIFICATE_TEMPLATE_PATH)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`PDF template not found: ${response.status} ${response.statusText}`);
                }
                
                certificatePreview.innerHTML = `
                    <div class="alert alert-success mb-3">
                        <i class="bi bi-check-circle me-2"></i>
                        Test step 1: PDF template found!
                    </div>
                    <button id="generateTestBtn" class="btn btn-primary mt-2">Generate Test Certificate</button>
                `;
                
                // Add event listener for the test generation button
                document.getElementById('generateTestBtn').addEventListener('click', () => {
                    downloadCertificate(testUserData);
                });
            })
            .catch(error => {
                certificatePreview.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Test failed: ${error.message}
                    </div>
                    <div class="mt-3">
                        <p>Make sure you have a PDF template at: <code>${CERTIFICATE_TEMPLATE_PATH}</code></p>
                    </div>
                `;
            });
    } catch (error) {
        certificatePreview.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Test failed: ${error.message}
            </div>
        `;
    }
}

// Add this after your DOM loaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for the test certificate button
    const testCertificateBtn = document.getElementById('testCertificateBtn');
    if (testCertificateBtn) {
        testCertificateBtn.addEventListener('click', testCertificateGeneration);
    }
});

// Update your exports
export { generateCertificate, downloadCertificate, testCertificateGeneration };