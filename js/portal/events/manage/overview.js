// Portal Events — Manage overview tab (Phase 5M.3A)

'use strict';

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
function publicEventUrl(event) {
    return PUBLIC_SITE_URL + '/events/?e=' + encodeURIComponent(event?.slug || '');
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
    const guestGoing = STATE.guestRsvps.filter(r => r.status === 'going').length;
    const going = STATE.rsvps.filter(r => r.status === 'going').length + guestGoing;
    const maybe = STATE.rsvps.filter(r => r.status === 'maybe').length;
    const paid  = STATE.rsvps.filter(r => r.paid).length + STATE.guestRsvps.filter(r => r.paid).length;
    const checked = STATE.checkins.length;
    const revenue = paid * (e.rsvp_cost_cents || 0);
    const startLocal = new Date(e.start_date).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
    const isLlc = e.event_type === 'llc';
    const minNeeded = Number(e.min_participants || 0);
    const thresholdPct = minNeeded ? Math.min(100, Math.round((going / minNeeded) * 100)) : 0;
    const thresholdMet = minNeeded ? going >= minNeeded : false;
    const deadline = e.rsvp_deadline ? new Date(e.rsvp_deadline).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
    const transportMode = e.transportation_mode;
    const transportEstimate = e.transportation_estimate_cents ? money(e.transportation_estimate_cents) : '';
    const thresholdCopy = thresholdMet
        ? `${going} confirmed RSVP${going === 1 ? '' : 's'}; minimum was ${minNeeded}${deadline ? ` by ${deadline}` : ''}. This event can stay confirmed.`
        : `${going} of ${minNeeded} required RSVP${minNeeded === 1 ? '' : 's'}${deadline ? ` by ${deadline}` : ''}. ${Math.max(0, minNeeded - going)} more RSVP${minNeeded - going === 1 ? '' : 's'} needed.`;

    const inviteUrl = publicEventUrl(e);
    const portalLink = `<a href="../portal/events.html?event=${encodeURIComponent(e.slug || '')}" class="em-btn-ghost" style="text-decoration:none;display:inline-block">Open in portal →</a>`;
    const thresholdCard = isLlc && minNeeded ? `
        <div class="em-card em-op-card">
            <div class="em-op-head">
                <div><p class="em-op-kicker">Minimum</p><p class="em-op-title">${thresholdMet ? 'Threshold met' : 'Needs momentum'}</p></div>
                <span class="em-op-icon">${thresholdMet ? '✅' : '⚠️'}</span>
            </div>
            <p class="em-op-copy">${thresholdCopy}</p>
            <div class="em-op-progress"><span style="width:${thresholdPct}%"></span></div>
            <div class="em-op-meta"><span class="em-op-chip">${thresholdPct}% filled</span><button class="em-btn-ghost" data-overview-tab="rsvps">Review RSVPs</button></div>
        </div>` : '';
    const transportCard = isLlc && transportMode ? `
        <div class="em-card em-op-card">
            <div class="em-op-head">
                <div><p class="em-op-kicker">Transportation</p><p class="em-op-title">${transportMode === 'llc_provides' ? 'LLC provided' : 'Self-arranged'}</p></div>
                <span class="em-op-icon">${transportMode === 'llc_provides' ? '✈️' : '🧳'}</span>
            </div>
            <p class="em-op-copy">${transportMode === 'llc_provides' ? 'Upload tickets or travel documents in Docs when they are ready for members.' : `Members book travel themselves${transportEstimate ? `, estimated around ${transportEstimate}` : ''}.`}</p>
            <div class="em-op-meta"><button class="em-btn-ghost" data-overview-tab="docs">Open Docs</button><span class="em-op-chip">${transportMode === 'llc_provides' ? 'Document handoff' : 'Member-owned'}</span></div>
        </div>` : '';
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
    const showFeaturedToggle = typeof canManageEventBanners === 'function' && canManageEventBanners();

    return `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="em-card em-stat"><span class="em-stat-label">Going</span><span class="em-stat-num">${going}${e.max_participants ? `<span style="font-size:14px;color:#9ca3af;font-weight:500">/${e.max_participants}</span>` : ''}</span></div>
            <div class="em-card em-stat"><span class="em-stat-label">Interested</span><span class="em-stat-num" style="color:#db2777">${maybe}</span></div>
            <div class="em-card em-stat"><span class="em-stat-label">Checked In</span><span class="em-stat-num" style="color:#7c3aed">${checked}</span></div>
            <div class="em-card em-stat"><span class="em-stat-label">Revenue</span><span class="em-stat-num" style="color:#059669">${money(revenue)}</span></div>
        </div>

        ${operationsHtml ? `<div class="em-op-grid">${operationsHtml}</div>` : ''}

        <div class="em-card mb-3">
            <h3 class="font-bold text-gray-800 text-sm mb-3">Details</h3>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between gap-3"><span class="text-gray-500">When</span><span class="text-gray-800 font-medium text-right">${startLocal}</span></div>
                ${e.location_nickname ? `<div class="flex justify-between gap-3"><span class="text-gray-500">Where</span><span class="text-gray-800 font-medium text-right truncate">${esc(e.location_nickname)}</span></div>` : ''}
                <div class="flex justify-between gap-3"><span class="text-gray-500">Status</span><span class="text-gray-800 font-medium uppercase tracking-wide text-xs">${e.status}</span></div>
                <div class="flex justify-between gap-3"><span class="text-gray-500">Pricing</span><span class="text-gray-800 font-medium">${e.pricing_mode === 'paid' ? `Paid · ${money(e.rsvp_cost_cents)}` : 'Free'}</span></div>
                ${e.rsvp_deadline ? `<div class="flex justify-between gap-3"><span class="text-gray-500">RSVP deadline</span><span class="text-gray-800 font-medium">${new Date(e.rsvp_deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>` : ''}
            </div>
        </div>

        <div class="em-card mb-3" id="emCopyEditorCard">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Event copy</h3>
                    <p class="em-section-sub">Edit the title and description shown across the portal and invite page.</p>
                </div>
            </div>
            <form id="emCopyForm" class="space-y-3">
                <div>
                    <label for="emCopyTitle" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Title *</label>
                    <input id="emCopyTitle" class="em-input" type="text" maxlength="120" required value="${esc(e.title || '')}">
                </div>
                <div>
                    <label for="emCopyDescription" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                    <textarea id="emCopyDescription" class="em-textarea" rows="4" maxlength="2000">${esc(e.description || '')}</textarea>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button type="submit" id="emCopySave" class="em-btn-primary">Save changes</button>
                    <button type="button" id="emCopyCancel" class="em-btn-ghost">Cancel</button>
                    <span id="emCopyStatus" class="text-xs text-gray-400"></span>
                </div>
            </form>
        </div>

        ${showFeaturedToggle ? `
        <div class="em-card mb-3">
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-bold text-gray-800 text-sm">&#9733; Featured on portal</p>
                    <p class="text-xs text-gray-500 mt-0.5">Show this event in the hero banner on the portal events page.</p>
                </div>
                <button id="emFeaturedToggle"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${STATE.event.is_featured ? 'bg-brand-600' : 'bg-gray-200'}"
                    role="switch" aria-checked="${STATE.event.is_featured ? 'true' : 'false'}"
                    onclick="window._emToggleFeatured()"
                >
                    <span class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${STATE.event.is_featured ? 'translate-x-5' : 'translate-x-0'}"></span>
                </button>
            </div>
        </div>` : ''}

        <div class="em-card">
            <h3 class="font-bold text-gray-800 text-sm mb-3">Quick actions</h3>
            <div class="flex flex-wrap gap-2">
                ${portalLink}
                ${e.slug ? `<button class="em-btn-ghost" data-copy-invite-url>Copy invite link</button>` : ''}
                ${e.checkin_enabled !== false && e.checkin_mode === 'attendee_ticket' && ['open','confirmed','active'].includes(e.status) ? `<button class="em-btn-ghost" onclick="window.EventsManage.close();setTimeout(()=>window.evtOpenScanner&&window.evtOpenScanner('${STATE.eventId}'),150)"><svg style="width:14px;height:14px;display:inline;vertical-align:-2px;margin-right:4px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>Scan Attendees</button>` : ''}
            </div>
            <p class="text-xs text-gray-400 mt-3">Tap any tab above for Money, Docs, Raffle, or Comp details.</p>
        </div>
        ${e.slug ? `
        <div class="em-card mt-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Invitation QR</h3><p class="em-section-sub">Use this public event link on printed or digital invitations.</p></div></div>
            <canvas id="emInviteQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
            <p class="text-xs text-gray-400 text-center mt-2 break-all">${esc(inviteUrl)}</p>
            <div class="flex flex-wrap justify-center gap-2 mt-3">
                <button class="em-btn-primary" data-share-invite-url>Share invite</button>
                <button class="em-btn-primary" data-download-invite-qr>Download QR</button>
                <button class="em-btn-ghost" data-copy-invite-url>Copy invite link</button>
            </div>
        </div>` : ''}
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
    document.getElementById('emSheetContent').querySelectorAll('[data-overview-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            STATE.activeTab = btn.dataset.overviewTab;
            api().renderTabs?.();
            api().renderTab?.(STATE.activeTab);
        });
    });
    const copyForm = document.getElementById('emCopyForm');
    const copyTitle = document.getElementById('emCopyTitle');
    const copyDescription = document.getElementById('emCopyDescription');
    const copyStatus = document.getElementById('emCopyStatus');
    copyForm?.addEventListener('submit', (ev) => {
        ev.preventDefault();
        saveEventCopy(copyForm);
    });
    document.getElementById('emCopyCancel')?.addEventListener('click', () => {
        if (copyTitle) copyTitle.value = STATE.event?.title || '';
        if (copyDescription) copyDescription.value = STATE.event?.description || '';
        if (copyStatus) {
            copyStatus.className = 'text-xs text-gray-400';
            copyStatus.textContent = 'Changes discarded';
            setTimeout(() => { copyStatus.textContent = ''; }, 1800);
        }
    });
    if (STATE.editCopyOnOpen) {
        STATE.editCopyOnOpen = false;
        setTimeout(() => {
            document.getElementById('emCopyEditorCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            copyTitle?.focus();
            copyTitle?.select();
        }, 100);
    }
}

async function saveEventCopy(form) {
    const STATE = getState();
    const e = STATE.event;
    if (!e || !form) return;
    const titleInput = document.getElementById('emCopyTitle');
    const descriptionInput = document.getElementById('emCopyDescription');
    const saveBtn = document.getElementById('emCopySave');
    const status = document.getElementById('emCopyStatus');
    const title = (titleInput?.value || '').trim();
    const description = (descriptionInput?.value || '').trim();

    function setStatus(message, isError) {
        if (!status) return;
        status.className = isError ? 'text-xs text-red-600' : 'text-xs text-gray-400';
        status.textContent = message;
    }

    if (!title) {
        setStatus('Title is required.', true);
        titleInput?.focus();
        return;
    }

    if (saveBtn) saveBtn.disabled = true;
    setStatus('Saving...', false);

    try {
        const { data, error } = await supabaseClient
            .from('events')
            .update({ title, description: description || null })
            .eq('id', e.id)
            .select('title, description')
            .single();
        if (error) throw error;

        STATE.event.title = data?.title || title;
        STATE.event.description = data?.description || null;
        api().renderHeader?.();
        api().renderTab?.('overview');
        setTimeout(() => {
            const refreshedStatus = document.getElementById('emCopyStatus');
            if (refreshedStatus) {
                refreshedStatus.className = 'text-xs text-emerald-600';
                refreshedStatus.textContent = 'Saved changes.';
                setTimeout(() => { refreshedStatus.textContent = ''; }, 2500);
            }
        }, 0);
        api().notifyParent?.('updated', e.id);
    } catch (err) {
        setStatus('Update failed: ' + (err.message || 'unknown error'), true);
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
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

async function toggleFeatured() {
    const STATE = getState();
    const btn = document.getElementById('emFeaturedToggle');
    if (!btn) return;
    const newVal = !(STATE.event.is_featured);
    btn.disabled = true;
    const { error } = await supabaseClient
        .from('events')
        .update({ is_featured: newVal })
        .eq('id', STATE.event.id);
    if (error) {
        alert('Failed to update: ' + error.message);
        btn.disabled = false;
        return;
    }
    STATE.event.is_featured = newVal;
    // Re-render overview tab to reflect new state
    api().renderTab?.('overview');
    // Notify list view to refresh hero
    document.dispatchEvent(new CustomEvent('events:manage:updated', { detail: { eventId: STATE.event.id } }));
}

export const manageOverviewApi = {
    overviewHtml,
    wireOverview,
    saveEventCopy,
    ensureQrCode,
    renderOverviewQrs,
    toggleFeatured,
};
globalThis._emToggleFeatured = toggleFeatured;

globalThis.EventsManageOverview = manageOverviewApi;
