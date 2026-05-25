// Portal Events — Init (Bootstrap + Event Listeners)
// This file must load LAST — it depends on all other modules.
// ═══════════════════════════════════════════════════════════

import { evtCloseScanner } from './detail/scanner.js';
import { evtToggleModal, evtHandleBannerSelect, evtHandleEmbedImageSelect } from './core/utils.js';
import { loadEvents, renderEvents, setupSearch, initFilterChips } from './list/shell.js';
import { evtHandleCreate } from './create/legacy-submit.js';
import { evtInitLocationValidation } from './create/legacy-location.js';
import { evtHandlePreview } from './create/legacy-preview.js';
import { evtToggleLlcFields, evtAddCostItem, evtRecalcCostSummary } from './create/legacy-costs.js';
import { evtRecalcCompTiers } from './detail/competition.js';

// ── One-time init guard (Phase 5L.2) ─────────────────────
let _eventsPageInitialized = false;
let _eventsPopstateListenerBound = false;
let _eventsListenersBound = false;

async function initEventsPage() {
    if (_eventsPageInitialized) return;
    _eventsPageInitialized = true;
    window._eventsPageInitialized = true;

    globalThis.evtCurrentUser = await checkAuth();
    if (!globalThis.evtCurrentUser) return;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role, first_name, last_name, profile_picture_url')
        .eq('id', globalThis.evtCurrentUser.id)
        .maybeSingle();
    globalThis.evtCurrentUserRole = profile?.role;
    window.evtCurrentUserName = profile?.first_name || '';
    window.evtCurrentUserPic = profile?.profile_picture_url || null;
    window.evtCurrentUserInitials = ((profile?.first_name?.[0] || '') + (profile?.last_name?.[0] || '')).toUpperCase() || '?';

    if (typeof canCreateEvents === 'function' && canCreateEvents()) {
        document.getElementById('createEventBtn')?.classList.remove('hidden');
        document.getElementById('createEventBtn')?.classList.add('flex');
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzSel = document.getElementById('eventTimezone');
    if (tzSel) {
        for (const opt of tzSel.options) {
            if (opt.value === tz) { opt.selected = true; break; }
        }
    }

    evtSetupListeners();
    await loadEvents();

    globalThis.evtRouteByUrl();

    if (!_eventsPopstateListenerBound) {
        _eventsPopstateListenerBound = true;
        window.addEventListener('popstate', () => globalThis.evtRouteByUrl());
    }
}

document.addEventListener('DOMContentLoaded', initEventsPage);

function evtUpdateRaffleCostHint() {
    const costGroup = document.getElementById('raffleEntryCostGroup');
    const hint = document.getElementById('raffleCostHint');
    const mode = document.getElementById('pricingMode')?.value || 'free';
    const raffleOn = document.getElementById('raffleEnabled')?.checked;

    if (!costGroup) return;

    if (mode === 'paid') {
        costGroup.classList.add('hidden');
        if (hint) hint.textContent = 'Raffle entry is included free with paid RSVP.';
    } else {
        costGroup.classList.remove('hidden');
        if (hint) hint.textContent = 'This is the price for a standalone raffle ticket.';
    }
}

function evtSetupListeners() {
    if (_eventsListenersBound) return;
    _eventsListenersBound = true;

    initFilterChips();
    setupSearch();
    document.getElementById('typeFilter')?.addEventListener('change', renderEvents);

    function _openCreate() {
        if (window.EventsCreate && window.EventsCreate.open) {
            window.EventsCreate.open();
        } else {
            evtToggleModal('createModal', true);
        }
    }
    document.getElementById('createEventBtn')?.addEventListener('click', _openCreate);
    document.getElementById('emptyCreateBtn')?.addEventListener('click', _openCreate);
    document.getElementById('closeCreateModal')?.addEventListener('click', () => evtToggleModal('createModal', false));
    document.getElementById('createModalOverlay')?.addEventListener('click', () => evtToggleModal('createModal', false));

    document.addEventListener('events:created', () => loadEvents());

    document.getElementById('closeScannerModal')?.addEventListener('click', evtCloseScanner);
    document.getElementById('scannerModalOverlay')?.addEventListener('click', evtCloseScanner);

    const dropzone = document.getElementById('bannerDropzone');
    const fileInput = document.getElementById('bannerFile');
    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', evtHandleBannerSelect);
    dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('border-brand-400'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('border-brand-400'));
    dropzone?.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('border-brand-400');
        if (e.dataTransfer.files[0]) {
            fileInput.files = e.dataTransfer.files;
            evtHandleBannerSelect();
        }
    });

    const embedDropzone = document.getElementById('embedImageDropzone');
    const embedFileInput = document.getElementById('embedImageFile');
    embedDropzone?.addEventListener('click', () => embedFileInput?.click());
    embedFileInput?.addEventListener('change', evtHandleEmbedImageSelect);
    embedDropzone?.addEventListener('dragover', e => { e.preventDefault(); embedDropzone.classList.add('border-brand-400'); });
    embedDropzone?.addEventListener('dragleave', () => embedDropzone.classList.remove('border-brand-400'));
    embedDropzone?.addEventListener('drop', e => {
        e.preventDefault();
        embedDropzone.classList.remove('border-brand-400');
        if (e.dataTransfer.files[0]) {
            embedFileInput.files = e.dataTransfer.files;
            evtHandleEmbedImageSelect();
        }
    });

    document.getElementById('createEventForm')?.addEventListener('submit', evtHandleCreate);
    evtInitLocationValidation();
    document.getElementById('previewEventBtn')?.addEventListener('click', evtHandlePreview);

    const pricingModeEl = document.getElementById('pricingMode');
    pricingModeEl?.addEventListener('change', () => {
        const mode = pricingModeEl.value;
        const rsvpCostGroup = document.getElementById('rsvpCostGroup');
        if (rsvpCostGroup) rsvpCostGroup.classList.toggle('hidden', mode !== 'paid');
        evtUpdateRaffleCostHint();
    });

    const raffleToggle = document.getElementById('raffleEnabled');
    raffleToggle?.addEventListener('change', () => {
        const config = document.getElementById('raffleConfig');
        if (config) config.classList.toggle('hidden', !raffleToggle.checked);
        evtUpdateRaffleCostHint();
    });

    const winnerCountEl = document.getElementById('raffleWinnerCount');
    winnerCountEl?.addEventListener('change', () => {
        const count = parseInt(winnerCountEl.value) || 1;
        const container = document.getElementById('rafflePrizesList');
        if (!container) return;

        let html = '';
        for (let i = 1; i <= count; i++) {
            const suffix = typeof globalThis.evtOrdinalSuffix === 'function'
                ? globalThis.evtOrdinalSuffix(i) : 'th';
            html += `<div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-500 w-6">#${i}</span>
                <input type="text" name="rafflePrize" data-raffle-prize placeholder="Prize for ${i}${suffix} place" class="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500">
            </div>`;
        }
        container.innerHTML = html;
    });

    document.getElementById('closeRaffleDrawModal')?.addEventListener('click', () => evtToggleModal('raffleDrawModal', false));
    document.getElementById('raffleDrawOverlay')?.addEventListener('click', () => evtToggleModal('raffleDrawModal', false));

    document.getElementById('eventType')?.addEventListener('change', evtToggleLlcFields);
    document.getElementById('compTier1Pct')?.addEventListener('input', evtRecalcCompTiers);
    document.getElementById('compTier2Pct')?.addEventListener('input', evtRecalcCompTiers);
    document.getElementById('compTier3Pct')?.addEventListener('input', evtRecalcCompTiers);

    document.getElementById('addCostItemBtn')?.addEventListener('click', evtAddCostItem);
    document.getElementById('eventMax')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventMax')?.addEventListener('input', evtRecalcCostSummary);
    document.getElementById('eventMinParticipants')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventMinParticipants')?.addEventListener('input', evtRecalcCostSummary);
    document.getElementById('eventLlcCut')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventLlcCut')?.addEventListener('input', evtRecalcCostSummary);

    const llcOverride = document.getElementById('llcRsvpOverride');
    llcOverride?.addEventListener('input', () => { llcOverride.dataset.userEdited = 'true'; });
    llcOverride?.addEventListener('change', () => { llcOverride.dataset.userEdited = 'true'; });

    const transportEl = document.getElementById('eventTransportation');
    transportEl?.addEventListener('change', () => {
        const group = document.getElementById('transportEstimateGroup');
        if (group) group.classList.toggle('hidden', transportEl.value !== 'self_arranged');
    });

    const transportToggle = document.getElementById('transportationEnabled');
    transportToggle?.addEventListener('change', () => {
        const section = document.getElementById('transportationSection');
        if (section) section.classList.toggle('hidden', !transportToggle.checked);
    });

    const rsvpToggle = document.getElementById('rsvpEnabled');
    rsvpToggle?.addEventListener('change', () => {
        const settings = document.getElementById('rsvpSettingsGroup');
        if (settings) settings.classList.toggle('hidden', !rsvpToggle.checked);
        if (!rsvpToggle.checked) {
            ['gateTime', 'gateLocation', 'gateNotes'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.checked = false;
            });
            const notes = document.getElementById('eventGatedNotes');
            if (notes) notes.value = '';
        }
    });

    const checkinToggle = document.getElementById('checkinEnabled');
    checkinToggle?.addEventListener('change', () => {
        const section = document.getElementById('checkinModeSection');
        if (section) section.classList.toggle('hidden', !checkinToggle.checked);
    });
}

import { publishGlobals } from './compat/publish-globals.js';
publishGlobals({ evtSetupListeners, evtUpdateRaffleCostHint });
window.PortalEvents = window.PortalEvents || {};
window.PortalEvents.initEventsPage = initEventsPage;
