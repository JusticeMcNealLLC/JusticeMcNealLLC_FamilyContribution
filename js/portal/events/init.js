// Portal Events — Init (Bootstrap + Event Listeners)
// This file must load LAST — it depends on all other modules.
// ═══════════════════════════════════════════════════════════

import { evtCloseScanner } from './detail/scanner.js';
import { evtToggleModal } from './core/utils.js';
import { loadEvents, renderEvents, setupSearch, initFilterChips } from './list/shell.js';

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
        // Create lives on the FAB (header button retired).
        const fab = document.getElementById('evtCreateFab');
        fab?.classList.remove('hidden');
        fab?.classList.add('flex');
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

function evtSetupListeners() {
    if (_eventsListenersBound) return;
    _eventsListenersBound = true;

    initFilterChips();
    setupSearch();
    document.getElementById('typeFilter')?.addEventListener('change', renderEvents);

    function _openCreate() {
        if (window.EventsCreate && typeof window.EventsCreate.open === 'function') {
            window.EventsCreate.open();
        } else {
            alert('Create event is unavailable. Please refresh the page.');
        }
    }
    // Header create retired — FAB + empty-state / create-tile still open create.
    document.getElementById('createEventBtn')?.addEventListener('click', _openCreate);
    document.getElementById('evtCreateFab')?.addEventListener('click', _openCreate);
    document.getElementById('emptyCreateBtn')?.addEventListener('click', _openCreate);

    document.addEventListener('events:created', () => loadEvents());

    document.getElementById('closeScannerModal')?.addEventListener('click', evtCloseScanner);
    document.getElementById('scannerModalOverlay')?.addEventListener('click', evtCloseScanner);

    document.getElementById('closeRaffleDrawModal')?.addEventListener('click', () => evtToggleModal('raffleDrawModal', false));
    document.getElementById('raffleDrawOverlay')?.addEventListener('click', () => evtToggleModal('raffleDrawModal', false));
}

import { publishGlobals } from './compat/publish-globals.js';
publishGlobals({ evtSetupListeners });
window.PortalEvents = window.PortalEvents || {};
window.PortalEvents.initEventsPage = initEventsPage;
