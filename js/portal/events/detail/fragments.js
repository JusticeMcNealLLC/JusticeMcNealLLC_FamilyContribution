/* ════════════════════════════════════════════════════════════
   Portal Events — Detail HTML fragment helpers (Phase 5F-prep)
   Classic IIFE; loads after detail/map-overlay.js, before detail.js.
   ════════════════════════════════════════════════════════════ */

'use strict';

function metaRow(icon, label, value, extra) {
    return `<div class="ed-meta-row">
    <div class="ed-meta-icon">${icon}</div>
    <div class="ed-meta-text">
        <span class="ed-meta-label">${label}</span>
        <span class="ed-meta-value">${value}</span>
        ${extra || ''}
    </div>
</div>`;
}

function pill(text, cls) {
    return `<span class="ed-pill ${cls || ''}">${text}</span>`;
}

function card(content, extraCls) {
    return `<div class="ed-card ${extraCls || ''}">${content}</div>`;
}

function notice(emoji, title, sub) {
    return `<div class="ed-notice">
    <span class="ed-notice-emoji">${emoji}</span>
    <div><p class="ed-notice-title">${title}</p><p class="ed-notice-sub">${sub}</p></div>
</div>`;
}

function sectionHead(title) {
    return `<div class="ed-section-head"><h3>${title}</h3></div>`;
}

export const detailFragmentsApi = {
    metaRow,
    pill,
    card,
    notice,
    sectionHead,
};

globalThis.evtEdMetaRow = metaRow;
globalThis.evtEdPill = pill;
globalThis.evtEdCard = card;
globalThis.evtEdNotice = notice;
globalThis.evtEdSectionHead = sectionHead;

const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.detail = PortalEvents.detail || {};
PortalEvents.detail.fragments = detailFragmentsApi;
