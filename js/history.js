// Payment history page functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const user = await checkAuth();
    if (!user) return;

    // Load invoices
    await loadInvoices(user.id);

    // Set up filters
    setupFilters(user.id);
});

async function loadInvoices(userId, filters = {}) {
    const invoicesBody = document.getElementById('invoicesBody');
    const emptyState = document.getElementById('emptyState');
    const invoicesTable = document.getElementById('invoicesTable');
    const paymentCountEl = document.getElementById('paymentCount');

    try {
        let query = supabaseClient
            .from('invoices')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // Apply status filter
        if (filters.status === 'paid') {
            query = query.eq('status', 'paid');
        }

        // Apply period filter
        if (filters.months) {
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(filters.months));
            query = query.gte('created_at', cutoffDate.toISOString());
        }

        const { data: invoices, error } = await query;

        if (error) {
            console.error('Error loading invoices:', error);
            return;
        }

        if (!invoices || invoices.length === 0) {
            // Show empty state
            if (invoicesTable) invoicesTable.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        // Show table
        if (invoicesTable) invoicesTable.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');

        // Update payment count
        if (paymentCountEl) {
            paymentCountEl.textContent = invoices.length;
        }

        // Calculate and update total
        const total = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.amount_paid_cents || 0), 0);
        
        const historyTotalEl = document.getElementById('historyTotal');
        if (historyTotalEl) historyTotalEl.textContent = formatCurrency(total);

        // Render invoices
        invoicesBody.innerHTML = invoices.map(invoice => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${formatDate(invoice.created_at)}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 font-medium">
                    ${formatCurrency(invoice.amount_paid_cents)}
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(invoice.status)}">
                        ${invoice.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm">
                    ${invoice.hosted_invoice_url ? `
                        <a href="${invoice.hosted_invoice_url}" target="_blank" class="text-primary hover:text-primary-hover">
                            View receipt →
                        </a>
                    ` : '--'}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading invoices:', error);
        invoicesBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-red-500">
                    Error loading invoices. Please try again.
                </td>
            </tr>
        `;
    }
}

function getStatusClasses(status) {
    switch (status) {
        case 'paid':
            return 'bg-green-100 text-green-800';
        case 'open':
        case 'draft':
            return 'bg-yellow-100 text-yellow-800';
        case 'void':
        case 'uncollectible':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function setupFilters(userId) {
    const statusFilter = document.getElementById('statusFilter');
    const periodFilter = document.getElementById('periodFilter');

    function applyFilters() {
        const filters = {
            status: statusFilter?.value !== 'all' ? statusFilter.value : null,
            months: periodFilter?.value !== 'all' ? periodFilter.value : null,
        };
        loadInvoices(userId, filters);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }

    if (periodFilter) {
        periodFilter.addEventListener('change', applyFilters);
    }
}
