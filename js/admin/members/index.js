// js/admin/members/index.js
// Members admin page — main entry point.
// Spec: members_001.md §7a (unified data fetch) and §10 P0.3–P0.5.
//
// Responsibilities:
//   - Auth check
//   - loadAllMembers() — single parallel fetch
//   - Stats render (5 tiles)
//   - Tab filtering (client-side)
//   - Member list render (delegates to MemberCards)

(function (global) {
    'use strict';

    const { deriveMemberStatus, deriveAttentionFlags, MEMBER_STATUS } = global.MembersStatus;

    // ── Module state ─────────────────────────────────────────────────────
    const state = {
        members: [],          // EnrichedMember[]
        stats:   null,
        tab:     'all',
        search:  '',
    };

    // Tabs in display order. Counts derive from full unfiltered array.
    const TABS = [
        { key: 'all',                   label: 'All' },
        { key: 'active',                label: 'Active' },
        { key: 'pending',               label: 'Pending' },
        { key: 'past_due',              label: 'Past Due' },
        { key: 'awaiting_subscription', label: 'Awaiting Sub' },
        { key: 'deactivated',           label: 'Deactivated' },
    ];

    // ── Bootstrap ────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        const user = await global.checkAuth({ permission: 'admin.members' });
        if (!user) return;

        _renderTabs();
        _bindEvents();

        if (global.InviteModal && typeof global.InviteModal.init === 'function') {
            global.InviteModal.init();
        }
        if (global.MemberModal && typeof global.MemberModal.init === 'function') {
            global.MemberModal.init();
        }

        await refresh();
    });

    // ── Public API ───────────────────────────────────────────────────────
    async function refresh() {
        try {
            const result = await loadAllMembers();
            state.members = result.members;
            state.stats   = result.stats;
            _renderStats();
            _renderTabCounts();
            _renderMemberList();
            return state.members.length > 0;
        } catch (err) {
            console.error('[members] refresh failed:', err);
            return false;
        }
    }

    // ── Unified data fetch ───────────────────────────────────────────────
    // Returns { members: EnrichedMember[], stats: {...} }
    async function loadAllMembers() {
        // `supabaseClient` is a top-level `const` in js/config.js — it lives in
        // the shared classic-script scope, NOT on window. Reference it directly
        // by name (lexical lookup) rather than via `global.supabaseClient`.
        const sb = supabaseClient;

        const [
            profilesRes,
            subsRes,
            invoicesRes,
            depositsRes,
            memberRolesRes,
            notifPrefsRes,
            creditPointsRes,
            allTimeRpcRes,
        ] = await Promise.all([
            sb.from('profiles').select(
                'id, email, role, is_active, setup_completed, first_name, last_name, ' +
                'birthday, profile_picture_url, payout_enrolled, connect_onboarding_complete, ' +
                'contribution_streak, created_at, updated_at'
            ),
            sb.from('subscriptions').select('user_id, status, current_amount_cents, current_period_end, stripe_subscription_id'),
            sb.from('invoices').select('user_id, amount_paid_cents').eq('status', 'paid'),
            sb.from('manual_deposits').select('member_id, amount_cents'),
            sb.from('member_roles').select('user_id, roles(id, name, color, icon, position, is_system)'),
            sb.from('notification_preferences').select('user_id, push_enabled'),
            sb.from('credit_points_log').select('user_id, points, expires_at'),
            // Canonical All Time total — same RPC used by hub.js, transactions.js,
            // dashboard.js. Do NOT replace with a client-side sum: orphan invoices
            // / deposits (no matching profile row) would silently drop out.
            sb.rpc('get_family_contribution_total'),
        ]);

        if (profilesRes.error) throw profilesRes.error;

        const profiles = profilesRes.data || [];

        // ── Build lookup maps keyed by user_id ───────────────────────────
        const subMap   = {};
        (subsRes.data || []).forEach(s => { subMap[s.user_id] = s; });

        const invMap   = {};
        (invoicesRes.data || []).forEach(i => {
            invMap[i.user_id] = (invMap[i.user_id] || 0) + (i.amount_paid_cents || 0);
        });

        const depMap   = {};
        (depositsRes.data || []).forEach(d => {
            depMap[d.member_id] = (depMap[d.member_id] || 0) + (d.amount_cents || 0);
        });

        const roleMap  = {};
        (memberRolesRes.data || []).forEach(mr => {
            if (!mr.roles) return;
            (roleMap[mr.user_id] = roleMap[mr.user_id] || []).push(mr.roles);
        });
        // Sort each member's roles by position
        Object.keys(roleMap).forEach(uid => {
            roleMap[uid].sort((a, b) => (a.position || 0) - (b.position || 0));
        });

        const notifMap = {};
        (notifPrefsRes.data || []).forEach(n => { notifMap[n.user_id] = n; });

        const now = new Date();
        const cpActive   = {};
        const cpLifetime = {};
        (creditPointsRes.data || []).forEach(cp => {
            const pts = cp.points || 0;
            cpLifetime[cp.user_id] = (cpLifetime[cp.user_id] || 0) + pts;
            const notExpired = !cp.expires_at || new Date(cp.expires_at) > now;
            if (notExpired) cpActive[cp.user_id] = (cpActive[cp.user_id] || 0) + pts;
        });

        // ── Enrich members in a single pass ──────────────────────────────
        const ctx = { now, payoutsEnabled: false }; // payouts globally enabled — Phase 2
        const members = profiles.map(p => {
            const sub = subMap[p.id] || null;
            const status = deriveMemberStatus(p, sub, /* authMeta */ null);
            const attentionFlags = deriveAttentionFlags(p, sub, null, ctx);

            return {
                // Profile fields
                id:                  p.id,
                email:                p.email,
                role:                 p.role,
                is_active:            p.is_active,
                setup_completed:      p.setup_completed,
                first_name:           p.first_name,
                last_name:            p.last_name,
                birthday:             p.birthday,
                profile_picture_url:  p.profile_picture_url,
                payout_enrolled:      p.payout_enrolled,
                contribution_streak:  p.contribution_streak,
                created_at:           p.created_at,

                // Joined data
                subscription:         sub,
                roles:                roleMap[p.id] || [],
                pushEnabled:          !!(notifMap[p.id] && notifMap[p.id].push_enabled),
                creditPointsActive:   cpActive[p.id]   || 0,
                creditPointsLifetime: cpLifetime[p.id] || 0,

                // Derived totals
                monthlyAmountCents:    sub ? (sub.current_amount_cents || 0) : 0,
                totalContributedCents: (invMap[p.id] || 0) + (depMap[p.id] || 0),

                // Derived state
                status,
                attentionFlags,
            };
        });

        // ── Page stats ───────────────────────────────────────────────────
        // Use RPC value for All Time so stats match other admin pages exactly.
        const allTimeRpcCents = (allTimeRpcRes && !allTimeRpcRes.error)
            ? (allTimeRpcRes.data || 0)
            : null;
        const stats = _computeStats(members, now, allTimeRpcCents);

        return { members, stats };
    }

    function _computeStats(members, now, allTimeRpcCents) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let activeCount = 0;
        let needsAttention = 0;
        let fallbackAllTime = 0;
        const totalInvited = members.length;

        members.forEach(m => {
            if (m.status === MEMBER_STATUS.ACTIVE && m.role !== 'admin') activeCount++;
            fallbackAllTime += m.totalContributedCents;
            const hasHighFlag = m.attentionFlags.some(f => global.MembersStatus.HIGH_MED_FLAGS.has(f));
            if (hasHighFlag) needsAttention++;
        });

        // RPC is canonical; per-member sum is only a fallback if the RPC failed.
        const allTimeTotalCents = allTimeRpcCents != null ? allTimeRpcCents : fallbackAllTime;

        // This Month — needs separate fetch (invoice/deposit dates not in card data).
        // Computed lazily after stats render via _loadThisMonthTotal().
        return {
            thisMonthCents:    null,   // populated async
            activeCount,
            allTimeTotalCents,
            totalInvited,
            needsAttention,
            startOfMonth,
        };
    }

    async function _loadThisMonthTotal(startOfMonth) {
        try {
            const sb = supabaseClient;
            const startStr     = startOfMonth.toISOString();
            const startDateStr = startOfMonth.toISOString().split('T')[0];

            const [invRes, depRes] = await Promise.all([
                sb.from('invoices').select('amount_paid_cents, created_at')
                    .eq('status', 'paid').gte('created_at', startStr),
                sb.from('manual_deposits').select('amount_cents, deposit_date')
                    .gte('deposit_date', startDateStr),
            ]);
            const inv = (invRes.data || []).reduce((s, i) => s + (i.amount_paid_cents || 0), 0);
            const dep = (depRes.data || []).reduce((s, d) => s + (d.amount_cents || 0), 0);
            return inv + dep;
        } catch (err) {
            console.error('[members] this-month fetch failed:', err);
            return 0;
        }
    }

    // ── Stats render (5 tiles) ───────────────────────────────────────────
    function _renderStats() {
        const s = state.stats;
        if (!s) return;

        _setText('statActiveCount',   String(s.activeCount));
        _setText('statAllTime',       _money(s.allTimeTotalCents));
        _setText('statTotalInvited',  String(s.totalInvited));
        _setText('statNeedsAttention',String(s.needsAttention));

        // Async — replace skeleton when ready
        _loadThisMonthTotal(s.startOfMonth).then(cents => {
            s.thisMonthCents = cents;
            _setText('statThisMonth', _money(cents));
        });
    }

    // ── Tab UI ───────────────────────────────────────────────────────────
    function _renderTabs() {
        const container = document.getElementById('membersTabs');
        if (!container) return;
        container.innerHTML = TABS.map(t => `
            <button data-tab="${t.key}"
                class="members-tab whitespace-nowrap px-3 py-2 text-sm font-semibold rounded-lg transition
                       text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                ${t.label} <span class="ml-1 text-xs text-gray-400" data-tab-count="${t.key}">0</span>
            </button>
        `).join('');
        _highlightActiveTab();
    }

    function _renderTabCounts() {
        TABS.forEach(t => {
            const count = t.key === 'all'
                ? state.members.length
                : state.members.filter(m => m.status === t.key).length;
            const el = document.querySelector(`[data-tab-count="${t.key}"]`);
            if (el) el.textContent = String(count);
        });
    }

    function _highlightActiveTab() {
        document.querySelectorAll('.members-tab').forEach(btn => {
            const isActive = btn.dataset.tab === state.tab;
            btn.classList.toggle('bg-brand-50',     isActive);
            btn.classList.toggle('text-brand-700',  isActive);
            btn.classList.toggle('text-gray-500',   !isActive);
        });
    }

    // ── Member list render ───────────────────────────────────────────────
    function _renderMemberList() {
        const container = document.getElementById('membersListContainer');
        if (!container) return;

        // Defensive — if state.tab is somehow unknown (stale attr, future tab
        // removed), fall back to 'all' rather than rendering an empty list.
        if (!TABS.some(t => t.key === state.tab)) state.tab = 'all';

        const filtered = _applyFilters(state.members, state.tab, state.search);

        if (filtered.length === 0) {
            container.innerHTML = global.MemberCards.renderEmptyState(state.tab);
            return;
        }

        container.innerHTML = filtered.map(m => global.MemberCards.renderCard(m)).join('');
    }

    function _applyFilters(members, tab, search) {
        let arr = members;
        if (tab !== 'all') arr = arr.filter(m => m.status === tab);
        const q = (search || '').trim().toLowerCase();
        if (q) {
            arr = arr.filter(m => {
                const name = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase();
                return (m.email || '').toLowerCase().includes(q) || name.includes(q);
            });
        }
        return arr;
    }

    // ── Event binding ────────────────────────────────────────────────────
    function _bindEvents() {
        // Tab clicks (delegated)
        const tabs = document.getElementById('membersTabs');
        if (tabs) {
            tabs.addEventListener('click', (e) => {
                const btn = e.target.closest('.members-tab');
                if (!btn) return;
                state.tab = btn.dataset.tab;
                _highlightActiveTab();
                _renderMemberList();
            });
        }

        // Card clicks + invite-from-empty-state (delegated on list container)
        const list = document.getElementById('membersListContainer');
        if (list) {
            list.addEventListener('click', (e) => {
                const inviteCta = e.target.closest('[data-action="open-invite"]');
                if (inviteCta) {
                    if (global.InviteModal) global.InviteModal.open();
                    return;
                }
                const card = e.target.closest('[data-action="open-member"]');
                if (card) {
                    const id = card.dataset.memberId;
                    if (global.MemberModal && typeof global.MemberModal.open === 'function') {
                        global.MemberModal.open(id);
                    } else {
                        console.warn('[members] MemberModal not loaded:', id);
                    }
                }
            });
        }
    }

    // ── DOM helpers ──────────────────────────────────────────────────────
    function _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function _money(cents) {
        if (typeof global.formatCurrency === 'function') return global.formatCurrency(cents || 0);
        return '$' + (((cents || 0) / 100).toFixed(2));
    }

    // Expose for invite refresh + debugging
    global.membersPage = { refresh, loadAllMembers, _state: state };
})(window);
