(function(globalScope) {
    const BADGE_DB_NAME = 'PulaTechBadgeDB';
    const BADGE_DB_VERSION = 1;
    const BADGE_STORE_NAME = 'badgeState';
    const BADGE_KEY = 'unreadCount';

    function normalizeBadgeCount(count) {
        const numericCount = Number(count);
        if (!Number.isFinite(numericCount) || numericCount <= 0) {
            return 0;
        }
        return Math.floor(numericCount);
    }

    function openBadgeDb() {
        if (!('indexedDB' in globalScope)) {
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
            return 0;
        }
    }

    async function writeStoredBadgeCount(count) {
        const normalizedCount = normalizeBadgeCount(count);

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
        const workerNavigator = globalScope.navigator;
        if (!workerNavigator || (!('setAppBadge' in workerNavigator) && !('clearAppBadge' in workerNavigator))) {
            return false;
        }

        try {
            if (normalizedCount > 0 && 'setAppBadge' in workerNavigator) {
                await workerNavigator.setAppBadge(normalizedCount);
            } else if ('clearAppBadge' in workerNavigator) {
                await workerNavigator.clearAppBadge();
            } else {
                await workerNavigator.setAppBadge(0);
            }
            return true;
        } catch (error) {
            console.debug('App badge update skipped:', error);
            return false;
        }
    }

    async function setBadgeCount(count) {
        const normalizedCount = normalizeBadgeCount(count);
        await writeStoredBadgeCount(normalizedCount);
        await applyAppBadge(normalizedCount);
        return normalizedCount;
    }

    async function incrementBadgeCount(amount = 1) {
        const currentCount = await readStoredBadgeCount();
        return setBadgeCount(currentCount + normalizeBadgeCount(amount));
    }

    globalScope.pulaTechBadge = {
        set: setBadgeCount,
        clear: () => setBadgeCount(0),
        increment: incrementBadgeCount
    };
})(self);
