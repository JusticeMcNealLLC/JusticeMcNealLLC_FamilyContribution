// Admin invite functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Check admin authentication
    const user = await checkAuth({ permission: 'admin.invite' });
    if (!user) return;

    // Set up invite form
    setupInviteForm();

    // Load all sections
    await loadAllSections();
});

function setupInviteForm() {
    const inviteForm = document.getElementById('inviteForm');

    if (inviteForm) {
        inviteForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleInvite();
        });
    }
}

async function handleInvite() {
    const emailInput = document.getElementById('inviteEmail');
    const inviteBtn = document.getElementById('inviteBtn');
    const email = emailInput.value.trim();

    hideError('inviteError');
    hideError('inviteSuccess');

    if (!email) {
        showError('inviteError', 'Please enter an email address');
        return;
    }

    setButtonLoading(inviteBtn, true, 'Send Invitation');

    try {
        await callEdgeFunction('invite-user', {
            email: email,
        });

        showSuccess('inviteSuccess', `Invitation sent to ${email}!`);
        emailInput.value = '';
        
        // Reload all sections
        await loadAllSections();

    } catch (error) {
        showError('inviteError', error.message || 'Failed to send invitation');
    } finally {
        setButtonLoading(inviteBtn, false, 'Send Invitation');
    }
}

async function loadAllSections() {
    try {
        // Get all profiles with subscription info
        const { data: profiles, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, email, role, is_active, setup_completed, first_name, last_name, created_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (profileError) {
            console.error('Error loading profiles:', profileError);
            return;
        }

        // Get all subscriptions
        const { data: subscriptions, error: subError } = await supabaseClient
            .from('subscriptions')
            .select('user_id, status, current_amount_cents');

        const subsByUser = {};
        if (!subError && subscriptions) {
            subscriptions.forEach(sub => {
                subsByUser[sub.user_id] = sub;
            });
        }

        // Categorize users
        const pending = [];      // setup_completed = false AND never filled profile (truly new invite)
        const awaiting = [];     // setup_completed = true but no active subscription
        const active = [];       // has active/trialing subscription

        profiles.forEach(profile => {
            // Skip admins from these lists (they manage, not contribute)
            if (profile.role === 'admin') return;

            const sub = subsByUser[profile.id];
            const hasActiveSub = sub && (sub.status === 'active' || sub.status === 'trialing');
            const hasProfileData = !!(profile.first_name && profile.last_name);

            if (!profile.setup_completed && !hasProfileData && !sub) {
                // Truly fresh invite — never filled out profile, no subscription history
                pending.push(profile);
            } else if (hasActiveSub) {
                // Active subscriber (may be re-onboarding if setup_completed is false)
                active.push({ ...profile, subscription: sub });
            } else {
                // Onboarded but no active subscription (may be re-onboarding)
                awaiting.push({ ...profile, subscription: sub });
            }
        });

        // Render each section
        renderPendingInvites(pending);
        renderAwaitingSubscription(awaiting);
        renderActiveMembers(active);

    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

function renderPendingInvites(users) {
    const section = document.getElementById('pendingInvites');
    const body = document.getElementById('pendingBody');
    const mobileList = document.getElementById('pendingMobileList');
    const empty = document.getElementById('noPending');

    if (users.length === 0) {
        section.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    section.classList.remove('hidden');
    empty.classList.add('hidden');

    if (body) {
        body.innerHTML = users.map(user => `
            <tr class="hover:bg-surface-50 transition">
                <td class="px-5 py-3.5 text-sm text-gray-900">${user.email}</td>
                <td class="px-5 py-3.5 text-sm text-gray-500">${formatDate(user.created_at)}</td>
                <td class="px-5 py-3.5">
                    <button onclick="resendInvite('${user.email}')" class="text-brand-600 hover:text-brand-700 text-sm font-medium">Resend</button>
                </td>
            </tr>
        `).join('');
    }

    if (mobileList) {
        mobileList.innerHTML = users.map(user => `
            <div class="px-4 py-3.5 flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">${user.email}</div>
                    <div class="text-xs text-gray-400 mt-0.5">Invited ${formatDate(user.created_at)}</div>
                </div>
                <button onclick="resendInvite('${user.email}')" class="text-brand-600 hover:text-brand-700 text-xs font-semibold px-3 py-1.5 bg-brand-50 rounded-lg flex-shrink-0">Resend</button>
            </div>
        `).join('');
    }
}

function renderAwaitingSubscription(users) {
    const section = document.getElementById('awaitingSection');
    const body = document.getElementById('awaitingBody');
    const mobileList = document.getElementById('awaitingMobileList');
    const empty = document.getElementById('noAwaiting');

    if (users.length === 0) {
        section.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    section.classList.remove('hidden');
    empty.classList.add('hidden');

    if (body) {
        body.innerHTML = users.map(user => `
            <tr class="hover:bg-surface-50 transition">
                <td class="px-5 py-3.5 text-sm text-gray-900">${user.email}</td>
                <td class="px-5 py-3.5 text-sm text-gray-500">${formatDate(user.created_at)}</td>
                <td class="px-5 py-3.5 whitespace-nowrap">
                    ${!user.setup_completed ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 mr-2">Re-onboarding</span>' : ''}
                    <button onclick="resetOnboarding('${user.id}', '${user.email}')" class="text-amber-600 hover:text-amber-700 text-sm font-medium whitespace-nowrap">Reset Onboarding</button>
                </td>
            </tr>
        `).join('');
    }

    if (mobileList) {
        mobileList.innerHTML = users.map(user => `
            <div class="px-4 py-3.5 flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">${user.email}</div>
                    <div class="text-xs text-gray-400 mt-0.5">Signed up ${formatDate(user.created_at)}</div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    ${!user.setup_completed ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Re-onboarding</span>' : ''}
                    <button onclick="resetOnboarding('${user.id}', '${user.email}')" class="text-amber-600 hover:text-amber-700 text-xs font-semibold px-3 py-1.5 bg-amber-50 rounded-lg flex-shrink-0">Reset</button>
                </div>
            </div>
        `).join('');
    }
}

function getStatusClasses(status) {
    const map = {
        active: 'bg-emerald-100 text-emerald-700',
        trialing: 'bg-blue-100 text-blue-700',
        past_due: 'bg-red-100 text-red-700',
        canceled: 'bg-gray-100 text-gray-600',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
}

function renderActiveMembers(users) {
    const section = document.getElementById('activeSection');
    const body = document.getElementById('activeBody');
    const mobileList = document.getElementById('activeMobileList');
    const empty = document.getElementById('noActive');

    if (users.length === 0) {
        section.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    section.classList.remove('hidden');
    empty.classList.add('hidden');

    if (body) {
        body.innerHTML = users.map(user => `
            <tr class="hover:bg-surface-50 transition">
                <td class="px-5 py-3.5 text-sm text-gray-900">${user.email}</td>
                <td class="px-5 py-3.5 text-sm text-gray-900 font-medium">
                    ${user.subscription?.current_amount_cents 
                        ? formatCurrency(user.subscription.current_amount_cents) + '/mo'
                        : '--'}
                </td>
                <td class="px-5 py-3.5">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses(user.subscription?.status)}">
                        ${user.subscription?.status || 'Unknown'}
                    </span>
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap">
                    ${!user.setup_completed ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 mr-2">Re-onboarding</span>' : ''}
                    <button onclick="resetOnboarding('${user.id}', '${user.email}')" class="text-amber-600 hover:text-amber-700 text-sm font-medium whitespace-nowrap">Reset Onboarding</button>
                </td>
            </tr>
        `).join('');
    }

    if (mobileList) {
        mobileList.innerHTML = users.map(user => `
            <div class="px-4 py-3.5 flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">${user.email}</div>
                    <div class="text-xs text-gray-400 mt-0.5">
                        ${user.subscription?.current_amount_cents 
                            ? formatCurrency(user.subscription.current_amount_cents) + '/mo'
                            : 'No plan'}
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    ${!user.setup_completed ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Re-onboarding</span>' : ''}
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses(user.subscription?.status)}">
                        ${user.subscription?.status || 'Unknown'}
                    </span>
                    <button onclick="resetOnboarding('${user.id}', '${user.email}')" class="text-amber-600 hover:text-amber-700 text-xs font-semibold px-2 py-1 bg-amber-50 rounded-lg">Reset</button>
                </div>
            </div>
        `).join('');
    }
}

// Global function for resend button
async function resendInvite(email) {
    try {
        await callEdgeFunction('invite-user', {
            email: email,
            resend: true,
        });
        alert(`Invitation resent to ${email}`);
    } catch (error) {
        alert('Failed to resend invitation: ' + error.message);
    }
}

// Global function to reset onboarding for a member
async function resetOnboarding(userId, email) {
    if (!confirm(`Reset onboarding for ${email}?\n\nThis will require them to go through the welcome wizard again next time they log in.`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ 
                setup_completed: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;

        alert(`Onboarding reset for ${email}. They'll see the welcome wizard on their next visit.`);

        // Reload sections to reflect the change
        await loadAllSections();

    } catch (error) {
        console.error('Reset onboarding error:', error);
        alert('Failed to reset onboarding: ' + (error.message || 'Unknown error'));
    }
}
