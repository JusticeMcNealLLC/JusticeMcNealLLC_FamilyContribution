/* ════════════════════════════════════════════════════════════
   Portal Events — Detail presentation helpers (Phase 5D.1)
   ESM module (Phase 7.6); loads after team/tools.js, before detail.js.
   ════════════════════════════════════════════════════════════ */

'use strict';

function evtMiniMarkdown(text) {
    if (!text) return '';
    let html = evtEscapeHtml(text);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html;
}

function evtOpenLightbox(imgUrl) {
    if (!imgUrl) return;
    const lb = document.createElement('div');
    lb.className = 'evt-lightbox';
    lb.innerHTML = `<button class="evt-lightbox-close" aria-label="Close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button><img src="${imgUrl}" alt="Event banner">`;
    lb.onclick = e => { if (e.target === lb || e.target.closest('.evt-lightbox-close')) { lb.classList.remove('active'); setTimeout(() => lb.remove(), 250); } };
    document.body.appendChild(lb);
    requestAnimationFrame(() => lb.classList.add('active'));
}

function evtInitSectionAnimations() {
    const sections = document.querySelectorAll('#eventsDetailView .ed-card');
    if (!sections.length) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('ed-visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.08 });
    sections.forEach((s, i) => { s.style.animationDelay = `${i * 0.06}s`; obs.observe(s); });
}

var _evtCountdownInterval = null;
function evtStartLiveCountdown(startDate) {
    if (_evtCountdownInterval) clearInterval(_evtCountdownInterval);
    const badgeEl = document.querySelector('#eventsDetailView .evt-status-badge');
    if (!badgeEl) return;

    function tick() {
        const ms = new Date(startDate) - new Date();
        if (ms <= 0) {
            badgeEl.className = 'evt-status-badge evt-status-live';
            badgeEl.innerHTML = '<span class="evt-status-dot pulse"></span>Live';
            clearInterval(_evtCountdownInterval);
            return;
        }
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        let lbl;
        if (d > 0) lbl = `${d}d ${h}h`;
        else if (h > 0) lbl = `${h}h ${m}m`;
        else lbl = `${m}m ${s}s`;
        badgeEl.innerHTML = `<span class="evt-status-dot${d === 0 ? ' pulse' : ''}"></span>${lbl}`;
    }
    const msUntil = new Date(startDate) - new Date();
    const interval = msUntil < 3600000 ? 1000 : 60000;
    _evtCountdownInterval = setInterval(tick, interval);
    if (interval === 60000) {
        const upgradeIn = msUntil - 3600000;
        if (upgradeIn > 0) {
            setTimeout(() => { clearInterval(_evtCountdownInterval); _evtCountdownInterval = setInterval(tick, 1000); }, upgradeIn);
        }
    }
}

export const detailPresentationApi = {
    miniMarkdown: evtMiniMarkdown,
    openLightbox: evtOpenLightbox,
    initSectionAnimations: evtInitSectionAnimations,
    startLiveCountdown: evtStartLiveCountdown,
};

globalThis.evtMiniMarkdown = evtMiniMarkdown;
globalThis.evtOpenLightbox = evtOpenLightbox;
globalThis.evtInitSectionAnimations = evtInitSectionAnimations;
globalThis.evtStartLiveCountdown = evtStartLiveCountdown;

const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.detail = PortalEvents.detail || {};
PortalEvents.detail.presentation = detailPresentationApi;
