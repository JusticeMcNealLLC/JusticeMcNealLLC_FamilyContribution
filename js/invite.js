// Admin invite functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Check admin authentication
    const user = await checkAuth(true);
    if (!user) return;

    // Set up invite form
    setupInviteForm();

    // Load pending invites and members
    await loadPendingInvites();
    await loadAllMembers();
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
        
        // Reload pending invites
        await loadPendingInvites();
        await loadAllMembers();

    } catch (error) {
        showError('inviteError', error.message || 'Failed to send invitation');
    } finally {
        setButtonLoading(inviteBtn, false, 'Send Invitation');
    }
}

async function loadPendingInvites() {
    const pendingBody = document.getElementById('pendingBody');
    const noPending = document.getElementById('noPending');
    const pendingInvites = document.getElementById('pendingInvites');

    try {
        // Get profiles that haven't completed setup (no subscription yet)
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select(`
                id,
                email,
                created_at,
                subscriptions (
                    id
                )
            `)
            .eq('is_active', true);

        if (error) {
            console.error('Error loading pending invites:', error);
            return;
        }

        // Filter to only those without subscriptions
        const pendingUsers = profiles?.filter(p => !p.subscriptions || p.subscriptions.length === 0) || [];

        if (pendingUsers.length === 0) {
            if (pendingInvites) pendingInvites.classList.add('hidden');
            if (noPending) noPending.classList.remove('hidden');
            return;
        }

        if (pendingInvites) pendingInvites.classList.remove('hidden');
        if (noPending) noPending.classList.add('hidden');

        pendingBody.innerHTML = pendingUsers.map(user => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${user.email}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${formatDate(user.created_at)}
                </td>
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

    } catch (error) {
        console.error('Error loading pending invites:', error);
    }
}

async function loadAllMembers() {
    const container = document.getElementById('membersListContainer');

    try {
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('email, role, is_active')
            .order('email');

        if (error) {
            console.error('Error loading members:', error);
            return;
        }

        if (!profiles || profiles.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No members yet</p>';
            return;
        }

        container.innerHTML = profiles.map(profile => `
            <div class="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                        ${profile.email.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-gray-900">${profile.email}</span>
                </div>
                <div class="flex items-center gap-2">
                    ${profile.role === 'admin' ? `
                        <span class="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded">Admin</span>
                    ` : ''}
                    <span class="w-2 h-2 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-gray-300'}"></span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading members:', error);
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
