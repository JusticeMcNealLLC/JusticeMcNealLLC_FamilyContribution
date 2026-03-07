// Unified Transaction History — Stripe payments + manual deposits

document.addEventListener('DOMContentLoaded', async function() {
    const user = await checkAuth();
    if (!user) return;

    await loadTransactions(user.id);
    setupFilters(user.id);
});

// ─── Data Loading ───────────────────────────────────────
async function loadTransactions(userId, filters = {}) {
    const tableBody = document.getElementById('transactionsBody');
    const mobileList = document.getElementById('transactionsMobileList');
    const container = document.getElementById('transactionsContainer');
    const table = document.getElementById('transactionsTable');
    const emptyState = document.getElementById('emptyState');
    const paymentCountEl = document.getElementById('paymentCount');
    const depositCountEl = document.getElementById('depositCount');
    const historyTotalEl = document.getElementById('historyTotal');

    try {
        // Build queries
        let invoiceQuery = supabaseClient
            .from('invoices')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        let depositQuery = supabaseClient
            .from('manual_deposits')
            .select('*')
            .eq('member_id', userId)
            .order('deposit_date', { ascending: false });

        // Apply period filter to both queries
        if (filters.months) {
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - parseInt(filters.months));
            invoiceQuery = invoiceQuery.gte('created_at', cutoff.toISOString());
            depositQuery = depositQuery.gte('deposit_date', cutoff.toISOString().split('T')[0]);
        }

        const [invoiceRes, depositRes] = await Promise.all([invoiceQuery, depositQuery]);
        if (invoiceRes.error) throw invoiceRes.error;
        if (depositRes.error) throw depositRes.error;

        const invoices = invoiceRes.data || [];
        const deposits = depositRes.data || [];

        // Build unified transaction list
        let transactions = [];

        invoices.forEach(inv => {
            transactions.push({
                source: 'stripe',
                date: new Date(inv.created_at),
                amount: inv.amount_paid_cents || 0,
                status: inv.status,
                receiptUrl: inv.hosted_invoice_url || null,
                notes: null,
                depositType: null,
            });
        });

        deposits.forEach(dep => {
            const typeLabel = dep.deposit_type === 'cash' ? 'Cash' : dep.deposit_type === 'transfer' ? 'Transfer' : dep.deposit_type === 'other' ? 'Other' : 'Manual';
            transactions.push({
                source: 'deposit',
                date: new Date(dep.deposit_date + 'T00:00:00'),
                amount: dep.amount_cents,
                status: 'paid',
                receiptUrl: null,
                notes: dep.notes,
                depositType: typeLabel,
            });
        });

        // Apply source filter
        if (filters.source === 'stripe') {
            transactions = transactions.filter(t => t.source === 'stripe');
        } else if (filters.source === 'deposit') {
            transactions = transactions.filter(t => t.source === 'deposit');
        }

        // Sort by date descending
        transactions.sort((a, b) => b.date - a.date);

        // Update summary cards
        const paidInvoices = invoices.filter(i => i.status === 'paid');
        if (paymentCountEl) paymentCountEl.textContent = paidInvoices.length;
        if (depositCountEl) depositCountEl.textContent = deposits.length;

        // Combined total via RPC
        const { data: combinedTotal } = await supabaseClient
            .rpc('get_member_total_contributions', { target_member_id: userId });
        if (historyTotalEl) historyTotalEl.textContent = formatCurrency(combinedTotal || 0);

        // Empty state
        if (transactions.length === 0) {
            if (container) container.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (container) container.classList.remove('hidden');
        if (table) table.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');

        // Render desktop table
        if (tableBody) {
            tableBody.innerHTML = transactions.map(tx => {
                const sourceBadge = tx.source === 'stripe'
                    ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Stripe</span>'
                    : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">${tx.depositType}</span>`;

                const statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(tx.status)}">${tx.status}</span>`;

                const details = tx.source === 'stripe' && tx.receiptUrl
                    ? `<a href="${tx.receiptUrl}" target="_blank" class="text-brand-600 hover:text-brand-700 text-sm font-medium">View receipt &rarr;</a>`
                    : tx.notes ? `<span class="text-gray-500 text-sm truncate block max-w-[200px]" title="${tx.notes}">${tx.notes}</span>` : '<span class="text-gray-300">—</span>';

                return `<tr class="hover:bg-gray-50 transition">
                    <td class="px-5 py-4 text-sm text-gray-900">${formatDate(tx.date)}</td>
                    <td class="px-5 py-4">${sourceBadge}</td>
                    <td class="px-5 py-4 text-sm font-semibold ${tx.status === 'paid' ? 'text-emerald-600' : 'text-gray-900'}">+${formatCurrency(tx.amount)}</td>
                    <td class="px-5 py-4">${statusBadge}</td>
                    <td class="px-5 py-4">${details}</td>
                </tr>`;
            }).join('');
        }

        // Render mobile cards
        if (mobileList) {
            mobileList.innerHTML = transactions.map(tx => {
                const isDeposit = tx.source === 'deposit';
                const iconBg = isDeposit ? 'bg-blue-100' : 'bg-emerald-100';
                const iconColor = isDeposit ? 'text-blue-600' : 'text-emerald-600';
                const icon = isDeposit
                    ? `<svg class="w-4 h-4 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>`
                    : `<svg class="w-4 h-4 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;

                const label = isDeposit ? `${tx.depositType} deposit` : `Subscription payment`;
                const sublabel = tx.notes || formatDate(tx.date);

                return `<div class="flex items-center justify-between px-4 py-3.5">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-9 h-9 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0">${icon}</div>
                        <div class="min-w-0 flex-1">
                            <div class="text-sm font-medium text-gray-900">${label}</div>
                            <div class="text-xs text-gray-500 truncate">${sublabel}</div>
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0 ml-3">
                        <div class="text-sm font-bold ${tx.status === 'paid' ? 'text-emerald-600' : 'text-gray-600'}">+${formatCurrency(tx.amount)}</div>
                        ${tx.receiptUrl ? `<a href="${tx.receiptUrl}" target="_blank" class="text-[10px] text-brand-600 font-medium">Receipt</a>` : ''}
                    </div>
                </div>`;
            }).join('');
        }

    } catch (error) {
        console.error('Error loading transactions:', error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-5 py-8 text-center text-red-500 text-sm">Error loading transactions. Please try again.</td></tr>`;
        }
    }
}

// ─── Helpers ────────────────────────────────────────────
function getStatusClasses(status) {
    switch (status) {
        case 'paid': return 'bg-green-100 text-green-800';
        case 'open': case 'draft': return 'bg-yellow-100 text-yellow-800';
        case 'void': case 'uncollectible': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function setupFilters(userId) {
    const sourceFilter = document.getElementById('sourceFilter');
    const periodFilter = document.getElementById('periodFilter');

    function applyFilters() {
        const filters = {
            source: sourceFilter?.value !== 'all' ? sourceFilter.value : null,
            months: periodFilter?.value !== 'all' ? periodFilter.value : null,
        };
        loadTransactions(userId, filters);
    }

    if (sourceFilter) sourceFilter.addEventListener('change', applyFilters);
    if (periodFilter) periodFilter.addEventListener('change', applyFilters);
}
