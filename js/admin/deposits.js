// Admin Manual Deposits Management
// Record, view, filter, and delete manual deposits

let currentUser = null;
let allDeposits = [];
let memberMap = {}; // id → { email, name }
let pendingDeleteId = null;

document.addEventListener('DOMContentLoaded', async function () {
    currentUser = await checkAuth(true);
    if (!currentUser) return;

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // Set default date to today
    document.getElementById('depositDate').value = new Date().toISOString().split('T')[0];

    // Form submit
    document.getElementById('depositForm').addEventListener('submit', handleDepositSubmit);

    // Filter
    document.getElementById('filterMember').addEventListener('change', renderDeposits);

    // Delete modal
    document.getElementById('deleteModalOverlay').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);

    // Load data
    await loadMembers();
    await loadDeposits();
});

// ─── Load Members ───────────────────────────────────────

async function loadMembers() {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id, email, is_active')
            .eq('is_active', true)
            .order('email');

        if (error) throw error;

        const memberSelect = document.getElementById('depositMember');
        const filterSelect = document.getElementById('filterMember');

        (data || []).forEach(m => {
            const name = m.email;
            memberMap[m.id] = { email: m.email, name };

            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = name;
            memberSelect.appendChild(opt);

            const filterOpt = document.createElement('option');
            filterOpt.value = m.id;
            filterOpt.textContent = name;
            filterSelect.appendChild(filterOpt);
        });
    } catch (err) {
        console.error('Failed to load members:', err);
    }
}

// ─── Handle Form Submit ─────────────────────────────────

async function handleDepositSubmit(e) {
    e.preventDefault();
    hideMessages();

    const memberId = document.getElementById('depositMember').value;
    const amountStr = document.getElementById('depositAmount').value;
    const date = document.getElementById('depositDate').value;
    const type = document.getElementById('depositType').value;
    const notes = document.getElementById('depositNotes').value.trim();

    if (!memberId) { showError('Please select a member'); return; }
    if (!amountStr || parseFloat(amountStr) <= 0) { showError('Please enter a valid amount'); return; }
    if (!date) { showError('Please select a deposit date'); return; }

    const amountCents = Math.round(parseFloat(amountStr) * 100);
    const btn = document.getElementById('depositSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const { error } = await supabaseClient
            .from('manual_deposits')
            .insert({
                member_id: memberId,
                amount_cents: amountCents,
                deposit_date: date,
                deposit_type: type,
                notes: notes || null,
                recorded_by: currentUser.id,
            });

        if (error) throw error;

        showSuccess(`Deposit of $${parseFloat(amountStr).toFixed(2)} recorded for ${memberMap[memberId]?.name || 'member'}`);

        // Reset form (keep member and date for quick multi-entry)
        document.getElementById('depositAmount').value = '';
        document.getElementById('depositNotes').value = '';

        await loadDeposits();
    } catch (err) {
        showError('Failed to save deposit: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Record Deposit';
    }
}

// ─── Load Deposits ──────────────────────────────────────

async function loadDeposits() {
    try {
        const { data, error } = await supabaseClient
            .from('manual_deposits')
            .select('*')
            .order('deposit_date', { ascending: false });

        if (error) throw error;

        allDeposits = data || [];
        renderSummary();
        renderDeposits();
    } catch (err) {
        console.error('Failed to load deposits:', err);
    }
}

// ─── Render Summary Cards ───────────────────────────────

function renderSummary() {
    const total = allDeposits.reduce((s, d) => s + d.amount_cents, 0);
    document.getElementById('totalDeposits').textContent = formatCurrency(total);
    document.getElementById('countDeposits').textContent = allDeposits.length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTotal = allDeposits
        .filter(d => new Date(d.deposit_date + 'T00:00:00') >= startOfMonth)
        .reduce((s, d) => s + d.amount_cents, 0);
    document.getElementById('monthDeposits').textContent = formatCurrency(monthTotal);

    document.getElementById('depositCount').textContent = `${allDeposits.length} record${allDeposits.length === 1 ? '' : 's'}`;
}

// ─── Render Deposits List ───────────────────────────────

function renderDeposits() {
    const filterMemberId = document.getElementById('filterMember').value;
    const filtered = filterMemberId
        ? allDeposits.filter(d => d.member_id === filterMemberId)
        : allDeposits;

    const tbody = document.getElementById('depositsTableBody');
    const mobileList = document.getElementById('depositsMobileList');
    const emptyState = document.getElementById('emptyState');

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        mobileList.innerHTML = '';
        document.querySelector('#depositsTableBody')?.closest('.bg-white')?.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    document.querySelector('#depositsTableBody')?.closest('.bg-white')?.classList.remove('hidden');

    // Desktop table
    tbody.innerHTML = filtered.map(d => {
        const date = new Date(d.deposit_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const member = memberMap[d.member_id]?.name || d.member_id;
        const amount = formatCurrency(d.amount_cents);
        const type = formatDepositType(d.deposit_type);
        const notes = d.notes ? escapeHtml(d.notes) : '<span class="text-gray-300">—</span>';

        return `<tr class="border-b border-gray-100 last:border-0 hover:bg-surface-50 transition-colors">
            <td class="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">${date}</td>
            <td class="px-5 py-3.5 text-gray-700">${escapeHtml(member)}</td>
            <td class="px-5 py-3.5 text-right font-bold text-emerald-600 whitespace-nowrap">${amount}</td>
            <td class="px-5 py-3.5">${type}</td>
            <td class="px-5 py-3.5 text-gray-500 text-xs max-w-[200px] truncate">${notes}</td>
            <td class="px-5 py-3.5 text-right">
                <button onclick="openDeleteModal('${d.id}', '${escapeHtml(member)}', ${d.amount_cents}, '${d.deposit_date}')"
                    class="text-gray-400 hover:text-red-600 transition p-1.5 rounded-lg hover:bg-red-50">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        </tr>`;
    }).join('');

    // Mobile list
    mobileList.innerHTML = filtered.map(d => {
        const date = new Date(d.deposit_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
        const member = memberMap[d.member_id]?.name || d.member_id;
        const amount = formatCurrency(d.amount_cents);
        const type = formatDepositType(d.deposit_type);

        return `<div class="px-4 py-3.5">
            <div class="flex justify-between items-start">
                <div class="min-w-0 flex-1">
                    <div class="font-medium text-gray-900 text-sm">${escapeHtml(member)}</div>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-xs text-gray-500">${date}</span>
                        <span class="text-xs text-gray-300">·</span>
                        ${type}
                    </div>
                    ${d.notes ? `<div class="text-xs text-gray-400 mt-1 truncate">${escapeHtml(d.notes)}</div>` : ''}
                </div>
                <div class="text-right flex-shrink-0 flex items-center gap-2 ml-3">
                    <span class="font-bold text-emerald-600">${amount}</span>
                    <button onclick="openDeleteModal('${d.id}', '${escapeHtml(member)}', ${d.amount_cents}, '${d.deposit_date}')"
                        class="text-gray-300 hover:text-red-600 transition p-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─── Delete Modal ───────────────────────────────────────

function openDeleteModal(id, memberName, amountCents, date) {
    pendingDeleteId = id;
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('deleteModalText').textContent =
        `Delete the ${formatCurrency(amountCents)} deposit for ${memberName} on ${formattedDate}? This cannot be undone.`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    pendingDeleteId = null;
    document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
    if (!pendingDeleteId) return;
    const btn = document.getElementById('deleteConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
        const { error } = await supabaseClient
            .from('manual_deposits')
            .delete()
            .eq('id', pendingDeleteId);

        if (error) throw error;

        closeDeleteModal();
        await loadDeposits();
        showSuccess('Deposit deleted');
    } catch (err) {
        showError('Failed to delete: ' + err.message);
        closeDeleteModal();
    } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
    }
}

// ─── Helpers ────────────────────────────────────────────

function formatCurrency(cents) {
    return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDepositType(type) {
    const types = {
        manual: '<span class="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-semibold">Manual</span>',
        transfer: '<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Transfer</span>',
        cash: '<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Cash</span>',
        other: '<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">Other</span>',
    };
    return types[type] || types.other;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(msg) {
    const el = document.getElementById('depositSuccess');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
}

function showError(msg) {
    const el = document.getElementById('depositError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function hideMessages() {
    document.getElementById('depositSuccess').classList.add('hidden');
    document.getElementById('depositError').classList.add('hidden');
}
