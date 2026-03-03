// Admin dashboard functionality

document.addEventListener('DOMContentLoaded', async function () {
    // Check admin authentication
    const user = await checkAuth(true);
    if (!user) return;

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIconOpen = document.getElementById('menuIconOpen');
    const menuIconClose = document.getElementById('menuIconClose');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = !mobileMenu.classList.contains('hidden');
            mobileMenu.classList.toggle('hidden');
            menuIconOpen.classList.toggle('hidden', !isOpen);
            menuIconClose.classList.toggle('hidden', isOpen);
        });
    }

    // Logout buttons
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // Load dashboard if on dashboard page
    if (document.getElementById('membersGrid')) {
        await loadAdminDashboard();
    }
});

async function loadAdminDashboard() {
    await Promise.all([
        loadStats(),
        loadMembers(),
        loadPastDue(),
        loadDeactivatedMembers(),
    ]);
}

// ─── Stats ──────────────────────────────────────────────
async function loadStats() {
    try {
        const { data: subscriptions, error: subError } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .in('status', ['active', 'trialing']);

        if (!subError && subscriptions) {
            const el = document.getElementById('activeMemberCount');
            if (el) el.textContent = subscriptions.length;
        }

        const { data: invoices, error: invError } = await supabaseClient
            .from('invoices')
            .select('amount_paid_cents, created_at, status')
            .eq('status', 'paid');

        if (!invError && invoices) {
            const allTimeTotal = invoices.reduce((s, i) => s + (i.amount_paid_cents || 0), 0);
            const el1 = document.getElementById('allTimeTotal');
            if (el1) el1.textContent = formatCurrency(allTimeTotal);

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisMonthTotal = invoices
                .filter(i => new Date(i.created_at) >= startOfMonth)
                .reduce((s, i) => s + (i.amount_paid_cents || 0), 0);
            const el2 = document.getElementById('thisMonthTotal');
            if (el2) el2.textContent = formatCurrency(thisMonthTotal);
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// ─── Helpers ────────────────────────────────────────────
function getInitials(email) {
    const name = email.split('@')[0];
    const parts = name.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(email) {
    const colors = [
        'bg-brand-100 text-brand-700',
        'bg-emerald-100 text-emerald-700',
        'bg-amber-100 text-amber-700',
        'bg-rose-100 text-rose-700',
        'bg-cyan-100 text-cyan-700',
        'bg-violet-100 text-violet-700',
        'bg-orange-100 text-orange-700',
        'bg-teal-100 text-teal-700',
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function getStatusBadge(status) {
    const map = {
        active: 'bg-emerald-100 text-emerald-700',
        trialing: 'bg-blue-100 text-blue-700',
        past_due: 'bg-red-100 text-red-700',
        canceled: 'bg-gray-100 text-gray-600',
    };
    const cls = map[status] || 'bg-gray-100 text-gray-600';
    const label = status || 'No sub';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}">${label}</span>`;
}

// ─── Members ────────────────────────────────────────────
async function loadMembers() {
    const grid = document.getElementById('membersGrid');
    const emptyState = document.getElementById('emptyState');
    const badge = document.getElementById('memberCountBadge');

    try {
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('id, email, role')
            .eq('is_active', true);

        if (error) { console.error('Error loading members:', error); return; }

        if (!profiles || profiles.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        // Show badge count
        if (badge) {
            badge.textContent = profiles.length + ' member' + (profiles.length !== 1 ? 's' : '');
            badge.classList.remove('hidden');
        }

        const { data: subscriptions } = await supabaseClient
            .from('subscriptions')
            .select('user_id, status, current_amount_cents');
        const subMap = {};
        (subscriptions || []).forEach(s => { subMap[s.user_id] = s; });

        const { data: invoiceTotals } = await supabaseClient
            .from('invoices')
            .select('user_id, amount_paid_cents')
            .eq('status', 'paid');
        const totMap = {};
        (invoiceTotals || []).forEach(i => { totMap[i.user_id] = (totMap[i.user_id] || 0) + (i.amount_paid_cents || 0); });

        grid.innerHTML = profiles.map(p => {
            const sub = subMap[p.id];
            const total = totMap[p.id] || 0;
            const isAdmin = p.role === 'admin';
            const initials = getInitials(p.email);
            const avatarCls = getAvatarColor(p.email);

            return `
                <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 card-hover cursor-pointer" onclick="openMemberModal('${p.id}')">
                    <div class="flex items-center gap-3 sm:gap-4">
                        <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarCls}">
                            ${initials}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-sm font-semibold text-gray-900 truncate">${p.email}</span>
                                ${isAdmin ? '<span class="bg-brand-100 text-brand-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">Admin</span>' : ''}
                            </div>
                            <div class="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                <span>${sub?.current_amount_cents ? formatCurrency(sub.current_amount_cents) + '/mo' : 'No plan'}</span>
                                <span class="text-gray-300">&middot;</span>
                                <span>Total: ${formatCurrency(total)}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            ${getStatusBadge(sub?.status)}
                            ${!isAdmin ? `
                                <button onclick="event.stopPropagation(); deactivateUser('${p.id}', '${p.email}')" class="hidden sm:block p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Deactivate">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading members:', err);
    }
}

// ─── Past Due ───────────────────────────────────────────
async function loadPastDue() {
    const section = document.getElementById('pastDueSection');
    const body = document.getElementById('pastDueBody');

    try {
        const { data: pastDue, error } = await supabaseClient
            .from('subscriptions')
            .select(`current_amount_cents, updated_at, profiles ( email )`)
            .eq('status', 'past_due');

        if (error) { console.error('Error loading past due:', error); return; }
        if (!pastDue || pastDue.length === 0) { if (section) section.classList.add('hidden'); return; }

        if (section) section.classList.remove('hidden');

        body.innerHTML = pastDue.map(s => `
            <div class="flex items-center justify-between bg-white rounded-xl p-3 border border-red-100">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span class="text-red-700 font-bold text-xs">${getInitials(s.profiles?.email || 'UK')}</span>
                    </div>
                    <div class="min-w-0">
                        <span class="text-sm font-medium text-red-900 truncate block">${s.profiles?.email || 'Unknown'}</span>
                        <span class="text-xs text-red-600">${formatDate(s.updated_at)}</span>
                    </div>
                </div>
                <span class="text-sm font-bold text-red-700 flex-shrink-0">${formatCurrency(s.current_amount_cents)}/mo</span>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading past due:', err);
    }
}

// ─── Deactivated Members ────────────────────────────────
async function loadDeactivatedMembers() {
    const section = document.getElementById('deactivatedSection');
    const grid = document.getElementById('deactivatedGrid');
    if (!section || !grid) return;

    try {
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('id, email')
            .eq('is_active', false);

        if (error) { console.error('Error loading deactivated:', error); return; }
        if (!profiles || profiles.length === 0) { section.classList.add('hidden'); return; }

        const { data: invoiceTotals } = await supabaseClient
            .from('invoices')
            .select('user_id, amount_paid_cents')
            .eq('status', 'paid');
        const totMap = {};
        (invoiceTotals || []).forEach(i => { totMap[i.user_id] = (totMap[i.user_id] || 0) + (i.amount_paid_cents || 0); });

        section.classList.remove('hidden');
        grid.innerHTML = profiles.map(p => {
            const total = totMap[p.id] || 0;
            const initials = getInitials(p.email);
            return `
                <div class="bg-gray-50 rounded-2xl border border-gray-200 p-4 sm:p-5 opacity-70 hover:opacity-100 transition cursor-pointer" onclick="openMemberModal('${p.id}')">
                    <div class="flex items-center gap-3 sm:gap-4">
                        <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm flex-shrink-0">${initials}</div>
                        <div class="flex-1 min-w-0">
                            <span class="text-sm font-medium text-gray-500 truncate block">${p.email}</span>
                            <span class="text-xs text-gray-400">Total paid: ${formatCurrency(total)}</span>
                        </div>
                        <button onclick="event.stopPropagation(); reactivateUser('${p.id}', '${p.email}')" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition flex-shrink-0">
                            Reactivate
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading deactivated:', err);
    }
}

// ─── Actions ────────────────────────────────────────────
async function deactivateUser(userId, email) {
    if (!confirm(`Deactivate ${email}?\n\nThis will:\n• Cancel their subscription\n• Prevent them from logging in\n• Preserve their payment history`)) return;

    try {
        const result = await callEdgeFunction('deactivate-user', { userId });
        alert(result.message || 'User deactivated successfully');
        await loadAdminDashboard();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function reactivateUser(userId, email) {
    if (!confirm(`Reactivate ${email}?\n\nThey will be able to log in again and set up a new subscription.`)) return;

    try {
        const result = await callEdgeFunction('reactivate-user', { userId });
        alert(result.message || 'User reactivated successfully');
        await loadAdminDashboard();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ─── Member Modal ───────────────────────────────────────
async function openMemberModal(userId) {
    const modal = document.getElementById('memberModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Reset
    document.getElementById('modalAvatar').textContent = '--';
    document.getElementById('modalAvatar').className = 'w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg flex-shrink-0';
    document.getElementById('modalMemberEmail').textContent = 'Loading...';
    document.getElementById('modalMemberRole').textContent = '';
    document.getElementById('modalStatus').innerHTML = getStatusBadge(null);
    document.getElementById('modalAmount').textContent = '$--';
    document.getElementById('modalTotal').textContent = '$--';
    document.getElementById('modalTransactions').innerHTML = '<div class="text-gray-400 text-center py-6 text-sm">Loading...</div>';

    try {
        const { data: profile, error: pErr } = await supabaseClient
            .from('profiles')
            .select('id, email, role, is_active')
            .eq('id', userId)
            .single();
        if (pErr) throw pErr;

        // Set avatar
        const avatar = document.getElementById('modalAvatar');
        avatar.textContent = getInitials(profile.email);
        avatar.className = `w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${getAvatarColor(profile.email)}`;

        document.getElementById('modalMemberEmail').textContent = profile.email;
        document.getElementById('modalMemberRole').textContent = profile.role === 'admin' ? 'Administrator' : 'Member';

        // Subscription
        const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .select('status, current_amount_cents')
            .eq('user_id', userId)
            .single();

        if (subscription) {
            document.getElementById('modalStatus').innerHTML = getStatusBadge(subscription.status);
            document.getElementById('modalAmount').textContent = subscription.current_amount_cents
                ? formatCurrency(subscription.current_amount_cents)
                : 'N/A';
        } else {
            document.getElementById('modalStatus').innerHTML = getStatusBadge(null);
            document.getElementById('modalAmount').textContent = 'N/A';
        }

        // Invoices
        const { data: invoices, error: iErr } = await supabaseClient
            .from('invoices')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (iErr) throw iErr;

        const totalPaid = invoices
            .filter(i => i.status === 'paid')
            .reduce((s, i) => s + (i.amount_paid_cents || 0), 0);
        document.getElementById('modalTotal').textContent = formatCurrency(totalPaid);

        const txEl = document.getElementById('modalTransactions');
        if (!invoices || invoices.length === 0) {
            txEl.innerHTML = `
                <div class="text-gray-400 text-center py-8">
                    <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                    <p class="text-sm">No transactions yet</p>
                </div>
            `;
        } else {
            txEl.innerHTML = invoices.map(inv => `
                <div class="flex items-center justify-between py-2.5 px-3.5 rounded-xl ${inv.status === 'paid' ? 'bg-emerald-50/60' : 'bg-red-50/60'}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center ${inv.status === 'paid' ? 'bg-emerald-100' : 'bg-red-100'}">
                            ${inv.status === 'paid'
                                ? '<svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                                : '<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                            }
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${inv.status === 'paid' ? 'Payment received' : 'Payment ' + inv.status}</div>
                            <div class="text-xs text-gray-500">${formatDate(inv.created_at)}</div>
                        </div>
                    </div>
                    <span class="text-sm font-bold ${inv.status === 'paid' ? 'text-emerald-600' : 'text-red-500'}">
                        ${inv.status === 'paid' ? '+' : ''}${formatCurrency(inv.amount_paid_cents || inv.amount_due_cents || 0)}
                    </span>
                </div>
            `).join('');
        }

    } catch (err) {
        console.error('Error loading member details:', err);
        document.getElementById('modalTransactions').innerHTML = `<div class="text-red-500 text-center py-4 text-sm">Error loading details</div>`;
    }
}

function closeMemberModal() {
    document.getElementById('memberModal').classList.add('hidden');
    document.body.style.overflow = '';
}

// Close on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMemberModal(); });
