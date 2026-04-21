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
        sort:    'name_asc',          // name_asc | join_desc | join_asc | contribution_desc | last_active_desc
        attentionOnly:    false,      // true when "Needs Attention" tile is active
        bannerDismissed:  false,      // collapsed/dismissed attention banner
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
            _renderAttentionBanner();
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

        // Phase 3 column set (includes username, phone). If migration 083 has
        // not been applied yet the DB returns 42703 — we retry without those
        // columns so the page keeps working pre-migration.
        const PROFILE_COLS_PH3 =
            'id, email, role, is_active, setup_completed, first_name, last_name, ' +
            'birthday, profile_picture_url, payout_enrolled, connect_onboarding_complete, ' +
            'contribution_streak, username, phone, created_at, updated_at';
        const PROFILE_COLS_PH2 =
            'id, email, role, is_active, setup_completed, first_name, last_name, ' +
            'birthday, profile_picture_url, payout_enrolled, connect_onboarding_complete, ' +
            'contribution_streak, created_at, updated_at';

        let profilesRes = await sb.from('profiles').select(PROFILE_COLS_PH3);
        if (profilesRes.error && profilesRes.error.code === '42703') {
            console.warn('[members] username/phone columns missing — apply migration 083 to enable Settings tab edits.');
            profilesRes = await sb.from('profiles').select(PROFILE_COLS_PH2);
        }
        if (profilesRes.error) throw profilesRes.error;

        const [
            subsRes,
            invoicesRes,
            depositsRes,
            memberRolesRes,
            notifPrefsRes,
            creditPointsRes,
            allTimeRpcRes,
            authMetaRes,
        ] = await Promise.all([
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
            // Phase 3: auth metadata (last_sign_in_at, email_confirmed_at) for every
            // user. Admin-only RPC (migration 084). If it fails (older DB), every
            // member falls back to authMeta=null and status derivation still works.
            sb.rpc('admin_user_auth_meta'),
        ]);

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

        // Phase 3: authMeta map keyed by user_id. Shape consumed by
        // deriveMemberStatus / deriveAttentionFlags:
        //   { confirmed_at, last_sign_in_at, invited_at }
        // We map invited_at ← user_created_at when not yet confirmed (Supabase
        // doesn't expose a separate invited_at; the auth.users row is created
        // when the invite is sent).
        const authMetaMap = {};
        if (authMetaRes && !authMetaRes.error && Array.isArray(authMetaRes.data)) {
            authMetaRes.data.forEach(a => {
                authMetaMap[a.user_id] = {
                    confirmed_at:    a.email_confirmed_at,
                    last_sign_in_at: a.last_sign_in_at,
                    invited_at:      a.email_confirmed_at ? null : a.user_created_at,
                };
            });
        } else if (authMetaRes && authMetaRes.error) {
            console.warn('[members] admin_user_auth_meta unavailable:', authMetaRes.error.message);
        }

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
            const authMeta = authMetaMap[p.id] || null;
            const status = deriveMemberStatus(p, sub, authMeta);
            const attentionFlags = deriveAttentionFlags(p, sub, authMeta, ctx);

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
                username:             p.username,
                phone:                p.phone,
                created_at:           p.created_at,

                // Auth metadata (Phase 3) — nullable
                lastSignInAt:         authMeta && authMeta.last_sign_in_at,
                confirmedAt:          authMeta && authMeta.confirmed_at,

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
        const attention = state.attentionOnly;
        document.querySelectorAll('.members-tab').forEach(btn => {
            const isActive = !attention && btn.dataset.tab === state.tab;
            btn.classList.toggle('bg-brand-50',     isActive);
            btn.classList.toggle('text-brand-700',  isActive);
            btn.classList.toggle('text-gray-500',   !isActive);
        });
        const tile = document.getElementById('statNeedsAttentionTile');
        if (tile) {
            tile.classList.toggle('ring-2',           attention);
            tile.classList.toggle('ring-amber-500',   attention);
            tile.classList.toggle('bg-amber-50',      attention);
        }
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
            container.innerHTML = global.MemberCards.renderEmptyState(state.attentionOnly ? 'attention' : state.tab);
            return;
        }

        container.innerHTML = filtered.map(m => global.MemberCards.renderCard(m)).join('');
    }

    function _applyFilters(members, tab, search) {
        let arr = members;
        if (state.attentionOnly) {
            const HIGH_MED = global.MembersStatus.HIGH_MED_FLAGS;
            arr = arr.filter(m => (m.attentionFlags || []).some(f => HIGH_MED.has(f)));
        } else if (tab !== 'all') {
            arr = arr.filter(m => m.status === tab);
        }
        const q = (search || '').trim().toLowerCase();
        if (q) {
            arr = arr.filter(m => {
                const name = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase();
                return (m.email || '').toLowerCase().includes(q) || name.includes(q);
            });
        }
        return _applySort(arr, state.sort);
    }

    function _applySort(arr, sort) {
        const byName = (m) => `${(m.first_name || '').toLowerCase()} ${(m.last_name || '').toLowerCase()}`.trim()
            || (m.email || '').toLowerCase();
        const cmpStr = (a, b) => a < b ? -1 : a > b ? 1 : 0;
        const ts     = (v) => v ? new Date(v).getTime() : 0;
        const sorted = arr.slice();
        switch (sort) {
            case 'join_desc':
                sorted.sort((a, b) => ts(b.created_at) - ts(a.created_at));
                break;
            case 'join_asc':
                sorted.sort((a, b) => ts(a.created_at) - ts(b.created_at));
                break;
            case 'contribution_desc':
                sorted.sort((a, b) => (b.totalContributedCents || 0) - (a.totalContributedCents || 0));
                break;
            case 'last_active_desc':
                sorted.sort((a, b) => ts(b.lastSignInAt) - ts(a.lastSignInAt));
                break;
            case 'name_asc':
            default:
                sorted.sort((a, b) => cmpStr(byName(a), byName(b)));
        }
        return sorted;
    }

    // ── Attention Banner (Spec §6d) ──────────────────────────────────────
    function _renderAttentionBanner() {
        const el = document.getElementById('attentionBanner');
        if (!el) return;
        const HIGH_MED = global.MembersStatus.HIGH_MED_FLAGS;
        const flagged = state.members.filter(m =>
            (m.attentionFlags || []).some(f => HIGH_MED.has(f))
        );
        if (flagged.length === 0) {
            el.classList.add('hidden');
            el.innerHTML = '';
            return;
        }
        el.classList.remove('hidden');

        if (state.bannerDismissed) {
            el.innerHTML = `
                <button type="button" data-action="banner-expand"
                    class="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition">
                    <span class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3l-7.07-12a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z"/>
                        </svg>
                        ${flagged.length} member${flagged.length === 1 ? '' : 's'} need${flagged.length === 1 ? 's' : ''} attention
                    </span>
                    <span class="text-xs">Show ↓</span>
                </button>`;
            return;
        }

        // Group by primary (highest-severity) flag
        const PRIORITY = ['past_due', 'invite_expired', 'onboarding_stalled', 'inactive_90'];
        const groups = {};
        flagged.forEach(m => {
            const primary = PRIORITY.find(p => (m.attentionFlags || []).includes(p)) || (m.attentionFlags || [])[0];
            if (!groups[primary]) groups[primary] = [];
            groups[primary].push(m);
        });

        const ACCENT = {
            past_due:           { bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500',    text: 'text-red-700'    },
            invite_expired:     { bg: 'bg-violet-50',  border: 'border-violet-200',  dot: 'bg-violet-500', text: 'text-violet-700' },
            onboarding_stalled: { bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500',  text: 'text-amber-700'  },
            inactive_90:        { bg: 'bg-gray-100',   border: 'border-gray-200',    dot: 'bg-gray-500',   text: 'text-gray-700'   },
        };

        const sections = PRIORITY.filter(k => groups[k] && groups[k].length).map(key => {
            const list = groups[key];
            const accent = ACCENT[key] || ACCENT.inactive_90;
            const label  = global.MembersStatus.getFlagLabel(key);
            const items  = list.slice(0, 5).map(m => {
                const name = (m.first_name && m.last_name) ? `${m.first_name} ${m.last_name}` : (m.email || 'Unknown');
                return `<li><button type="button" data-action="open-member" data-member-id="${m.id}"
                    class="text-left text-sm font-medium ${accent.text} hover:underline">${_esc(name)}</button></li>`;
            }).join('');
            const more = list.length > 5 ? `<li class="text-xs text-gray-500 italic">+ ${list.length - 5} more</li>` : '';
            return `
                <div class="flex items-start gap-2.5">
                    <span class="mt-1.5 w-2 h-2 rounded-full ${accent.dot} flex-shrink-0"></span>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold uppercase tracking-wider ${accent.text}">${label} <span class="text-gray-500">(${list.length})</span></div>
                        <ul class="mt-1 flex flex-wrap gap-x-3 gap-y-1">${items}${more}</ul>
                    </div>
                </div>`;
        }).join('');

        el.innerHTML = `
            <div class="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3l-7.07-12a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z"/>
                        </svg>
                        <span class="text-sm font-bold text-gray-900">${flagged.length} member${flagged.length === 1 ? '' : 's'} need${flagged.length === 1 ? 's' : ''} attention</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button type="button" data-action="banner-filter"
                            class="text-xs font-semibold px-2.5 py-1 rounded-lg text-amber-800 hover:bg-amber-100">
                            ${state.attentionOnly ? 'Show all' : 'Filter to these'}
                        </button>
                        <button type="button" data-action="banner-dismiss"
                            class="p-1 rounded-md text-amber-700 hover:bg-amber-100" aria-label="Collapse banner">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="space-y-2.5">${sections}</div>
            </div>`;
    }

    function _esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
                state.attentionOnly = false;       // tabs override attention filter
                _highlightActiveTab();
                _renderMemberList();
            });
        }

        // "Needs Attention" stat tile — toggles attention-only filter
        const attentionTile = document.getElementById('statNeedsAttentionTile');
        if (attentionTile) {
            attentionTile.addEventListener('click', () => {
                state.attentionOnly = !state.attentionOnly;
                if (state.attentionOnly) state.bannerDismissed = false;   // re-expand
                _highlightActiveTab();
                _renderAttentionBanner();
                _renderMemberList();
                if (state.attentionOnly) {
                    const banner = document.getElementById('attentionBanner');
                    if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }

        // Attention banner actions (delegated)
        const banner = document.getElementById('attentionBanner');
        if (banner) {
            banner.addEventListener('click', (e) => {
                const dismiss = e.target.closest('[data-action="banner-dismiss"]');
                if (dismiss) {
                    state.bannerDismissed = true;
                    _renderAttentionBanner();
                    return;
                }
                const expand = e.target.closest('[data-action="banner-expand"]');
                if (expand) {
                    state.bannerDismissed = false;
                    _renderAttentionBanner();
                    return;
                }
                const filter = e.target.closest('[data-action="banner-filter"]');
                if (filter) {
                    state.attentionOnly = !state.attentionOnly;
                    _highlightActiveTab();
                    _renderAttentionBanner();
                    _renderMemberList();
                    return;
                }
                const open = e.target.closest('[data-action="open-member"]');
                if (open && global.MemberModal && typeof global.MemberModal.open === 'function') {
                    global.MemberModal.open(open.dataset.memberId);
                }
            });
        }

        // Search input — debounced
        const search = document.getElementById('memberSearchInput');
        const clear  = document.getElementById('memberSearchClear');
        if (search) {
            let t = null;
            search.addEventListener('input', () => {
                if (clear) clear.classList.toggle('hidden', !search.value);
                clearTimeout(t);
                t = setTimeout(() => {
                    state.search = search.value;
                    _renderMemberList();
                }, 120);
            });
        }
        if (clear) {
            clear.addEventListener('click', () => {
                if (search) search.value = '';
                state.search = '';
                clear.classList.add('hidden');
                _renderMemberList();
                if (search) search.focus();
            });
        }

        // Sort select
        const sortSel = document.getElementById('memberSortSelect');
        if (sortSel) {
            sortSel.value = state.sort;
            sortSel.addEventListener('change', () => {
                state.sort = sortSel.value;
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

                // Card overflow menu — handle BEFORE card click so the sheet
                // doesn't open when the user is just opening/using the menu.
                const cardAction = e.target.closest('[data-card-action]');
                if (cardAction) {
                    e.stopPropagation();
                    e.preventDefault();
                    _onCardAction(cardAction, e);
                    return;
                }

                // Click outside any open menu closes it.
                _closeAllCardMenus();

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
        // Esc closes any open card menu.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') _closeAllCardMenus();
        });

        // Phase 4: CSV export of currently-filtered list
        const csvBtn = document.getElementById('exportCsvBtn');
        if (csvBtn) {
            csvBtn.addEventListener('click', () => {
                const rows = _applyFilters(state.members, state.tab, state.search);
                _exportMembersCsv(rows, state.tab);
            });
        }
    }

    // ── Card overflow menu (Spec §6b) ────────────────────────────────────
    function _closeAllCardMenus() {
        document.querySelectorAll('[data-card-menu-list]').forEach(m => {
            m.classList.add('hidden');
            const btn = m.parentElement && m.parentElement.querySelector('[data-card-action="toggle-menu"]');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    }

    function _onCardAction(triggerEl, e) {
        const card = triggerEl.closest('[data-member-id]');
        if (!card) return;
        const memberId = card.dataset.memberId;
        const member   = state.members.find(m => m.id === memberId);
        if (!member) return;
        const action = triggerEl.dataset.cardAction;

        if (action === 'toggle-menu') {
            const menu = triggerEl.parentElement.querySelector('[data-card-menu-list]');
            const willOpen = menu && menu.classList.contains('hidden');
            _closeAllCardMenus();
            if (willOpen) {
                menu.classList.remove('hidden');
                triggerEl.setAttribute('aria-expanded', 'true');
            }
            return;
        }

        // Any other action = close the menu first, then dispatch.
        _closeAllCardMenus();
        if (action === 'copy-email')      _cardCopyEmail(member);
        else if (action === 'resend-invite')   _cardResendInvite(member);
        else if (action === 'deactivate')      _cardSetActive(member, false);
        else if (action === 'reactivate')      _cardSetActive(member, true);
    }

    function _cardCopyEmail(member) {
        if (!member.email) return _toast('No email on file', 'error');
        const writeText = (typeof navigator !== 'undefined' && navigator.clipboard)
            ? navigator.clipboard.writeText.bind(navigator.clipboard)
            : null;
        const ok = () => _toast('Email copied');
        const fail = () => _toast('Copy failed', 'error');
        if (writeText) {
            writeText(member.email).then(ok).catch(fail);
        } else {
            try {
                const ta = document.createElement('textarea');
                ta.value = member.email;
                ta.setAttribute('readonly', '');
                ta.style.position = 'absolute'; ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select(); document.execCommand('copy'); ta.remove();
                ok();
            } catch (_) { fail(); }
        }
    }

    async function _cardResendInvite(member) {
        if (!member.email) return _toast('No email on file', 'error');
        _toast(`Resending invite to ${member.email}…`);
        try {
            const fn = global.callEdgeFunction;
            if (typeof fn !== 'function') throw new Error('callEdgeFunction unavailable');
            const res = await fn('invite-user', { email: member.email, resend: true });
            if (res && res.error) throw res.error;
            _toast('Invite resent');
        } catch (err) {
            console.error('[members] resend failed:', err);
            _toast('Resend failed: ' + (err.message || 'unknown'), 'error');
        }
    }

    async function _cardSetActive(member, makeActive) {
        const verb = makeActive ? 'reactivate' : 'deactivate';
        // Two-step confirm via toast — simpler than building a separate modal.
        // Spec §6f bans native window.confirm; this uses an inline confirm toast.
        _toastConfirm(
            `${makeActive ? 'Reactivate' : 'Deactivate'} ${member.email || 'this member'}?`,
            async () => {
                try {
                    const sb = supabaseClient;
                    const { error } = await sb.from('profiles')
                        .update({ is_active: makeActive }).eq('id', member.id);
                    if (error) throw error;
                    _toast(`Member ${verb}d`);
                    await refresh();
                } catch (err) {
                    console.error(`[members] ${verb} failed:`, err);
                    _toast(`${verb} failed: ` + (err.message || 'unknown'), 'error');
                }
            }
        );
    }

    // Tiny shared toast — non-blocking notification.
    function _toast(msg, kind) {
        let el = document.getElementById('membersToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'membersToast';
            // bottom-24 (96px) clears the mobile bottom-tab-bar; sm:bottom-6 on desktop.
            el.className = 'fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none px-4 w-full max-w-sm flex flex-col items-center';
            document.body.appendChild(el);
        }
        const tone = kind === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-900 text-white';
        const node = document.createElement('div');
        node.className = `pointer-events-auto px-4 py-2 rounded-xl text-sm font-semibold shadow-lg mb-2 ${tone} transition-opacity`;
        node.textContent = msg;
        el.appendChild(node);
        setTimeout(() => { node.style.opacity = '0'; }, 2200);
        setTimeout(() => { node.remove(); }, 2700);
    }

    function _toastConfirm(msg, onConfirm) {
        let el = document.getElementById('membersToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'membersToast';
            el.className = 'fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 w-full max-w-sm flex flex-col items-center';
            document.body.appendChild(el);
        }
        const node = document.createElement('div');
        node.className = 'pointer-events-auto w-full px-4 py-3 rounded-xl text-sm shadow-lg mb-2 bg-white border border-gray-200 flex flex-wrap items-center gap-2 sm:gap-3';
        node.innerHTML = `
            <span class="text-gray-900 font-semibold flex-1 min-w-0">${msg.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</span>
            <button type="button" class="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg" data-act="cancel">Cancel</button>
            <button type="button" class="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg" data-act="confirm">Confirm</button>
        `;
        el.appendChild(node);
        let dismissed = false;
        const dismiss = () => { if (dismissed) return; dismissed = true; node.remove(); };
        node.addEventListener('click', (e) => {
            const a = e.target.closest('[data-act]');
            if (!a) return;
            if (a.dataset.act === 'confirm') { dismiss(); onConfirm(); }
            else dismiss();
        });
        setTimeout(dismiss, 8000);
    }

    // ── CSV export (Phase 4) ─────────────────────────────────────────────
    function _exportMembersCsv(rows, tabKey) {
        const headers = [
            'Name', 'Email', 'Status', 'Role',
            'Monthly $', 'Total $',
            'Subscription status', 'Next bill',
            'Username', 'Phone',
            'Last sign-in', 'Joined',
        ];
        const csvRows = rows.map(m => {
            const name = (m.first_name && m.last_name) ? `${m.first_name} ${m.last_name}` : '';
            const sub  = m.subscription || {};
            const nextBill = sub.current_period_end
                ? new Date(sub.current_period_end).toISOString().slice(0, 10) : '';
            return [
                name,
                m.email || '',
                m.status || '',
                m.role || '',
                m.monthlyAmountCents    ? (m.monthlyAmountCents    / 100).toFixed(2) : '',
                m.totalContributedCents ? (m.totalContributedCents / 100).toFixed(2) : '0.00',
                sub.status || '',
                nextBill,
                m.username || '',
                m.phone    || '',
                m.lastSignInAt ? new Date(m.lastSignInAt).toISOString() : '',
                m.created_at  ? new Date(m.created_at).toISOString().slice(0, 10) : '',
            ];
        });

        const csv = [headers, ...csvRows].map(r => r.map(_csvCell).join(',')).join('\r\n');
        const stamp = new Date().toISOString().slice(0, 10);
        const fname = `members-${tabKey || 'all'}-${stamp}.csv`;
        // Prepend BOM so Excel detects UTF-8 properly.
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = fname;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function _csvCell(value) {
        const s = value == null ? '' : String(value);
        // Quote if it contains a delimiter, quote, or newline. Escape inner quotes
        // by doubling them (RFC 4180). Also defends against CSV injection by
        // prefixing leading =/+/-/@ with a single quote.
        const needsGuard = /^[=+\-@]/.test(s);
        const safe = needsGuard ? `'${s}` : s;
        if (/[",\r\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
        return safe;
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
