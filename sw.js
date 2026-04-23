// ─── Service Worker — Justice McNeal Family Portal ──────
// Cache-first for statics, network-first for API calls.
// Push notification handler for native OS notifications.

const CACHE_NAME = 'jm-portal-v74';

// Shell assets to pre-cache on install
const SHELL_ASSETS = [
    '/portal/index.html',
    '/portal/feed.html',
    '/portal/quests.html',
    '/js/portal/quests/config.js',
    '/js/portal/quests/renders.js',
    '/js/portal/quests/init.js',
    '/css/shared.css',
    '/js/components/pageShell/icons.js',
    '/js/components/pageShell/helpers.js',
    '/js/components/pageShell/nav.js',
    '/js/components/pageShell/dropdowns.js',
    '/js/components/pageShell/drawer.js',
    '/js/components/pageShell/profile-loader.js',
    '/js/config.js',
    '/js/lottie-effects.js',
    '/assets/lottie/founders.json',
    '/assets/lottie/cat-playing.json',
    '/assets/banner/founder1.webp',
    '/assets/banner/cat1.webp',
    '/manifest.json',
];

// External domains the SW should never intercept (network-only).
// These either don't support CORS or shouldn't be cached.
const NETWORK_ONLY_HOSTS = [
    'geocoding.geo.census.gov',
    'nominatim.openstreetmap.org',
    'tile.openstreetmap.org',
    'unpkg.com',
    'cdnjs.cloudflare.com',
    'js.stripe.com',
    'api.stripe.com',
];

// Install: cache shell assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch strategy
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Only handle http(s) GET requests (skip chrome-extension://, POSTs, etc.)
    if (!url.protocol.startsWith('http') || e.request.method !== 'GET') {
        return;
    }

    // Let the browser handle full page navigations natively — no synthetic 503 fallback
    if (e.request.mode === 'navigate') {
        return;
    }

    // Network-only for Supabase API & auth
    if (url.hostname.includes('supabase') || url.pathname.startsWith('/auth/')) {
        return;
    }

    // Network-only for Tailwind CDN (always fresh)
    if (url.hostname === 'cdn.tailwindcss.com') {
        return;
    }

    // Network-only for external APIs that don't support CORS or shouldn't be cached
    if (NETWORK_ONLY_HOSTS.includes(url.hostname)) {
        return;
    }

    // Stale-while-revalidate for everything else
    e.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(e.request).then(cached => {
                const fetchPromise = fetch(e.request).then(response => {
                    if (response && response.ok) {
                        cache.put(e.request, response.clone());
                    }
                    return response;
                }).catch(() => null);

                if (cached) {
                    // Return stale cache immediately; revalidate in background
                    fetchPromise.catch(() => {});
                    return cached;
                }

                // No cache hit — wait for network, fallback to 503
                return fetchPromise.then(r =>
                    r || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
                );
            })
        )
    );
});

// ─── Push Notification Handler ──────────────────────────
self.addEventListener('push', (e) => {
    if (!e.data) return;

    let payload;
    try {
        payload = e.data.json();
    } catch (_) {
        payload = {
            title: '🔔 Justice McNeal Portal',
            body: e.data.text() || 'New notification',
            icon: '/assets/icons/icon-192.svg',
            data: { url: '/portal/feed.html' },
        };
    }

    const options = {
        body: payload.body || 'New notification',
        icon: payload.icon || '/assets/icons/icon-192.svg',
        badge: payload.badge || '/assets/icons/icon-192.svg',
        tag: payload.tag || 'jm-notification',
        renotify: true,
        vibrate: [100, 50, 100],
        data: payload.data || { url: '/portal/feed.html' },
        actions: [
            { action: 'open', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    e.waitUntil(
        self.registration.showNotification(payload.title || '🔔 New Notification', options)
    );
});

// ─── Notification Click Handler ─────────────────────────
self.addEventListener('notificationclick', (e) => {
    e.notification.close();

    if (e.action === 'dismiss') return;

    const targetUrl = (e.notification.data && e.notification.data.url) || '/portal/feed.html';

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus existing tab if open
            for (const client of windowClients) {
                if (client.url.includes(new URL(targetUrl, self.location.origin).pathname)) {
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            return clients.openWindow(targetUrl);
        })
    );
});
