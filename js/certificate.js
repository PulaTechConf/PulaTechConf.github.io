import { app } from "./firebase-config.js";

// DOM elements - with null checks
const downloadCertificateBtn = document.getElementById('downloadCertificateBtn');
const certificatePreview = document.getElementById('certificatePreview');

// Check if elements exist
if (!certificatePreview) {
    console.error("Certificate preview element not found");
}

// Certificate PDF template path
const CERTIFICATE_TEMPLATE_PATH = '../icons/img/certificat.pdf';
// Fallback image path for preview
const CERTIFICATE_IMAGE_PATH = '../icons/img/certifikat-01.jpg';

// Function to get user data from profile page DOM elements
function getUserDataFromProfilePage() {
    try {
        const firstNameElement = document.getElementById('firstName');
        const lastNameElement = document.getElementById('lastName');
        
        if (firstNameElement && lastNameElement) {
            const firstName = firstNameElement.textContent.trim();
            const lastName = lastNameElement.textContent.trim();
            
            // Only use the data if it's not a placeholder
            if (firstName !== 'Loading...' && lastName !== 'Loading...' && 
                firstName !== 'Not provided' && lastName !== 'Not provided') {
                console.log("Using user data from profile page:", { firstName, lastName });
                return { firstName, lastName };
            }
        }
    } catch (error) {
        console.error("Error getting user data from profile page:", error);
    }
    
    return null;
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

// Fallback function to show image preview when PDF generation fails
async function showImagePreview(userData) {
    if (!certificatePreview) return;
    
    try {
        // Show the static certificate image as fallback
        certificatePreview.innerHTML = `
            <div class="position-relative">
                <img src="${CERTIFICATE_IMAGE_PATH}" alt="Certificate Preview" class="img-fluid certificate-thumbnail">
                <div class="position-absolute" style="top: 45%; left: 0; right: 0; text-align: center;">
                    <h2 style="font-family: 'Italianno', cursive; font-size: 42px; color: #333;">
                        ${userData.firstName} ${userData.lastName}
                    </h2>
                </div>
                <p class="text-muted mt-2 small">Preview of your certificate (image only)</p>
            </div>
        `;
        
        return true;
    } catch (error) {
        console.error("Error showing image preview:", error);
        certificatePreview.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Could not display certificate preview
            </div>
        `;
        return false;
    }
}

// Enhanced certificate generation using PDF template
async function generateCertificate(userData) {
    if (!certificatePreview) return null;
    
    // Try to get user data from profile page if not provided
    if (!userData || !userData.firstName || !userData.lastName) {
        const profileData = getUserDataFromProfilePage();
        if (profileData) {
            userData = profileData;
        }
    }
    
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
        
        // Verify PDFLib loaded correctly
        if (typeof PDFLib === 'undefined' || !PDFLib.PDFDocument) {
            throw new Error("PDF libraries didn't load correctly");
        }
        
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
        let italiannoFont;
        
        try {
            const fontResponse = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/italianno@5.0.17/files/italianno-latin-400-normal.woff');
            const fontBytes = await fontResponse.arrayBuffer();
            italiannoFont = await pdfDoc.embedFont(fontBytes);
        } catch (fontError) {
            console.warn("Failed to load Italianno font, falling back to standard font:", fontError);
            // Fall back to a standard font
            italiannoFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
        }
        
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
            <object data="${pdfUrl}" type="application/pdf" class="certificate-pdf-preview" style="width:100%; height:300px;">
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
        
        // Try fallback to image preview
        console.log("Attempting fallback to image preview...");
        const fallbackSuccess = await showImagePreview(userData);
        
        if (!fallbackSuccess) {
            certificatePreview.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Error generating certificate: ${error.message}
                </div>
            `;
        }
        
        return null;
    }
}

// Download certificate as PDF
async function downloadCertificate(userData) {
    if (!downloadCertificateBtn || !certificatePreview) {
        console.error("Required DOM elements not found");
        return;
    }
    
    // Try to get user data from profile page if not provided
    if (!userData || !userData.firstName || !userData.lastName) {
        const profileData = getUserDataFromProfilePage();
        if (profileData) {
            userData = profileData;
        }
    }
    
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
    // Try to get user data from profile page
    const profileData = getUserDataFromProfilePage();
    
    if (profileData) {
        console.log("Using data from profile page for certificate");
        // Generate certificate preview with profile data
        generateCertificate(profileData);
        
        // Add click event to download button with profile data
        if (downloadCertificateBtn) {
            downloadCertificateBtn.addEventListener('click', () => downloadCertificate(profileData));
        }
        return;
    }
    
    // If data is not available yet, wait and retry
    console.log("Profile data not ready, will retry shortly...");
    
    // Show waiting message
    if (certificatePreview) {
        certificatePreview.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-hourglass-split me-2"></i>
                Loading your certificate data...
            </div>
        `;
    }
    
    // Try again after a delay
    setTimeout(() => {
        const retryProfileData = getUserDataFromProfilePage();
        
        if (retryProfileData) {
            console.log("Successfully loaded profile data on retry");
            generateCertificate(retryProfileData);
            
            if (downloadCertificateBtn) {
                downloadCertificateBtn.addEventListener('click', () => downloadCertificate(retryProfileData));
            }
        } else {
            // Still no data, use fallback
            console.warn("Could not load profile data, using fallback");
            const fallbackData = {
                firstName: "Conference",
                lastName: "Participant"
            };
            
            if (certificatePreview) {
                certificatePreview.innerHTML = `
                    <div class="alert alert-warning mb-3">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        <strong>Note:</strong> Using generic data for certificate. Please try reloading the page.
                    </div>
                `;
                
                // Add event listener for the retry button
                const retryButton = document.createElement('button');
                retryButton.className = 'btn btn-outline-primary mb-3';
                retryButton.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Retry Loading Data';
                retryButton.addEventListener('click', () => {
                    const latestData = getUserDataFromProfilePage();
                    if (latestData) {
                        generateCertificate(latestData);
                        if (downloadCertificateBtn) {
                            downloadCertificateBtn.addEventListener('click', () => downloadCertificate(latestData));
                        }
                    } else {
                        // Still no data, generate with fallback
                        generateCertificate(fallbackData);
                    }
                });
                
                // Add retry button to the preview
                certificatePreview.prepend(retryButton);
                
                // Still add functionality to generate certificate with generic data
                if (downloadCertificateBtn) {
                    downloadCertificateBtn.addEventListener('click', () => downloadCertificate(fallbackData));
                }
                
                // Generate preview with fallback data
                generateCertificate(fallbackData);
            }
        }
    }, 1500);
}

// Simple test function to check if basic functionality works
function testCertificateGeneration() {
    if (!certificatePreview) {
        console.error("Certificate preview element not found");
        return;
    }
    
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
                    <button id="fallbackTestBtn" class="btn btn-secondary mt-2 ms-2">Test Fallback Preview</button>
                `;
                
                // Add event listener for the test generation button
                document.getElementById('generateTestBtn').addEventListener('click', () => {
                    downloadCertificate(testUserData);
                });
                
                // Add event listener for the fallback test button
                document.getElementById('fallbackTestBtn').addEventListener('click', () => {
                    showImagePreview(testUserData);
                });
            })
            .catch(error => {
                certificatePreview.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        PDF template not found: ${error.message}
                    </div>
                    <div class="mt-3">
                        <p>Testing fallback to image preview...</p>
                        <button id="fallbackTestBtn" class="btn btn-primary mt-2">Test Image Fallback</button>
                    </div>
                `;
                
                // Add event listener for the fallback test button
                document.getElementById('fallbackTestBtn').addEventListener('click', () => {
                    showImagePreview(testUserData);
                });
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

// Initialize with proper DOM checks and delayed to allow profile page to load
document.addEventListener('DOMContentLoaded', () => {
    if (downloadCertificateBtn && certificatePreview) {
        // Wait a longer moment to let user-profile.js load the data first
        setTimeout(() => {
            initCertificate();
        }, 2000); // Ensure profile is loaded
        
        // Add event listener for the test certificate button
        const testCertificateBtn = document.getElementById('testCertificateBtn');
        if (testCertificateBtn) {
            testCertificateBtn.addEventListener('click', testCertificateGeneration);
        }
    } else {
        console.warn("Certificate elements not found in DOM");
    }
});

// Update your exports
export { generateCertificate, downloadCertificate, testCertificateGeneration };