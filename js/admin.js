// Admin dashboard functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Check admin authentication
    const user = await checkAuth(true); // true = require admin
    if (!user) return;

    // Only load dashboard data if we're on the admin dashboard page
    const membersBody = document.getElementById('membersBody');
    if (membersBody) {
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

async function loadStats() {
    try {
        // Get all subscriptions for active count (include 'active' and 'trialing')
        const { data: subscriptions, error: subError } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .in('status', ['active', 'trialing']);

        if (!subError && subscriptions) {
            const activeMemberCountEl = document.getElementById('activeMemberCount');
            if (activeMemberCountEl) {
                activeMemberCountEl.textContent = subscriptions.length;
            }
        }

        // Get all invoices for totals
        const { data: invoices, error: invError } = await supabaseClient
            .from('invoices')
            .select('amount_paid_cents, created_at, status')
            .eq('status', 'paid');

        if (!invError && invoices) {
            // All time total
            const allTimeTotal = invoices.reduce((sum, inv) => sum + (inv.amount_paid_cents || 0), 0);
            const allTimeTotalEl = document.getElementById('allTimeTotal');
            if (allTimeTotalEl) {
                allTimeTotalEl.textContent = formatCurrency(allTimeTotal);
            }

            // This month total
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisMonthInvoices = invoices.filter(inv => new Date(inv.created_at) >= startOfMonth);
            const thisMonthTotal = thisMonthInvoices.reduce((sum, inv) => sum + (inv.amount_paid_cents || 0), 0);
            
            const thisMonthTotalEl = document.getElementById('thisMonthTotal');
            if (thisMonthTotalEl) {
                thisMonthTotalEl.textContent = formatCurrency(thisMonthTotal);
            }
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadMembers() {
    const membersBody = document.getElementById('membersBody');
    const emptyState = document.getElementById('emptyState');

    try {
        // Get all active profiles
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('id, email, role')
            .eq('is_active', true);

        if (error) {
            console.error('Error loading members:', error);
            return;
        }

        if (!profiles || profiles.length === 0) {
            if (membersBody) membersBody.closest('.bg-white')?.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        // Get all subscriptions separately
        const { data: subscriptions, error: subError } = await supabaseClient
            .from('subscriptions')
            .select('user_id, status, current_amount_cents');

        const subscriptionsByUser = {};
        if (!subError && subscriptions) {
            subscriptions.forEach(sub => {
                subscriptionsByUser[sub.user_id] = sub;
            });
        }

        // Get invoice totals for each user
        const { data: invoiceTotals, error: invError } = await supabaseClient
            .from('invoices')
            .select('user_id, amount_paid_cents')
            .eq('status', 'paid');

        const totalsByUser = {};
        if (!invError && invoiceTotals) {
            invoiceTotals.forEach(inv => {
                if (!totalsByUser[inv.user_id]) {
                    totalsByUser[inv.user_id] = 0;
                }
                totalsByUser[inv.user_id] += inv.amount_paid_cents || 0;
            });
        }

        // Render members
        membersBody.innerHTML = profiles.map(profile => {
            const subscription = subscriptionsByUser[profile.id];
            const total = totalsByUser[profile.id] || 0;
            const isAdmin = profile.role === 'admin';
            
            return `
                <tr class="hover:bg-gray-50 cursor-pointer" onclick="openMemberModal('${profile.id}')">
                    <td class="px-6 py-4 text-sm text-gray-900">
                        ${profile.email}
                        ${isAdmin ? '<span class="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded">Admin</span>' : ''}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900 font-medium">
                        ${subscription?.current_amount_cents 
                            ? formatCurrency(subscription.current_amount_cents) + '/mo'
                            : '--'}
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(subscription?.status)}">
                            ${subscription?.status || 'No subscription'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                        ${formatCurrency(total)}
                    </td>
                    <td class="px-6 py-4 text-sm" onclick="event.stopPropagation()">
                        ${!isAdmin ? `
                            <button 
                                onclick="event.stopPropagation(); deactivateUser('${profile.id}', '${profile.email}')"
                                class="text-red-600 hover:text-red-800 font-medium"
                            >
                                Deactivate
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading members:', error);
    }
}

async function loadPastDue() {
    const pastDueSection = document.getElementById('pastDueSection');
    const pastDueBody = document.getElementById('pastDueBody');

    try {
        const { data: pastDueSubscriptions, error } = await supabaseClient
            .from('subscriptions')
            .select(`
                current_amount_cents,
                updated_at,
                profiles (
                    email
                )
            `)
            .eq('status', 'past_due');

        if (error) {
            console.error('Error loading past due:', error);
            return;
        }

        if (!pastDueSubscriptions || pastDueSubscriptions.length === 0) {
            if (pastDueSection) pastDueSection.classList.add('hidden');
            return;
        }

        // Show section
        if (pastDueSection) pastDueSection.classList.remove('hidden');

        // Render past due members
        pastDueBody.innerHTML = pastDueSubscriptions.map(sub => `
            <tr>
                <td class="px-6 py-4 text-sm text-red-900">
                    ${sub.profiles?.email || 'Unknown'}
                </td>
                <td class="px-6 py-4 text-sm text-red-900 font-medium">
                    ${formatCurrency(sub.current_amount_cents)}/mo
                </td>
                <td class="px-6 py-4 text-sm text-red-700">
                    ${formatDate(sub.updated_at)}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading past due:', error);
    }
}

function getStatusClasses(status) {
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-800';
        case 'past_due':
            return 'bg-red-100 text-red-800';
        case 'canceled':
            return 'bg-gray-100 text-gray-800';
        case 'trialing':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Deactivate a user
async function deactivateUser(userId, email) {
    if (!confirm(`Are you sure you want to deactivate ${email}?\n\nThis will:\n• Cancel their subscription\n• Prevent them from logging in\n• Preserve their payment history`)) {
        return;
    }

    try {
        const result = await callEdgeFunction('deactivate-user', { userId });
        alert(result.message || 'User deactivated successfully');
        
        // Reload the dashboard
        await loadAdminDashboard();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Load deactivated members
async function loadDeactivatedMembers() {
    const deactivatedSection = document.getElementById('deactivatedSection');
    const deactivatedBody = document.getElementById('deactivatedBody');

    if (!deactivatedSection || !deactivatedBody) return;

    try {
        // Get deactivated profiles
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('id, email')
            .eq('is_active', false);

        if (error) {
            console.error('Error loading deactivated members:', error);
            return;
        }

        if (!profiles || profiles.length === 0) {
            deactivatedSection.classList.add('hidden');
            return;
        }

        // Get invoice totals
        const { data: invoiceTotals } = await supabaseClient
            .from('invoices')
            .select('user_id, amount_paid_cents')
            .eq('status', 'paid');

        const totalsByUser = {};
        if (invoiceTotals) {
            invoiceTotals.forEach(inv => {
                if (!totalsByUser[inv.user_id]) {
                    totalsByUser[inv.user_id] = 0;
                }
                totalsByUser[inv.user_id] += inv.amount_paid_cents || 0;
            });
        }

        // Show section and render
        deactivatedSection.classList.remove('hidden');
        deactivatedBody.innerHTML = profiles.map(profile => {
            const total = totalsByUser[profile.id] || 0;
            return `
                <tr class="hover:bg-gray-100 cursor-pointer" onclick="openMemberModal('${profile.id}')">
                    <td class="px-6 py-4 text-sm text-gray-500">
                        ${profile.email}
                        <span class="ml-2 bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded">Deactivated</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">
                        ${formatCurrency(total)}
                    </td>
                    <td class="px-6 py-4 text-sm" onclick="event.stopPropagation()">
                        <button 
                            onclick="event.stopPropagation(); reactivateUser('${profile.id}', '${profile.email}')"
                            class="text-green-600 hover:text-green-800 font-medium"
                        >
                            Reactivate
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading deactivated members:', error);
    }
}

// Reactivate a user
async function reactivateUser(userId, email) {
    if (!confirm(`Reactivate ${email}?\n\nThey will be able to log in again and set up a new subscription.`)) {
        return;
    }

    try {
        // Directly update the profile (admin can do this via service role in a function,
        // but for simplicity we'll create a simple reactivate function)
        const result = await callEdgeFunction('reactivate-user', { userId });
        alert(result.message || 'User reactivated successfully');
        
        // Reload the dashboard
        await loadAdminDashboard();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Member Modal Functions
async function openMemberModal(userId) {
    const modal = document.getElementById('memberModal');
    modal.classList.remove('hidden');
    
    // Reset modal content
    document.getElementById('modalMemberEmail').textContent = 'Loading...';
    document.getElementById('modalMemberRole').textContent = '';
    document.getElementById('modalStatus').innerHTML = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">--</span>';
    document.getElementById('modalAmount').textContent = '$--';
    document.getElementById('modalTotal').textContent = '$--';
    document.getElementById('modalTransactions').innerHTML = '<div class="text-gray-500 text-center py-4">Loading transactions...</div>';

    try {
        // Load member profile
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, email, role, is_active')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        document.getElementById('modalMemberEmail').textContent = profile.email;
        document.getElementById('modalMemberRole').textContent = profile.role === 'admin' ? '👑 Administrator' : '👤 Member';

        // Load subscription
        const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .select('status, current_amount_cents')
            .eq('user_id', userId)
            .single();

        if (subscription) {
            document.getElementById('modalStatus').innerHTML = `
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusClasses(subscription.status)}">
                    ${subscription.status}
                </span>
            `;
            document.getElementById('modalAmount').textContent = subscription.current_amount_cents 
                ? formatCurrency(subscription.current_amount_cents) + '/mo'
                : 'Not set';
        } else {
            document.getElementById('modalStatus').innerHTML = `
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    No subscription
                </span>
            `;
            document.getElementById('modalAmount').textContent = 'N/A';
        }

        // Load invoices/transactions
        const { data: invoices, error: invError } = await supabaseClient
            .from('invoices')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (invError) throw invError;

        // Calculate total
        const totalPaid = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.amount_paid_cents || 0), 0);
        document.getElementById('modalTotal').textContent = formatCurrency(totalPaid);

        // Render transactions
        const transactionsEl = document.getElementById('modalTransactions');
        if (!invoices || invoices.length === 0) {
            transactionsEl.innerHTML = `
                <div class="text-gray-500 text-center py-8">
                    <div class="text-3xl mb-2">📭</div>
                    <p>No transactions yet</p>
                </div>
            `;
        } else {
            transactionsEl.innerHTML = invoices.map(inv => `
                <div class="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center ${inv.status === 'paid' ? 'bg-green-100' : 'bg-red-100'}">
                            ${inv.status === 'paid' 
                                ? '<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                                : '<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                            }
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">
                                ${inv.status === 'paid' ? 'Payment received' : 'Payment ' + inv.status}
                            </div>
                            <div class="text-xs text-gray-500">
                                ${formatDate(inv.created_at)}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-semibold ${inv.status === 'paid' ? 'text-green-600' : 'text-red-600'}">
                            ${inv.status === 'paid' ? '+' : ''}${formatCurrency(inv.amount_paid_cents || inv.amount_due_cents || 0)}
                        </div>
                    </div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading member details:', error);
        document.getElementById('modalTransactions').innerHTML = `
            <div class="text-red-500 text-center py-4">Error loading member details</div>
        `;
    }
}

function closeMemberModal() {
    const modal = document.getElementById('memberModal');
    modal.classList.add('hidden');
}

// Close modal on background click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('memberModal');
    if (e.target === modal) {
        closeMemberModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeMemberModal();
    }
});
