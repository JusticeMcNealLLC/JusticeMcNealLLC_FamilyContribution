// Admin Transaction Log — All family transactions (Stripe + manual deposits)

const PAGE_SIZE = 50;
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
let memberMap = {};

document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth(true);
    if (!user) return;

    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    await loadMembers();
    await loadAllTransactions();
    setupFilters();
    setupPagination();
});

// ─── Load Members for Filter ────────────────────────────
async function loadMembers() {
    try {
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('id, email')
            .order('email');

        if (error) throw error;

        const select = document.getElementById('memberFilter');
        (profiles || []).forEach(p => {
            memberMap[p.id] = p.email;
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.email;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load members:', err);
    }
}

// ─── Load All Transactions ──────────────────────────────
async function loadAllTransactions() {
    try {
        const [invoiceRes, depositRes] = await Promise.all([
            supabaseClient
                .from('invoices')
                .select('user_id, amount_paid_cents, status, created_at, hosted_invoice_url')
                .order('created_at', { ascending: false }),
            supabaseClient
                .from('manual_deposits')
                .select('member_id, amount_cents, deposit_date, deposit_type, notes, created_at')
                .order('deposit_date', { ascending: false })
        ]);

        if (invoiceRes.error) throw invoiceRes.error;
        if (depositRes.error) throw depositRes.error;

        allTransactions = [];

        (invoiceRes.data || []).forEach(inv => {
            allTransactions.push({
                source: 'stripe',
                memberId: inv.user_id,
                memberEmail: memberMap[inv.user_id] || 'Unknown',
                date: new Date(inv.created_at),
                amount: inv.amount_paid_cents || 0,
                status: inv.status,
                receiptUrl: inv.hosted_invoice_url || null,
                depositType: null,
                notes: null,
            });
        });

        (depositRes.data || []).forEach(dep => {
            const typeLabel = dep.deposit_type === 'cash' ? 'Cash' : dep.deposit_type === 'transfer' ? 'Transfer' : dep.deposit_type === 'other' ? 'Other' : 'Manual';
            allTransactions.push({
                source: 'deposit',
                memberId: dep.member_id,
                memberEmail: memberMap[dep.member_id] || 'Unknown',
                date: new Date(dep.deposit_date + 'T00:00:00'),
                amount: dep.amount_cents,
                status: 'paid',
                receiptUrl: null,
                depositType: typeLabel,
                notes: dep.notes,
            });
        });

        allTransactions.sort((a, b) => b.date - a.date);

        applyFiltersAndRender();
        updateSummary();
    } catch (err) {
        console.error('Error loading transactions:', err);
    }
}

// ─── Summary Stats ──────────────────────────────────────
async function updateSummary() {
    // All Time total via RPC
    try {
        const { data: allTimeTotal } = await supabaseClient.rpc('get_family_contribution_total');
        document.getElementById('statAllTime').textContent = formatCurrency(allTimeTotal || 0);
    } catch (e) { /* */ }

    // This month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTotal = allTransactions
        .filter(t => t.date >= startOfMonth && (t.status === 'paid'))
        .reduce((s, t) => s + t.amount, 0);
    document.getElementById('statThisMonth').textContent = formatCurrency(thisMonthTotal);

    // Counts
    const stripeCount = allTransactions.filter(t => t.source === 'stripe' && t.status === 'paid').length;
    const depositCount = allTransactions.filter(t => t.source === 'deposit').length;
    document.getElementById('statStripeCount').textContent = stripeCount;
    document.getElementById('statDepositCount').textContent = depositCount;
}

// ─── Filtering ──────────────────────────────────────────
function applyFiltersAndRender() {
    const memberFilter = document.getElementById('memberFilter')?.value;
    const sourceFilter = document.getElementById('sourceFilter')?.value;
    const periodFilter = document.getElementById('periodFilter')?.value;

    filteredTransactions = [...allTransactions];

    // Member filter
    if (memberFilter && memberFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.memberId === memberFilter);
    }

    // Source filter
    if (sourceFilter && sourceFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.source === sourceFilter);
    }

    // Period filter
    if (periodFilter && periodFilter !== 'all') {
        const months = parseInt(periodFilter);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - months);
        filteredTransactions = filteredTransactions.filter(t => t.date >= cutoff);
    }

    currentPage = 1;
    renderPage();
}

function setupFilters() {
    ['memberFilter', 'sourceFilter', 'periodFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyFiltersAndRender);
    });
}

// ─── Pagination ─────────────────────────────────────────
function setupPagination() {
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderPage(); }
    });
    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
        if (currentPage < totalPages) { currentPage++; renderPage(); }
    });
}

// ─── Rendering ──────────────────────────────────────────
function renderPage() {
    const container = document.getElementById('transactionsContainer');
    const table = document.getElementById('transactionsTable');
    const emptyState = document.getElementById('emptyState');
    const paginationRow = document.getElementById('paginationRow');

    if (filteredTransactions.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        paginationRow.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    table.classList.remove('hidden');
    emptyState.classList.add('hidden');

    const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, filteredTransactions.length);
    const pageItems = filteredTransactions.slice(start, end);

    // Pagination controls
    if (totalPages > 1) {
        paginationRow.classList.remove('hidden');
        paginationRow.classList.add('flex');
        document.getElementById('paginationInfo').textContent = `${start + 1}–${end} of ${filteredTransactions.length}`;
        document.getElementById('prevPageBtn').disabled = currentPage <= 1;
        document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
    } else {
        paginationRow.classList.add('hidden');
    }

    renderDesktopTable(pageItems);
    renderMobileList(pageItems);
}

function getInitials(email) {
    const name = email.split('@')[0];
    const parts = name.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function renderDesktopTable(items) {
    const tbody = document.getElementById('transactionsBody');
    tbody.innerHTML = items.map(tx => {
        const sourceBadge = tx.source === 'stripe'
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Stripe</span>'
            : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">${tx.depositType}</span>`;

        const statusCls = tx.status === 'paid' ? 'bg-green-100 text-green-800' : tx.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600';

        const notes = tx.notes
            ? `<span class="text-gray-500 text-sm truncate block max-w-[180px]" title="${tx.notes}">${tx.notes}</span>`
            : tx.receiptUrl
                ? `<a href="${tx.receiptUrl}" target="_blank" class="text-brand-600 hover:text-brand-700 text-sm font-medium">Receipt &rarr;</a>`
                : '<span class="text-gray-300">—</span>';

        return `<tr class="hover:bg-gray-50 transition">
            <td class="px-5 py-3.5 text-sm text-gray-900 whitespace-nowrap">${formatDate(tx.date)}</td>
            <td class="px-5 py-3.5">
                <span class="text-sm text-gray-900 truncate block max-w-[200px]" title="${tx.memberEmail}">${tx.memberEmail}</span>
            </td>
            <td class="px-5 py-3.5">${sourceBadge}</td>
            <td class="px-5 py-3.5 text-sm font-semibold ${tx.status === 'paid' ? 'text-emerald-600' : 'text-gray-700'}">+${formatCurrency(tx.amount)}</td>
            <td class="px-5 py-3.5"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCls}">${tx.status}</span></td>
            <td class="px-5 py-3.5">${notes}</td>
        </tr>`;
    }).join('');
}

function renderMobileList(items) {
    const list = document.getElementById('transactionsMobileList');
    list.innerHTML = items.map(tx => {
        const isDeposit = tx.source === 'deposit';
        const iconBg = isDeposit ? 'bg-blue-100' : 'bg-emerald-100';
        const iconColor = isDeposit ? 'text-blue-600' : 'text-emerald-600';
        const icon = isDeposit
            ? `<svg class="w-4 h-4 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>`
            : `<svg class="w-4 h-4 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;

        const label = isDeposit ? `${tx.depositType} deposit` : 'Subscription';
        const initials = getInitials(tx.memberEmail);

        return `<div class="flex items-center gap-3 px-4 py-3.5">
            <div class="w-9 h-9 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0">${icon}</div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-900 truncate">${tx.memberEmail.split('@')[0]}</span>
                    <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isDeposit ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}">${label}</span>
                </div>
                <div class="text-xs text-gray-500">${formatDate(tx.date)}${tx.notes ? ' · ' + tx.notes : ''}</div>
            </div>
            <span class="text-sm font-bold ${tx.status === 'paid' ? 'text-emerald-600' : 'text-gray-600'} flex-shrink-0">+${formatCurrency(tx.amount)}</span>
        </div>`;
    }).join('');
}
