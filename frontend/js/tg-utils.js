const tg = window.Telegram?.WebApp;

export function initTelegramApp() {
    if (tg) {
        tg.ready();
        tg.expand();
    }
}

export function getInitData() {
    return tg?.initData || '';
}

export function getTelegramUser() {
    return tg?.initDataUnsafe?.user || null;
}

export function closeTelegramApp() {
    if (tg) {
        tg.close();
    }
}

export function cloudSet(key, value) {
    localStorage.setItem(key, value);

    try {
        tg?.CloudStorage?.setItem(key, value, () => {});
    } catch (error) {
        // localStorage is the fallback when Telegram CloudStorage is unavailable.
    }
}

export function cloudGet(key) {
    return new Promise((resolve) => {
        if (!tg?.CloudStorage) {
            resolve(localStorage.getItem(key));
            return;
        }

        try {
            tg.CloudStorage.getItem(key, (error, value) => {
                resolve(error ? localStorage.getItem(key) : value);
            });
        } catch (error) {
            resolve(localStorage.getItem(key));
        }
    });
}

export function showPopup(options) {
    if (tg?.showPopup) {
        tg.showPopup(options);
    } else {
        alert(options.message ? `${options.title}\n\n${options.message}` : options.title);
    }
}

export function openLink(url) {
    if (tg?.openLink) {
        tg.openLink(url);
    } else {
        window.location.href = url;
    }
}
