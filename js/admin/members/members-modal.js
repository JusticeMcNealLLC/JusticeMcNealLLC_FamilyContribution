// js/admin/members/members-modal.js
// Phase 2: tabbed profile sheet for a single member.
// Spec: members_001.md §5b (Tab Architecture).
//
// Public API:
//   MemberModal.open(memberId)  — opens sheet, renders Overview eagerly
//   MemberModal.close()         — closes sheet, restores focus
//   MemberModal.init()          — binds close handlers (idempotent)
//
// Tabs: Overview | Financials | Roles | Transactions | Settings
// Lazy load: each tab fetches on first activation per member; cached after.

(function (global) {
    'use strict';

    const TABS = ['overview', 'financials', 'roles', 'transactions', 'settings'];
    const TAB_LABELS = {
        overview:     'Overview',
        financials:   'Financials',
        roles:        'Roles',
        transactions: 'Transactions',
        settings:     'Settings',
    };

    // memberCache[memberId] = { financials, roles, transactions, settings }
    const _cache = {};
    const state = {
        memberId:    null,
        currentTab:  'overview',
        initialized: false,
        lastFocus:   null,
    };

    // ── Public ─────────────────────────────────────────────────────────────
    function open(memberId) {
        if (!memberId) return;
        const member = _findMember(memberId);
        if (!member) {
            console.warn('[member-modal] member not found:', memberId);
            return;
        }

        state.memberId   = memberId;
        state.currentTab = 'overview';
        state.lastFocus  = document.activeElement;

        const sheet = document.getElementById('memberSheet');
        if (!sheet) return;

        _renderHeader(member);
        _renderTabBar();
        _renderTabContent('overview', member);

        sheet.classList.remove('hidden');
        sheet.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        const closeBtn = document.getElementById('memberSheetClose');
        if (closeBtn) setTimeout(() => closeBtn.focus(), 50);
    }

    function close() {
        const sheet = document.getElementById('memberSheet');
        if (!sheet) return;
        sheet.classList.add('hidden');
        sheet.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        state.memberId = null;
        if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
            try { state.lastFocus.focus(); } catch (_) { /* noop */ }
        }
    }

    function init() {
        if (state.initialized) return;
        const sheet    = document.getElementById('memberSheet');
        const backdrop = document.getElementById('memberSheetBackdrop');
        const closeBtn = document.getElementById('memberSheetClose');
        const tabBar   = document.getElementById('memberSheetTabs');
        const content  = document.getElementById('memberSheetContent');

        if (closeBtn) closeBtn.addEventListener('click', close);
        if (backdrop) backdrop.addEventListener('click', close);
        if (tabBar) tabBar.addEventListener('click', _onTabClick);
        if (content) content.addEventListener('click', _onContentClick);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sheet && !sheet.classList.contains('hidden')) {
                close();
            }
        });

        state.initialized = true;
    }

    // ── Internals: rendering ───────────────────────────────────────────────
    function _renderHeader(member) {
        const name = _displayName(member);
        const initials = _getInitials(member);
        const avatarCls = _getAvatarColor(member.email);
        const photo = member.profile_picture_url;
        const cfg = (global.MembersStatus.STATUS_CONFIG[member.status] || global.MembersStatus.STATUS_CONFIG.pending);

        const avatarBlock = photo
            ? `<img src="${_esc(photo)}" alt="${_esc(name)}" class="w-14 h-14 rounded-full object-cover border-2 border-white shadow">`
            : `<div class="w-14 h-14 rounded-full flex items-center justify-center font-bold text-base ${avatarCls} border-2 border-white shadow">${_esc(initials)}</div>`;

        const headerEl = document.getElementById('memberSheetHeader');
        if (!headerEl) return;
        headerEl.innerHTML = `
            <div class="flex items-center gap-3 min-w-0 flex-1">
                ${avatarBlock}
                <div class="min-w-0">
                    <div class="text-base font-bold text-gray-900 truncate">${_esc(name)}</div>
                    <div class="text-xs text-gray-500 truncate">${_esc(member.email || '')}</div>
                </div>
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.badgeBg} ${cfg.badgeText} flex-shrink-0">
                ${_esc(cfg.label)}
            </span>
        `;
    }

    function _renderTabBar() {
        const bar = document.getElementById('memberSheetTabs');
        if (!bar) return;
        bar.innerHTML = TABS.map(t => `
            <button data-tab="${t}"
                class="member-sheet-tab whitespace-nowrap px-3 py-2.5 text-sm font-semibold border-b-2 transition
                       ${t === state.currentTab
                           ? 'border-brand-600 text-brand-700'
                           : 'border-transparent text-gray-500 hover:text-gray-900'}">
                ${TAB_LABELS[t]}
            </button>
        `).join('');
    }

    function _renderTabContent(tabKey, member) {
        const content = document.getElementById('memberSheetContent');
        if (!content) return;

        if (tabKey === 'overview')   { content.innerHTML = _renderOverview(member);   return; }
        if (tabKey === 'financials') { content.innerHTML = _renderFinancials(member); return; }
        if (tabKey === 'roles')      { _renderRolesAsync(member, content);            return; }
        if (tabKey === 'transactions') { _renderTransactionsAsync(member, content);   return; }
        if (tabKey === 'settings')   { content.innerHTML = _renderSettings(member);   return; }
    }

    // ── Overview tab (eager — uses already-loaded enriched member) ────────
    function _renderOverview(m) {
        const created = m.created_at ? _formatDate(m.created_at) : '—';
        const monthly = m.monthlyAmountCents ? `${_money(m.monthlyAmountCents)}/mo` : 'No plan';
        const total   = _money(m.totalContributedCents || 0);
        const cpActive   = m.creditPointsActive   || 0;
        const cpLifetime = m.creditPointsLifetime || 0;
        const streak     = m.contribution_streak  || 0;
        const pushOn     = !!m.pushEnabled;
        const payoutOn   = !!m.payout_enrolled;

        const flags = (m.attentionFlags || []).map(f => `
            <li class="flex items-center gap-2 text-sm text-amber-800">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                ${_esc(global.MembersStatus.getFlagLabel(f))}
            </li>
        `).join('');

        const flagsBlock = flags
            ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
                   <div class="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">Attention</div>
                   <ul class="space-y-1">${flags}</ul>
               </div>`
            : '';

        return `
            <div class="space-y-4">
                ${flagsBlock}

                <div class="grid grid-cols-2 gap-3">
                    ${_statCell('Monthly', monthly)}
                    ${_statCell('All Time', total)}
                    ${_statCell('Active Points', String(cpActive), cpLifetime ? `${cpLifetime} lifetime` : '')}
                    ${_statCell('Streak', `${streak} mo`)}
                </div>

                <div class="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                    ${_kvRow('Member since', created)}
                    ${_kvRow('Push notifications', pushOn ? 'Enabled' : 'Off')}
                    ${_kvRow('Payout setup', payoutOn ? 'Complete' : 'Incomplete')}
                    ${_kvRow('Onboarding', m.setup_completed ? 'Complete' : 'In progress')}
                </div>
            </div>
        `;
    }

    // ── Financials tab (uses already-loaded subscription) ─────────────────
    function _renderFinancials(m) {
        const sub = m.subscription;
        if (!sub) {
            return `
                <div class="text-center py-8">
                    <div class="text-sm text-gray-500">No active subscription on file.</div>
                </div>
            `;
        }
        const nextBill = sub.current_period_end ? _formatDate(sub.current_period_end) : '—';
        const status = sub.status || 'unknown';
        const statusCls = status === 'active' ? 'text-emerald-700' :
                          status === 'past_due' ? 'text-red-700' :
                          'text-gray-700';

        return `
            <div class="space-y-4">
                <div class="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                    ${_kvRow('Subscription', `<span class="font-semibold ${statusCls}">${_esc(status)}</span>`, true)}
                    ${_kvRow('Monthly amount', _money(sub.current_amount_cents || 0))}
                    ${_kvRow('Next bill', nextBill)}
                    ${_kvRow('Stripe ID', `<code class="text-[11px] text-gray-500">${_esc(sub.stripe_subscription_id || '—')}</code>`, true)}
                </div>

                <div class="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                    ${_kvRow('Payout enrolled', m.payout_enrolled ? 'Yes' : 'No')}
                </div>
            </div>
        `;
    }

    // ── Roles tab (lazy fetch all roles) ───────────────────────────────────
    async function _renderRolesAsync(m, container) {
        container.innerHTML = _spinnerBlock('Loading roles…');
        let allRoles = _cache[m.id] && _cache[m.id].allRoles;
        try {
            if (!allRoles) {
                const sb = supabaseClient;
                const { data, error } = await sb.from('roles').select('id, name, color, icon, position, is_system').order('position');
                if (error) throw error;
                allRoles = data || [];
                _cache[m.id] = _cache[m.id] || {};
                _cache[m.id].allRoles = allRoles;
            }
        } catch (err) {
            console.error('[member-modal] roles load failed:', err);
            container.innerHTML = _errorBlock('Failed to load roles.');
            return;
        }

        const memberRoleIds = new Set((m.roles || []).map(r => r.id));
        const items = allRoles.map(r => {
            const checked = memberRoleIds.has(r.id) ? 'checked' : '';
            const safeColor = _safeHex(r.color) || '#6366f1';
            return `
                <label class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" class="member-role-toggle w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                        data-role-id="${_esc(r.id)}" ${checked}>
                    <span class="inline-flex items-center gap-1 text-sm font-semibold"
                        style="color:${safeColor}">
                        ${r.icon ? _esc(r.icon) + ' ' : ''}${_esc(r.name)}
                    </span>
                    ${r.is_system ? '<span class="ml-auto text-[10px] uppercase tracking-wider text-gray-400">system</span>' : ''}
                </label>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-3">
                <p class="text-xs text-gray-500">Toggle a role to assign or remove. Changes save instantly.</p>
                <div class="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                    ${items || '<div class="p-4 text-sm text-gray-500">No roles defined.</div>'}
                </div>
                <div id="memberRolesStatus" class="text-xs text-gray-500 h-4"></div>
            </div>
        `;
    }

    // ── Transactions tab (lazy fetch invoices + manual_deposits) ──────────
    async function _renderTransactionsAsync(m, container) {
        container.innerHTML = _spinnerBlock('Loading transactions…');
        let txns = _cache[m.id] && _cache[m.id].transactions;
        try {
            if (!txns) {
                const sb = supabaseClient;
                const [invRes, depRes] = await Promise.all([
                    sb.from('invoices').select('id, amount_paid_cents, created_at, status')
                        .eq('user_id', m.id).eq('status', 'paid').order('created_at', { ascending: false }).limit(40),
                    sb.from('manual_deposits').select('id, amount_cents, deposit_date, notes')
                        .eq('member_id', m.id).order('deposit_date', { ascending: false }).limit(40),
                ]);
                if (invRes.error) throw invRes.error;
                if (depRes.error) throw depRes.error;
                txns = []
                    .concat((invRes.data || []).map(i => ({
                        kind: 'invoice', id: i.id, cents: i.amount_paid_cents, date: i.created_at, note: 'Subscription',
                    })))
                    .concat((depRes.data || []).map(d => ({
                        kind: 'deposit', id: d.id, cents: d.amount_cents, date: d.deposit_date, note: d.notes || 'Manual deposit',
                    })))
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 20);
                _cache[m.id] = _cache[m.id] || {};
                _cache[m.id].transactions = txns;
            }
        } catch (err) {
            console.error('[member-modal] transactions load failed:', err);
            container.innerHTML = _errorBlock('Failed to load transactions.');
            return;
        }

        if (!txns.length) {
            container.innerHTML = '<div class="text-center py-8 text-sm text-gray-500">No transactions yet.</div>';
            return;
        }

        const rows = txns.map(t => {
            const iconBg = t.kind === 'invoice' ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700';
            const icon = t.kind === 'invoice' ? '↻' : '+';
            return `
                <div class="flex items-center gap-3 px-3 py-2.5">
                    <div class="w-8 h-8 rounded-full ${iconBg} flex items-center justify-center font-bold text-sm flex-shrink-0">${icon}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-semibold text-gray-900 truncate">${_esc(t.note)}</div>
                        <div class="text-xs text-gray-500">${_formatDate(t.date)}</div>
                    </div>
                    <div class="text-sm font-semibold text-gray-900">${_money(t.cents || 0)}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                ${rows}
            </div>
            <p class="text-xs text-gray-400 text-center mt-3">Showing ${txns.length} most recent</p>
        `;
    }

    // ── Settings tab ──────────────────────────────────────────────────────
    function _renderSettings(m) {
        const isDeactivated = m.status === global.MembersStatus.MEMBER_STATUS.DEACTIVATED;
        const showResend = !m.setup_completed && !isDeactivated;

        const dangerLabel = isDeactivated ? 'Reactivate Member' : 'Deactivate Member';
        const dangerCls = isDeactivated
            ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
            : 'border-red-300 text-red-700 hover:bg-red-50';
        const dangerAction = isDeactivated ? 'reactivate' : 'deactivate';

        return `
            <div class="space-y-4">
                <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <div class="text-xs font-bold uppercase tracking-wider text-gray-500">Profile fields</div>
                    <div class="opacity-50">
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                        <input type="tel" disabled placeholder="Available after Phase 3 migration"
                            class="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                    </div>
                    <div class="opacity-50">
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                        <input type="text" disabled placeholder="Available after Phase 3 migration"
                            class="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                    </div>
                </div>

                ${showResend ? `
                <div class="bg-white border border-gray-200 rounded-xl p-4">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <div class="text-sm font-semibold text-gray-900">Resend invite</div>
                            <div class="text-xs text-gray-500">Send the setup email again.</div>
                        </div>
                        <button data-action="resend-invite"
                            class="px-3 py-2 text-sm font-semibold text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-50">
                            Resend
                        </button>
                    </div>
                    <div data-resend-status class="text-xs text-gray-500 mt-2 h-4"></div>
                </div>
                ` : ''}

                <div class="bg-white border border-gray-200 rounded-xl p-4">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <div class="text-sm font-semibold text-gray-900">${isDeactivated ? 'Reactivate access' : 'Deactivate member'}</div>
                            <div class="text-xs text-gray-500">${isDeactivated ? 'Restore login + subscription.' : 'Removes access without deleting data.'}</div>
                        </div>
                        <button data-action="${dangerAction}"
                            class="px-3 py-2 text-sm font-semibold border rounded-lg ${dangerCls}">
                            ${dangerLabel}
                        </button>
                    </div>
                    <div data-danger-status class="text-xs text-gray-500 mt-2 h-4"></div>
                </div>
            </div>
        `;
    }

    // ── Event handlers ─────────────────────────────────────────────────────
    function _onTabClick(e) {
        const btn = e.target.closest('.member-sheet-tab');
        if (!btn) return;
        const tab = btn.dataset.tab;
        if (!tab || tab === state.currentTab) return;
        state.currentTab = tab;
        const member = _findMember(state.memberId);
        if (!member) return;
        _renderTabBar();
        _renderTabContent(tab, member);
    }

    async function _onContentClick(e) {
        const member = _findMember(state.memberId);
        if (!member) return;

        // Role toggle
        const roleToggle = e.target.closest('.member-role-toggle');
        if (roleToggle) {
            await _onRoleToggle(member, roleToggle);
            return;
        }

        const action = e.target.closest('[data-action]');
        if (!action) return;
        const kind = action.dataset.action;

        if (kind === 'resend-invite') {
            const status = action.parentElement.parentElement.querySelector('[data-resend-status]');
            await _onResendInvite(member, action, status);
            return;
        }
        if (kind === 'deactivate' || kind === 'reactivate') {
            const status = action.parentElement.parentElement.querySelector('[data-danger-status]');
            await _onToggleActive(member, kind === 'deactivate' ? false : true, action, status);
            return;
        }
    }

    async function _onRoleToggle(member, input) {
        const roleId = input.dataset.roleId;
        const wantAssigned = input.checked;
        const status = document.getElementById('memberRolesStatus');
        input.disabled = true;
        if (status) status.textContent = 'Saving…';
        try {
            const sb = supabaseClient;
            if (wantAssigned) {
                const { error } = await sb.from('member_roles').insert({ user_id: member.id, role_id: roleId });
                if (error) throw error;
            } else {
                const { error } = await sb.from('member_roles')
                    .delete().eq('user_id', member.id).eq('role_id', roleId);
                if (error) throw error;
            }
            // Update local member.roles cache
            if (wantAssigned) {
                const allRoles = (_cache[member.id] && _cache[member.id].allRoles) || [];
                const r = allRoles.find(x => x.id === roleId);
                if (r && !member.roles.find(x => x.id === roleId)) member.roles.push(r);
            } else {
                member.roles = (member.roles || []).filter(x => x.id !== roleId);
            }
            if (status) status.textContent = 'Saved.';
            // Refresh card list so chips update
            if (global.membersPage && typeof global.membersPage.refresh === 'function') {
                global.membersPage.refresh();
            }
        } catch (err) {
            console.error('[member-modal] role toggle failed:', err);
            input.checked = !wantAssigned;
            if (status) status.textContent = 'Failed to save.';
        } finally {
            input.disabled = false;
            setTimeout(() => { if (status) status.textContent = ''; }, 1500);
        }
    }

    async function _onResendInvite(member, btn, status) {
        if (!member.email) { if (status) status.textContent = 'No email on file.'; return; }
        btn.disabled = true;
        if (status) status.textContent = 'Sending…';
        try {
            if (typeof global.callEdgeFunction !== 'function') throw new Error('Edge function helper missing.');
            await global.callEdgeFunction('invite-user', { email: member.email });
            if (status) status.textContent = 'Invite sent.';
        } catch (err) {
            console.error('[member-modal] resend invite failed:', err);
            if (status) status.textContent = (err && err.message) || 'Failed to send.';
        } finally {
            btn.disabled = false;
            setTimeout(() => { if (status) status.textContent = ''; }, 2500);
        }
    }

    async function _onToggleActive(member, makeActive, btn, status) {
        const verb = makeActive ? 'Reactivate' : 'Deactivate';

        // Two-click confirmation (no native window.confirm per spec §6f).
        // First click flips the button label; second click within 4s commits.
        if (btn.dataset.confirming !== '1') {
            const original = btn.innerHTML;
            btn.dataset.confirming = '1';
            btn.dataset.original = original;
            btn.classList.add('ring-2', 'ring-offset-1', 'ring-red-400');
            btn.innerHTML = `Click again to ${verb.toLowerCase()}`;
            if (status) status.textContent = 'Tap again to confirm, or wait to cancel.';
            const t = setTimeout(() => {
                if (btn.dataset.confirming === '1') {
                    btn.dataset.confirming = '';
                    btn.innerHTML = btn.dataset.original || original;
                    btn.classList.remove('ring-2', 'ring-offset-1', 'ring-red-400');
                    if (status) status.textContent = '';
                }
            }, 4000);
            btn.dataset.confirmTimer = String(t);
            return;
        }

        // Confirmed — clear the pending state and commit
        if (btn.dataset.confirmTimer) clearTimeout(Number(btn.dataset.confirmTimer));
        btn.dataset.confirming = '';
        btn.classList.remove('ring-2', 'ring-offset-1', 'ring-red-400');
        btn.innerHTML = btn.dataset.original || btn.innerHTML;

        btn.disabled = true;
        if (status) status.textContent = 'Saving…';
        try {
            const sb = supabaseClient;
            const { error } = await sb.from('profiles').update({ is_active: makeActive }).eq('id', member.id);
            if (error) throw error;
            member.is_active = makeActive;
            if (status) status.textContent = makeActive ? 'Reactivated.' : 'Deactivated.';
            if (global.membersPage && typeof global.membersPage.refresh === 'function') {
                await global.membersPage.refresh();
            }
            // Re-render settings tab so button label flips
            const updated = _findMember(member.id);
            if (updated) {
                const content = document.getElementById('memberSheetContent');
                if (content && state.currentTab === 'settings') {
                    content.innerHTML = _renderSettings(updated);
                }
                _renderHeader(updated);
            }
        } catch (err) {
            console.error('[member-modal] toggle active failed:', err);
            if (status) status.textContent = 'Failed.';
        } finally {
            btn.disabled = false;
            setTimeout(() => { if (status) status.textContent = ''; }, 2000);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    function _findMember(id) {
        if (!id) return null;
        const arr = (global.membersPage && global.membersPage._state && global.membersPage._state.members) || [];
        return arr.find(m => m.id === id) || null;
    }

    function _displayName(m) {
        if (m.first_name && m.last_name) return `${m.first_name} ${m.last_name}`;
        return m.email || 'Unknown';
    }

    function _getInitials(m) {
        if (m.first_name && m.last_name) return (m.first_name[0] + m.last_name[0]).toUpperCase();
        if (m.first_name) return m.first_name.slice(0, 2).toUpperCase();
        const name = (m.email || '??').split('@')[0];
        const parts = name.split(/[._-]/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    }

    function _getAvatarColor(email) {
        const colors = [
            'bg-brand-100 text-brand-700', 'bg-emerald-100 text-emerald-700',
            'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
            'bg-cyan-100 text-cyan-700', 'bg-violet-100 text-violet-700',
            'bg-orange-100 text-orange-700', 'bg-teal-100 text-teal-700',
        ];
        const key = email || '';
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    }

    function _safeHex(v) {
        if (typeof v !== 'string') return null;
        return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ? v : null;
    }

    function _esc(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function _money(cents) {
        if (typeof global.formatCurrency === 'function') return global.formatCurrency(cents || 0);
        return '$' + (((cents || 0) / 100).toFixed(2));
    }

    function _formatDate(s) {
        if (!s) return '—';
        try {
            const d = new Date(s);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (_) { return String(s); }
    }

    function _statCell(label, value, sub) {
        return `
            <div class="bg-white border border-gray-200 rounded-xl p-3">
                <div class="text-[10px] font-bold uppercase tracking-widest text-gray-500">${_esc(label)}</div>
                <div class="text-lg font-extrabold text-gray-900 mt-1">${_esc(value)}</div>
                ${sub ? `<div class="text-[11px] text-gray-500 mt-0.5">${_esc(sub)}</div>` : ''}
            </div>
        `;
    }

    function _kvRow(label, value, isHtml) {
        return `
            <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs font-semibold uppercase tracking-wider text-gray-500">${_esc(label)}</span>
                <span class="text-sm text-gray-900 text-right">${isHtml ? value : _esc(value)}</span>
            </div>
        `;
    }

    function _spinnerBlock(text) {
        return `
            <div class="flex items-center justify-center py-10 text-sm text-gray-500 gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                ${_esc(text)}
            </div>
        `;
    }

    function _errorBlock(text) {
        return `<div class="text-center py-8 text-sm text-red-600">${_esc(text)}</div>`;
    }

    global.MemberModal = { open, close, init };
})(window);
