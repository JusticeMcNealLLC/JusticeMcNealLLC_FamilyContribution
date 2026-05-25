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
        _clearRafflePrizeImageState();

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
        if (tab === 'danger')   { _renderContent(_dangerHtml()); _wireDanger(); return; }
        // Lazy-loaded M3b tabs:
        if (tab === 'money')    return _renderTabAsync('money',  Money.loadMoney,  Money.moneyHtml,  Money.wireMoney);
        if (tab === 'docs')     return _renderTabAsync('docs',   Docs.loadDocs,   Docs.docsHtml,   Docs.wireDocs);
        if (tab === 'raffle')   return _renderTabAsync('raffle', _loadRaffle, _raffleHtml, _wireRaffle);
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

            <div class="em-danger-card" style="background:#fff7ed;border-color:#fed7aa">
                <p class="em-danger-title" style="color:#9a3412">Reset test participation</p>
                <p class="em-danger-sub" style="color:#7c2d12">Keeps the event, images, date, pricing, location, and public URL. Removes RSVPs, guest RSVPs, check-ins, raffle entries, and drawn raffle winners. This does not refund Stripe payments.</p>
                <button class="em-btn-danger" data-action="reset-participation" style="background:#ea580c">Reset participation</button>
            </div>

            <div class="em-danger-card">
                <p class="em-danger-title">Delete event permanently</p>
                <p class="em-danger-sub">Removes the event and ALL associated data: RSVPs, check-ins, raffle entries, documents, photos. You will be asked to type the event title to confirm.</p>
                <button class="em-btn-danger" data-action="delete">Delete event</button>
            </div>
        `;
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

        if (action === 'reset-participation') {
            await _resetParticipation();
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

    async function _getParticipationResetCounts() {
        const eventId = STATE.eventId;
        const tables = [
            ['member RSVPs', 'event_rsvps'],
            ['guest RSVPs', 'event_guest_rsvps'],
            ['check-ins', 'event_checkins'],
            ['raffle entries', 'event_raffle_entries'],
            ['raffle winners', 'event_raffle_winners'],
        ];
        const results = await Promise.all(tables.map(async ([label, table]) => {
            const { count, error } = await supabaseClient
                .from(table)
                .select('id', { count: 'exact', head: true })
                .eq('event_id', eventId);
            if (error) throw error;
            return { label, table, count: count || 0 };
        }));
        return results;
    }

    async function _resetParticipation() {
        const e = STATE.event;
        if (!e) return;
        let counts = [];
        try {
            counts = await _getParticipationResetCounts();
        } catch (err) {
            alert('Could not load participation counts: ' + (err.message || 'unknown error'));
            return;
        }

        const paidTickets = STATE.rsvps.filter(r => r.paid).length + STATE.guestRsvps.filter(r => r.paid).length;
        const summary = counts.map(item => `${item.count} ${item.label}`).join('\n');
        const typed = prompt(
            `Reset participation for "${e.title}"?\n\nThis will delete:\n${summary}\n\nThe event itself, images, links, pricing, and settings stay in place. Stripe payments are NOT refunded${paidTickets ? ` (${paidTickets} paid RSVP record${paidTickets === 1 ? '' : 's'} found)` : ''}.\n\nType RESET to continue.`
        );
        if (!typed || typed.trim().toUpperCase() !== 'RESET') {
            if (typed !== null) alert('Reset cancelled.');
            return;
        }

        try {
            await callEdgeFunction('manage-event-participation', {
                action: 'reset_participation',
                event_id: e.id,
            });
            await _refreshEventManager('danger');
            alert('Participation reset complete. The event is still intact.');
        } catch (err) {
            alert('Reset failed: ' + (err.message || 'unknown error'));
        }
    }

    async function _removeParticipationPerson(btn) {
        const kind = btn.dataset.removeRsvp;
        const name = btn.dataset.name || (kind === 'guest' ? 'this guest' : 'this member');
        const isPaid = btn.dataset.paid === '1';
        const warning = isPaid ? '\n\nThis was marked paid. Removing the record does not refund Stripe payments.' : '';
        if (!confirm(`Remove ${name} from this event? This also clears their check-in and raffle entry.${warning}`)) return;

        btn.disabled = true;
        btn.textContent = 'Removing...';
        try {
            if (kind === 'guest') {
                const guestToken = btn.dataset.guestToken;
                const rsvpId = btn.dataset.rsvpId;
                if (!guestToken || !rsvpId) throw new Error('Missing guest RSVP details.');
                await callEdgeFunction('manage-event-participation', {
                    action: 'remove_rsvp',
                    event_id: STATE.eventId,
                    kind: 'guest',
                    guest_token: guestToken,
                    rsvp_id: rsvpId,
                });
            } else {
                const userId = btn.dataset.userId;
                if (!userId) throw new Error('Missing member RSVP details.');
                await callEdgeFunction('manage-event-participation', {
                    action: 'remove_rsvp',
                    event_id: STATE.eventId,
                    kind: 'member',
                    user_id: userId,
                });
            }
            await _refreshEventManager('rsvps');
        } catch (err) {
            alert('Remove failed: ' + (err.message || 'unknown error'));
            _renderTab('rsvps');
        }
    }

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
        const raffleEntryPriceDollars = (Number(e.raffle_entry_cost_cents || 0) / 100).toFixed(2);
        const paidEventRaffleIncluded = e.pricing_mode === 'paid';
        const prizeSetupHtml = _rafflePrizeSetupHtml(raffleConfig, d.winners);

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

        const entryRows = eligibleEntries.length ? eligibleEntries.map(en => {
            const p = en.profiles || {};
            const guest = en.guest_token ? guestByToken.get(en.guest_token) : null;
            const name = en.user_id ? (`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member') : (guest?.guest_name || 'Guest');
            const sub = en.user_id ? 'Member raffle entry' : (guest?.guest_email || 'Guest raffle entry');
            const tokenAttr = en.guest_token ? ` data-guest-token="${_esc(en.guest_token)}"` : '';
            const userAttr = en.user_id ? ` data-user-id="${_esc(en.user_id)}"` : '';
            return `<div class="em-attendee-card"><div class="em-avatar" style="background:#f5f3ff;color:#6d28d9"><span>🎟</span></div><div class="em-attendee-main"><p class="em-attendee-name">${_esc(name)}</p><p class="em-attendee-sub">${_esc(sub)}</p><div class="flex flex-wrap gap-1 mt-2"><span class="em-pill em-pill-checked">${en.user_id ? 'Member' : 'Guest'}</span>${en.paid ? '<span class="em-pill em-pill-paid">Paid</span>' : ''}</div></div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-raffle-entry="${_esc(en.id)}"${userAttr}${tokenAttr} data-paid="${en.paid ? '1' : '0'}" data-name="${_esc(name)}">Remove</button></div>`;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No eligible entries yet.</p>`;

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
                    <div style="margin:12px 0;padding:12px;border:1px solid #eef2ff;border-radius:12px;background:#f8fafc">
                        <label for="emRaffleEntryPrice" style="display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Raffle entry price</label>
                        <div style="display:flex;gap:8px;align-items:center">
                            <span style="font-size:13px;font-weight:800;color:#475569">$</span>
                            <input id="emRaffleEntryPrice" class="em-input" type="number" min="0" max="500" step="0.01" value="${_esc(raffleEntryPriceDollars)}" ${paidEventRaffleIncluded ? 'disabled' : ''} style="flex:1;min-width:0">
                            <button id="emRafflePriceSave" type="button" class="em-btn-primary" ${paidEventRaffleIncluded ? 'disabled' : ''}>Save</button>
                        </div>
                        <p id="emRafflePriceStatus" class="text-xs text-gray-400 mt-2">${paidEventRaffleIncluded ? 'Paid RSVP events include raffle entry with the RSVP, so separate raffle pricing is not used.' : 'Set 0 for a free raffle. Changes apply to future raffle checkouts only.'}</p>
                    </div>
                    <div class="em-money-row"><span>Member entries</span><strong>${memberEntries.length}</strong></div>
                    <div class="em-money-row"><span>Guest entries</span><strong>${guestEntries.length}</strong></div>
                </div>

                ${prizeSetupHtml}

                <div class="em-card mt-3">
                    <div class="em-section-head"><div><h3 class="em-section-title">Entries <span class="text-gray-400 font-normal">· ${eligibleEntries.length}</span></h3><p class="em-section-sub">Remove accidental or test raffle entries without deleting the event.</p></div></div>
                    ${entryRows}
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
        document.getElementById('emSheetContent')?.querySelectorAll('[data-remove-raffle-entry]').forEach(btn => {
            btn.onclick = () => _removeRaffleEntry(btn);
        });
        document.getElementById('emRafflePriceSave')?.addEventListener('click', _saveRaffleEntryPrice);
        document.getElementById('emRafflePrizeSave')?.addEventListener('click', () => _saveRafflePrizeSetup());
        document.querySelector('[data-em-raffle-add-category]')?.addEventListener('click', () => _saveRafflePrizeSetup({ addCategory: true }));
        document.querySelector('[data-em-raffle-add-item]')?.addEventListener('click', () => _saveRafflePrizeSetup({ addItem: true }));
        document.querySelectorAll('[data-em-raffle-remove-category]').forEach(btn => {
            btn.addEventListener('click', () => {
                const label = btn.dataset.categoryLabel || 'this category';
                if (confirm(`Remove ${label}? Prize items in this category will move to the first remaining category.`)) {
                    _saveRafflePrizeSetup({ removeCategoryId: btn.dataset.emRaffleRemoveCategory });
                }
            });
        });
        document.querySelectorAll('[data-em-raffle-remove-item]').forEach(btn => {
            btn.addEventListener('click', () => {
                const label = btn.dataset.itemLabel || 'this prize';
                if (confirm(`Remove ${label} from the raffle prize setup? Existing drawn winner records are not deleted.`)) {
                    _saveRafflePrizeSetup({ removeItemId: btn.dataset.emRaffleRemoveItem });
                }
            });
        });
        _wireRafflePrizeImages();
    }

    function _rafflePrizeSetupHtml(config, winners = []) {
        const model = window.EventsRaffleModel;
        if (!model) {
            return `<div class="em-card mt-3"><div class="em-section-head"><div><h3 class="em-section-title">Prize setup</h3><p class="em-section-sub">Raffle editor unavailable because the raffle model helper did not load.</p></div></div></div>`;
        }
        const normalized = model.normalizeConfig(config || []);
        const categories = model.getOrderedCategories(normalized);
        const items = normalized.items || [];
        const validation = model.validateConfig(normalized);
        const categoryOptions = categories.map(category => `<option value="${_esc(category.id)}">${_esc(category.label)}</option>`).join('');
        const usedPrizeIds = new Set((winners || []).map(winner => winner.prize_id).filter(Boolean));
        const drawModeOptions = (selected) => [
            ['specific_item', 'Specific items'],
            ['random_item', 'Random item in category'],
            ['winner_choice', 'Winner chooses later'],
        ].map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');

        const categoryRows = categories.length ? categories.map((category, index) => `
            <div class="em-raffle-edit-row" data-em-raffle-category-row="${_esc(category.id)}" data-sort-order="${(index + 1) * 10}">
                <div>
                    <label class="em-raffle-edit-label">Category</label>
                    <input class="em-input" data-em-raffle-category-field="label" value="${_esc(category.label)}" maxlength="80">
                </div>
                <div>
                    <label class="em-raffle-edit-label">Draw mode</label>
                    <select class="em-input" data-em-raffle-category-field="draw_mode">${drawModeOptions(category.draw_mode)}</select>
                </div>
                <div>
                    <label class="em-raffle-edit-label">Winners</label>
                    <input class="em-input" type="number" min="0" step="1" data-em-raffle-category-field="winner_count" value="${category.winner_count ?? ''}">
                </div>
                <button type="button" class="em-btn-ghost" data-em-raffle-remove-category="${_esc(category.id)}" data-category-label="${_esc(category.label)}" ${categories.length <= 1 ? 'disabled' : ''}>Remove</button>
            </div>
        `).join('') : `<p class="text-xs text-gray-400 italic py-2">No prize categories yet.</p>`;

        const itemRows = items.length ? items.map((item, index) => {
            const previewUrl = RAFFLE_PRIZE_IMAGE_PREVIEWS[item.id] || item.image_url || '';
            const pendingName = RAFFLE_PRIZE_IMAGE_FILES[item.id]?.name || '';
            return `
            <div class="em-raffle-item-wrap" data-em-raffle-item-row="${_esc(item.id)}" data-sort-order="${(index + 1) * 10}" data-image-url="${_esc(item.image_url || '')}">
                <div class="em-raffle-edit-row em-raffle-item-row">
                    <div>
                        <label class="em-raffle-edit-label">Emoji</label>
                        <input class="em-input" data-em-raffle-item-field="emoji" value="${_esc(item.emoji || '🎁')}" maxlength="4">
                    </div>
                    <div>
                        <label class="em-raffle-edit-label">Prize</label>
                        <input class="em-input" data-em-raffle-item-field="name" value="${_esc(item.name)}" maxlength="120">
                    </div>
                    <div>
                        <label class="em-raffle-edit-label">Category</label>
                        <select class="em-input" data-em-raffle-item-field="category_id">
                            ${categories.map(category => `<option value="${_esc(category.id)}" ${item.category_id === category.id ? 'selected' : ''}>${_esc(category.label)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="em-raffle-edit-label">Qty</label>
                        <input class="em-input" type="number" min="1" step="1" data-em-raffle-item-field="quantity" value="${item.quantity || 1}">
                    </div>
                    <button type="button" class="em-btn-ghost" data-em-raffle-remove-item="${_esc(item.id)}" data-item-label="${_esc(item.name)}" ${usedPrizeIds.has(item.id) ? 'disabled title="Already assigned to a winner"' : ''}>Remove</button>
                </div>
                <div class="em-prize-img-row">
                    <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-em-prize-file="${_esc(item.id)}">
                    <div class="em-prize-img-drop" data-em-prize-drop="${_esc(item.id)}" title="Click or drag an image here">
                        ${previewUrl ? `<img src="${_esc(previewUrl)}" alt="Prize image">` : '<span>📷</span>'}
                    </div>
                    <div class="em-prize-img-copy" data-em-prize-copy="${_esc(item.id)}">
                        <strong>${pendingName ? _esc(pendingName) : (previewUrl ? 'Image set' : 'Prize image')}</strong>
                        <span>${previewUrl ? 'Click or drop to replace. Save prize setup to keep changes.' : 'Click or drag a PNG, JPG, or WebP image here.'}</span>
                    </div>
                    ${previewUrl ? `<button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-em-prize-clear="${_esc(item.id)}">Remove image</button>` : ''}
                </div>
            </div>
        `;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No prize items yet. Add a prize before drawing winners.</p>`;

        return `
            <div class="em-card mt-3">
                <style>
                    .em-raffle-edit-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) 88px auto; gap:8px; align-items:end; padding:10px 0; border-top:1px solid #f1f5f9; }
                    .em-raffle-edit-row:first-of-type { border-top:0; padding-top:0; }
                    .em-raffle-item-wrap { padding:10px 0; border-top:1px solid #f1f5f9; }
                    .em-raffle-item-wrap:first-of-type { border-top:0; padding-top:0; }
                    .em-raffle-item-wrap .em-raffle-edit-row { border-top:0; padding:0; }
                    .em-raffle-item-row { grid-template-columns:62px minmax(0,1.2fr) minmax(0,.9fr) 70px auto; }
                    .em-raffle-edit-label { display:block; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8; margin-bottom:5px; }
                    .em-prize-img-row { margin-top:10px; display:flex; align-items:center; gap:9px; }
                    .em-prize-img-drop { width:72px; height:72px; border:2px dashed #d1d5db; border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; color:#9ca3af; background:#fff; flex-shrink:0; }
                    .em-prize-img-drop:hover, .em-prize-img-drop.em-drag-over { border-color:#818cf8; background:#f5f3ff; color:#4f46e5; }
                    .em-prize-img-drop img { width:100%; height:100%; object-fit:cover; display:block; }
                    .em-prize-img-drop span { font-size:19px; }
                    .em-prize-img-copy { flex:1; min-width:0; font-size:11px; color:#6b7280; line-height:1.35; }
                    .em-prize-img-copy strong { display:block; color:#374151; font-size:12px; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                    @media(max-width:700px){ .em-raffle-edit-row, .em-raffle-item-row { grid-template-columns:1fr; } }
                    @media(max-width:520px){ .em-prize-img-row { align-items:flex-start; flex-wrap:wrap; } .em-prize-img-copy { flex-basis:calc(100% - 82px); } }
                </style>
                <div class="em-section-head">
                    <div><h3 class="em-section-title">Prize setup</h3><p class="em-section-sub">Add, edit, or remove raffle prizes after event creation. Existing drawn winners stay in the winner history.</p></div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0">
                    <p class="em-raffle-edit-label" style="margin:0">Categories</p>
                    <button type="button" class="em-btn-ghost" data-em-raffle-add-category>Add category</button>
                </div>
                ${categoryRows}
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 8px;border-top:1px solid #f1f5f9;padding-top:12px">
                    <p class="em-raffle-edit-label" style="margin:0">Prize items</p>
                    <button type="button" class="em-btn-ghost" data-em-raffle-add-item>Add prize</button>
                </div>
                ${itemRows}
                ${validation.valid ? '' : `<div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">${validation.errors.map(_esc).join('<br>')}</div>`}
                <div style="display:flex;align-items:center;gap:10px;margin-top:14px">
                    <button type="button" id="emRafflePrizeSave" class="em-btn-primary">Save prize setup</button>
                    <span id="emRafflePrizeStatus" class="text-xs text-gray-400">${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} · ${items.length} item${items.length === 1 ? '' : 's'}</span>
                </div>
            </div>
        `;
    }

    function _collectRafflePrizeConfigFromDom() {
        const model = window.EventsRaffleModel;
        if (!model) throw new Error('Raffle model helper is not loaded.');
        const categoryRows = Array.from(document.querySelectorAll('[data-em-raffle-category-row]'));
        const itemRows = Array.from(document.querySelectorAll('[data-em-raffle-item-row]'));
        if (!categoryRows.length && !itemRows.length) return model.normalizeConfig(STATE.event?.raffle_prizes || []);
        const categories = categoryRows.map((row, index) => {
            const field = name => row.querySelector(`[data-em-raffle-category-field="${name}"]`)?.value;
            return model.createCategory({
                id: row.dataset.emRaffleCategoryRow,
                label: field('label') || 'Prize Tier',
                draw_mode: field('draw_mode') || 'specific_item',
                winner_count: Math.max(0, Math.floor(Number(field('winner_count')) || 0)),
                sort_order: (index + 1) * 10,
            });
        });
        const fallbackCategory = categories[0]?.id || 'general';
        const categoryIds = new Set(categories.map(category => category.id));
        const items = itemRows.map((row, index) => {
            const field = name => row.querySelector(`[data-em-raffle-item-field="${name}"]`)?.value;
            const categoryId = categoryIds.has(field('category_id')) ? field('category_id') : fallbackCategory;
            return model.createItem({
                id: row.dataset.emRaffleItemRow,
                emoji: field('emoji') || model.DEFAULT_EMOJI || '🎁',
                name: field('name') || 'Prize item',
                category_id: categoryId,
                quantity: Math.max(1, Math.floor(Number(field('quantity')) || 1)),
                image_url: row.dataset.imageUrl || null,
                sort_order: (index + 1) * 10,
            });
        });
        return model.normalizeConfig({ version: 2, categories, items });
    }

    function _wireRafflePrizeImages() {
        document.querySelectorAll('[data-em-prize-drop]').forEach(zone => {
            const itemId = zone.dataset.emPrizeDrop;
            const fileInput = document.querySelector(`[data-em-prize-file="${CSS.escape(itemId)}"]`);
            if (!itemId || !fileInput) return;
            zone.addEventListener('click', () => fileInput.click());
            zone.addEventListener('dragover', event => {
                event.preventDefault();
                zone.classList.add('em-drag-over');
            });
            zone.addEventListener('dragleave', event => {
                if (!zone.contains(event.relatedTarget)) zone.classList.remove('em-drag-over');
            });
            zone.addEventListener('drop', event => {
                event.preventDefault();
                zone.classList.remove('em-drag-over');
                const file = event.dataTransfer?.files?.[0];
                if (file) _setRafflePrizeImage(itemId, file);
            });
            fileInput.addEventListener('change', () => {
                const file = fileInput.files?.[0];
                if (file) _setRafflePrizeImage(itemId, file);
            });
        });
        document.querySelectorAll('[data-em-prize-clear]').forEach(btn => {
            btn.addEventListener('click', () => _clearRafflePrizeImage(btn.dataset.emPrizeClear));
        });
    }

    function _setRafflePrizeImage(itemId, file) {
        if (!file.type.match(/^image\/(png|jpeg|webp)$/)) { alert('Please use a PNG, JPG, or WebP image.'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
        RAFFLE_PRIZE_IMAGE_FILES[itemId] = file;
        const reader = new FileReader();
        reader.onload = () => {
            RAFFLE_PRIZE_IMAGE_PREVIEWS[itemId] = reader.result;
            const zone = document.querySelector(`[data-em-prize-drop="${CSS.escape(itemId)}"]`);
            if (zone) zone.innerHTML = `<img src="${_esc(reader.result)}" alt="Prize image">`;
            const copy = document.querySelector(`[data-em-prize-copy="${CSS.escape(itemId)}"]`);
            if (copy) copy.innerHTML = `<strong>${_esc(file.name)}</strong><span>Ready to upload. Save prize setup to keep this image.</span>`;
            const status = document.getElementById('emRafflePrizeStatus');
            if (status) status.textContent = 'Image selected. Save prize setup to upload it.';
        };
        reader.readAsDataURL(file);
    }

    function _clearRafflePrizeImage(itemId) {
        if (!itemId) return;
        delete RAFFLE_PRIZE_IMAGE_FILES[itemId];
        delete RAFFLE_PRIZE_IMAGE_PREVIEWS[itemId];
        const row = document.querySelector(`[data-em-raffle-item-row="${CSS.escape(itemId)}"]`);
        if (row) row.dataset.imageUrl = '';
        const zone = document.querySelector(`[data-em-prize-drop="${CSS.escape(itemId)}"]`);
        if (zone) zone.innerHTML = '<span>📷</span>';
        const copy = document.querySelector(`[data-em-prize-copy="${CSS.escape(itemId)}"]`);
        if (copy) copy.innerHTML = '<strong>Prize image</strong><span>Image removed. Save prize setup to keep this change.</span>';
        const btn = document.querySelector(`[data-em-prize-clear="${CSS.escape(itemId)}"]`);
        if (btn) btn.remove();
        const status = document.getElementById('emRafflePrizeStatus');
        if (status) status.textContent = 'Image removed. Save prize setup to keep this change.';
    }

    function _clearRafflePrizeImageState() {
        Object.keys(RAFFLE_PRIZE_IMAGE_FILES).forEach(key => delete RAFFLE_PRIZE_IMAGE_FILES[key]);
        Object.keys(RAFFLE_PRIZE_IMAGE_PREVIEWS).forEach(key => delete RAFFLE_PRIZE_IMAGE_PREVIEWS[key]);
    }

    async function _uploadPendingRafflePrizeImages(config) {
        const uploads = Object.entries(RAFFLE_PRIZE_IMAGE_FILES);
        if (!uploads.length) return config;
        const slug = _safeFilename(STATE.event?.slug || STATE.event?.title || STATE.eventId || 'event');
        for (const [itemId, file] of uploads) {
            const item = (config.items || []).find(entry => entry.id === itemId);
            if (!item) continue;
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `${slug}/${itemId}-${Date.now()}.${ext}`;
            const up = await supabaseClient.storage
                .from('event-raffle-prizes')
                .upload(path, file, { contentType: file.type || 'image/jpeg' });
            if (up.error) throw new Error(`Prize image upload failed: ${up.error.message}`);
            item.image_url = supabaseClient.storage.from('event-raffle-prizes').getPublicUrl(path).data.publicUrl;
        }
        _clearRafflePrizeImageState();
        return config;
    }

    async function _saveRafflePrizeSetup(action = {}) {
        const model = window.EventsRaffleModel;
        const status = document.getElementById('emRafflePrizeStatus');
        const saveBtn = document.getElementById('emRafflePrizeSave');
        try {
            if (!model) throw new Error('Raffle model helper is not loaded.');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
            if (status) status.textContent = Object.keys(RAFFLE_PRIZE_IMAGE_FILES).length ? 'Uploading prize images...' : 'Saving prize setup...';
            let config = _collectRafflePrizeConfigFromDom();
            if (action.addCategory) {
                config.categories.push(model.createCategory({ label: 'New Tier', sort_order: (config.categories.length + 1) * 10, winner_count: 1 }));
            }
            if (action.addItem) {
                if (!config.categories.length) config.categories.push(model.createCategory({ id: 'general', label: 'Raffle Prizes', sort_order: 10, winner_count: 1 }));
                const category = config.categories[0];
                config.items.push(model.createItem({ category_id: category.id, name: 'New prize item', sort_order: (config.items.length + 1) * 10 }));
                category.winner_count = Math.max(Number(category.winner_count || 0), _categoryPrizeQuantity(config, category.id));
            }
            if (action.removeCategoryId) {
                if (config.categories.length <= 1) throw new Error('Keep at least one prize category.');
                config.categories = config.categories.filter(category => category.id !== action.removeCategoryId);
                const fallbackCategoryId = config.categories[0]?.id || 'general';
                config.items.forEach(item => { if (item.category_id === action.removeCategoryId) item.category_id = fallbackCategoryId; });
            }
            if (action.removeItemId) {
                const alreadyDrawn = (STATE.tabData.raffle?.winners || []).some(winner => winner.prize_id === action.removeItemId);
                if (alreadyDrawn) throw new Error('This prize is already assigned to a winner and cannot be removed from setup.');
                config.items = config.items.filter(item => item.id !== action.removeItemId);
                delete RAFFLE_PRIZE_IMAGE_FILES[action.removeItemId];
                delete RAFFLE_PRIZE_IMAGE_PREVIEWS[action.removeItemId];
                _capRaffleWinnerCounts(config);
            }
            config = model.normalizeConfig(config);
            config = await _uploadPendingRafflePrizeImages(config);
            const winnerCount = model.getTotalWinnerCount(config);
            if (status) status.textContent = 'Saving prize setup...';
            const { error } = await supabaseClient
                .from('events')
                .update({ raffle_prizes: config, raffle_winner_count: winnerCount })
                .eq('id', STATE.eventId);
            if (error) throw error;
            STATE.event.raffle_prizes = config;
            STATE.event.raffle_winner_count = winnerCount;
            await _refreshEventManager('raffle');
        } catch (err) {
            if (status) status.textContent = 'Save failed: ' + (err.message || 'unknown error');
            else alert('Prize setup save failed: ' + (err.message || 'unknown error'));
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save prize setup'; }
        }
    }

    function _categoryPrizeQuantity(config, categoryId) {
        return (config.items || [])
            .filter(item => item.category_id === categoryId)
            .reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
    }

    function _capRaffleWinnerCounts(config) {
        (config.categories || []).forEach(category => {
            const quantity = _categoryPrizeQuantity(config, category.id);
            category.winner_count = Math.min(Number(category.winner_count || 0), quantity);
        });
    }

    async function _saveRaffleEntryPrice() {
        const input = document.getElementById('emRaffleEntryPrice');
        const btn = document.getElementById('emRafflePriceSave');
        const status = document.getElementById('emRafflePriceStatus');
        const dollars = Number(input?.value || 0);
        if (!Number.isFinite(dollars) || dollars < 0) {
            if (status) status.textContent = 'Enter a price of 0 or higher.';
            input?.focus();
            return;
        }
        if (dollars > 500) {
            if (status) status.textContent = 'Raffle entry price cannot be more than $500.';
            input?.focus();
            return;
        }
        const cents = Math.round(dollars * 100);
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving...';
        }
        if (status) status.textContent = 'Saving raffle price...';
        try {
            const { error } = await supabaseClient
                .from('events')
                .update({ raffle_entry_cost_cents: cents })
                .eq('id', STATE.eventId);
            if (error) throw error;
            STATE.event.raffle_entry_cost_cents = cents;
            await _refreshEventManager('raffle');
        } catch (err) {
            if (status) status.textContent = 'Save failed: ' + (err.message || 'unknown error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Save';
            }
        }
    }

    async function _removeRaffleEntry(btn) {
        const name = btn.dataset.name || 'this entry';
        const isPaid = btn.dataset.paid === '1';
        const warning = isPaid ? '\n\nThis was marked paid. Removing the record does not refund Stripe payments.' : '';
        if (!confirm(`Remove raffle entry for ${name}? Any winner record for this entry will also be removed.${warning}`)) return;
        btn.disabled = true;
        btn.textContent = 'Removing...';
        try {
            await callEdgeFunction('manage-event-participation', {
                action: 'remove_raffle_entry',
                event_id: STATE.eventId,
                entry_id: btn.dataset.removeRaffleEntry,
            });
            STATE.tabData.raffle = null;
            await _renderTabAsync('raffle', _loadRaffle, _raffleHtml, _wireRaffle);
            _notifyParent('updated', STATE.eventId);
        } catch (err) {
            alert('Raffle entry remove failed: ' + (err.message || 'unknown error'));
            STATE.tabData.raffle = null;
            await _renderTabAsync('raffle', _loadRaffle, _raffleHtml, _wireRaffle);
        }
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
    // ─── Helpers ────────────────────────────────────────────────────
    function _safeFilename(value) {
        return String(value || 'event').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'event';
    }

    function _esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function _money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }

    function refreshRaffle(eventId) {
        if (eventId && eventId !== STATE.eventId) return;
        STATE.tabData.raffle = null;
        if (STATE.activeTab === 'raffle') _renderTab('raffle');
    }

    document.addEventListener('events:raffle:drawn', (evt) => refreshRaffle(evt.detail?.eventId));



    window.EventsManageRsvpsApi = {
        getState: () => STATE,
        removeParticipationPerson: _removeParticipationPerson,
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
