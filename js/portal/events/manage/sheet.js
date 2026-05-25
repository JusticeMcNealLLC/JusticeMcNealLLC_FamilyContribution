// ═══════════════════════════════════════════════════════════
// Event Management Sheet  (M3a + M3b)
//
// Self-contained module. Used by both:
//   • admin/events.html  → "Manage" button on each event card
//   • portal/events.html → Host Controls "Manage event" button
//
// All 7 tabs: Overview, RSVPs, Money, Docs, Raffle, Comp, Danger Zone
//
// Public surface:
//   window.EventsManage.open(eventId, { source: 'admin' | 'portal' })
//   window.EventsManage.close()
//
// Requirements: supabaseClient (global), formatCurrency (config.js).
// Per-tab data is lazy-loaded on first switch and cached on STATE.tabData.
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    const STATE = {
        eventId: null,
        event:   null,
        rsvps:   [],
        guestRsvps: [],
        checkins: [],
        activeTab: 'overview',
        source:  'admin', // 'admin' | 'portal'
        editCopyOnOpen: false,
        tabData: {}, // lazy per-tab cache: { money, docs, raffle, comp }
    };

    const RAFFLE_PRIZE_IMAGE_FILES = {};
    const RAFFLE_PRIZE_IMAGE_PREVIEWS = {};

    const DOC_TYPES = [
        { value: 'plane_ticket', label: 'Plane Ticket', perMember: true },
        { value: 'group_ticket', label: 'Group Ticket / Pass', perMember: false },
        { value: 'itinerary', label: 'Itinerary', perMember: false },
        { value: 'receipt', label: 'Receipt', perMember: false },
        { value: 'other', label: 'Other', perMember: false },
    ];

    const Shell = window.EventsManageShell;
    const Overview = window.EventsManageOverview;

    function _ensureMounted() { return Shell.ensureMounted(); }
    function _renderHeader() { return Shell.renderHeader(); }
    function _renderTabs() { return Shell.renderTabs(); }
    function _renderContent(html) { return Shell.renderContent(html); }

    // ─── Data loading ───────────────────────────────────────────────
    async function _loadEventData(eventId) {
        const { data: event } = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();
        STATE.event = event;

        const { data: rsvps } = await supabaseClient
            .from('event_rsvps')
            .select('id, user_id, status, paid, qr_token, profiles!event_rsvps_user_id_fkey(id, first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId);
        STATE.rsvps = rsvps || [];

        const { data: guestRsvps } = await supabaseClient
            .from('event_guest_rsvps')
            .select('id, guest_name, guest_email, guest_token, status, paid, amount_paid_cents, stripe_payment_intent_id, created_at')
            .eq('event_id', eventId);
        STATE.guestRsvps = guestRsvps || [];

        const { data: checkins } = await supabaseClient
            .from('event_checkins')
            .select('user_id, guest_token, checked_in_at')
            .eq('event_id', eventId);
        STATE.checkins = checkins || [];
    }

    // ─── Open / Close ───────────────────────────────────────────────
    async function open(eventId, opts = {}) {
        if (!eventId) return;
        Shell.ensureMounted();
        STATE.eventId = eventId;
        STATE.source  = opts.source || 'admin';
        STATE.activeTab = Shell.getTabs().some(t => t.key === opts.tab) ? opts.tab : 'overview';
        STATE.editCopyOnOpen = !!opts.editCopy;
        STATE.tabData = {};
        Raffle.clearPrizeImageState();

        Shell.setLoadingChrome();
        Shell.openPanel();

        await _loadEventData(eventId);
        Shell.renderHeader();
        _renderTab(STATE.activeTab);
    }

    function close() {
        Shell.closePanel();
    }

    function _renderTab(tab) {
        if (tab === 'overview') { _renderContent(Overview.overviewHtml()); Overview.wireOverview(); return; }
        if (tab === 'images')   { _renderContent(Images.imagesHtml());   Images.wireImages();   return; }
        if (tab === 'rsvps')    { _renderContent(Rsvps.rsvpsHtml()); Rsvps.wireRsvps(); return; }
        if (tab === 'danger')   { _renderContent(Danger.dangerHtml()); Danger.wireDanger(); return; }
        // Lazy-loaded M3b tabs:
        if (tab === 'money')    return _renderTabAsync('money',  Money.loadMoney,  Money.moneyHtml,  Money.wireMoney);
        if (tab === 'docs')     return _renderTabAsync('docs',   Docs.loadDocs,   Docs.docsHtml,   Docs.wireDocs);
        if (tab === 'raffle')   return _renderTabAsync('raffle', Raffle.loadRaffle, Raffle.raffleHtml, Raffle.wireRaffle);
        if (tab === 'comp') {
            if (STATE.event?.event_type !== 'competition') { _renderContent(Comp.compHtml()); Comp.wireComp(); return; }
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
        // Guard: user may have switched tabs while loading
        if (STATE.activeTab !== key) return;
        _renderContent(render());
        if (wire) wire();
    }

    function _overviewHtml() { return Overview.overviewHtml(); }
    function _wireOverview() { return Overview.wireOverview(); }

    async function _refreshEventManager(tab) {
        await _loadEventData(STATE.eventId);
        STATE.tabData = {};
        if (tab) STATE.activeTab = tab;
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

    window.EventsManageParticipationApi = {
        getState: () => STATE,
        refreshEventManager: _refreshEventManager,
        renderTab: _renderTab,
    };

    window.EventsManageDangerApi = {
        getState: () => STATE,
        notifyParent: _notifyParent,
        close,
        renderHeader: () => Shell.renderHeader(),
        renderTab: _renderTab,
        resetParticipation: () => Participation.resetParticipation(),
    };

    window.EventsManageRaffleApi = {
        getState: () => STATE,
        emptyHtml: _emptyHtml,
        notifyParent: _notifyParent,
        refreshEventManager: _refreshEventManager,
        renderTab: _renderTab,
        renderTabAsync: _renderTabAsync,
    };

    window.EventsManageRsvpsApi = {
        getState: () => STATE,
        removeParticipationPerson: (btn) => Participation.removeParticipationPerson(btn),
    };

    window.EventsManageImagesApi = {
        getState: () => STATE,
        notifyParent: _notifyParent,
    };

    window.EventsManageMoneyApi = {
        getState: () => STATE,
    };

    window.EventsManageDocsApi = {
        getState: () => STATE,
        getDocTypes: () => DOC_TYPES,
        renderTab: _renderTab,
        notifyParent: _notifyParent,
    };

    window.EventsManageCompetitionApi = {
        getState: () => STATE,
        emptyHtml: _emptyHtml,
    };

    window.EventsManageShellApi = {
        getState: () => STATE,
        onClose: close,
        renderTab: _renderTab,
    };

    window.EventsManageOverviewApi = {
        getState: () => STATE,
        renderHeader: () => Shell.renderHeader(),
        renderTabs: () => Shell.renderTabs(),
        renderTab: _renderTab,
        notifyParent: _notifyParent,
    };

    // ─── Public surface ─────────────────────────────────────────────
    window.EventsManage = { open, close, refreshRaffle };

    // PortalEvents.manage namespace bridge (additive — preserves window.EventsManage)
    if (window.PortalEvents) {
        window.PortalEvents.manage = window.PortalEvents.manage || {};
        window.PortalEvents.manage.open = open;
        window.PortalEvents.manage.close = close;
        window.PortalEvents.manage.refreshRaffle = refreshRaffle;
    }

    // Also register on PortalEvents.detail registry (if available)
    if (window.PortalEvents && window.PortalEvents.detail && typeof window.PortalEvents.detail.register === 'function') {
        window.PortalEvents.detail.register('manage', { open, close });
    }
})();
