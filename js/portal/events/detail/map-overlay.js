/* ════════════════════════════════════════════════════════════
   Portal Events — Detail fullscreen map overlay (Phase 5D.3)
   Classic IIFE; loads after detail/raffle-render.js, before detail.js.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    let _fullscreenMap = null;
    let _fullscreenMapCoords = null;

    async function evtOpenFullscreenMap(lat, lng, label) {
        const overlay = document.getElementById('fullscreenMapOverlay');
        if (!overlay) return;

        try {
            if (typeof window.evtEnsureLeaflet === 'function') await window.evtEnsureLeaflet();
        } catch (err) {
            console.error('Leaflet load error:', err);
            return;
        }
        if (typeof L === 'undefined') return;

        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        const dirBtn = document.getElementById('fullscreenMapDirections');
        if (dirBtn) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const addr = encodeURIComponent(label || `${lat},${lng}`);
            dirBtn.href = isIOS
                ? `https://maps.apple.com/?daddr=${addr}`
                : `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
        }

        setTimeout(() => {
            _fullscreenMapCoords = { lat, lng };
            if (_fullscreenMap) { _fullscreenMap.remove(); _fullscreenMap = null; }
            _fullscreenMap = L.map('fullscreenMapContainer', {
                zoomControl: true,
                attributionControl: false,
                dragging: true,
                scrollWheelZoom: true
            }).setView([lat, lng], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_fullscreenMap);
            L.marker([lat, lng]).addTo(_fullscreenMap).bindPopup(evtEscapeHtml(label || 'Event Location')).openPopup();
            setTimeout(() => _fullscreenMap.invalidateSize(), 50);
        }, 50);
    }

    function evtRecenterFullscreenMap() {
        if (!_fullscreenMap || !_fullscreenMapCoords) return;
        _fullscreenMap.setView([_fullscreenMapCoords.lat, _fullscreenMapCoords.lng], 16, { animate: true, duration: 0.5 });
    }

    function evtCloseFullscreenMap() {
        const overlay = document.getElementById('fullscreenMapOverlay');
        if (overlay) overlay.classList.add('hidden');
        if (_fullscreenMap) { _fullscreenMap.remove(); _fullscreenMap = null; }
        document.body.style.overflow = '';
    }

    window.PortalEvents.detail.mapOverlay = {
        open: evtOpenFullscreenMap,
        recenter: evtRecenterFullscreenMap,
        close: evtCloseFullscreenMap,
    };

    window.evtOpenFullscreenMap = evtOpenFullscreenMap;
    window.evtRecenterFullscreenMap = evtRecenterFullscreenMap;
    window.evtCloseFullscreenMap = evtCloseFullscreenMap;
})();
