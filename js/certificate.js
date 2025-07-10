import { app } from "./firebase-config.js";

// DOM elements - with null checks
const downloadCertificateBtn = document.getElementById('downloadCertificateBtn');
const certificatePreview = document.getElementById('certificatePreview');

// Check if elements exist
if (!certificatePreview) {
    console.error("Certificate preview element not found");
}

// Use JPG image directly instead of PDF template
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
    fontTest.style.fontSize = "50px"; // Use a smaller size for more reliable testing
    fontTest.style.visibility = "hidden";
    fontTest.textContent = "Test Font Loading"; // Use a longer text for better comparison
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
    console.log(`Width comparison: initial=${initialWidth}, after=${afterWidth}, difference=${Math.abs(initialWidth - afterWidth)}`);
    
    return fontLoaded;
}

// Enhanced preloading function that handles fonts with better timeout handling
function preloadResources() {
    return new Promise((resolve) => {
        console.log("Preloading fonts and resources...");
        const startTime = Date.now();
        
        // Load Italianno font
        const fontLoader = document.createElement('link');
        fontLoader.rel = 'stylesheet';
        fontLoader.href = 'https://fonts.googleapis.com/css2?family=Italianno&display=swap';
        document.head.appendChild(fontLoader);
        
        // Use more robust font loading detection
        let fontLoaded = false;
        let attempts = 0;
        
        // Create a function to check if font is loaded
        const checkFontInterval = setInterval(() => {
            attempts++;
            const elapsedTime = Date.now() - startTime;
            const isLoaded = checkFontLoaded();
            
            console.log(`Font load check attempt #${attempts} after ${elapsedTime}ms: ${isLoaded ? 'SUCCESS' : 'WAITING'}`);
            
            if (isLoaded) {
                fontLoaded = true;
                console.log(`Italianno font loaded successfully after ${elapsedTime}ms`);
                clearInterval(checkFontInterval);
                clearTimeout(timeoutHandler);
                resolve(true);
            }
            // Continue checking in the interval
        }, 500); // Check every 500ms
        
        // Fallback after exactly 1 minute (60000ms)
        const timeoutHandler = setTimeout(() => {
            clearInterval(checkFontInterval);
            const elapsedTime = Date.now() - startTime;
            console.warn(`Font loading timeout reached after ${elapsedTime}ms, continuing with fallbacks`);
            
            // Check one last time
            if (!fontLoaded && checkFontLoaded()) {
                console.log("Font loaded just in time during final check");
                resolve(true);
            } else {
                resolve(false);
            }
        }, 60000);
    });
}

// Enhanced certificate generation using JPG image directly
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
        const fontLoadResult = await preloadResources();
        console.log(`Font preloading complete, success: ${fontLoadResult}`);
        
        // First, create a canvas to draw the certificate
        console.log("Creating certificate on canvas...");
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Load the certificate image
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Failed to load certificate image"));
            image.src = CERTIFICATE_IMAGE_PATH;
        });
        
        // Set canvas size to match the certificate image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the certificate image on the canvas
        ctx.drawImage(img, 0, 0);
        
        // Add the name text - use information from font loading result
        let fontFamily, baseFontSize;
        
        if (fontLoadResult) {
            fontFamily = "'Italianno', cursive";
            baseFontSize = 400;
            console.log("Using Italianno font for certificate");
        } else {
            // Fallback font options
            fontFamily = "serif";
            baseFontSize = 120;
            console.log("Using fallback font for certificate");
        }
        
        // Position the text in the center-ish of the certificate
        const text = `${userData.firstName} ${userData.lastName}`;
        
        // Simple font size adjustment based on name length
        const nameLength = text.length;
        let fontSize = baseFontSize;
        
        // Adjust font size if name is too long
        if (nameLength > 15) {
            const reductionFactor = Math.min(1.0, 15 / nameLength);
            fontSize = Math.floor(baseFontSize * reductionFactor);
            console.log(`Adjusted font size to ${fontSize}px due to long name (${nameLength} characters)`);
        }
        
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = "#333333";
        ctx.textAlign = "center";
        
        console.log(`Using font: ${fontFamily} at size ${fontSize}px`);
        
        // Add margin from top/bottom (20% of canvas height)
        const maxWidth = canvas.width * 0.8; // 80% of canvas width as max width
        ctx.fillText(text, canvas.width / 2, canvas.height / 2, maxWidth);
        
        // Get the image data from canvas
        const imageData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Create a PDF document
        console.log("Creating PDF...");
        const { PDFDocument, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        
        // Add a page with the correct aspect ratio
        const pageWidth = 850;  // Adjust these values to match your certificate proportions
        const pageHeight = 650; // Adjust these values to match your certificate proportions
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Embed the certificate image with text
        const jpgImage = await pdfDoc.embedJpg(imageData);
        
        // Draw the image to fill the page
        const { width, height } = page.getSize();
        page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: width,
            height: height,
        });
        
        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        console.log("PDF created successfully");
        
        // Convert to base64 for preview
        const base64Data = arrayBufferToBase64(pdfBytes);
        const pdfUrl = `data:application/pdf;base64,${base64Data}`;
        
        // Generate preview
        certificatePreview.innerHTML = `
            <div class="mb-3">
                <img src="${imageData}" alt="Certificate Preview" class="img-fluid certificate-thumbnail mb-2">
                <p class="text-muted small">Image preview of your personalized certificate</p>
            </div>
        `;
        
        // Return the PDF bytes for download
        return {
            bytes: pdfBytes,
            filename: `PulaTechConf2025_Certificate_${userData.lastName}_${userData.firstName}.pdf`
        };
        
    } catch (error) {
        console.error("Detailed error in certificate generation:", error);
        console.error("Error stack:", error.stack);
        
        // Show error in certificate preview
        certificatePreview.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error generating certificate: ${error.message}
            </div>
        `;
        
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

// Initialize with proper DOM checks and delayed to allow profile page to load
document.addEventListener('DOMContentLoaded', () => {
    if (downloadCertificateBtn && certificatePreview) {
        // Wait a longer moment to let user-profile.js load the data first
        setTimeout(() => {
            initCertificate();
        }, 2000); // Ensure profile is loaded
    } else {
        console.warn("Certificate elements not found in DOM");
    }
});

// Update your exports
export { generateCertificate, downloadCertificate };