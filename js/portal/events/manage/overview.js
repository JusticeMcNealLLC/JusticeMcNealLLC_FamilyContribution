// Portal Events — Manage overview tab (Phase 5M.3A)

'use strict';

import { amenityVotingStatusHtml, wireAmenityVotingStatus } from './amenity-voting.js';

const PUBLIC_SITE_URL = 'https://justicemcneal.com';

function api() {
    return window.EventsManageOverviewApi || {};
}

function getState() {
    return api().getState?.() || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}
function money(cents) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
}
function adultPriceCents(e) {
    if (e?.adult_price_cents != null && Number.isFinite(Number(e.adult_price_cents))) {
        return Number(e.adult_price_cents);
    }
    return Number(e?.rsvp_cost_cents || 0);
}
function publicEventUrl(event) {
    const slug = event?.slug || '';
    if (typeof globalThis.evtPublicEventInviteUrl === 'function') {
        return globalThis.evtPublicEventInviteUrl(slug);
    }
    return PUBLIC_SITE_URL + '/events/?e=' + encodeURIComponent(slug);
}
function safeFilename(value) {
    return String(value || 'event').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'event';
}
function downloadCanvasPng(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
async function shareInviteUrl(url, event, btn) {
    const title = event?.title ? event.title + ' | Justice McNeal LLC' : 'Justice McNeal LLC Event';
    const text = event?.rsvp_enabled === false ? 'View event details.' : 'RSVP today.';
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
            return;
        } catch (_) { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    if (btn) {
        btn.textContent = 'Link copied ✓';
        setTimeout(() => { btn.textContent = 'Share invite'; }, 1500);
    }
}

function overviewHtml() {
    const STATE = getState();
    const e = STATE.event;
    const isCommitted = (row) => (window.EventsHelpers?.rsvpIsCommittedGoing
        ? window.EventsHelpers.rsvpIsCommittedGoing(e, row)
        : (e.pricing_mode === 'paid' ? row?.paid === true : !!(row && (row.status === 'going' || row.paid === true))));
    const guestGoing = STATE.guestRsvps.filter(isCommitted).length;
    const going = STATE.rsvps.filter(isCommitted).length + guestGoing;
    const maybe = STATE.rsvps.filter(r => r.status === 'maybe').length;
    const paid  = STATE.rsvps.filter(r => r.paid).length + STATE.guestRsvps.filter(r => r.paid).length;
    const checked = STATE.checkins.length;
    const adultCents = adultPriceCents(e);
    const revenue = paid * adultCents;
    const isLlc = e.event_type === 'llc';
    const minNeeded = Number(e.min_participants || 0);
    const thresholdPct = minNeeded ? Math.min(100, Math.round((going / minNeeded) * 100)) : 0;
    const thresholdMet = minNeeded ? going >= minNeeded : false;
    const deadline = e.rsvp_deadline ? new Date(e.rsvp_deadline).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
    const transportMode = e.transportation_mode;
    const transportMethod = e.transportation_method;
    const transportEstimate = e.transportation_estimate_cents ? money(e.transportation_estimate_cents) : '';
    const ticketHelper = window.EventsManageTicketHandoff;
    const goingMembers = STATE.rsvps.filter(isCommitted);
    const planeHandoff = isLlc && transportMethod === 'plane' && ticketHelper
        ? ticketHelper.computePlaneTicketHandoff({
            goingRsvps: goingMembers,
            documents: STATE.eventDocuments || [],
            event: e,
        })
        : null;
    const costBreakdown = e.cost_breakdown || {};
    const budgetIncluded = Number(costBreakdown.total_included_cents) || 0;
    const thresholdCopy = thresholdMet
        ? `${going} confirmed RSVP${going === 1 ? '' : 's'}; minimum was ${minNeeded}${deadline ? ` by ${deadline}` : ''}. This event can stay confirmed.`
        : `${going} of ${minNeeded} required RSVP${minNeeded === 1 ? '' : 's'}${deadline ? ` by ${deadline}` : ''}. ${Math.max(0, minNeeded - going)} more RSVP${minNeeded - going === 1 ? '' : 's'} needed.`;

    const inviteUrl = publicEventUrl(e);
    const portalLink = `<a href="/pages/portal/events.html?event=${encodeURIComponent(e.slug || '')}" class="em-btn-ghost" style="text-decoration:none;display:inline-block">Open in portal →</a>`;
    const thresholdCard = isLlc && minNeeded ? `
        <div class="em-card em-op-card">
            <div class="em-op-head">
                <div><p class="em-op-kicker">Minimum</p><p class="em-op-title">${thresholdMet ? 'Threshold met' : 'Needs momentum'}</p></div>
                <span class="em-op-icon">${thresholdMet ? '✅' : '⚠️'}</span>
            </div>
            <p class="em-op-copy">${thresholdCopy}</p>
            <div class="em-op-progress"><span style="width:${thresholdPct}%"></span></div>
            <div class="em-op-meta"><span class="em-op-chip">${thresholdPct}% filled</span><button class="em-btn-ghost" data-overview-tab="people">Review RSVPs</button></div>
        </div>` : '';
    let transportCard = '';
    if (isLlc && transportMode) {
        let title = 'Self-arranged';
        let icon = '🧳';
        let copy = `Members book travel themselves${transportEstimate ? `, estimated around ${transportEstimate}` : ''}.`;
        let chip = 'Member-owned';
        if (transportMode === 'llc_provides') {
            if (transportMethod === 'plane') {
                title = 'LLC flights';
                icon = '✈️';
                copy = planeHandoff
                    ? `Tickets: ${planeHandoff.uploaded}/${planeHandoff.total} members uploaded.${planeHandoff.missingCount ? ' Upload per-member plane tickets in Docs.' : ''}`
                    : 'Upload tickets or boarding documents in Docs when they are ready for members.';
                chip = 'Ticket handoff';
            } else if (transportMethod === 'car') {
                title = 'LLC ground transport';
                icon = '🚗';
                copy = 'Travel is by car. Docs can hold itineraries or seat lists if needed — no flight tickets.';
                chip = 'Ground travel';
            } else {
                title = 'LLC provided';
                icon = '🚐';
                copy = 'The LLC is arranging travel. Edit the event to specify car or plane.';
                chip = 'Transport';
            }
        }
        transportCard = `
        <div class="em-card em-op-card">
            <div class="em-op-head">
                <div><p class="em-op-kicker">Transportation</p><p class="em-op-title">${title}</p></div>
                <span class="em-op-icon">${icon}</span>
            </div>
            <p class="em-op-copy">${copy}</p>
            ${planeHandoff && planeHandoff.total ? `<div class="em-op-progress"><span style="width:${planeHandoff.ticketPct}%"></span></div>` : ''}
            <div class="em-op-meta"><button class="em-btn-ghost" data-overview-tab="docs">Open Docs</button><span class="em-op-chip">${chip}</span></div>
        </div>`;
    }
    const documentsCard = isLlc ? `
        <div class="em-card em-op-card">
            <div class="em-op-head">
                <div><p class="em-op-kicker">Documents</p><p class="em-op-title">Handoff hub</p></div>
                <span class="em-op-icon">📄</span>
            </div>
            <p class="em-op-copy">Upload group files or member-specific tickets here. Attendees only see a retrieval button on the event page.</p>
            <div class="em-op-meta"><button class="em-btn-primary" data-overview-tab="docs">Manage Docs</button></div>
        </div>` : '';
    const operationsHtml = [thresholdCard, transportCard, documentsCard].filter(Boolean).join('');
    const llcBudgetLine = isLlc && budgetIncluded > 0
        ? `<p class="text-xs text-gray-500 mb-4">Trip budget <strong>${money(budgetIncluded)}</strong> · Collected <strong>${money(revenue)}</strong> · <button type="button" class="text-brand-600 font-semibold hover:underline" data-overview-tab="money" style="background:none;border:none;padding:0;cursor:pointer">View Money</button></p>`
        : (isLlc ? `<p class="text-xs text-gray-500 mb-4">Collected <strong>${money(revenue)}</strong> · <button type="button" class="text-brand-600 font-semibold hover:underline" data-overview-tab="money" style="background:none;border:none;padding:0;cursor:pointer">View Money budget</button></p>` : '');

    return `
        ${llcBudgetLine}
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="em-card em-stat"><span class="em-stat-label">Going</span><span class="em-stat-num">${going}${e.max_participants ? `<span style="font-size:14px;color:#9ca3af;font-weight:500">/${e.max_participants}</span>` : ''}</span></div>
            <div class="em-card em-stat"><span class="em-stat-label">Interested</span><span class="em-stat-num" style="color:#db2777">${maybe}</span></div>
            <div class="em-card em-stat"><span class="em-stat-label">Checked In</span><span class="em-stat-num" style="color:#7c3aed">${checked}</span></div>
            <div class="em-card em-stat"><span class="em-stat-label">Revenue</span><span class="em-stat-num" style="color:#059669">${money(revenue)}</span></div>
        </div>

        ${operationsHtml ? `<div class="em-op-grid">${operationsHtml}</div>` : ''}

        ${e.slug ? `
        <div class="em-card mb-3" id="emAnnounceCard">
            <div class="em-section-head"><div><h3 class="em-section-title">Announce</h3><p class="em-section-sub">Share the invite link and QR. SMS lives on People.</p></div></div>
            <canvas id="emInviteQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
            <p class="text-xs text-gray-400 text-center mt-2 break-all">${esc(inviteUrl)}</p>
            <div class="flex flex-wrap justify-center gap-2 mt-3 mb-1">
                <button class="em-btn-primary" data-share-invite-url>Share invite</button>
                <button class="em-btn-primary" data-download-invite-qr>Download QR</button>
                <button class="em-btn-ghost" data-copy-invite-url>Copy invite link</button>
            </div>
        </div>` : ''}

        <div class="em-card">
            <h3 class="font-bold text-gray-800 text-sm mb-3">Next actions</h3>
            <div class="flex flex-wrap gap-2">
                <button type="button" class="em-btn-primary" data-overview-tab="event">Edit event</button>
                <button type="button" class="em-btn-ghost" data-overview-tab="money">View money</button>
                ${portalLink}
                ${e.checkin_enabled !== false && e.checkin_mode === 'attendee_ticket' && ['open','confirmed','active'].includes(e.status) ? `<button class="em-btn-ghost" onclick="window.EventsManage.close();setTimeout(()=>window.evtOpenScanner&&window.evtOpenScanner('${STATE.eventId}'),150)"><svg style="width:14px;height:14px;display:inline;vertical-align:-2px;margin-right:4px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>Scan attendees</button>` : ''}
            </div>
        </div>
        ${amenityVotingStatusHtml(e)}
        ${e.checkin_enabled !== false && e.checkin_mode === 'venue_scan' && e.venue_qr_token ? `
        <div class="em-card mt-3">
            <h3 class="font-bold text-gray-800 text-sm mb-3">📍 Venue QR Code</h3>
            <canvas id="emVenueQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
            <p class="text-xs text-gray-400 text-center mt-2">Display this at the entrance for attendees to scan</p>
        </div>` : ''}
    `;
}

function wireOverview() {
    const STATE = getState();
    const e = STATE.event;
    if (!e) return;
    const inviteUrl = publicEventUrl(e);
    renderOverviewQrs(inviteUrl, e);
    document.getElementById('emSheetContent').querySelectorAll('[data-copy-invite-url]').forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(inviteUrl);
            btn.textContent = 'Copied ✓';
            setTimeout(() => { btn.textContent = 'Copy invite link'; }, 1500);
        });
    });
    document.getElementById('emSheetContent').querySelectorAll('[data-share-invite-url]').forEach(btn => {
        btn.addEventListener('click', () => shareInviteUrl(inviteUrl, e, btn));
    });
    document.getElementById('emSheetContent').querySelectorAll('[data-download-invite-qr]').forEach(btn => {
        btn.addEventListener('click', () => downloadCanvasPng('emInviteQR', `${safeFilename(e.slug || e.title || 'event')}-invite-qr.png`));
    });
    wireAmenityVotingStatus(e);
    document.getElementById('emSheetContent').querySelectorAll('[data-overview-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const requested = btn.dataset.overviewTab;
            STATE.activeTab = window.EventsManageShell?.resolveTabKey?.(requested) || requested;
            api().renderTabs?.();
            api().renderTab?.(STATE.activeTab);
        });
    });
}

async function ensureQrCode() {
    if (typeof globalThis.evtEnsureQRCode === 'function') return window.evtEnsureQRCode();
    return globalThis.QRCode;
}

async function renderOverviewQrs(inviteUrl, e) {
    const inviteCanvas = document.getElementById('emInviteQR');
    const venueCanvas = document.getElementById('emVenueQR');
    if ((!inviteCanvas || !e.slug) && (!venueCanvas || !e.venue_qr_token)) return;
    try {
        const qr = await ensureQrCode();
        if (inviteCanvas?.isConnected && e.slug) {
            qr.toCanvas(inviteCanvas, inviteUrl, { width: 220, margin: 2, color: { dark: '#111827', light: '#ffffff' } });
        }
        if (venueCanvas?.isConnected && e.venue_qr_token) {
            qr.toCanvas(venueCanvas, `${window.location.origin}/events/?e=${encodeURIComponent(e.slug || '')}&checkin=1`, { width: 200, margin: 2 });
        }
    } catch (err) {
        console.warn('[events/manage] QR code renderer unavailable', err);
    }
}

export const manageOverviewApi = {
    overviewHtml,
    wireOverview,
    ensureQrCode,
    renderOverviewQrs,
};

globalThis.EventsManageOverview = manageOverviewApi;
