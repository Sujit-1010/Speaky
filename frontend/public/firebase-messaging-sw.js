const CACHE_NAME = 'speakup-appshell-v1';
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/site.webmanifest',
    '/manifest.json',
    '/favicon.ico',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/logo.png',
];

const IS_DEV = (
    self.location.hostname === 'localhost'
    || self.location.hostname === '127.0.0.1'
    || self.location.port === '5173'
);

if (!IS_DEV) {
    self.addEventListener('install', (event) => {
        self.skipWaiting();
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => cache.addAll(PRECACHE_URLS))
                .catch(() => undefined)
        );
    });

    self.addEventListener('activate', (event) => {
        event.waitUntil((async () => {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
            } catch { }
            try { await self.clients.claim(); } catch { }
        })());
    });

    self.addEventListener('fetch', (event) => {
        const req = event.request;
        if (!req || req.method !== 'GET') return;

        const url = new URL(req.url);
        if (url.origin !== self.location.origin) return;
        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) return;
        if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/src/')) return;

        // SPA navigation: network-first, fallback to cached index.html
        if (req.mode === 'navigate') {
            event.respondWith(
                fetch(req)
                    .then((resp) => {
                        const copy = resp.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => undefined);
                        return resp;
                    })
                    .catch(() => caches.match('/index.html'))
            );
            return;
        }

        // Static assets: cache-first, then network
        event.respondWith(
            caches.match(req)
                .then((cached) => cached || fetch(req))
                .then((resp) => {
                    try {
                        if (resp && resp.status === 200) {
                            const copy = resp.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => undefined);
                        }
                    } catch { }
                    return resp;
                })
                .catch(() => caches.match(req))
        );
    });
}

try {
    importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');

    firebase.initializeApp({
        apiKey: 'AIzaSyCxUTfUhpMfyadunt94VR6A10wVeWYfbOs',
        authDomain: 'speakup-fafe8.firebaseapp.com',
        projectId: 'speakup-fafe8',
        storageBucket: 'speakup-fafe8.firebasestorage.app',
        messagingSenderId: '451745252894',
        appId: '1:451745252894:web:7e818c42c801dfa106100f',
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        const data = payload?.data || {};
        const title = data._title || payload?.notification?.title || 'SpeakUp';
        const body = data._body || payload?.notification?.body || '';
        let actions = [];
        try {
            if (data.actions) actions = JSON.parse(data.actions);
        } catch { }
        // Fallback actions to match the sample UI
        if (!Array.isArray(actions) || actions.length === 0) {
            actions = [
                { action: 'open_admin', title: 'Open Admin' },
                { action: 'dismiss', title: 'Dismiss' },
            ];
        }

        const nurl = data.url || '/';
        const options = {
            body,
            icon: data.icon || '/logo.png',
            badge: data.badge || '/logo.png',
            image: (data.image && String(data.image).trim()) ? String(data.image) : undefined,
            actions,
            requireInteraction: String(data.requireInteraction || '') === 'true',
            data: {
                url: nurl, actionUrls: (() => {
                    try { return data.actionUrls ? JSON.parse(data.actionUrls) : {}; } catch { return {}; }
                })(), raw: data
            },
        };
        self.registration.showNotification(title, options);
    });
} catch (e) {
    // If Firebase scripts fail to load, still keep SW active for PWA caching.
}

self.addEventListener('notificationclick', (event) => {
    const action = event.action || '';
    const notif = event.notification;
    const data = (notif && notif.data) || {};
    const actionUrls = data.actionUrls || {};

    // Dismiss action: close only
    if (action === 'dismiss') {
        notif?.close();
        return;
    }

    const url = action && actionUrls[action] ? actionUrls[action] : (data.url || '/');
    notif?.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
            return null;
        })
    );
});
