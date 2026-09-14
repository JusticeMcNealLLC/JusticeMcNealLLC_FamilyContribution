// ═══════════════════════════════════════════════════════════
// Event Management Sheet  (M3a + M3b)
//
// Self-contained module. Used by both:
//   • admin/events.html  → "Manage" button on each event card
//   • portal/events.html → Host Controls "Manage event" button
//
// Host-job tabs: Overview, Event, People, Money, Docs?, Raffle?, Competition?, Danger
//
// Public surface:
//   window.EventsManage.open(eventId, { source: 'admin' | 'portal' })
//   window.EventsManage.close()
//
// Requirements: supabaseClient (global), formatCurrency (config.js).
// Per-tab data is lazy-loaded on first switch and cached on STATE.tabData.
// ═══════════════════════════════════════════════════════════

'use strict';

const STATE = {
    eventId: null,
    event:   null,
    rsvps:   [],
    guestRsvps: [],
    checkins: [],
    parties: [],
    seats: [],
    activeTab: 'overview',
    source:  'admin', // 'admin' | 'portal'
    editCopyOnOpen: false,
    tabData: {}, // lazy per-tab cache: { money, docs, raffle, comp, notifications }
    canManageNotifications: false,
    eventDocuments: [],
};

const RAFFLE_PRIZE_IMAGE_FILES = {};
const RAFFLE_PRIZE_IMAGE_PREVIEWS = {};

function getDocTypes() {
    const types = window.EventsConstants && window.EventsConstants.EVENT_DOC_TYPES;
    return types && types.length ? types : [];
}

const Shell = window.EventsManageShell;
const Overview = window.EventsManageOverview;
const EventTab = window.EventsManageEvent;
const Images = window.EventsManageImages;
const People = window.EventsManagePeople;
const Rsvps = window.EventsManageRsvps;
const Danger = window.EventsManageDanger;
const Money = window.EventsManageMoney;
const Docs = window.EventsManageDocs;
const Raffle = window.EventsManageRaffle;
const Comp = window.EventsManageCompetition;
const Participation = window.EventsManageParticipation;
const Notifications = window.EventsManageNotifications;

function _ensureMounted() { return Shell.ensureMounted(); }
function _renderHeader() { return Shell.renderHeader(); }
function _renderTabs() { return Shell.renderTabs(); }
function _renderContent(html) { return Shell.renderContent(html); }

async function _canManageNotificationsForEvent(event) {
    if (typeof canManageEventNotifications === 'function' && canManageEventNotifications()) return true;
    if (typeof canManageEvents === 'function' && canManageEvents()) return true;
    const uid = globalThis.evtCurrentUser?.id;
    if (!uid || !event) return false;
    if (event.created_by === uid) return true;
    const { data: host } = await supabaseClient
        .from('event_hosts')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', uid)
        .maybeSingle();
    return !!host;
}

// ─── Data loading ───────────────────────────────────────────────
async function _loadEventData(eventId) {
    const { data: event } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
    STATE.event = event;

    const [
        rsvpsRes,
        guestRes,
        checkinsRes,
        partiesRes,
        seatsRes,
    ] = await Promise.all([
        supabaseClient
            .from('event_rsvps')
            .select('id, user_id, status, paid, qr_token, party_id, invest_eligible_acknowledged, profiles!event_rsvps_user_id_fkey(id, first_name, last_name, profile_picture_url, phone)')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_guest_rsvps')
            .select('id, guest_name, guest_email, guest_phone, guest_token, status, paid, amount_paid_cents, stripe_payment_intent_id, created_at, party_id, attach_requested')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_checkins')
            .select('user_id, guest_token, checked_in_at')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_parties')
            .select('id, status, payer_kind, payer_user_id, payer_guest_rsvp_id, invite_token, disclaimer_acks, amenity_vote_option_id, amenity_vote_status')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_seats')
            .select('id, party_id, role, display_name, options, options_complete, info_invite_token, linked_user_id, linked_guest_rsvp_id, sort_order')
            .eq('event_id', eventId)
            .order('sort_order', { ascending: true }),
    ]);

    STATE.rsvps = rsvpsRes.data || [];
    STATE.guestRsvps = guestRes.data || [];
    STATE.checkins = checkinsRes.data || [];
    STATE.parties = partiesRes.data || [];
    STATE.seats = seatsRes.data || [];

    const { data: docs } = await supabaseClient
        .from('event_documents')
        .select('id, doc_type, target_user_id, distributed')
        .eq('event_id', eventId);
    STATE.eventDocuments = docs || [];
}

// ─── Open / Close ───────────────────────────────────────────────
async function open(eventId, opts = {}) {
    if (!eventId) return;
    Shell.ensureMounted();
    STATE.eventId = eventId;
    STATE.source  = opts.source || 'admin';
    STATE.editCopyOnOpen = !!opts.editCopy;
    const requested = opts.editCopy ? 'event' : opts.tab;
    STATE.activeTab = 'overview';
    STATE.tabData = {};
    Raffle?.clearPrizeImageState?.();

    Shell.setLoadingChrome();
    Shell.openPanel();

    await _loadEventData(eventId);
    STATE.canManageNotifications = await _canManageNotificationsForEvent(STATE.event);
    if (opts.notificationsPrefill && Notifications?.resetNotificationsUi) {
        Notifications.resetNotificationsUi(opts.notificationsPrefill);
    }
    STATE.activeTab = Shell.resolveOpenTab?.(requested) || 'overview';
    Shell.renderHeader();
    Shell.renderTabs();
    _renderTab(STATE.activeTab);
}

function close() {
    Shell.closePanel();
}

function _renderTab(tab) {
    const key = Shell.resolveTabKey?.(tab) || tab;
    if (key === 'overview') { _renderContent(Overview.overviewHtml()); Overview.wireOverview(); return; }
    if (key === 'event')    { _renderContent(EventTab.eventHtml()); EventTab.wireEvent(); return; }
    if (key === 'people') {
        if (STATE.canManageNotifications) {
            return _renderTabAsync('notifications', Notifications.loadNotifications, People.peopleHtml, People.wirePeople);
        }
        _renderContent(People.peopleHtml());
        People.wirePeople();
        return;
    }
    if (key === 'danger')   { _renderContent(Danger.dangerHtml()); Danger.wireDanger(); return; }
    // Lazy-loaded M3b tabs:
    if (key === 'money')    return _renderTabAsync('money',  Money.loadMoney,  Money.moneyHtml,  Money.wireMoney);
    if (key === 'docs')     return _renderTabAsync('docs',   Docs.loadDocs,   Docs.docsHtml,   Docs.wireDocs);
    if (key === 'raffle')   return _renderTabAsync('raffle', Raffle.loadRaffle, Raffle.raffleHtml, Raffle.wireRaffle);
    if (key === 'comp') {
        return _renderTabAsync('comp', Comp.loadComp, Comp.compHtml, Comp.wireComp);
    }
}

async function _renderTabAsync(key, loader, render, wire) {
    if (!STATE.tabData[key]) {
        _renderContent(`<div class="em-placeholder"><div style="font-size:13px">Loading…</div></div>`);
        try {
            STATE.tabData[key] = await loader();
        } catch (err) {
            _renderContent(`<div class="em-placeholder"><p class="text-sm text-red-600">Failed to load: ${_esc(err.message || err)}</p></div>`);
            return;
        }
    }
    const active = Shell.resolveTabKey?.(STATE.activeTab) || STATE.activeTab;
    const expected = key === 'notifications' ? 'people' : key;
    if (active !== expected && active !== key) return;
    _renderContent(render());
    if (wire) wire();
}

function _overviewHtml() { return Overview.overviewHtml(); }
function _wireOverview() { return Overview.wireOverview(); }

async function _refreshEventManager(tab) {
    await _loadEventData(STATE.eventId);
    STATE.tabData = {};
    if (tab) STATE.activeTab = Shell.resolveOpenTab?.(tab) || tab;
    _renderHeader();
    _renderTabs();
    _renderTab(STATE.activeTab);
    _notifyParent('updated', STATE.eventId);
}

function _notifyParent(type, eventId) {
    document.dispatchEvent(new CustomEvent('events:manage:' + type, { detail: { eventId } }));
}

// ─── Empty-state helper (used by M3b tabs when feature isn't enabled) ──
function _emptyHtml(title, sub) {
    return `
        <div class="em-placeholder">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="text-sm font-semibold text-gray-500">${_esc(title)}</p>
            ${sub ? `<p class="text-xs text-gray-400 mt-1">${_esc(sub)}</p>` : ''}
        </div>
    `;
}

// ─── Helpers ────────────────────────────────────────────────────
function _esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}
function _money(cents) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
}

function refreshRaffle(eventId) {
    return Raffle.refreshRaffle(eventId);
}

globalThis.EventsManageParticipationApi = {
    getState: () => STATE,
    refreshEventManager: _refreshEventManager,
    renderTab: _renderTab,
};

globalThis.EventsManageDangerApi = {
    getState: () => STATE,
    notifyParent: _notifyParent,
    close,
    renderHeader: () => Shell.renderHeader(),
    renderTab: _renderTab,
    resetParticipation: () => Participation.resetParticipation(),
};

globalThis.EventsManageRaffleApi = {
    getState: () => STATE,
    emptyHtml: _emptyHtml,
    notifyParent: _notifyParent,
    refreshEventManager: _refreshEventManager,
    renderTab: _renderTab,
    renderTabAsync: _renderTabAsync,
};

globalThis.EventsManageRsvpsApi = {
    getState: () => STATE,
    removeParticipationPerson: (btn) => Participation.removeParticipationPerson(btn),
};

globalThis.EventsManageImagesApi = {
    getState: () => STATE,
    notifyParent: _notifyParent,
};

globalThis.EventsManageMoneyApi = {
    getState: () => STATE,
};

globalThis.EventsManageDocsApi = {
    getState: () => STATE,
    getDocTypes,
    renderTab: _renderTab,
    notifyParent: _notifyParent,
};

globalThis.EventsManageCompetitionApi = {
    getState: () => STATE,
    emptyHtml: _emptyHtml,
};

globalThis.EventsManageNotificationsApi = {
    getState: () => STATE,
    renderTab: _renderTab,
    refreshNotificationsTab: () => Notifications.refreshNotificationsTab?.(),
};

globalThis.EventsManageShellApi = {
    getState: () => STATE,
    onClose: close,
    renderTab: _renderTab,
};

globalThis.EventsManageOverviewApi = {
    getState: () => STATE,
    renderHeader: () => Shell.renderHeader(),
    renderTabs: () => Shell.renderTabs(),
    renderTab: _renderTab,
    notifyParent: _notifyParent,
};

globalThis.EventsManageEventApi = {
    getState: () => STATE,
    renderHeader: () => Shell.renderHeader(),
    renderTab: _renderTab,
    notifyParent: _notifyParent,
};

globalThis.EventsManagePeopleApi = {
    getState: () => STATE,
};

// ─── Public surface ─────────────────────────────────────────────
export const eventsManageApi = { open, close, refreshRaffle };

globalThis.EventsManage = eventsManageApi;
const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.manage = PortalEvents.manage || {};
PortalEvents.manage.open = eventsManageApi.open;
PortalEvents.manage.close = eventsManageApi.close;
PortalEvents.manage.refreshRaffle = eventsManageApi.refreshRaffle;
if (PortalEvents.detail && typeof PortalEvents.detail.register === 'function') {
    PortalEvents.detail.register('manage', { open, close });
}
