// ─── Service Worker — Justice McNeal Family Portal ──────
// Cache-first for statics, network-first for API calls.

const CACHE_NAME = 'jm-portal-v1';

// Shell assets to pre-cache on install
const SHELL_ASSETS = [
    '/portal/index.html',
    '/portal/feed.html',
    '/css/shared.css',
    '/js/components/pageShell.js',
    '/js/config.js',
    '/manifest.json',
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

    // Network-only for Supabase API & auth
    if (url.hostname.includes('supabase') || url.pathname.startsWith('/auth/')) {
        return;
    }

    // Network-only for Tailwind CDN (always fresh)
    if (url.hostname === 'cdn.tailwindcss.com') {
        return;
    }

    // Stale-while-revalidate for everything else
    e.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(e.request).then(cached => {
                const fetched = fetch(e.request).then(response => {
                    if (response && response.status === 200) {
                        cache.put(e.request, response.clone());
                    }
                    return response;
                }).catch(() => cached); // offline fallback

                return cached || fetched;
            })
        )
    );
});
