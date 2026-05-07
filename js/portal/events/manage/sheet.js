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

    const M3A_TABS = [
        { key: 'overview', label: 'Overview' },
        { key: 'rsvps',    label: 'RSVPs'    },
        { key: 'money',    label: 'Money'    },
        { key: 'docs',     label: 'Docs'     },
        { key: 'raffle',   label: 'Raffle'   },
        { key: 'comp',     label: 'Comp'     },
        { key: 'danger',   label: 'Danger Zone' },
    ];

    const STATE = {
        eventId: null,
        event:   null,
        rsvps:   [],
        guestRsvps: [],
        checkins: [],
        activeTab: 'overview',
        source:  'admin', // 'admin' | 'portal'
        tabData: {}, // lazy per-tab cache: { money, docs, raffle, comp }
    };

    const DOC_TYPES = [
        { value: 'plane_ticket', label: 'Plane Ticket', perMember: true },
        { value: 'group_ticket', label: 'Group Ticket / Pass', perMember: false },
        { value: 'itinerary', label: 'Itinerary', perMember: false },
        { value: 'receipt', label: 'Receipt', perMember: false },
        { value: 'other', label: 'Other', perMember: false },
    ];

    // ─── DOM injection ──────────────────────────────────────────────
    function _ensureMounted() {
        if (document.getElementById('emSheetRoot')) return;
        const root = document.createElement('div');
        root.id = 'emSheetRoot';
        root.innerHTML = `
            <div id="emSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
            <div id="emSheet" class="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
                <div id="emSheetPanel" class="bg-white w-full sm:max-w-3xl sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col" style="max-height:90vh">
                    <header id="emSheetHeader" class="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] uppercase tracking-wide font-bold text-brand-600">Manage Event</p>
                            <h2 id="emSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">…</h2>
                            <p id="emSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                        </div>
                        <button id="emSheetClose" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" aria-label="Close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </header>
                    <nav id="emSheetTabs" class="flex gap-1 px-3 sm:px-4 border-b border-gray-100 overflow-x-auto flex-shrink-0" style="scrollbar-width:none;-ms-overflow-style:none"></nav>
                    <div id="emSheetContent" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"></div>
                </div>
            </div>
            <style>
                #emSheetTabs::-webkit-scrollbar { display: none; }
                .em-tab { white-space:nowrap; padding:10px 12px; font-size:13px; font-weight:600; color:#6b7280; border-bottom:2px solid transparent; transition:color .15s,border-color .15s; cursor:pointer; }
                .em-tab:hover { color:#374151; }
                .em-tab.active { color:#4f46e5; border-bottom-color:#4f46e5; }
                .em-tab.placeholder { color:#cbd5e1; }
                .em-tab.placeholder.active { color:#9ca3af; border-bottom-color:#cbd5e1; }
                .em-card { background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:16px; padding:16px; }
                .em-op-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:12px; }
                .em-op-card { min-height:150px; display:flex; flex-direction:column; gap:12px; }
                .em-op-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
                .em-op-kicker { font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#9ca3af; margin:0 0 3px; }
                .em-op-title { font-size:15px; font-weight:800; color:#111827; margin:0; line-height:1.15; }
                .em-op-icon { width:34px; height:34px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; flex-shrink:0; }
                .em-op-copy { font-size:12px; line-height:1.45; color:#6b7280; margin:0; }
                .em-op-meta { margin-top:auto; display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
                .em-op-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:999px; background:#f8fafc; color:#475569; font-size:11px; font-weight:700; }
                .em-op-progress { height:7px; border-radius:999px; overflow:hidden; background:#eef2f7; margin-top:auto; }
                .em-op-progress span { display:block; height:100%; width:0; border-radius:inherit; background:#4f46e5; }
                .em-command-card { background:linear-gradient(135deg,#111827,#312e81); color:#fff; border:0; overflow:hidden; position:relative; }
                .em-command-card:after { content:""; position:absolute; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,.08); right:-70px; top:-80px; }
                .em-command-eyebrow { font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#c7d2fe; margin:0 0 6px; }
                .em-command-title { font-size:20px; font-weight:850; margin:0; line-height:1.15; }
                .em-command-copy { font-size:12px; line-height:1.5; color:#dbeafe; margin:8px 0 0; max-width:560px; }
                .em-metric-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
                .em-metric { background:#fff; border:1px solid rgba(15,23,42,.06); border-radius:16px; padding:13px; min-width:0; }
                .em-metric span { display:block; font-size:10px; font-weight:800; letter-spacing:.08em; color:#94a3b8; text-transform:uppercase; }
                .em-metric strong { display:block; margin-top:5px; font-size:22px; line-height:1; color:#0f172a; }
                .em-metric small { display:block; margin-top:5px; color:#64748b; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .em-section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
                .em-section-title { margin:0; color:#111827; font-size:14px; font-weight:850; }
                .em-section-sub { margin:3px 0 0; color:#94a3b8; font-size:12px; line-height:1.4; }
                .em-attendee-card { display:flex; gap:12px; align-items:flex-start; padding:13px 0; border-top:1px solid #f1f5f9; }
                .em-attendee-card:first-of-type { border-top:0; padding-top:0; }
                .em-attendee-main { flex:1; min-width:0; }
                .em-attendee-name { margin:0; font-size:14px; font-weight:800; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .em-attendee-sub { margin:2px 0 0; color:#64748b; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .em-money-layout { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(260px,.9fr); gap:12px; align-items:start; }
                .em-money-row { display:flex; justify-content:space-between; gap:14px; padding:11px 0; border-top:1px solid #f1f5f9; font-size:13px; }
                .em-money-row:first-child { border-top:0; padding-top:0; }
                .em-money-row span { color:#64748b; }
                .em-money-row strong { color:#111827; }
                .em-stat { display:flex; flex-direction:column; gap:4px; }
                .em-stat-label { font-size:11px; text-transform:uppercase; letter-spacing:.04em; font-weight:600; color:#6b7280; }
                .em-stat-num { font-size:24px; font-weight:800; color:#111827; }
                .em-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f1f5f9; }
                .em-row:last-child { border-bottom:none; }
                .em-avatar { width:32px; height:32px; border-radius:50%; background:#e0e7ff; color:#4f46e5; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; overflow:hidden; }
                .em-avatar img { width:100%; height:100%; object-fit:cover; }
                .em-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
                .em-pill-going { background:#d1fae5; color:#065f46; }
                .em-pill-maybe { background:#fce7f3; color:#9d174d; }
                .em-pill-not { background:#fee2e2; color:#991b1b; }
                .em-pill-paid { background:#fef3c7; color:#92400e; }
                .em-pill-checked { background:#ede9fe; color:#5b21b6; }
                .em-danger-card { background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:14px; margin-bottom:10px; }
                .em-danger-title { font-weight:700; color:#991b1b; font-size:14px; }
                .em-danger-sub { font-size:12px; color:#7f1d1d; margin-top:2px; margin-bottom:10px; }
                .em-btn-danger { background:#dc2626; color:#fff; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
                .em-btn-danger:hover { background:#b91c1c; }
                .em-btn-ghost { background:#f3f4f6; color:#374151; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
                .em-btn-ghost:hover { background:#e5e7eb; }
                .em-btn-primary { background:#4f46e5; color:#fff; padding:9px 14px; border-radius:10px; font-size:13px; font-weight:700; border:none; cursor:pointer; }
                .em-btn-primary:hover { background:#4338ca; }
                .em-btn-primary:disabled { opacity:.55; cursor:not-allowed; }
                .em-input { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:9px 11px; font-size:13px; color:#111827; background:#fff; }
                .em-input:focus { outline:none; border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.18); }
                .em-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; color:#9ca3af; }
                .em-placeholder svg { width:48px; height:48px; margin-bottom:12px; opacity:.4; }
                @media(max-width:639px){
                    #emSheetPanel { max-height: 92vh; }
                    .em-op-grid { grid-template-columns:1fr; }
                    .em-metric-grid { grid-template-columns:1fr 1fr; }
                    .em-money-layout { grid-template-columns:1fr; }
                }
                @media(min-width:640px) and (max-width:900px){ .em-op-grid { grid-template-columns:1fr 1fr; } .em-money-layout { grid-template-columns:1fr; } }
            </style>
        `;
        document.body.appendChild(root);

        document.getElementById('emSheetClose').addEventListener('click', close);
        document.getElementById('emSheetBackdrop').addEventListener('click', close);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('emSheet')?.classList.contains('em-open')) close();
        });
    }

    // ─── Open / Close ───────────────────────────────────────────────
    async function open(eventId, opts = {}) {
        if (!eventId) return;
        _ensureMounted();
        STATE.eventId = eventId;
        STATE.source  = opts.source || 'admin';
        STATE.activeTab = M3A_TABS.some(t => t.key === opts.tab) ? opts.tab : 'overview';
        STATE.tabData = {}; // clear cache between events

        // Show shell immediately with skeleton
        document.getElementById('emSheetTitle').textContent = 'Loading event…';
        document.getElementById('emSheetSub').textContent = '';
        _renderTabs();
        _renderContent('<div class="em-placeholder"><div style="font-size:13px">Loading…</div></div>');

        const sheet = document.getElementById('emSheet');
        const panel = document.getElementById('emSheetPanel');
        const backdrop = document.getElementById('emSheetBackdrop');
        sheet.classList.add('em-open');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        backdrop.classList.add('opacity-100');
        requestAnimationFrame(() => {
            panel.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
            panel.classList.add('translate-y-0', 'sm:opacity-100');
        });
        document.body.style.overflow = 'hidden';

        // Fetch data
        await _loadEventData(eventId);
        _renderHeader();
        _renderTab(STATE.activeTab);
    }

    function close() {
        const sheet = document.getElementById('emSheet');
        const panel = document.getElementById('emSheetPanel');
        const backdrop = document.getElementById('emSheetBackdrop');
        if (!sheet || !sheet.classList.contains('em-open')) return;
        panel.classList.add('translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
        panel.classList.remove('translate-y-0', 'sm:opacity-100');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        backdrop.classList.remove('opacity-100');
        document.body.style.overflow = '';
        setTimeout(() => sheet.classList.remove('em-open'), 250);
    }

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
            .select('user_id, status, paid, qr_token, profiles!event_rsvps_user_id_fkey(id, first_name, last_name, profile_picture_url)')
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

    // ─── Header ─────────────────────────────────────────────────────
    function _renderHeader() {
        const e = STATE.event;
        if (!e) return;
        document.getElementById('emSheetTitle').textContent = e.title;
        const dateStr = new Date(e.start_date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
        const typeLabel = ({ llc:'LLC', member:'Member', competition:'Competition' })[e.event_type] || e.event_type;
        document.getElementById('emSheetSub').textContent = `${typeLabel} · ${dateStr} · ${(e.status || '').toUpperCase()}`;
    }

    // ─── Tab bar ────────────────────────────────────────────────────
    function _renderTabs() {
        const bar = document.getElementById('emSheetTabs');
        bar.innerHTML = M3A_TABS.map(t =>
            `<button class="em-tab${t.placeholder ? ' placeholder' : ''}${t.key === STATE.activeTab ? ' active' : ''}" data-tab="${t.key}">${t.label}${t.placeholder ? ' <span style="font-size:9px;opacity:.7">soon</span>' : ''}</button>`
        ).join('');
        bar.querySelectorAll('.em-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                STATE.activeTab = btn.dataset.tab;
                _renderTabs();
                _renderTab(STATE.activeTab);
                btn.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
            });
        });
    }

    function _renderContent(html) {
        document.getElementById('emSheetContent').innerHTML = html;
    }

    function _renderTab(tab) {
        if (tab === 'overview') { _renderContent(_overviewHtml()); _wireOverview(); return; }
        if (tab === 'rsvps')    return _renderContent(_rsvpsHtml());
        if (tab === 'danger')   { _renderContent(_dangerHtml()); _wireDanger(); return; }
        // Lazy-loaded M3b tabs:
        if (tab === 'money')    return _renderTabAsync('money',  _loadMoney,  _moneyHtml,  _wireMoney);
        if (tab === 'docs')     return _renderTabAsync('docs',   _loadDocs,   _docsHtml,   _wireDocs);
        if (tab === 'raffle')   return _renderTabAsync('raffle', _loadRaffle, _raffleHtml, _wireRaffle);
        if (tab === 'comp') {
            if (STATE.event?.event_type !== 'competition') { _renderContent(_compHtml()); _wireComp(); return; }
            return _renderTabAsync('comp', _loadComp, _compHtml, _wireComp);
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

    // ─── Overview tab ───────────────────────────────────────────────
    function _overviewHtml() {
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
        const transportEstimate = e.transportation_estimate_cents ? _money(e.transportation_estimate_cents) : '';

        const portalLink = `<a href="../portal/events.html?event=${encodeURIComponent(e.slug || '')}" class="em-btn-ghost" style="text-decoration:none;display:inline-block">Open in portal →</a>`;
        const thresholdCard = isLlc && minNeeded ? `
            <div class="em-card em-op-card">
                <div class="em-op-head">
                    <div><p class="em-op-kicker">Minimum</p><p class="em-op-title">${thresholdMet ? 'Threshold met' : 'Needs momentum'}</p></div>
                    <span class="em-op-icon">${thresholdMet ? '✅' : '⚠️'}</span>
                </div>
                <p class="em-op-copy">${going} of ${minNeeded} required RSVPs${deadline ? ` by ${deadline}` : ''}. ${thresholdMet ? 'This event can stay confirmed.' : `${Math.max(0, minNeeded - going)} more RSVP${minNeeded - going === 1 ? '' : 's'} needed.`}</p>
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

        return `
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div class="em-card em-stat"><span class="em-stat-label">Going</span><span class="em-stat-num">${going}${e.max_participants ? `<span style="font-size:14px;color:#9ca3af;font-weight:500">/${e.max_participants}</span>` : ''}</span></div>
                <div class="em-card em-stat"><span class="em-stat-label">Interested</span><span class="em-stat-num" style="color:#db2777">${maybe}</span></div>
                <div class="em-card em-stat"><span class="em-stat-label">Checked In</span><span class="em-stat-num" style="color:#7c3aed">${checked}</span></div>
                <div class="em-card em-stat"><span class="em-stat-label">Revenue</span><span class="em-stat-num" style="color:#059669">${_money(revenue)}</span></div>
            </div>

            ${operationsHtml ? `<div class="em-op-grid">${operationsHtml}</div>` : ''}

            <div class="em-card mb-3">
                <h3 class="font-bold text-gray-800 text-sm mb-3">Details</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between gap-3"><span class="text-gray-500">When</span><span class="text-gray-800 font-medium text-right">${startLocal}</span></div>
                    ${e.location_nickname ? `<div class="flex justify-between gap-3"><span class="text-gray-500">Where</span><span class="text-gray-800 font-medium text-right truncate">${_esc(e.location_nickname)}</span></div>` : ''}
                    <div class="flex justify-between gap-3"><span class="text-gray-500">Status</span><span class="text-gray-800 font-medium uppercase tracking-wide text-xs">${e.status}</span></div>
                    <div class="flex justify-between gap-3"><span class="text-gray-500">Pricing</span><span class="text-gray-800 font-medium">${e.pricing_mode === 'paid' ? `Paid · ${_money(e.rsvp_cost_cents)}` : 'Free'}</span></div>
                    ${e.rsvp_deadline ? `<div class="flex justify-between gap-3"><span class="text-gray-500">RSVP deadline</span><span class="text-gray-800 font-medium">${new Date(e.rsvp_deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>` : ''}
                </div>
            </div>

            ${STATE.source === 'admin' ? `
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
                    ${e.slug ? `<button class="em-btn-ghost" onclick="navigator.clipboard.writeText('${window.location.origin}/portal/events.html?event=${encodeURIComponent(e.slug)}');this.textContent='Copied ✓';setTimeout(()=>this.textContent='Copy share link',1500)">Copy share link</button>` : ''}
                    ${e.checkin_enabled !== false && e.checkin_mode === 'attendee_ticket' && ['open','confirmed','active'].includes(e.status) ? `<button class="em-btn-ghost" onclick="window.EventsManage.close();setTimeout(()=>window.evtOpenScanner&&window.evtOpenScanner('${STATE.eventId}'),150)"><svg style="width:14px;height:14px;display:inline;vertical-align:-2px;margin-right:4px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>Scan Attendees</button>` : ''}
                </div>
                <p class="text-xs text-gray-400 mt-3">Tap any tab above for Money, Docs, Raffle, or Comp details.</p>
            </div>
            ${e.checkin_enabled !== false && e.checkin_mode === 'venue_scan' && e.venue_qr_token ? `
            <div class="em-card mt-3">
                <h3 class="font-bold text-gray-800 text-sm mb-3">📍 Venue QR Code</h3>
                <canvas id="emVenueQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
                <p class="text-xs text-gray-400 text-center mt-2">Display this at the entrance for attendees to scan</p>
            </div>` : ''}
        `;
    }

    // ─── RSVPs tab ──────────────────────────────────────────────────
    function _rsvpsHtml() {
        const e = STATE.event;
        const going = STATE.rsvps.filter(r => r.status === 'going');
        const maybe = STATE.rsvps.filter(r => r.status === 'maybe');
        const not   = STATE.rsvps.filter(r => r.status === 'not_going');
        const guestGoing = STATE.guestRsvps.filter(r => r.status === 'going');
        const checkedSet = new Set(STATE.checkins.map(c => c.user_id));
        const guestCheckedSet = new Set(STATE.checkins.map(c => c.guest_token).filter(Boolean));
        const totalGoing = going.length + guestGoing.length;
        const checkedTotal = STATE.checkins.length;
        const capacity = e.max_participants || 0;
        const capacityLeft = capacity ? Math.max(0, capacity - totalGoing) : null;
        const minNeeded = Number(e.min_participants || 0);
        const thresholdLeft = minNeeded ? Math.max(0, minNeeded - totalGoing) : 0;
        const checkedPct = totalGoing ? Math.round((checkedTotal / totalGoing) * 100) : 0;

        function memberRow(r) {
            const p = r.profiles || {};
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
            const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?';
            const avatar = p.profile_picture_url
                ? `<img src="${_esc(p.profile_picture_url)}" alt="">`
                : `<span>${initials}</span>`;
            const pills = [];
            if (r.status === 'going') pills.push('<span class="em-pill em-pill-going">Going</span>');
            else if (r.status === 'maybe') pills.push('<span class="em-pill em-pill-maybe">Maybe</span>');
            else pills.push('<span class="em-pill em-pill-not">Not going</span>');
            if (r.paid) pills.push('<span class="em-pill em-pill-paid">Paid</span>');
            if (checkedSet.has(r.user_id)) pills.push('<span class="em-pill em-pill-checked">Checked in</span>');
            return `<div class="em-attendee-card"><div class="em-avatar">${avatar}</div><div class="em-attendee-main"><p class="em-attendee-name">${_esc(name)}</p><p class="em-attendee-sub">Member RSVP${r.qr_token ? ' · ticket ready' : ''}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join('')}</div></div></div>`;
        }

        function guestRow(g) {
            const initials = (g.guest_name || 'G').slice(0, 1).toUpperCase();
            const pills = ['<span class="em-pill em-pill-going">Guest</span>'];
            if (g.paid) pills.push('<span class="em-pill em-pill-paid">Paid</span>');
            if (guestCheckedSet.has(g.guest_token)) pills.push('<span class="em-pill em-pill-checked">Checked in</span>');
            return `<div class="em-attendee-card"><div class="em-avatar" style="background:#fef3c7;color:#92400e"><span>${_esc(initials)}</span></div><div class="em-attendee-main"><p class="em-attendee-name">${_esc(g.guest_name || 'Guest')}</p><p class="em-attendee-sub">${_esc(g.guest_email || 'Public guest')}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join('')}</div></div></div>`;
        }

        function section(title, list, emptyText) {
            return `
                <div class="em-card mb-3">
                    <div class="em-section-head"><div><h3 class="em-section-title">${title} <span class="text-gray-400 font-normal">· ${list.length}</span></h3></div></div>
                    ${list.length ? list.map(memberRow).join('') : `<p class="text-xs text-gray-400 italic py-2">${emptyText}</p>`}
                </div>
            `;
        }

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Attendance command</p>
                <h3 class="em-command-title">${totalGoing ? `${totalGoing} attending` : 'No confirmed attendees yet'}</h3>
                <p class="em-command-copy">${thresholdLeft ? `${thresholdLeft} more RSVP${thresholdLeft === 1 ? '' : 's'} needed to meet the minimum.` : 'Minimum and attendance signals are in good shape.'} ${capacityLeft !== null ? `${capacityLeft} spot${capacityLeft === 1 ? '' : 's'} still available.` : 'Capacity is open-ended.'}</p>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Total going</span><strong>${totalGoing}</strong><small>${going.length} member · ${guestGoing.length} guest</small></div>
                <div class="em-metric"><span>Checked in</span><strong>${checkedTotal}</strong><small>${checkedPct}% of going</small></div>
                <div class="em-metric"><span>Interested</span><strong>${maybe.length}</strong><small>Member maybes</small></div>
                <div class="em-metric"><span>Capacity</span><strong>${capacityLeft === null ? 'Open' : capacityLeft}</strong><small>${capacity ? `${totalGoing}/${capacity} filled` : 'No max set'}</small></div>
            </div>

            ${section('Going members', going, 'No members are going yet.')}
            <div class="em-card mb-3">
                <div class="em-section-head"><div><h3 class="em-section-title">Public guests <span class="text-gray-400 font-normal">· ${guestGoing.length}</span></h3><p class="em-section-sub">Guests from the public event link and ticket flow.</p></div></div>
                ${guestGoing.length ? guestGoing.map(guestRow).join('') : '<p class="text-xs text-gray-400 italic py-2">No public guests yet.</p>'}
            </div>
            ${section('Interested', maybe, 'No interested members.')}
            ${not.length ? section('Not going', not, '') : ''}
        `;
    }

    // ─── Danger Zone tab ────────────────────────────────────────────
    function _dangerHtml() {
        const e = STATE.event;
        const isCancelled = e.status === 'cancelled';
        const isCompleted = e.status === 'completed';
        const totalRsvps = STATE.rsvps.length + STATE.guestRsvps.length;
        const paidTickets = STATE.rsvps.filter(r => r.paid).length + STATE.guestRsvps.filter(r => r.paid).length;
        const checkins = STATE.checkins.length;
        const statusLabel = (e.status || 'draft').toUpperCase();

        return `
            <div class="em-card em-command-card mb-4" style="background:linear-gradient(135deg,#7f1d1d,#111827)">
                <p class="em-command-eyebrow">Danger zone</p>
                <h3 class="em-command-title">High-impact event controls</h3>
                <p class="em-command-copy">These actions change availability, visibility, or stored event records. Review attendance and money before making a destructive change.</p>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Status</span><strong style="font-size:18px">${_esc(statusLabel)}</strong><small>Current lifecycle</small></div>
                <div class="em-metric"><span>RSVP records</span><strong>${totalRsvps}</strong><small>Member + guest</small></div>
                <div class="em-metric"><span>Paid tickets</span><strong>${paidTickets}</strong><small>Refund review</small></div>
                <div class="em-metric"><span>Check-ins</span><strong>${checkins}</strong><small>Attendance history</small></div>
            </div>

            ${!isCancelled && !isCompleted ? `
            <div class="em-danger-card">
                <p class="em-danger-title">Cancel event</p>
                <p class="em-danger-sub">Marks the event as cancelled. Paid RSVPs are NOT auto-refunded — handle refunds in M3b's Money tab or Stripe dashboard.</p>
                <button class="em-btn-danger" data-action="cancel">Cancel event</button>
            </div>` : ''}

            ${!isCompleted ? `
            <div class="em-danger-card" style="background:#fffbeb;border-color:#fde68a">
                <p class="em-danger-title" style="color:#92400e">Mark completed</p>
                <p class="em-danger-sub" style="color:#78350f">Closes RSVPs and locks the event. Use this after the event has ended.</p>
                <button class="em-btn-ghost" data-action="complete" style="background:#fde68a;color:#78350f">Mark completed</button>
            </div>` : ''}

            ${isCancelled ? `<div class="em-card mb-3"><div class="em-section-head"><div><h3 class="em-section-title">Event already cancelled</h3><p class="em-section-sub">Cancellation controls are hidden because this event is no longer open.</p></div></div></div>` : ''}
            ${isCompleted ? `<div class="em-card mb-3"><div class="em-section-head"><div><h3 class="em-section-title">Event completed</h3><p class="em-section-sub">Completion controls are hidden because this event has already been closed.</p></div></div></div>` : ''}

            <div class="em-danger-card">
                <p class="em-danger-title">Delete event permanently</p>
                <p class="em-danger-sub">Removes the event and ALL associated data: RSVPs, check-ins, raffle entries, documents, photos. You will be asked to type the event title to confirm.</p>
                <button class="em-btn-danger" data-action="delete">Delete event</button>
            </div>
        `;
    }

    function _wireOverview() {
        const e = STATE.event;
        if (!e) return;
        // Render venue QR if present
        const canvas = document.getElementById('emVenueQR');
        if (canvas && e.venue_qr_token && typeof QRCode !== 'undefined') {
            QRCode.toCanvas(canvas, `${window.location.origin}/events/?e=${encodeURIComponent(e.slug || '')}&checkin=1`, { width: 200, margin: 2 });
        }
        document.getElementById('emSheetContent').querySelectorAll('[data-overview-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                STATE.activeTab = btn.dataset.overviewTab;
                _renderTabs();
                _renderTab(STATE.activeTab);
            });
        });
    }

    function _wireDanger() {
        document.getElementById('emSheetContent').querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => _runDangerAction(btn.dataset.action));
        });
    }

    async function _runDangerAction(action) {
        const e = STATE.event;
        if (!e) return;

        if (action === 'delete') {
            const typed = prompt(`Type the event title to permanently delete:\n\n"${e.title}"`);
            if (!typed || typed.trim() !== e.title.trim()) {
                if (typed !== null) alert('Title did not match. Deletion cancelled.');
                return;
            }
            try {
                const { error } = await supabaseClient.from('events').delete().eq('id', e.id);
                if (error) throw error;
                alert('Event deleted.');
                close();
                _notifyParent('deleted', e.id);
            } catch (err) {
                alert('Delete failed: ' + (err.message || 'unknown error'));
            }
            return;
        }

        if (action === 'cancel') {
            if (!confirm(`Mark "${e.title}" as cancelled?`)) return;
            try {
                const { error } = await supabaseClient.from('events').update({ status: 'cancelled' }).eq('id', e.id);
                if (error) throw error;
                STATE.event.status = 'cancelled';
                _renderHeader();
                _renderTab('danger');
                _notifyParent('updated', e.id);
            } catch (err) {
                alert('Cancel failed: ' + (err.message || 'unknown error'));
            }
            return;
        }

        if (action === 'complete') {
            if (!confirm(`Mark "${e.title}" as completed?`)) return;
            try {
                const { error } = await supabaseClient.from('events').update({ status: 'completed' }).eq('id', e.id);
                if (error) throw error;
                STATE.event.status = 'completed';
                _renderHeader();
                _renderTab('danger');
                _notifyParent('updated', e.id);
            } catch (err) {
                alert('Complete failed: ' + (err.message || 'unknown error'));
            }
        }
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

    // ═══════════════════════════════════════════════════════════════
    // M3b — MONEY TAB
    // ═══════════════════════════════════════════════════════════════
    async function _loadMoney() {
        const eventId = STATE.eventId;
        const [rsvpsRes, guestRes, raffleRes, poolRes] = await Promise.all([
            supabaseClient
                .from('event_rsvps')
                .select('id, user_id, status, amount_paid_cents, paid, refunded, refund_amount_cents, stripe_payment_intent_id, profiles!event_rsvps_user_id_fkey(first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId),
            supabaseClient
                .from('event_guest_rsvps')
                .select('id, guest_name, guest_email, status, paid, amount_paid_cents, stripe_payment_intent_id')
                .eq('event_id', eventId),
            supabaseClient
                .from('event_raffle_entries')
                .select('id, paid, amount_paid_cents')
                .eq('event_id', eventId),
            supabaseClient
                .from('prize_pool_contributions')
                .select('id, amount_cents')
                .eq('event_id', eventId),
        ]);
        return {
            rsvps:    rsvpsRes.data    || [],
            guests:   guestRes.data    || [],
            raffle:   raffleRes.data   || [],
            poolPays: poolRes.data     || [],
        };
    }

    function _moneyHtml() {
        const d = STATE.tabData.money;
        const isPaidEvent = STATE.event?.pricing_mode === 'paid' || Number(STATE.event?.rsvp_cost_cents || 0) > 0;
        const paidRsvps = d.rsvps.filter(r => r.paid);
        const paidGuests = d.guests.filter(g => g.paid);
        const refundedRsvps = d.rsvps.filter(r => r.refunded);
        const unpaidGoing = isPaidEvent ? STATE.rsvps.filter(r => r.status === 'going' && !r.paid).length + STATE.guestRsvps.filter(g => g.status === 'going' && !g.paid).length : 0;

        const rsvpRevenue   = paidRsvps.reduce((s, r) => s + (r.amount_paid_cents || 0), 0);
        const guestRevenue  = paidGuests.reduce((s, g) => s + (g.amount_paid_cents || 0), 0);
        const raffleRevenue = d.raffle.filter(e => e.paid).reduce((s, e) => s + (e.amount_paid_cents || 0), 0);
        const poolRevenue   = d.poolPays.reduce((s, p) => s + (p.amount_cents || 0), 0);
        const refunded      = refundedRsvps.reduce((s, r) => s + (r.refund_amount_cents || 0), 0);
        const grossRevenue  = rsvpRevenue + guestRevenue + raffleRevenue + poolRevenue;
        const netRevenue    = grossRevenue - refunded;

        const fmt = window.formatCurrency || _money;
        const ticketLabel = isPaidEvent ? 'Paid RSVPs' : 'Ticketed RSVPs';

        function paymentRow({ name, sub, amount, refundedAmount, stripeId, avatarHtml, isGuest }) {
            const refundPill = refundedAmount
                ? `<span class="em-pill em-pill-not">Refunded ${fmt(refundedAmount)}</span>`
                : `<span class="em-pill em-pill-paid">${amount > 0 ? `Paid ${fmt(amount)}` : 'Ticketed'}</span>`;
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar"${isGuest ? ' style="background:#fef3c7;color:#92400e"' : ''}>${avatarHtml}</div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${_esc(name)}</p>
                        <p class="em-attendee-sub">${_esc(sub)}</p>
                        <div class="flex flex-wrap gap-1 mt-2">${refundPill}${isGuest ? '<span class="em-pill em-pill-going">Guest</span>' : ''}</div>
                    </div>
                    ${stripeId ? `<a href="https://dashboard.stripe.com/payments/${encodeURIComponent(stripeId)}" target="_blank" rel="noopener" class="text-xs text-brand-600 font-semibold hover:underline whitespace-nowrap">Stripe ↗</a>` : ''}
                </div>`;
        }

        const memberRows = paidRsvps.map(r => {
            const p = r.profiles || {};
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
            const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?';
            const avatar = p.profile_picture_url ? `<img src="${_esc(p.profile_picture_url)}" alt="">` : `<span>${initials}</span>`;
            return paymentRow({ name, sub: 'Member RSVP payment', amount: r.amount_paid_cents || 0, refundedAmount: r.refund_amount_cents || 0, stripeId: r.stripe_payment_intent_id, avatarHtml: avatar });
        });
        const guestRows = paidGuests.map(g => paymentRow({
            name: g.guest_name || 'Guest',
            sub: g.guest_email || 'Public guest payment',
            amount: g.amount_paid_cents || 0,
            refundedAmount: 0,
            stripeId: g.stripe_payment_intent_id,
            avatarHtml: `<span>${_esc((g.guest_name || 'G').slice(0, 1).toUpperCase())}</span>`,
            isGuest: true,
        }));
        const paymentRows = [...memberRows, ...guestRows].join('') || `<p class="text-xs text-gray-400 italic py-2">No paid RSVPs yet.</p>`;

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Money command</p>
                <h3 class="em-command-title">${fmt(netRevenue)} net collected</h3>
                <p class="em-command-copy">${grossRevenue ? `${fmt(grossRevenue)} gross across RSVP, guest, raffle, and prize-pool activity.` : (isPaidEvent ? 'No paid activity has landed yet.' : 'This free event has no RSVP revenue to collect.')} ${unpaidGoing ? `${unpaidGoing} going attendee${unpaidGoing === 1 ? '' : 's'} still show unpaid.` : (isPaidEvent ? 'No unpaid going attendees are currently flagged.' : 'Ticketed attendees are tracked for access and check-in.')}</p>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Gross</span><strong>${fmt(grossRevenue)}</strong><small>All sources</small></div>
                <div class="em-metric"><span>Net</span><strong>${fmt(netRevenue)}</strong><small>After refunds</small></div>
                <div class="em-metric"><span>Refunded</span><strong>${fmt(refunded)}</strong><small>${refundedRsvps.length} member RSVP${refundedRsvps.length === 1 ? '' : 's'}</small></div>
                <div class="em-metric"><span>${ticketLabel}</span><strong>${paidRsvps.length + paidGuests.length}</strong><small>${paidRsvps.length} member · ${paidGuests.length} guest</small></div>
            </div>

            <div class="em-money-layout">
                <div class="em-card">
                    <div class="em-section-head"><div><h3 class="em-section-title">${isPaidEvent ? 'Paid attendees' : 'Ticketed attendees'} <span class="text-gray-400 font-normal">· ${paidRsvps.length + paidGuests.length}</span></h3><p class="em-section-sub">${isPaidEvent ? 'Member and public guest RSVP payments.' : 'Members and public guests with issued event tickets.'}</p></div></div>
                    ${paymentRows}
                </div>

                <div class="em-card">
                    <div class="em-section-head"><div><h3 class="em-section-title">Revenue sources</h3><p class="em-section-sub">Quick audit of how money entered this event.</p></div></div>
                    <div class="em-money-row"><span>Member RSVP payments</span><strong>${fmt(rsvpRevenue)}</strong></div>
                    <div class="em-money-row"><span>Guest RSVP payments</span><strong>${fmt(guestRevenue)}</strong></div>
                    <div class="em-money-row"><span>Raffle entries</span><strong>${fmt(raffleRevenue)}</strong></div>
                    <div class="em-money-row"><span>Prize-pool contributions</span><strong>${fmt(poolRevenue)}</strong></div>
                    <div class="em-money-row"><span>Refunds recorded</span><strong>${fmt(refunded)}</strong></div>
                    <p class="text-xs text-gray-400 mt-3">Refunds are still handled through Stripe/dashboard tooling. This panel keeps the host-facing audit trail together.</p>
                </div>
            </div>
        `;
    }

    function _wireMoney() { /* read-only in M3b */ }

    // ═══════════════════════════════════════════════════════════════
    // M3b — DOCS TAB
    // ═══════════════════════════════════════════════════════════════
    async function _loadDocs() {
        const { data, error } = await supabaseClient
            .from('event_documents')
            .select('id, doc_type, label, file_name, file_size_bytes, file_path, distributed, target_user_id, created_at, profiles:target_user_id(first_name, last_name, profile_picture_url)')
            .eq('event_id', STATE.eventId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return { docs: data || [] };
    }

    function _docTypeIcon(type) {
        return ({
            plane_ticket: '✈️', group_ticket: '🎫', itinerary: '🗺️',
            receipt: '🧾', other: '📄',
        })[type] || '📄';
    }

    function _formatBytes(bytes) {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    function _docsHtml() {
        const docs = STATE.tabData.docs.docs;
        const groupDocs = docs.filter(d => !d.target_user_id);
        const memberDocs = docs.filter(d => d.target_user_id);
        const goingMembers = STATE.rsvps
            .filter(r => r.status === 'going')
            .map(r => {
                const profile = r.profiles || {};
                return {
                    id: r.user_id,
                    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Member',
                };
            });

        const distributedCount = docs.filter(d => d.distributed).length;
        const pendingCount = docs.length - distributedCount;
        const distributedPct = docs.length ? Math.round((distributedCount / docs.length) * 100) : 0;
        const totalBytes = docs.reduce((sum, d) => sum + (d.file_size_bytes || 0), 0);

        function docRow(d) {
            const distBtn = d.distributed
                ? `<button class="em-pill em-pill-checked" data-doc-action="undistribute" data-id="${d.id}" style="border:none;cursor:pointer">Distributed ✓</button>`
                : `<button class="em-pill em-pill-paid" data-doc-action="distribute" data-id="${d.id}" style="border:none;cursor:pointer">Mark sent</button>`;
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar" style="background:#fef3c7;color:#92400e;font-size:16px">${_docTypeIcon(d.doc_type)}</div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${_esc(d.label || d.file_name || 'Document')}</p>
                        <p class="em-attendee-sub">${_esc(d.file_name || '')} · ${_formatBytes(d.file_size_bytes)}</p>
                        <div class="flex flex-wrap gap-1 mt-2">${distBtn}<span class="em-pill em-pill-going">${d.target_user_id ? 'Member file' : 'Group file'}</span></div>
                    </div>
                    <button data-doc-action="delete" data-id="${d.id}" class="text-xs text-red-600 font-semibold hover:underline" style="background:none;border:none;cursor:pointer">Delete</button>
                </div>
            `;
        }

        function memberSection(memberDoc) {
            // Group per-member docs by user
            const byUser = {};
            memberDoc.forEach(d => {
                const uid = d.target_user_id;
                (byUser[uid] = byUser[uid] || { user: d.profiles, docs: [] }).docs.push(d);
            });
            const userList = Object.values(byUser);
            if (!userList.length) return `<p class="text-xs text-gray-400 italic py-2">No per-member documents yet.</p>`;
            return userList.map(u => {
                const p = u.user || {};
                const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
                return `
                    <div style="margin-bottom:14px">
                        <div class="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">${_esc(name)} <span class="text-gray-400 font-normal">· ${u.docs.length}</span></div>
                        ${u.docs.map(docRow).join('')}
                    </div>
                `;
            }).join('');
        }

        const memberOptions = goingMembers.map(m => `<option value="${_esc(m.id)}">${_esc(m.name)}</option>`).join('');
        const typeOptions = DOC_TYPES.map(t => `<option value="${_esc(t.value)}">${_esc(t.label)}</option>`).join('');

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Document handoff</p>
                <h3 class="em-command-title">${pendingCount ? `${pendingCount} document${pendingCount === 1 ? '' : 's'} pending` : 'Documents are caught up'}</h3>
                <p class="em-command-copy">Upload group files or member-specific travel docs here. Attendees only see a retrieval button on the event page.</p>
                <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${distributedPct}%;background:#a7f3d0"></span></div>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Total files</span><strong>${docs.length}</strong><small>${_formatBytes(totalBytes)}</small></div>
                <div class="em-metric"><span>Distributed</span><strong>${distributedCount}</strong><small>${distributedPct}% complete</small></div>
                <div class="em-metric"><span>Pending</span><strong>${pendingCount}</strong><small>Need handoff</small></div>
                <div class="em-metric"><span>Member files</span><strong>${memberDocs.length}</strong><small>${groupDocs.length} group</small></div>
            </div>

            <div class="em-card mb-4">
                <div class="em-section-head"><div><h3 class="em-section-title">Upload document</h3><p class="em-section-sub">Choose who can retrieve this file from the attendee-facing document viewer.</p></div></div>
                <div class="grid sm:grid-cols-2 gap-3">
                    <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Visible to
                        <select id="emDocTargetMode" class="em-input mt-1">
                            <option value="group">Everyone RSVP'd</option>
                            <option value="member">Specific member</option>
                        </select>
                    </label>
                    <label id="emDocMemberWrap" class="text-xs font-bold uppercase tracking-wide text-gray-500 hidden">Member
                        <select id="emDocMember" class="em-input mt-1">
                            ${memberOptions || '<option value="">No RSVP\'d members yet</option>'}
                        </select>
                    </label>
                    <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Label
                        <input id="emDocLabel" type="text" class="em-input mt-1" placeholder="Flight ticket, itinerary, receipt">
                    </label>
                    <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Type
                        <select id="emDocType" class="em-input mt-1">${typeOptions}</select>
                    </label>
                    <label class="text-xs font-bold uppercase tracking-wide text-gray-500 sm:col-span-2">File
                        <input id="emDocFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" class="em-input mt-1">
                    </label>
                </div>
                <div class="flex items-center justify-between gap-3 mt-3">
                    <p class="text-xs text-gray-400">Uploads live here in Manage Event. Members only see a document viewer button on the event page.</p>
                    <button id="emDocUploadBtn" class="em-btn-primary">Upload</button>
                </div>
            </div>

            <div class="em-card mb-3">
                <div class="em-section-head"><div><h3 class="em-section-title">Group documents <span class="text-gray-400 font-normal">· ${groupDocs.length}</span></h3><p class="em-section-sub">Visible to everyone with RSVP access.</p></div></div>
                ${groupDocs.length ? groupDocs.map(docRow).join('') : `<p class="text-xs text-gray-400 italic py-2">No group documents yet.</p>`}
            </div>

            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">Per-member documents <span class="text-gray-400 font-normal">· ${memberDocs.length}</span></h3><p class="em-section-sub">Private files for individual attendees, like tickets or receipts.</p></div></div>
                ${memberSection(memberDocs)}
            </div>
        `;
    }

    function _wireDocs() {
        const targetMode = document.getElementById('emDocTargetMode');
        const memberWrap = document.getElementById('emDocMemberWrap');
        const type = document.getElementById('emDocType');
        if (type) type.value = 'itinerary';
        targetMode?.addEventListener('change', () => {
            memberWrap?.classList.toggle('hidden', targetMode.value !== 'member');
            if (type) type.value = targetMode.value === 'member' ? 'plane_ticket' : 'itinerary';
        });
        document.getElementById('emDocUploadBtn')?.addEventListener('click', _uploadDocFromManage);

        document.getElementById('emSheetContent').querySelectorAll('[data-doc-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.docAction;
                const id = btn.dataset.id;
                if (action === 'delete') {
                    if (!confirm('Delete this document? This cannot be undone.')) return;
                    const doc = STATE.tabData.docs.docs.find(d => d.id === id);
                    if (doc?.file_path) await supabaseClient.storage.from('event-documents').remove([doc.file_path]);
                    const { error } = await supabaseClient.from('event_documents').delete().eq('id', id);
                    if (error) return alert('Delete failed: ' + error.message);
                } else {
                    const { error } = await supabaseClient
                        .from('event_documents')
                        .update({ distributed: action === 'distribute' })
                        .eq('id', id);
                    if (error) return alert('Update failed: ' + error.message);
                }
                STATE.tabData.docs = null;
                _renderTab('docs');
                _notifyParent('updated', STATE.eventId);
            });
        });
    }

    async function _uploadDocFromManage() {
        const btn = document.getElementById('emDocUploadBtn');
        const mode = document.getElementById('emDocTargetMode')?.value || 'group';
        const targetUserId = mode === 'member' ? (document.getElementById('emDocMember')?.value || '') : '';
        const label = (document.getElementById('emDocLabel')?.value || '').trim();
        const docType = document.getElementById('emDocType')?.value || 'other';
        const file = document.getElementById('emDocFile')?.files?.[0];

        if (mode === 'member' && !targetUserId) return alert('Choose a member for this document.');
        if (!label) return alert('Add a document label.');
        if (!file) return alert('Choose a file to upload.');

        btn.disabled = true;
        btn.textContent = 'Uploading...';
        try {
            const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
            const storagePath = `${STATE.eventId}/${targetUserId || 'group'}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
            const { error: uploadErr } = await supabaseClient.storage
                .from('event-documents')
                .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });
            if (uploadErr) throw uploadErr;

            const { error: dbErr } = await supabaseClient
                .from('event_documents')
                .insert({
                    event_id: STATE.eventId,
                    uploaded_by: evtCurrentUser.id,
                    target_user_id: targetUserId || null,
                    doc_type: docType,
                    label,
                    file_path: storagePath,
                    file_name: file.name,
                    file_size_bytes: file.size,
                    mime_type: file.type,
                });
            if (dbErr) throw dbErr;

            STATE.tabData.docs = null;
            _renderTab('docs');
            _notifyParent('updated', STATE.eventId);
        } catch (err) {
            alert('Upload failed: ' + (err.message || err));
        } finally {
            btn.disabled = false;
            btn.textContent = 'Upload';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // M3b — RAFFLE TAB
    // ═══════════════════════════════════════════════════════════════
    async function _loadRaffle() {
        const eventId = STATE.eventId;
        const [entriesRes, winnersRes, guestsRes] = await Promise.all([
            supabaseClient
                .from('event_raffle_entries')
                .select('id, user_id, guest_token, paid, amount_paid_cents, profiles:user_id(first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId),
            supabaseClient
                .from('event_raffle_winners')
                .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId)
                .order('place', { ascending: true }),
            supabaseClient
                .from('event_guest_rsvps')
                .select('guest_token, guest_name, guest_email')
                .eq('event_id', eventId),
        ]);
        return {
            entries: entriesRes.data || [],
            winners: winnersRes.data || [],
            guests: guestsRes.data || [],
        };
    }

    function _ord(n) {
        const s = ['th','st','nd','rd'], v = n % 100;
        return n + (s[(v-20)%10] || s[v] || s[0]);
    }

    function _raffleHtml() {
        const e = STATE.event;
        if (!e.raffle_enabled) {
            return _emptyHtml('Raffle not enabled', 'Enable the raffle on the portal detail page (Edit event → Raffle).');
        }
        const d = STATE.tabData.raffle;
        const fmt = window.formatCurrency || _money;
        const guestByToken = new Map((d.guests || []).map(g => [g.guest_token, g]));
        const eligibleEntries = d.entries.filter(en => en.paid || !e.raffle_entry_cost_cents);
        const memberEntries = eligibleEntries.filter(en => en.user_id);
        const guestEntries = eligibleEntries.filter(en => en.guest_token);
        const raffleConfig = _raffleConfig(e);
        const categories = _raffleCategories(raffleConfig);
        const drawQueue = _raffleDrawQueue(raffleConfig, d.winners);
        const winnersDrawn = d.winners.length;
        const totalPrizes = _raffleTotalWinners(raffleConfig) || e.raffle_winner_count || winnersDrawn;
        const remainingDraws = Math.max(0, totalPrizes - winnersDrawn);
        const allDrawn = totalPrizes > 0 && winnersDrawn >= totalPrizes;
        const canDraw = typeof window.evtOpenRaffleDraw === 'function' && eligibleEntries.length > 0 && !allDrawn;
        const drawPct = totalPrizes ? Math.round((winnersDrawn / totalPrizes) * 100) : 0;

        const winnerRows = d.winners.length ? d.winners.map(w => {
            const p = w.profiles || {};
            const guest = w.guest_token ? guestByToken.get(w.guest_token) : null;
            const name = w.user_id ? (`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member') : (guest?.guest_name || `Guest · ${(w.guest_token || '').slice(0,8)}`);
            const medal = ['🥇','🥈','🥉'][w.place - 1] || `#${w.place}`;
            const choiceHtml = _winnerChoiceHtml(w, raffleConfig, d.winners);
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar" style="background:#faf5ff;color:#7c3aed;font-size:18px">${medal}</div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${_esc(name)}</p>
                        <p class="em-attendee-sub">${_ord(w.place)} place · ${_esc(w.prize_description || 'Prize pending')}</p>
                        <div class="flex flex-wrap gap-1 mt-2">
                            <span class="em-pill em-pill-checked">${w.user_id ? 'Member' : 'Guest'}</span>
                            ${w.selection_status === 'pending_choice' ? '<span class="em-pill em-pill-paid">Needs prize choice</span>' : '<span class="em-pill em-pill-going">Prize assigned</span>'}
                        </div>
                        ${choiceHtml}
                    </div>
                </div>
            `;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No winners drawn yet.</p>`;

        const entryRevenue = eligibleEntries.reduce((s, en) => s + (en.amount_paid_cents || 0), 0);
        const categoryHtml = categories.length ? categories.map(cat => {
            const items = _raffleItems(raffleConfig, cat.id);
            const pendingSlots = drawQueue.filter(slot => slot.category_id === cat.id).length;
            const drawnCount = Math.max(0, (cat.winner_count || 0) - pendingSlots);
            const itemPreview = items.length ? items.slice(0, 3).map(item => `${item.emoji || '🎁'} ${_esc(item.name)}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ') : 'Prize details pending';
            const extraItems = Math.max(0, items.length - 3);
            return `
                <div class="em-card em-op-card">
                    <div class="em-op-head">
                        <div class="min-w-0"><p class="em-op-kicker">Prize group</p><p class="em-op-title">${_esc(cat.label || 'Prize category')}</p></div>
                        <span class="em-op-icon">🎁</span>
                    </div>
                    <p class="em-op-copy">${_drawModeLabel(cat.draw_mode)} · ${drawnCount}/${cat.winner_count || 0} drawn</p>
                    <div class="em-op-progress"><span style="width:${cat.winner_count ? Math.round((drawnCount / cat.winner_count) * 100) : 0}%"></span></div>
                    <p class="em-op-copy">${itemPreview}${extraItems ? `, +${extraItems} more` : ''}</p>
                    <div class="em-op-meta"><span class="em-op-chip">${pendingSlots} left</span><span class="em-op-chip">${items.length} item${items.length === 1 ? '' : 's'}</span></div>
                </div>
            `;
        }).join('') : '';

        const nextSlot = drawQueue[0] || null;
        const nextDrawHtml = !allDrawn ? `
            <div class="em-card mb-4" style="border-color:#ddd6fe;background:#faf5ff">
                <div class="em-section-head">
                    <div>
                        <h3 class="em-section-title">Next draw</h3>
                        <p class="em-section-sub" style="color:#6d28d9">${nextSlot ? _esc(_prizeSlotLabel(nextSlot)) : 'Next available prize'}${nextSlot?.category_label ? ` · ${_esc(nextSlot.category_label)}` : ''}</p>
                    </div>
                    <span class="em-pill em-pill-paid">${remainingDraws} remaining</span>
                </div>
                ${canDraw ? `<button id="emRaffleDrawBtn" type="button" class="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition">Draw next winner</button>` : `<p class="text-xs text-gray-500">${eligibleEntries.length ? 'Draw controls are unavailable on this page.' : 'No valid raffle entries yet.'}</p>`}
            </div>
        ` : '';

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Raffle command</p>
                <h3 class="em-command-title">${allDrawn ? 'All winners drawn' : `${remainingDraws} draw${remainingDraws === 1 ? '' : 's'} remaining`}</h3>
                <p class="em-command-copy">${eligibleEntries.length ? `${eligibleEntries.length} eligible entr${eligibleEntries.length === 1 ? 'y' : 'ies'} across ${memberEntries.length} member and ${guestEntries.length} guest entries.` : 'No eligible raffle entries yet.'} ${nextSlot ? `Next up: ${_esc(_prizeSlotLabel(nextSlot))}.` : ''}</p>
                <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${drawPct}%;background:#a78bfa"></span></div>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Eligible entries</span><strong>${eligibleEntries.length}</strong><small>${memberEntries.length} member · ${guestEntries.length} guest</small></div>
                <div class="em-metric"><span>Revenue</span><strong>${fmt(entryRevenue)}</strong><small>${e.raffle_entry_cost_cents ? 'Paid entries' : 'Free raffle'}</small></div>
                <div class="em-metric"><span>Prizes</span><strong>${totalPrizes || '—'}</strong><small>${categories.length} group${categories.length === 1 ? '' : 's'}</small></div>
                <div class="em-metric"><span>Drawn</span><strong>${winnersDrawn}</strong><small>${drawPct}% complete</small></div>
            </div>

            ${nextDrawHtml}

            <div class="em-money-layout">
                <div>
                    ${categories.length ? `<div class="em-op-grid" style="grid-template-columns:1fr;margin-bottom:12px">${categoryHtml}</div>` : ''}
                    <div class="em-card">
                        <div class="em-section-head"><div><h3 class="em-section-title">Winners <span class="text-gray-400 font-normal">· ${winnersDrawn}${totalPrizes ? '/' + totalPrizes : ''}</span></h3><p class="em-section-sub">Draw results and pending prize choices.</p></div></div>
                        ${winnerRows}
                        ${allDrawn ? `<p class="text-xs text-emerald-600 font-semibold mt-3">All winners drawn ✓</p>` : `<p class="text-xs text-gray-400 mt-3">Draws follow category sort order, starting with the smallest/lower-sort categories.</p>`}
                    </div>
                </div>

                <div class="em-card">
                    <div class="em-section-head"><div><h3 class="em-section-title">Configuration</h3><p class="em-section-sub">Rules currently driving the draw.</p></div></div>
                    <div class="em-money-row"><span>Type</span><strong>${_esc(e.raffle_type || 'digital')}</strong></div>
                    <div class="em-money-row"><span>Draw trigger</span><strong>${_esc(e.raffle_draw_trigger || 'manual')}</strong></div>
                    <div class="em-money-row"><span>Entry cost</span><strong>${e.raffle_entry_cost_cents ? fmt(e.raffle_entry_cost_cents) : 'Free'}</strong></div>
                    <div class="em-money-row"><span>Member entries</span><strong>${memberEntries.length}</strong></div>
                    <div class="em-money-row"><span>Guest entries</span><strong>${guestEntries.length}</strong></div>
                </div>
            </div>
        `;
    }

    function _wireRaffle() {
        const drawBtn = document.getElementById('emRaffleDrawBtn');
        if (drawBtn) {
            drawBtn.onclick = () => window.evtOpenRaffleDraw?.(STATE.eventId, STATE.event);
        }
        document.getElementById('emSheetContent')?.querySelectorAll('[data-raffle-assign-choice]').forEach(btn => {
            btn.onclick = () => _assignWinnerChoice(btn.dataset.winnerId);
        });
    }

    function _winnerChoiceHtml(winner, config, winners) {
        if (winner.selection_status !== 'pending_choice') return '';
        const items = _availableChoiceItems(config, winners, winner);
        if (!items.length) {
            return `<div class="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">No unassigned items are available in this category.</div>`;
        }
        const options = items.map(item => `<option value="${_esc(item.id)}">${_esc(item.emoji || '🎁')} ${_esc(item.name)}${item.quantity > 1 ? ` (${item.quantity} total)` : ''}</option>`).join('');
        return `
            <div class="mt-3 flex flex-col sm:flex-row gap-2">
                <select id="emWinnerChoice_${_esc(winner.id)}" class="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200">
                    ${options}
                </select>
                <button type="button" data-raffle-assign-choice="1" data-winner-id="${_esc(winner.id)}" class="rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 text-xs font-bold transition">Assign prize</button>
            </div>
        `;
    }

    function _availableChoiceItems(config, winners, currentWinner) {
        const items = _raffleItems(config, currentWinner.category_id);
        const used = new Map();
        (winners || []).forEach(winner => {
            if (!winner.prize_id || winner.id === currentWinner.id) return;
            if (winner.selection_status === 'pending_choice') return;
            used.set(winner.prize_id, (used.get(winner.prize_id) || 0) + 1);
        });
        return items.filter(item => (used.get(item.id) || 0) < item.quantity);
    }

    async function _assignWinnerChoice(winnerId) {
        const winner = (STATE.tabData.raffle?.winners || []).find(row => row.id === winnerId);
        if (!winner) return;
        const select = document.getElementById(`emWinnerChoice_${winnerId}`);
        const itemId = select?.value;
        if (!itemId) return alert('Choose a prize item first.');

        const config = _raffleConfig(STATE.event);
        const item = _raffleItems(config, winner.category_id).find(row => row.id === itemId);
        if (!item) return alert('Prize item is no longer available. Refresh and try again.');

        const { error } = await supabaseClient
            .from('event_raffle_winners')
            .update({
                prize_id: item.id,
                prize_description: item.name,
                prize_image_url: item.image_url || null,
                prize_emoji: item.emoji || window.EventsRaffleModel?.DEFAULT_EMOJI || '🎁',
                selection_status: 'assigned',
            })
            .eq('id', winnerId)
            .eq('event_id', STATE.eventId)
            .eq('selection_status', 'pending_choice');
        if (error) return alert('Prize assignment failed: ' + error.message);

        STATE.tabData.raffle = null;
        await _renderTabAsync('raffle', _loadRaffle, _raffleHtml, _wireRaffle);
        document.dispatchEvent(new CustomEvent('events:raffle:drawn', { detail: { eventId: STATE.eventId } }));
    }

    function _raffleConfig(event) {
        if (!window.EventsRaffleModel) return event?.raffle_prizes || [];
        return window.EventsRaffleModel.normalizeConfig(event?.raffle_prizes || []);
    }

    function _raffleCategories(config) {
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getOrderedCategories(config);
    }

    function _raffleItems(config, categoryId) {
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getItemsForCategory(config, categoryId);
    }

    function _raffleTotalWinners(config) {
        if (!window.EventsRaffleModel) return 0;
        return window.EventsRaffleModel.getTotalWinnerCount(config);
    }

    function _raffleDrawQueue(config, winners) {
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getDrawQueue(config, winners || []);
    }

    function _drawModeLabel(drawMode) {
        if (drawMode === 'random_item') return 'Random prize assigned';
        if (drawMode === 'winner_choice') return 'Winner chooses later';
        return 'Specific prize';
    }

    function _prizeSlotLabel(slot) {
        if (!slot) return '';
        if (slot.prize_name) return slot.prize_name;
        if (slot.draw_mode === 'winner_choice') return `${slot.category_label || 'Prize tier'} choice`;
        return slot.category_label || 'Prize';
    }

    function _winnerBelongsToCategory(winner, category, config) {
        if (!winner || !category) return false;
        if (winner.category_id) return winner.category_id === category.id;
        if (winner.category_label) return winner.category_label === category.label;
        const slot = _raffleSlotByPlace(config, winner.place);
        return slot?.category_id === category.id;
    }

    function _raffleSlotByPlace(config, place) {
        if (!window.EventsRaffleModel || place == null) return null;
        return window.EventsRaffleModel.getDrawQueue(config, []).find(slot => Number(slot.place) === Number(place)) || null;
    }

    // ═══════════════════════════════════════════════════════════════
    // M3b — COMPETITION TAB
    // ═══════════════════════════════════════════════════════════════
    async function _loadComp() {
        const eventId = STATE.eventId;
        const [phasesRes, entriesRes, votesRes, winnersRes, contribRes] = await Promise.all([
            supabaseClient.from('competition_phases').select('*').eq('event_id', eventId).order('phase_num', { ascending: true }),
            supabaseClient.from('competition_entries').select('id, user_id, title, moderated, vote_count, profiles:user_id(first_name, last_name)').eq('event_id', eventId),
            supabaseClient.from('competition_votes').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
            supabaseClient.from('competition_winners').select('*, profiles:user_id(first_name, last_name), competition_entries!competition_winners_entry_id_fkey(title)').eq('event_id', eventId).order('place', { ascending: true }),
            supabaseClient.from('prize_pool_contributions').select('amount_cents').eq('event_id', eventId),
        ]);
        return {
            phases:   phasesRes.data   || [],
            entries:  entriesRes.data  || [],
            voteCount: votesRes.count || 0,
            winners:  winnersRes.data  || [],
            contribs: contribRes.data  || [],
        };
    }

    function _compHtml() {
        const e = STATE.event;
        if (e.event_type !== 'competition') {
            return _emptyHtml('Not a competition', 'This is not a competition event. Set event type to "Competition" to use this tab.');
        }
        const d = STATE.tabData.comp;
        const fmt = window.formatCurrency || _money;
        const cfg = e.competition_config || {};
        const liveEntries = d.entries.filter(x => !x.moderated);
        const moderatedCount = d.entries.length - liveEntries.length;
        const poolTotal = (e.total_prize_pool_cents || 0) + d.contribs.reduce((s, c) => s + (c.amount_cents || 0), 0);
        const housePct = Number(cfg.house_pct || 0);
        const netPool  = Math.round(poolTotal * (1 - housePct / 100));
        const activePhase = d.phases.find(ph => ph.status === 'active') || null;
        const entryTarget = Number(cfg.min_entries || 0);
        const entryPct = entryTarget ? Math.min(100, Math.round((liveEntries.length / entryTarget) * 100)) : 100;

        const phaseStatusColor = { pending:'#9ca3af', active:'#4f46e5', completed:'#059669', extended:'#d97706', cancelled:'#dc2626' };
        const phaseRows = d.phases.length ? d.phases.map(ph => {
            const color = phaseStatusColor[ph.status] || '#6b7280';
            const dates = (ph.starts_at || ph.ends_at)
                ? `${ph.starts_at ? new Date(ph.starts_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'} → ${ph.ends_at ? new Date(ph.ends_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}`
                : '';
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar" style="background:${color}22;color:${color};font-weight:900">${ph.phase_num}</div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${_esc(ph.name || 'Competition phase')}</p>
                        <p class="em-attendee-sub">${dates || 'Dates not set'}</p>
                        <div class="flex flex-wrap gap-1 mt-2"><span class="em-pill em-pill-checked" style="background:${color}22;color:${color}">${_esc(ph.status || 'pending')}</span>${ph.extended_once ? '<span class="em-pill em-pill-paid">Extended</span>' : ''}</div>
                    </div>
                </div>
            `;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No phases configured yet.</p>`;

        const winnerRows = d.winners.length ? d.winners.map(w => {
            const p = w.profiles || {};
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
            const entry = w.competition_entries || {};
            const medal = ['🥇','🥈','🥉'][w.place - 1] || `#${w.place}`;
            const payoutBadge = ({
                pending:    '<span class="em-pill em-pill-paid">Pending</span>',
                processing: '<span class="em-pill em-pill-paid">Processing</span>',
                paid:       '<span class="em-pill em-pill-going">Paid</span>',
                failed:     '<span class="em-pill em-pill-not">Failed</span>',
            })[w.payout_status] || '';
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar" style="background:#fef3c7;color:#92400e;font-size:18px">${medal}</div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${_esc(name)}</p>
                        <p class="em-attendee-sub">${_esc(entry.title || 'Winning entry')} · ${fmt(w.prize_amount_cents)}${w.needs_1099 ? ' · 1099 needed' : ''}</p>
                        <div class="flex flex-wrap gap-1 mt-2">${payoutBadge}</div>
                    </div>
                </div>
            `;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No winners finalized yet.</p>`;

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Competition command</p>
                <h3 class="em-command-title">${activePhase ? `Phase ${activePhase.phase_num}: ${_esc(activePhase.name || 'Active')}` : 'Competition setup'}</h3>
                <p class="em-command-copy">${liveEntries.length} live entr${liveEntries.length === 1 ? 'y' : 'ies'}${entryTarget ? ` toward ${entryTarget} minimum` : ''}. ${d.voteCount} vote${d.voteCount === 1 ? '' : 's'} recorded with ${fmt(netPool)} net payout available.</p>
                <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${entryPct}%;background:#a78bfa"></span></div>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Entries</span><strong>${liveEntries.length}</strong><small>${entryTarget ? `${entryPct}% of minimum` : 'No minimum set'}</small></div>
                <div class="em-metric"><span>Votes</span><strong>${d.voteCount}</strong><small>Submitted votes</small></div>
                <div class="em-metric"><span>Pool</span><strong>${fmt(poolTotal)}</strong><small>Gross prize pool</small></div>
                <div class="em-metric"><span>Net payout</span><strong>${fmt(netPool)}</strong><small>${housePct}% house cut</small></div>
            </div>

            <div class="em-card mb-3">
                <div class="em-section-head"><div><h3 class="em-section-title">Phases <span class="text-gray-400 font-normal">· ${d.phases.length}</span></h3><p class="em-section-sub">Timeline and moderation state for the competition.</p></div></div>
                ${phaseRows}
            </div>

            <div class="em-card mb-3">
                <div class="em-section-head"><div><h3 class="em-section-title">Configuration</h3><p class="em-section-sub">Rules currently driving entries, voting, and payouts.</p></div></div>
                <div class="em-money-row"><span>Entry type</span><strong>${_esc(cfg.entry_type || 'any')}</strong></div>
                <div class="em-money-row"><span>Entry fee</span><strong>${cfg.entry_fee_cents ? fmt(cfg.entry_fee_cents) : 'Free'}</strong></div>
                <div class="em-money-row"><span>House cut</span><strong>${housePct}%</strong></div>
                <div class="em-money-row"><span>Voter eligibility</span><strong>${_esc(cfg.voter_eligibility || 'all_members')}</strong></div>
                ${moderatedCount ? `<div class="em-money-row"><span>Moderated entries</span><strong style="color:#dc2626">${moderatedCount}</strong></div>` : ''}
            </div>

            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">Winners <span class="text-gray-400 font-normal">· ${d.winners.length}</span></h3><p class="em-section-sub">Final results and payout status.</p></div></div>
                ${winnerRows}
                <p class="text-xs text-gray-400 mt-3">Phase advancement and winner finalization happen on the portal detail page. Per-tab controls land in M4.</p>
            </div>
        `;
    }

    function _wireComp() { /* read-only in M3b */ }

    // ─── Helpers ────────────────────────────────────────────────────
    function _esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function _money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }

    // ─── Featured toggle (admin only) ───────────────────────────────
    window._emToggleFeatured = async function () {
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
        _renderTab('overview');
        // Notify list view to refresh hero
        document.dispatchEvent(new CustomEvent('events:manage:updated', { detail: { eventId: STATE.event.id } }));
    };

    function refreshRaffle(eventId) {
        if (eventId && eventId !== STATE.eventId) return;
        STATE.tabData.raffle = null;
        if (STATE.activeTab === 'raffle') _renderTab('raffle');
    }

    document.addEventListener('events:raffle:drawn', (evt) => refreshRaffle(evt.detail?.eventId));

    // ─── Public surface ─────────────────────────────────────────────
    window.EventsManage = { open, close, refreshRaffle };

    // Also register on PortalEvents.detail registry (if available)
    if (window.PortalEvents && window.PortalEvents.detail && typeof window.PortalEvents.detail.register === 'function') {
        window.PortalEvents.detail.register('manage', { open, close });
    }
})();
