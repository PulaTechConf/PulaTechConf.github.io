import { db } from "./firebase-config.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const downloadCertificateBtn = document.getElementById('downloadCertificateBtn');
const certificatePreview = document.getElementById('certificatePreview');
const CERTIFICATE_IMAGE_PATH = '../icons/img/certifikat-01.jpg';
const CERTIFICATE_FONT_ID = 'certificate-italianno-font';

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);

    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loadScripts(urls) {
    return Promise.all(urls.map(url => {
        return new Promise((resolve, reject) => {
            if (url.includes('pdf-lib') && window.PDFLib) {
                resolve();
                return;
            }

            if (url.includes('fontkit') && window.fontkit) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }));
}

async function loadCertificateFont(sampleText) {
    if (!document.getElementById(CERTIFICATE_FONT_ID)) {
        const link = document.createElement('link');
        link.id = CERTIFICATE_FONT_ID;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Italianno&display=block';
        document.head.appendChild(link);

        await Promise.race([
            new Promise(resolve => {
                link.onload = resolve;
                link.onerror = resolve;
            }),
            timeout(5000)
        ]);
    }

    if (!document.fonts || !document.fonts.load) {
        return false;
    }

    await Promise.race([
        document.fonts.load('400 420px "Italianno"', sampleText),
        timeout(8000)
    ]);
    await Promise.race([document.fonts.ready, timeout(8000)]);

    return document.fonts.check('400 120px "Italianno"', sampleText);
}

function showLockedCertificate() {
    if (certificatePreview) {
        certificatePreview.innerHTML = `
            <div class="certificate-locked-state">
                <i class="bi bi-lock-fill"></i>
                <p class="mb-1 fw-semibold">Conference Certificate will be available at the end of the conference.</p>
                <p class="text-muted small mb-0">Please check back after the conference or wait for organizer approval.</p>
            </div>
        `;
    }

    if (downloadCertificateBtn) {
        downloadCertificateBtn.disabled = true;
        downloadCertificateBtn.innerHTML = '<i class="bi bi-lock me-2"></i>Certificate Locked';
    }
}

function showCertificateLoading(message = 'Generating your certificate...') {
    if (certificatePreview) {
        certificatePreview.innerHTML = `
            <div class="certificate-loading">
                <div class="spinner-border" role="status"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function showCertificateError(message) {
    if (certificatePreview) {
        certificatePreview.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                ${message}
            </div>
        `;
    }
}

async function getCurrentUserData() {
    const userId = localStorage.getItem('userId');
    if (!userId) return null;

    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) return null;

    return {
        id: userSnap.id,
        ...userSnap.data()
    };
}

function normalizeCertificateUserData(userData) {
    return {
        firstName: userData?.firstName || 'Conference',
        lastName: userData?.lastName || 'Participant',
        certificateEnabled: userData?.certificateEnabled === true
    };
}

function loadCertificateImage() {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load certificate image'));
        image.src = CERTIFICATE_IMAGE_PATH;
    });
}

function fitNameFont(ctx, text, maxWidth, preferredSize) {
    let fontSize = preferredSize;

    while (fontSize > 180) {
        ctx.font = `${fontSize}px "Italianno", "Times New Roman", serif`;
        if (ctx.measureText(text).width <= maxWidth) {
            return fontSize;
        }
        fontSize -= 10;
    }

    return fontSize;
}

async function generateCertificate(userData) {
    if (!certificatePreview) return null;

    const normalizedUser = normalizeCertificateUserData(userData);
    const fullName = `${normalizedUser.firstName} ${normalizedUser.lastName}`.trim();

    showCertificateLoading('Preparing your certificate...');

    try {
        await loadScripts([
            'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
            'https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'
        ]);

        if (!window.PDFLib || !window.PDFLib.PDFDocument) {
            throw new Error("PDF library did not load correctly");
        }

        const [image, fontReady] = await Promise.all([
            loadCertificateImage(),
            loadCertificateFont(fullName)
        ]);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        const maxWidth = canvas.width * 0.58;
        const preferredSize = Math.round(canvas.width * 0.105);
        const fontSize = fontReady ? fitNameFont(ctx, fullName, maxWidth, preferredSize) : 190;

        ctx.font = fontReady
            ? `${fontSize}px "Italianno", "Times New Roman", serif`
            : `${fontSize}px "Times New Roman", serif`;
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(fullName, canvas.width / 2, canvas.height * 0.515, maxWidth);

        const imageData = canvas.toDataURL('image/jpeg', 0.95);
        const { PDFDocument } = window.PDFLib;
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([850, 650]);
        const jpgImage = await pdfDoc.embedJpg(imageData);
        const { width, height } = page.getSize();

        page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width,
            height
        });

        const pdfBytes = await pdfDoc.save();

        certificatePreview.innerHTML = `
            <div class="mb-3">
                <img src="${imageData}" alt="Certificate Preview" class="img-fluid certificate-thumbnail mb-2">
                <p class="text-muted small">Image preview of your personalized certificate</p>
            </div>
        `;

        return {
            bytes: pdfBytes,
            filename: `PulaTechConf2026_Certificate_${sanitizeFilename(normalizedUser.lastName)}_${sanitizeFilename(normalizedUser.firstName)}.pdf`
        };
    } catch (error) {
        console.error("Error generating certificate:", error);
        showCertificateError(`Error generating certificate: ${error.message}`);
        return null;
    }
}

function sanitizeFilename(value) {
    return String(value || 'Participant').replace(/[^a-z0-9_-]+/gi, '_');
}

async function downloadCertificate(userData) {
    if (!downloadCertificateBtn || !certificatePreview) return;

    if (!normalizeCertificateUserData(userData).certificateEnabled) {
        showLockedCertificate();
        return;
    }

    const originalBtnContent = downloadCertificateBtn.innerHTML;
    downloadCertificateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
    downloadCertificateBtn.disabled = true;

    try {
        const result = await generateCertificate(userData);
        if (!result?.bytes) {
            throw new Error('Failed to generate certificate PDF');
        }

        const blob = new Blob([result.bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error downloading certificate:", error);
        showCertificateError(`Error downloading certificate: ${error.message}`);
    } finally {
        downloadCertificateBtn.innerHTML = originalBtnContent;
        downloadCertificateBtn.disabled = false;
    }
}

async function initCertificate() {
    if (!downloadCertificateBtn || !certificatePreview) return;

    try {
        const userData = await getCurrentUserData();
        const normalizedUser = normalizeCertificateUserData(userData);

        if (!normalizedUser.certificateEnabled) {
            showLockedCertificate();
            return;
        }

        downloadCertificateBtn.disabled = false;
        downloadCertificateBtn.innerHTML = '<i class="bi bi-download me-2"></i>Download Certificate';
        await generateCertificate(normalizedUser);

        downloadCertificateBtn.addEventListener('click', () => {
            downloadCertificate(normalizedUser);
        });
    } catch (error) {
        console.error("Error initializing certificate:", error);
        showLockedCertificate();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initCertificate();
});

export { generateCertificate, downloadCertificate };
