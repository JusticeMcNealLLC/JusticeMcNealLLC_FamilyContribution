/**
 * Portal Events — lazy CDN vendors (QR, jsQR, Leaflet).
 * Loaded on demand so events.html does not block on three CDN scripts.
 */
(function (root) {
    'use strict';

    const SRC = {
        qrcode: 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js',
        jsqr: 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
        leafletJs: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        leafletCss: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    };

    const scriptPromises = {};

    function loadScript(src, isReady) {
        if (isReady()) return Promise.resolve(isReady());
        if (!scriptPromises[src]) {
            scriptPromises[src] = new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${src}"]`);
                const script = existing || document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => (isReady() ? resolve(isReady()) : reject(new Error(`Vendor did not initialize: ${src}`)));
                script.onerror = () => reject(new Error(`Vendor failed to load: ${src}`));
                if (!existing) document.head.appendChild(script);
            });
        }
        return scriptPromises[src];
    }

    let leafletCssPromise = null;
    function loadLeafletCss() {
        if (document.querySelector(`link[href="${SRC.leafletCss}"]`)) return Promise.resolve();
        if (!leafletCssPromise) {
            leafletCssPromise = new Promise((resolve, reject) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = SRC.leafletCss;
                link.crossOrigin = '';
                link.onload = () => resolve();
                link.onerror = () => reject(new Error('Leaflet CSS failed to load'));
                document.head.appendChild(link);
            });
        }
        return leafletCssPromise;
    }

    async function ensureQRCode() {
        return loadScript(SRC.qrcode, () => root.QRCode);
    }

    async function ensureJsQR() {
        return loadScript(SRC.jsqr, () => root.jsQR);
    }

    async function ensureLeaflet() {
        await loadLeafletCss();
        return loadScript(SRC.leafletJs, () => root.L);
    }

    root.PortalEvents = root.PortalEvents || {};
    root.PortalEvents.vendors = { ensureQRCode, ensureJsQR, ensureLeaflet };
    root.evtEnsureQRCode = ensureQRCode;
    root.evtEnsureJsQR = ensureJsQR;
    root.evtEnsureLeaflet = ensureLeaflet;
})(typeof window !== 'undefined' ? window : globalThis);
