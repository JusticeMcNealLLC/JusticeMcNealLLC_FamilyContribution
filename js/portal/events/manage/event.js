// Portal Events — Manage Event tab (copy, images, pricing, disclaimers)

'use strict';

import { pricingEditorHtml, wirePricingEditor } from './pricing-editor.js';
import { disclaimersEditorHtml, wireDisclaimersEditor } from './disclaimers-editor.js';
import { amenityVotingSettingsHtml, wireAmenityVotingSettings } from './amenity-voting.js';

function api() {
    return window.EventsManageEventApi || {};
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
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format((cents || 0) / 100);
}

function adultPriceCents(e) {
    if (e?.adult_price_cents != null && Number.isFinite(Number(e.adult_price_cents))) {
        return Number(e.adult_price_cents);
    }
    return Number(e?.rsvp_cost_cents || 0);
}

function capacityLabel(e) {
    const mode = e?.capacity_mode || 'none';
    if (mode === 'none') return 'No limit';
    const counts = e?.capacity_counts === 'all' ? 'adults + kids' : 'adults only';
    const cap = mode === 'soft' ? 'Soft cap' : 'Hard cap';
    const n = e?.max_participants || '—';
    return `${cap} · ${n} (${counts})`;
}

function pricingModeLabel(e) {
    if (e?.pricing_mode === 'paid') return 'Paid';
    if (e?.pricing_mode === 'free_paid_raffle') return 'Free + paid raffle';
    return 'Free';
}

function eventHtml() {
    const STATE = getState();
    const e = STATE.event;
    if (!e) return '';
    const Images = window.EventsManageImages;
    const startLocal = new Date(e.start_date).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    const adultCents = adultPriceCents(e);
    const showFeaturedToggle = typeof canManageEventBanners === 'function' && canManageEventBanners();
    const type = e.event_type || 'member';

    return `
        <div class="em-card mb-3">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Full event editor</h3>
                    <p class="em-section-sub">Edit About, Included, When &amp; Where${type === 'llc' ? ', LLC settings,' : ''}${type === 'competition' ? ' Competition settings,' : ''} and voting options in the create sheet.</p>
                </div>
            </div>
            ${(type === 'member' || type === 'llc' || type === 'competition')
                ? `<button type="button" id="emEditEventBtn" class="em-btn-primary">Edit event</button>${type === 'competition' ? '<p class="text-xs text-gray-500 mt-2">Competition prizes and rules lock after the first competitor registers.</p>' : ''}`
                : `<p class="text-xs text-gray-500">Sheet editing is available for member, LLC, and competition events.</p>`}
        </div>

        <div class="em-card mb-3">
            <h3 class="font-bold text-gray-800 text-sm mb-3">Details</h3>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between gap-3"><span class="text-gray-500">When</span><span class="text-gray-800 font-medium text-right">${startLocal}</span></div>
                ${e.location_nickname ? `<div class="flex justify-between gap-3"><span class="text-gray-500">Where</span><span class="text-gray-800 font-medium text-right truncate">${esc(e.location_nickname)}</span></div>` : ''}
                <div class="flex justify-between gap-3"><span class="text-gray-500">Status</span><span class="text-gray-800 font-medium uppercase tracking-wide text-xs">${esc(e.status || '')}</span></div>
                <div class="flex justify-between gap-3"><span class="text-gray-500">Pricing</span><span class="text-gray-800 font-medium">${pricingModeLabel(e)}</span></div>
                ${e.pricing_mode === 'paid' ? `<div class="flex justify-between gap-3"><span class="text-gray-500">Adult price</span><span class="text-gray-800 font-medium">${money(adultCents)}</span></div>` : ''}
                ${e.pricing_mode === 'paid' ? `<div class="flex justify-between gap-3"><span class="text-gray-500">Kids</span><span class="text-gray-800 font-medium">${e.kids_free !== false ? 'Free' : `${money(e.kid_price_cents)} per child`}</span></div>` : ''}
                ${e.fund_deadline ? `<div class="flex justify-between gap-3"><span class="text-gray-500">Fund deadline</span><span class="text-gray-800 font-medium">${new Date(e.fund_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>` : ''}
                <div class="flex justify-between gap-3"><span class="text-gray-500">Capacity</span><span class="text-gray-800 font-medium text-right">${esc(capacityLabel(e))}</span></div>
                ${e.rsvp_deadline ? `<div class="flex justify-between gap-3"><span class="text-gray-500">RSVP deadline</span><span class="text-gray-800 font-medium">${new Date(e.rsvp_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>` : ''}
            </div>
        </div>

        <div class="em-card mb-3" id="emCopyEditorCard">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Event copy</h3>
                    <p class="em-section-sub">Title and description shown across the portal and invite page.</p>
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
                    <p class="font-bold text-gray-800 text-sm">Featured on portal</p>
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

        ${typeof Images?.imagesHtml === 'function' ? Images.imagesHtml() : ''}
        ${pricingEditorHtml(STATE)}
        ${disclaimersEditorHtml(STATE)}
        ${amenityVotingSettingsHtml(e)}
    `;
}

function wireEvent() {
    const STATE = getState();
    const e = STATE.event;
    if (!e) return;
    window.EventsManageImages?.wireImages?.();
    wirePricingEditor();
    wireDisclaimersEditor();
    wireAmenityVotingSettings(e);

    document.getElementById('emEditEventBtn')?.addEventListener('click', () => {
        const eventId = STATE.eventId || e.id;
        if (!eventId) return;
        window.EventsManage?.close?.();
        setTimeout(() => {
            window.EventsCreate?.open?.({ eventId });
        }, 200);
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
        if (copyTitle) copyTitle.value = e.title || '';
        if (copyDescription) copyDescription.value = e.description || '';
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
        api().renderTab?.('event');
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
        if (window.EventsHelpers?.alertDialog) {
            window.EventsHelpers.alertDialog({ title: 'Could not update', message: 'Failed to update: ' + error.message });
        } else {
            window.alert('Failed to update: ' + error.message);
        }
        btn.disabled = false;
        return;
    }
    STATE.event.is_featured = newVal;
    api().renderTab?.('event');
    document.dispatchEvent(new CustomEvent('events:manage:updated', { detail: { eventId: STATE.event.id } }));
}

export const manageEventApi = {
    eventHtml,
    wireEvent,
    saveEventCopy,
    toggleFeatured,
};

globalThis._emToggleFeatured = toggleFeatured;
globalThis.EventsManageEvent = manageEventApi;
