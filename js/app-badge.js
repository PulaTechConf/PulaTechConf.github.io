const BADGE_DB_NAME = 'PulaTechBadgeDB';
const BADGE_DB_VERSION = 1;
const BADGE_STORE_NAME = 'badgeState';
const BADGE_KEY = 'unreadCount';
const BADGE_LOCAL_STORAGE_KEY = 'pulaTechUnreadBadgeCount';

function normalizeBadgeCount(count) {
    const numericCount = Number(count);
    if (!Number.isFinite(numericCount) || numericCount <= 0) {
        return 0;
    }
    return Math.floor(numericCount);
}

function openBadgeDb() {
    if (!('indexedDB' in window)) {
        return Promise.reject(new Error('IndexedDB is not available'));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(BADGE_DB_NAME, BADGE_DB_VERSION);

        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(BADGE_STORE_NAME)) {
                database.createObjectStore(BADGE_STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function readStoredBadgeCount() {
    try {
        const database = await openBadgeDb();
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction(BADGE_STORE_NAME, 'readonly');
            const store = transaction.objectStore(BADGE_STORE_NAME);
            const request = store.get(BADGE_KEY);

            request.onsuccess = () => resolve(normalizeBadgeCount(request.result));
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => database.close();
        });
    } catch {
        return normalizeBadgeCount(localStorage.getItem(BADGE_LOCAL_STORAGE_KEY));
    }
}

async function writeStoredBadgeCount(count) {
    const normalizedCount = normalizeBadgeCount(count);
    localStorage.setItem(BADGE_LOCAL_STORAGE_KEY, String(normalizedCount));

    try {
        const database = await openBadgeDb();
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(BADGE_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(BADGE_STORE_NAME);
            const request = store.put(normalizedCount, BADGE_KEY);

            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => {
                database.close();
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.debug('Badge count storage skipped:', error);
    }
}

async function applyAppBadge(count) {
    const normalizedCount = normalizeBadgeCount(count);
    if (!('setAppBadge' in navigator) && !('clearAppBadge' in navigator)) {
        return false;
    }

    try {
        if (normalizedCount > 0 && 'setAppBadge' in navigator) {
            await navigator.setAppBadge(normalizedCount);
        } else if ('clearAppBadge' in navigator) {
            await navigator.clearAppBadge();
        } else {
            await navigator.setAppBadge(0);
        }
        return true;
    } catch (error) {
        console.debug('App badge update skipped:', error);
        return false;
    }
}

export function isAppBadgeSupported() {
    return 'setAppBadge' in navigator || 'clearAppBadge' in navigator;
}

export async function setAppBadgeCount(count) {
    const normalizedCount = normalizeBadgeCount(count);
    await writeStoredBadgeCount(normalizedCount);
    await applyAppBadge(normalizedCount);
    return normalizedCount;
}

export async function clearAppBadgeCount() {
    return setAppBadgeCount(0);
}

export async function incrementAppBadgeCount(amount = 1) {
    const currentCount = await readStoredBadgeCount();
    return setAppBadgeCount(currentCount + normalizeBadgeCount(amount));
}

export async function syncAppBadgeFromStorage() {
    const currentCount = await readStoredBadgeCount();
    await applyAppBadge(currentCount);
    return currentCount;
}
