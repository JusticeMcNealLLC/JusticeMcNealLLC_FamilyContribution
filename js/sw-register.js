// ─── Service Worker Registration ────────────────────────
// Include this script in every page to register the SW.
(function() {
    // Detect standalone PWA mode (iOS + Android)
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
        document.documentElement.classList.add('pwa-standalone');
    }

    if ('serviceWorker' in navigator) {
        // Determine root path (works from /portal/, /admin/, /auth/ etc.)
        var swPath = '/sw.js';
        // For GitHub Pages custom domain, root is always /
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
