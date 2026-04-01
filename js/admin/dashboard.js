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

        // All Time — combined Stripe + manual deposits
        const { data: allTimeTotal, error: rpcErr } = await supabaseClient
            .rpc('get_family_contribution_total');

        if (!rpcErr) {
            const el1 = document.getElementById('allTimeTotal');
            if (el1) el1.textContent = formatCurrency(allTimeTotal || 0);
        }

        // Fee breakdown for All Time stat
        const [netRes, feeRes] = await Promise.all([
            supabaseClient.rpc('get_family_net_total'),
            supabaseClient.rpc('get_total_stripe_fees')
        ]);
        const netTotal = netRes.data || 0;
        const totalFees = feeRes.data || 0;
        const feeEl = document.getElementById('allTimeFeeBreakdown');
        if (feeEl && (netTotal > 0 || totalFees > 0)) {
            feeEl.innerHTML = `Net: <span class="text-emerald-600 font-semibold">${formatCurrency(netTotal)}</span> · Fees: <span class="text-red-500 font-semibold">${formatCurrency(totalFees)}</span>`;
        }

        // This Month — Stripe invoices + manual deposits from current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startStr = startOfMonth.toISOString();

        const [invoiceRes, depositRes] = await Promise.all([
            supabaseClient
                .from('invoices')
                .select('amount_paid_cents, created_at')
                .eq('status', 'paid')
                .gte('created_at', startStr),
            supabaseClient
                .from('manual_deposits')
                .select('amount_cents, deposit_date')
                .gte('deposit_date', startOfMonth.toISOString().split('T')[0])
        ]);

        const monthInvoices = (invoiceRes.data || []).reduce((s, i) => s + (i.amount_paid_cents || 0), 0);
        const monthDeposits = (depositRes.data || []).reduce((s, d) => s + (d.amount_cents || 0), 0);
        const el2 = document.getElementById('thisMonthTotal');
        if (el2) el2.textContent = formatCurrency(monthInvoices + monthDeposits);
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// ─── Helpers ────────────────────────────────────────────
function getInitials(email, firstName, lastName) {
    if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
    if (firstName) return firstName.slice(0, 2).toUpperCase();
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

function getOnboardingBadge(setupCompleted) {
    if (setupCompleted) {
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600" title="Onboarding complete">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            Onboarded
        </span>`;
    }
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600" title="Onboarding incomplete">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01"></path></svg>
        Incomplete
    </span>`;
}

// ─── Members ────────────────────────────────────────────
async function loadMembers() {
    const grid = document.getElementById('membersGrid');
    const emptyState = document.getElementById('emptyState');
    const badge = document.getElementById('memberCountBadge');

    try {
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('id, email, role, first_name, last_name, profile_picture_url, setup_completed')
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

        // Stripe invoice totals
        const { data: invoiceTotals } = await supabaseClient
            .from('invoices')
            .select('user_id, amount_paid_cents')
            .eq('status', 'paid');
        const invMap = {};
        (invoiceTotals || []).forEach(i => { invMap[i.user_id] = (invMap[i.user_id] || 0) + (i.amount_paid_cents || 0); });

        // Manual deposit totals
        const { data: depositTotals } = await supabaseClient
            .from('manual_deposits')
            .select('member_id, amount_cents');
        const depMap = {};
        (depositTotals || []).forEach(d => { depMap[d.member_id] = (depMap[d.member_id] || 0) + (d.amount_cents || 0); });

        // Fetch member roles with role details
        const { data: memberRoles } = await supabaseClient
            .from('member_roles')
            .select('user_id, roles(id, name, color, icon, position, is_system)')
            .order('roles(position)', { ascending: true });
        const roleMap = {};
        (memberRoles || []).forEach(mr => {
            if (!mr.roles) return;
            if (!roleMap[mr.user_id]) roleMap[mr.user_id] = [];
            roleMap[mr.user_id].push(mr.roles);
        });

        grid.innerHTML = profiles.map(p => {
            const sub = subMap[p.id];
            const total = (invMap[p.id] || 0) + (depMap[p.id] || 0);
            const isAdmin = p.role === 'admin';
            const initials = getInitials(p.email, p.first_name, p.last_name);
            const avatarCls = getAvatarColor(p.email);
            const displayName = (p.first_name && p.last_name) ? `${p.first_name} ${p.last_name}` : p.email;
            const hasPhoto = !!p.profile_picture_url;
            const memberRoleList = roleMap[p.id] || [];
            const roleChips = memberRoleList.map(r => {
                const bg = r.color ? `${r.color}20` : '#e0e7ff';
                const fg = r.color || '#4f46e5';
                return `<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style="background:${bg};color:${fg}">${r.icon ? r.icon + ' ' : ''}${r.name}</span>`;
            }).join('');

            return `
                <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 card-hover cursor-pointer" onclick="openMemberModal('${p.id}')">
                    <div class="flex items-center gap-3 sm:gap-4">
                        ${hasPhoto
                            ? `<img src="${p.profile_picture_url}" alt="${displayName}" class="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover flex-shrink-0 border-2 border-gray-100">`
                            : `<div class="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarCls}">${initials}</div>`
                        }
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-sm font-semibold text-gray-900 truncate">${displayName}</span>
                                ${roleChips}
                                ${getOnboardingBadge(p.setup_completed)}
                            </div>
                            ${(p.first_name && p.last_name) ? `<div class="text-xs text-gray-400 truncate">${p.email}</div>` : ''}
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
            .select(`current_amount_cents, updated_at, profiles ( email, first_name, last_name )`)
            .eq('status', 'past_due');

        if (error) { console.error('Error loading past due:', error); return; }
        if (!pastDue || pastDue.length === 0) { if (section) section.classList.add('hidden'); return; }

        if (section) section.classList.remove('hidden');

        body.innerHTML = pastDue.map(s => {
            const pName = (s.profiles?.first_name && s.profiles?.last_name)
                ? `${s.profiles.first_name} ${s.profiles.last_name}`
                : (s.profiles?.email || 'Unknown');
            return `
            <div class="flex items-center justify-between bg-white rounded-xl p-3 border border-red-100">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span class="text-red-700 font-bold text-xs">${getInitials(s.profiles?.email || 'UK', s.profiles?.first_name, s.profiles?.last_name)}</span>
                    </div>
                    <div class="min-w-0">
                        <span class="text-sm font-medium text-red-900 truncate block">${pName}</span>
                        <span class="text-xs text-red-600">${formatDate(s.updated_at)}</span>
                    </div>
                </div>
                <span class="text-sm font-bold text-red-700 flex-shrink-0">${formatCurrency(s.current_amount_cents)}/mo</span>
            </div>
        `}).join('');

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
            .select('id, email, first_name, last_name, profile_picture_url')
            .eq('is_active', false);

        if (error) { console.error('Error loading deactivated:', error); return; }
        if (!profiles || profiles.length === 0) { section.classList.add('hidden'); return; }

        const { data: invoiceTotals } = await supabaseClient
            .from('invoices')
            .select('user_id, amount_paid_cents')
            .eq('status', 'paid');
        const invMap = {};
        (invoiceTotals || []).forEach(i => { invMap[i.user_id] = (invMap[i.user_id] || 0) + (i.amount_paid_cents || 0); });

        // Manual deposit totals for deactivated members
        const { data: depositTotals } = await supabaseClient
            .from('manual_deposits')
            .select('member_id, amount_cents');
        const depMap = {};
        (depositTotals || []).forEach(d => { depMap[d.member_id] = (depMap[d.member_id] || 0) + (d.amount_cents || 0); });

        section.classList.remove('hidden');
        // Auto-expand the details element
        const details = section.querySelector('details');
        if (details) details.open = true;
        grid.innerHTML = profiles.map(p => {
            const total = (invMap[p.id] || 0) + (depMap[p.id] || 0);
            const initials = getInitials(p.email, p.first_name, p.last_name);
            const displayName = (p.first_name && p.last_name) ? `${p.first_name} ${p.last_name}` : p.email;
            const hasPhoto = !!p.profile_picture_url;
            return `
                <div class="bg-gray-50 rounded-2xl border border-gray-200 p-4 sm:p-5 opacity-70 hover:opacity-100 transition cursor-pointer" onclick="openMemberModal('${p.id}')">
                    <div class="flex items-center gap-3 sm:gap-4">
                        ${hasPhoto
                            ? `<img src="${p.profile_picture_url}" alt="${displayName}" class="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover flex-shrink-0 border-2 border-gray-100 grayscale">`
                            : `<div class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm flex-shrink-0">${initials}</div>`
                        }
                        <div class="flex-1 min-w-0">
                            <span class="text-sm font-medium text-gray-500 truncate block">${displayName}</span>
                            ${(p.first_name && p.last_name) ? `<span class="text-xs text-gray-400 truncate block">${p.email}</span>` : ''}
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
    document.getElementById('modalAvatar').innerHTML = '';
    document.getElementById('modalAvatar').textContent = '--';
    document.getElementById('modalAvatar').className = 'w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg flex-shrink-0';
    document.getElementById('modalMemberName').textContent = 'Loading...';
    document.getElementById('modalMemberEmail').textContent = '';
    document.getElementById('modalMemberRole').textContent = '';
    const detailsReset = document.getElementById('modalProfileDetails');
    if (detailsReset) detailsReset.innerHTML = '<div class="text-gray-400 text-xs text-center py-2">Loading profile...</div>';
    document.getElementById('modalStatus').innerHTML = getStatusBadge(null);
    document.getElementById('modalAmount').textContent = '$--';
    document.getElementById('modalTotal').textContent = '$--';
    document.getElementById('modalTransactions').innerHTML = '<div class="text-gray-400 text-center py-6 text-sm">Loading...</div>';
    const roleAssignReset = document.getElementById('modalRoleAssignment');
    if (roleAssignReset) roleAssignReset.innerHTML = '<div class="text-gray-400 text-center py-2 text-sm">Loading roles...</div>';
    const roleWarnReset = document.getElementById('modalRoleWarning');
    if (roleWarnReset) roleWarnReset.classList.add('hidden');

    try {
        const { data: profile, error: pErr } = await supabaseClient
            .from('profiles')
            .select('id, email, role, is_active, first_name, last_name, profile_picture_url, birthday, setup_completed, title')
            .eq('id', userId)
            .single();
        if (pErr) throw pErr;

        const displayName = (profile.first_name && profile.last_name)
            ? `${profile.first_name} ${profile.last_name}`
            : profile.email;

        // Set avatar
        const avatar = document.getElementById('modalAvatar');
        if (profile.profile_picture_url) {
            avatar.innerHTML = `<img src="${profile.profile_picture_url}" alt="${displayName}" class="w-12 h-12 rounded-full object-cover">`;
            avatar.className = 'w-12 h-12 rounded-full flex-shrink-0 overflow-hidden';
        } else {
            avatar.innerHTML = '';
            avatar.textContent = getInitials(profile.email, profile.first_name, profile.last_name);
            avatar.className = `w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${getAvatarColor(profile.email)}`;
        }

        document.getElementById('modalMemberName').textContent = displayName;
        document.getElementById('modalMemberEmail').textContent = profile.email;

        // Fetch all roles + this member's assigned roles for the modal
        const [allRolesRes, userRolesRes] = await Promise.all([
            supabaseClient.from('roles').select('id, name, color, icon, position, is_system, role_permissions(permission)').order('position'),
            supabaseClient.from('member_roles').select('role_id').eq('user_id', userId),
        ]);
        const allRoles = allRolesRes.data || [];
        const userRoleIds = new Set((userRolesRes.data || []).map(r => r.role_id));

        // Show role chips in header
        const headerRoles = allRoles.filter(r => userRoleIds.has(r.id));
        const modalRoleEl = document.getElementById('modalMemberRole');
        if (modalRoleEl) {
            modalRoleEl.innerHTML = headerRoles.map(r => {
                const bg = r.color ? `${r.color}20` : '#e0e7ff';
                const fg = r.color || '#4f46e5';
                return `<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md mr-1" style="background:${bg};color:${fg}">${r.icon ? r.icon + ' ' : ''}${r.name}</span>`;
            }).join('') || '<span class="text-xs text-gray-400">No roles</span>';
        }

        // Render role assignment checkboxes
        renderRoleAssignment(userId, allRoles, userRoleIds);

        // Profile details section
        const detailsEl = document.getElementById('modalProfileDetails');
        if (detailsEl) {
            let detailsHTML = '';
            if (profile.first_name || profile.last_name) {
                detailsHTML += `<div class="flex justify-between py-2 border-b border-gray-50">
                    <span class="text-xs text-gray-500">Full Name</span>
                    <span class="text-xs font-medium text-gray-900">${profile.first_name || ''} ${profile.last_name || ''}</span>
                </div>`;
            }
            detailsHTML += `<div class="flex justify-between py-2 border-b border-gray-50">
                <span class="text-xs text-gray-500">Email</span>
                <span class="text-xs font-medium text-gray-900">${profile.email}</span>
            </div>`;
            if (profile.birthday) {
                const bday = new Date(profile.birthday + 'T00:00:00');
                const bdayStr = bday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                detailsHTML += `<div class="flex justify-between py-2 border-b border-gray-50">
                    <span class="text-xs text-gray-500">Birthday</span>
                    <span class="text-xs font-medium text-gray-900">${bdayStr}</span>
                </div>`;
            }
            detailsHTML += `<div class="flex justify-between py-2">
                <span class="text-xs text-gray-500">Role</span>
                <span class="text-xs font-medium text-gray-900">${headerRoles.map(r => r.name).join(', ') || 'Member'}</span>
            </div>`;
            detailsHTML += `<div class="flex justify-between items-center py-2 border-t border-gray-50">
                <span class="text-xs text-gray-500">Leadership Title</span>
                <select id="modalTitleSelect" onchange="saveLeadershipTitle('${profile.id}', this)"
                    class="text-xs font-medium text-gray-900 border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                    <option value="" ${!profile.title ? 'selected' : ''}>— None (Member) —</option>
                    <option value="President" ${profile.title === 'President' ? 'selected' : ''}>👑 President</option>
                    <option value="Vice President" ${profile.title === 'Vice President' ? 'selected' : ''}>⭐ Vice President</option>
                    <option value="Treasurer" ${profile.title === 'Treasurer' ? 'selected' : ''}>💰 Treasurer</option>
                    <option value="Secretary" ${profile.title === 'Secretary' ? 'selected' : ''}>📋 Secretary</option>
                    <option value="Event Coordinator" ${profile.title === 'Event Coordinator' ? 'selected' : ''}>🎉 Event Coordinator</option>
                </select>
            </div>`;
            detailsHTML += `<div class="flex justify-between items-center py-2 border-t border-gray-50">`;
            detailsHTML += `<span class="text-xs text-gray-500">Onboarding</span>`;
            detailsHTML += `${getOnboardingBadge(profile.setup_completed)}</div>`;
            detailsEl.innerHTML = detailsHTML;
        }

        // Subscription
        const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .select('status, current_amount_cents, current_period_end, stripe_subscription_id')
            .eq('user_id', userId)
            .maybeSingle();

        // Append Next Bill Date row to profile details
        const detailsElSub = document.getElementById('modalProfileDetails');
        if (detailsElSub && subscription) {
            const billDate = subscription.current_period_end ? formatDate(new Date(subscription.current_period_end)) : '--';
            const hasSub = !!subscription.stripe_subscription_id;
            detailsElSub.insertAdjacentHTML('beforeend', `<div class="flex justify-between items-center py-2 border-t border-gray-50">
                <span class="text-xs text-gray-500">Next Bill Date</span>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-gray-900" id="modalNextBillDate">${billDate}</span>
                    ${hasSub ? `<button onclick="syncSubscriptionFromStripe('${userId}', this)" class="text-[10px] font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-md transition">Sync</button>` : ''}
                </div>
            </div>`);
        }

        if (subscription) {
            document.getElementById('modalStatus').innerHTML = getStatusBadge(subscription.status);
            document.getElementById('modalAmount').textContent = subscription.current_amount_cents
                ? formatCurrency(subscription.current_amount_cents)
                : 'N/A';
        } else {
            document.getElementById('modalStatus').innerHTML = getStatusBadge(null);
            document.getElementById('modalAmount').textContent = 'N/A';
        }

        // Invoices + manual deposits
        const [invoiceRes, depositRes] = await Promise.all([
            supabaseClient
                .from('invoices')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false }),
            supabaseClient
                .from('manual_deposits')
                .select('*')
                .eq('member_id', userId)
                .order('deposit_date', { ascending: false })
        ]);

        const invoices = invoiceRes.data || [];
        const deposits = depositRes.data || [];
        if (invoiceRes.error) throw invoiceRes.error;

        // Combined total via RPC
        const { data: combinedTotal, error: totErr } = await supabaseClient
            .rpc('get_member_total_contributions', { target_member_id: userId });
        if (totErr) throw totErr;
        document.getElementById('modalTotal').textContent = formatCurrency(combinedTotal || 0);

        // Build unified transaction list (invoices + deposits sorted by date)
        const transactions = [];
        invoices.forEach(inv => {
            transactions.push({
                type: 'invoice',
                date: new Date(inv.created_at),
                amount: inv.amount_paid_cents || 0,
                fee: inv.stripe_fee_cents || 0,
                net: inv.net_amount_cents || (inv.amount_paid_cents || 0),
                status: inv.status,
            });
        });
        deposits.forEach(dep => {
            transactions.push({
                type: 'deposit',
                date: new Date(dep.deposit_date + 'T00:00:00'),
                amount: dep.amount_cents,
                status: 'paid',
                depositType: dep.deposit_type,
                notes: dep.notes,
            });
        });
        transactions.sort((a, b) => b.date - a.date);

        const txEl = document.getElementById('modalTransactions');
        if (transactions.length === 0) {
            txEl.innerHTML = `
                <div class="text-gray-400 text-center py-8">
                    <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                    <p class="text-sm">No transactions yet</p>
                </div>
            `;
        } else {
            txEl.innerHTML = transactions.map(tx => {
                const isPaid = tx.status === 'paid';
                const isDeposit = tx.type === 'deposit';

                let label, sublabel;
                if (isDeposit) {
                    const typeLabel = tx.depositType === 'cash' ? 'Cash' : tx.depositType === 'transfer' ? 'Transfer' : 'Manual';
                    label = `${typeLabel} deposit`;
                    sublabel = tx.notes ? tx.notes : formatDate(tx.date);
                } else {
                    label = isPaid ? 'Payment received' : 'Payment ' + tx.status;
                    sublabel = formatDate(tx.date);
                }

                const bgCls = isDeposit ? 'bg-blue-50/60' : (isPaid ? 'bg-emerald-50/60' : 'bg-red-50/60');
                const iconBg = isDeposit ? 'bg-blue-100' : (isPaid ? 'bg-emerald-100' : 'bg-red-100');
                const amountCls = isDeposit ? 'text-blue-600' : (isPaid ? 'text-emerald-600' : 'text-red-500');
                const feeInfo = (!isDeposit && tx.fee > 0)
                    ? `<div class="text-[10px] text-gray-400 mt-0.5 text-right">Fee: -${formatCurrency(tx.fee)} · Net: ${formatCurrency(tx.net)}</div>`
                    : '';
                const icon = isDeposit
                    ? '<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>'
                    : (isPaid
                        ? '<svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                        : '<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                    );

                return `
                <div class="flex items-center justify-between py-2.5 px-3.5 rounded-xl ${bgCls}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center ${iconBg}">
                            ${icon}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${label}</div>
                            <div class="text-xs text-gray-500">${sublabel}</div>
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <span class="text-sm font-bold ${amountCls}">
                            ${isPaid || isDeposit ? '+' : ''}${formatCurrency(tx.amount)}
                        </span>
                        ${feeInfo}
                    </div>
                </div>`;
            }).join('');
        }

    } catch (err) {
        console.error('Error loading member details:', err);
        document.getElementById('modalTransactions').innerHTML = `<div class="text-red-500 text-center py-4 text-sm">Error loading details</div>`;
    }
}

async function saveLeadershipTitle(userId, selectEl) {
    const newTitle = selectEl.value || null;
    selectEl.disabled = true;
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ title: newTitle })
            .eq('id', userId);
        if (error) throw error;
        // Visual feedback — briefly flash green border
        selectEl.style.borderColor = '#10b981';
        setTimeout(() => { selectEl.style.borderColor = ''; }, 1500);
    } catch (err) {
        console.error('Failed to update title:', err);
        selectEl.style.borderColor = '#ef4444';
        setTimeout(() => { selectEl.style.borderColor = ''; }, 1500);
    } finally {
        selectEl.disabled = false;
    }
}

// ─── Role Assignment ─────────────────────────────────────

const OWNER_ROLE_ID = '00000000-0000-0000-0000-000000000001';

function renderRoleAssignment(userId, allRoles, userRoleIds) {
    const container = document.getElementById('modalRoleAssignment');
    if (!container) return;

    const currentUserIsOwner = window.__userRoles && window.__userRoles.some(r => r.id === OWNER_ROLE_ID);

    container.innerHTML = allRoles.map(r => {
        const checked = userRoleIds.has(r.id);
        const isOwnerRole = r.id === OWNER_ROLE_ID;
        const disabled = isOwnerRole && !currentUserIsOwner;
        const bg = r.color ? `${r.color}20` : '#f3f4f6';
        const fg = r.color || '#4f46e5';
        const borderCls = checked ? `border-current` : 'border-gray-200';

        return `
            <label class="flex items-center gap-3 p-2.5 rounded-xl border ${borderCls} cursor-pointer hover:bg-gray-50 transition${disabled ? ' opacity-50 pointer-events-none' : ''}" style="${checked ? `border-color:${fg}; background:${bg}` : ''}">
                <input type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}
                    onchange="toggleMemberRole('${userId}', '${r.id}', this.checked)"
                    class="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500">
                <span class="inline-flex items-center gap-1 text-sm font-medium" style="color:${fg}">
                    ${r.icon ? r.icon : ''} ${r.name}
                </span>
                ${isOwnerRole && !currentUserIsOwner ? '<span class="ml-auto text-[10px] text-gray-400">Owner only</span>' : ''}
                ${r.is_system ? '<span class="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">System</span>' : ''}
            </label>`;
    }).join('');

    updateRoleWarning(userId, allRoles, userRoleIds);
}

function updateRoleWarning(userId, allRoles, userRoleIds) {
    const warning = document.getElementById('modalRoleWarning');
    if (!warning) return;

    // Check if user has any role with admin.dashboard permission
    const adminRoles = allRoles.filter(r =>
        userRoleIds.has(r.id) &&
        (r.role_permissions || []).some(rp => rp.permission === 'admin.dashboard')
    );

    if (adminRoles.length <= 1 && adminRoles.length > 0) {
        warning.classList.remove('hidden');
    } else {
        warning.classList.add('hidden');
    }
}

async function toggleMemberRole(userId, roleId, assign) {
    const container = document.getElementById('modalRoleAssignment');
    // Disable all checkboxes during operation
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.disabled = true);

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const actorId = user.id;

        if (assign) {
            const { error } = await supabaseClient
                .from('member_roles')
                .insert({ user_id: userId, role_id: roleId, granted_by: actorId });
            if (error) throw error;

            // Audit log
            await supabaseClient.from('role_audit_log').insert({
                actor_id: actorId,
                action: 'role_assigned',
                target_user_id: userId,
                role_id: roleId,
                details: {}
            });
        } else {
            const { error } = await supabaseClient
                .from('member_roles')
                .delete()
                .eq('user_id', userId)
                .eq('role_id', roleId);
            if (error) throw error;

            // Audit log
            await supabaseClient.from('role_audit_log').insert({
                actor_id: actorId,
                action: 'role_removed',
                target_user_id: userId,
                role_id: roleId,
                details: {}
            });
        }

        // Re-fetch to get updated state
        const [allRolesRes, userRolesRes] = await Promise.all([
            supabaseClient.from('roles').select('id, name, color, icon, position, is_system, role_permissions(permission)').order('position'),
            supabaseClient.from('member_roles').select('role_id').eq('user_id', userId),
        ]);
        const allRoles = allRolesRes.data || [];
        const userRoleIds = new Set((userRolesRes.data || []).map(r => r.role_id));

        renderRoleAssignment(userId, allRoles, userRoleIds);

        // Update header role chips
        const headerRoles = allRoles.filter(r => userRoleIds.has(r.id));
        const modalRoleEl = document.getElementById('modalMemberRole');
        if (modalRoleEl) {
            modalRoleEl.innerHTML = headerRoles.map(r => {
                const bg = r.color ? `${r.color}20` : '#e0e7ff';
                const fg = r.color || '#4f46e5';
                return `<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md mr-1" style="background:${bg};color:${fg}">${r.icon ? r.icon + ' ' : ''}${r.name}</span>`;
            }).join('') || '<span class="text-xs text-gray-400">No roles</span>';
        }

        // Refresh member list in background
        loadMembers();
    } catch (err) {
        console.error('Error toggling role:', err);
        alert('Failed to update role: ' + (err.message || err));
        // Re-enable checkboxes on error
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.disabled = false);
    }
}

function closeMemberModal() {
    document.getElementById('memberModal').classList.add('hidden');
    document.body.style.overflow = '';
}

// Close on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMemberModal(); });

async function syncSubscriptionFromStripe(userId, btnEl) {
    const orig = btnEl.textContent;
    btnEl.disabled = true;
    btnEl.textContent = 'Syncing...';
    try {
        const result = await callEdgeFunction('sync-subscription', { userId });
        const dateEl = document.getElementById('modalNextBillDate');
        if (dateEl && result.current_period_end) {
            dateEl.textContent = formatDate(new Date(result.current_period_end));
        }
        btnEl.textContent = '✓ Synced';
        btnEl.className = 'text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md';
    } catch (err) {
        alert('Sync failed: ' + (err.message || err));
        btnEl.textContent = orig;
        btnEl.disabled = false;
    }
}
