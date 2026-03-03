// Admin invite functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Check admin authentication
    const user = await checkAuth(true);
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
            .select('id, email, role, is_active, setup_completed, created_at')
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
        const pending = [];      // setup_completed = false (haven't set password)
        const awaiting = [];     // setup_completed = true but no active subscription
        const active = [];       // has active/trialing subscription

        profiles.forEach(profile => {
            // Skip admins from these lists (they manage, not contribute)
            if (profile.role === 'admin') return;

            const sub = subsByUser[profile.id];
            const hasActiveSub = sub && (sub.status === 'active' || sub.status === 'trialing');

            if (!profile.setup_completed) {
                pending.push(profile);
            } else if (!hasActiveSub) {
                awaiting.push({ ...profile, subscription: sub });
            } else {
                active.push({ ...profile, subscription: sub });
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
    const empty = document.getElementById('noPending');

    if (users.length === 0) {
        section.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    section.classList.remove('hidden');
    empty.classList.add('hidden');

    body.innerHTML = users.map(user => `
        <tr class="hover:bg-yellow-50">
            <td class="px-6 py-4 text-sm text-gray-900">${user.email}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${formatDate(user.created_at)}</td>
            <td class="px-6 py-4">
                <button 
                    onclick="resendInvite('${user.email}')"
                    class="text-primary hover:text-primary-hover text-sm font-medium"
                >
                    Resend
                </button>
            </td>
        </tr>
    `).join('');
}

function renderAwaitingSubscription(users) {
    const section = document.getElementById('awaitingSection');
    const body = document.getElementById('awaitingBody');
    const empty = document.getElementById('noAwaiting');

    if (users.length === 0) {
        section.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    section.classList.remove('hidden');
    empty.classList.add('hidden');

    body.innerHTML = users.map(user => `
        <tr class="hover:bg-blue-50">
            <td class="px-6 py-4 text-sm text-gray-900">${user.email}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${formatDate(user.created_at)}</td>
        </tr>
    `).join('');
}

function renderActiveMembers(users) {
    const section = document.getElementById('activeSection');
    const body = document.getElementById('activeBody');
    const empty = document.getElementById('noActive');

    if (users.length === 0) {
        section.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    section.classList.remove('hidden');
    empty.classList.add('hidden');

    body.innerHTML = users.map(user => `
        <tr class="hover:bg-green-50">
            <td class="px-6 py-4 text-sm text-gray-900">${user.email}</td>
            <td class="px-6 py-4 text-sm text-gray-900 font-medium">
                ${user.subscription?.current_amount_cents 
                    ? formatCurrency(user.subscription.current_amount_cents) + '/mo'
                    : '--'}
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(user.subscription?.status)}">
                    ${user.subscription?.status || 'Unknown'}
                </span>
            </td>
        </tr>
    `).join('');
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
