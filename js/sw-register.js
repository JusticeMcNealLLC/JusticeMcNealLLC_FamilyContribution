// ─── Service Worker Registration ────────────────────────
// Include this script in every page to register the SW.
(function() {
    // Detect standalone PWA mode (iOS + Android)
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
        document.documentElement.classList.add('pwa-standalone');
    }

    if ('serviceWorker' in navigator) {
        // Query bust forces CDN/browser to fetch the latest sw.js when we bump caches.
        // Scope stays / so the SW still controls the whole origin.
        var swPath = '/sw.js?v=118';
        navigator.serviceWorker.register(swPath, { scope: '/' })
            .then(function(reg) {
                // Check for updates periodically
                setInterval(function() { reg.update(); }, 60 * 60 * 1000); // hourly
            })
            .catch(function(err) {
                console.warn('SW registration failed:', err);
            });
    }
})();
