// Admin Expense Tracker
// CRUD for LLC business expenses with receipt storage, charts, CSV export

const RECEIPT_BUCKET = 'llc-receipts';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

// ── IRS Schedule C Categories ──
const IRS_MILEAGE_RATE = 0.70; // 2026 IRS standard mileage rate

const CATEGORY_CONFIG = {
    'advertising':      { label: 'Advertising',            icon: '📢', line: 'Line 8',  color: '#6366f1', pct: 1 },
    'travel-mileage':   { label: 'Travel & Mileage',       icon: '🚗', line: 'Line 9',  color: '#ef4444', pct: 1 },
    'commissions':      { label: 'Commissions & Fees',     icon: '💳', line: 'Line 10', color: '#8b5cf6', pct: 1 },
    'contract-labor':   { label: 'Contract Labor',         icon: '👷', line: 'Line 11', color: '#a855f7', pct: 1 },
    'depreciation':     { label: 'Depreciation',           icon: '📉', line: 'Line 13', color: '#78716c', pct: 1 },
    'insurance':        { label: 'Insurance',              icon: '🛡️', line: 'Line 15', color: '#06b6d4', pct: 1 },
    'interest':         { label: 'Interest (Business)',     icon: '🏦', line: 'Line 16a',color: '#0d9488', pct: 1 },
    'legal':            { label: 'Legal & Professional',   icon: '⚖️', line: 'Line 17', color: '#0ea5e9', pct: 1 },
    'office':           { label: 'Office & Software',      icon: '💻', line: 'Line 18', color: '#3b82f6', pct: 1 },
    'rent-hosting':     { label: 'Rent / Hosting / SaaS',  icon: '🖥️', line: 'Line 20b',color: '#10b981', pct: 1 },
    'repairs':          { label: 'Repairs & Maintenance',  icon: '🔧', line: 'Line 21', color: '#a3a3a3', pct: 1 },
    'supplies':         { label: 'Supplies',               icon: '📦', line: 'Line 22', color: '#d97706', pct: 1 },
    'taxes-licenses':   { label: 'Taxes & Licenses',       icon: '🏛️', line: 'Line 23', color: '#f59e0b', pct: 1 },
    'meals':            { label: 'Meals (50% Deductible)',  icon: '🍽️', line: 'Line 24b',color: '#e11d48', pct: 0.5 },
    'utilities':        { label: 'Utilities (Internet)',    icon: '🌐', line: 'Line 25', color: '#f97316', pct: 1 },
    'member-payouts':   { label: 'Member Payouts & Prizes',icon: '🎁', line: 'Line 27', color: '#ec4899', pct: 1 },
    'other':            { label: 'Other Expenses',          icon: '📁', line: 'Line 27', color: '#6b7280', pct: 1 },
};

let currentUser = null;
let allExpenses = [];
let pendingDeleteId = null;
let pendingDeleteReceiptPath = null;
let selectedReceipt = null;
let editingExpenseId = null;
let expenseChart = null;
let chartType = 'pie';

// ══════════════════════════════════════════════
// Init
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async function () {
    currentUser = await checkAuth(true);
    if (!currentUser) return;

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    initCategoryDropdowns();
    initEventListeners();
    await loadExpenses();
});

function initCategoryDropdowns() {
    const selects = [document.getElementById('expCategory'), document.getElementById('filterCategory')];
    for (const sel of selects) {
        if (!sel) continue;
        // Keep the first option (placeholder / "All")
        const firstOpt = sel.options[0];
        sel.innerHTML = '';
        sel.appendChild(firstOpt);
        for (const [key, cfg] of Object.entries(CATEGORY_CONFIG)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${cfg.icon} ${cfg.label} (${cfg.line})`;
            sel.appendChild(opt);
        }
    }
}

function initEventListeners() {
    // Add expense
    document.getElementById('addExpenseBtn').addEventListener('click', () => openExpenseModal());
    document.getElementById('expenseModalOverlay').addEventListener('click', closeExpenseModal);
    document.getElementById('cancelBtn').addEventListener('click', closeExpenseModal);
    document.getElementById('expenseForm').addEventListener('submit', handleSaveExpense);

    // Recurring toggle
    document.getElementById('expRecurring').addEventListener('change', (e) => {
        document.getElementById('recurrenceRow').classList.toggle('hidden', !e.target.checked);
    });

    // Category change — show/hide mileage section
    document.getElementById('expCategory').addEventListener('change', (e) => {
        const isMileage = e.target.value === 'travel-mileage';
        document.getElementById('mileageSection').classList.toggle('hidden', !isMileage);
        // Show meals hint
        const mealsHint = document.getElementById('mealsHint');
        if (mealsHint) mealsHint.classList.toggle('hidden', e.target.value !== 'meals');
        if (isMileage) {
            document.getElementById('mileageRateDisplay').textContent = IRS_MILEAGE_RATE.toFixed(2);
            // Auto-calc on miles input
            document.getElementById('expMiles').focus();
        } else {
            // Clear mileage fields when switching away
            document.getElementById('expMiles').value = '';
            document.getElementById('expTripFrom').value = '';
            document.getElementById('expTripTo').value = '';
            document.getElementById('mileageDeduction').textContent = '$0.00';
        }
    });

    // Miles driven → auto-calc amount
    document.getElementById('expMiles').addEventListener('input', (e) => {
        const miles = parseFloat(e.target.value) || 0;
        const deduction = miles * IRS_MILEAGE_RATE;
        document.getElementById('mileageDeduction').textContent = '$' + deduction.toFixed(2);
        // Auto-fill the amount field
        document.getElementById('expAmount').value = deduction.toFixed(2);
    });

    // Receipt upload
    const dropZone = document.getElementById('receiptDropZone');
    const receiptInput = document.getElementById('receiptInput');
    dropZone.addEventListener('click', () => receiptInput.click());
    receiptInput.addEventListener('change', handleReceiptSelect);
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', handleReceiptDrop);
    document.getElementById('clearReceiptBtn').addEventListener('click', clearReceipt);

    // Delete modal
    document.getElementById('deleteModalOverlay').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteConfirmBtn').addEventListener('click', handleDeleteConfirm);

    // Receipt view modal
    document.getElementById('receiptViewOverlay').addEventListener('click', closeReceiptView);
    document.getElementById('receiptViewClose').addEventListener('click', closeReceiptView);

    // Filters
    document.getElementById('searchInput').addEventListener('input', renderTable);
    document.getElementById('filterCategory').addEventListener('change', renderTable);
    document.getElementById('filterYear').addEventListener('change', () => { renderTable(); renderScheduleCSummary(); });
    document.getElementById('filterMonth').addEventListener('change', renderTable);

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportCSV);

    // Chart toggles
    document.getElementById('chartTogglePie').addEventListener('click', () => setChartType('pie'));
    document.getElementById('chartToggleBar').addEventListener('click', () => setChartType('bar'));
}

// ══════════════════════════════════════════════
// Load
// ══════════════════════════════════════════════
async function loadExpenses() {
    try {
        const { data, error } = await supabaseClient
            .from('llc_expenses')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        allExpenses = data || [];

        populateYearFilter();
        updateStats();
        renderTable();
        renderChart();
        renderScheduleCSummary();

        document.getElementById('tableSkeleton').classList.add('hidden');
    } catch (err) {
        console.error('Failed to load expenses:', err);
        showError('Failed to load expenses. Please refresh.');
    }
}

function populateYearFilter() {
    const sel = document.getElementById('filterYear');
    const years = [...new Set(allExpenses.map(e => new Date(e.date).getFullYear()))].sort((a, b) => b - a);
    // Keep first option
    const first = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(first);
    for (const y of years) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        sel.appendChild(opt);
    }
}

// ══════════════════════════════════════════════
// Stats
// ══════════════════════════════════════════════
function updateStats() {
    const now = new Date();
    const thisMonth = allExpenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisYear = allExpenses.filter(e => new Date(e.date).getFullYear() === now.getFullYear());
    const recurring = allExpenses.filter(e => e.is_recurring);

    const sumMonth = thisMonth.reduce((s, e) => s + parseFloat(e.amount), 0);
    const sumYear = thisYear.reduce((s, e) => s + parseFloat(e.amount), 0);

    document.getElementById('statMonth').textContent = '$' + sumMonth.toFixed(2);
    document.getElementById('statYear').textContent = '$' + sumYear.toFixed(2);
    document.getElementById('statCount').textContent = allExpenses.length;
    document.getElementById('statRecurring').textContent = recurring.length;

    // Mileage stats — YTD miles
    const ytdMiles = thisYear
        .filter(e => e.miles_driven)
        .reduce((s, e) => s + parseFloat(e.miles_driven), 0);
    document.getElementById('statMiles').textContent = ytdMiles > 0 ? ytdMiles.toFixed(1) : '0';

    // Missing receipts
    const missingReceipts = allExpenses.filter(e => !e.receipt_path && parseFloat(e.amount) >= 25).length;
    const missingEl = document.getElementById('statMissingReceipts');
    if (missingEl) {
        missingEl.textContent = missingReceipts;
        missingEl.closest('.stat-card')?.classList.toggle('hidden', missingReceipts === 0);
    }
}

// ══════════════════════════════════════════════
// Filtering
// ══════════════════════════════════════════════
function getFilteredExpenses() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const catFilter = document.getElementById('filterCategory').value;
    const yearFilter = document.getElementById('filterYear').value;
    const monthFilter = document.getElementById('filterMonth').value;

    return allExpenses.filter(e => {
        if (catFilter && e.category !== catFilter) return false;
        if (yearFilter && new Date(e.date).getFullYear() !== parseInt(yearFilter)) return false;
        if (monthFilter && (new Date(e.date).getMonth() + 1) !== parseInt(monthFilter)) return false;
        if (search) {
            const hay = `${e.description || ''} ${e.vendor || ''} ${e.notes || ''} ${e.category || ''}`.toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });
}

// ══════════════════════════════════════════════
// Render Table
// ══════════════════════════════════════════════
function renderTable() {
    const filtered = getFilteredExpenses();
    const tbody = document.getElementById('expenseTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableSkel = document.getElementById('tableSkeleton');

    tableSkel.classList.add('hidden');

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.toggle('hidden', allExpenses.length > 0 && filtered.length === 0 ? true : false);
        if (allExpenses.length > 0 && filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-gray-400">No expenses match your filters.</td></tr>`;
            emptyState.classList.add('hidden');
        } else if (allExpenses.length === 0) {
            emptyState.classList.remove('hidden');
        }
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = filtered.map(exp => {
        const cat = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG['other'];
        const d = new Date(exp.date + 'T00:00:00');
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const amt = parseFloat(exp.amount).toFixed(2);
        const hasReceipt = !!exp.receipt_path;
        const recurBadge = exp.is_recurring
            ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-700 ml-2">↻ ${exp.recurrence_interval || 'recurring'}</span>`
            : '';
        const milesBadge = exp.miles_driven
            ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-red-100 text-red-700 ml-1">🚗 ${parseFloat(exp.miles_driven).toFixed(1)} mi</span>`
            : '';
        const noReceiptBadge = (!exp.receipt_path && parseFloat(exp.amount) >= 25)
            ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-yellow-100 text-yellow-700 ml-1" title="Missing receipt — recommended for expenses ≥ $25">⚠ No receipt</span>`
            : '';
        const mealsBadge = (cat.pct && cat.pct < 1)
            ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-pink-100 text-pink-700 ml-1">${Math.round(cat.pct * 100)}% deductible</span>`
            : '';

        return `
            <tr class="border-b border-gray-50 hover:bg-surface-50 transition-colors group">
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap text-xs sm:text-sm">${dateStr}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <span class="text-base">${cat.icon}</span>
                        <div class="min-w-0">
                            <div class="text-sm font-medium text-gray-900 truncate">${escapeHtml(exp.description || '—')}</div>
                            <div class="text-xs text-gray-400 truncate sm:hidden">${cat.label}</div>
                        </div>
                        ${recurBadge}${milesBadge}${noReceiptBadge}${mealsBadge}
                    </div>
                </td>
                <td class="px-4 py-3 hidden sm:table-cell">
                    <span class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold" style="background: ${cat.color}15; color: ${cat.color}">
                        ${cat.label}
                    </span>
                </td>
                <td class="px-4 py-3 text-gray-600 text-sm hidden md:table-cell">${escapeHtml(exp.vendor || '—')}</td>
                <td class="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">$${amt}</td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
                        ${hasReceipt ? `<button onclick="viewReceipt('${exp.receipt_path}')" class="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition" title="View Receipt">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        </button>` : ''}
                        <button onclick="editExpense('${exp.id}')" class="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition" title="Edit">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="confirmDelete('${exp.id}', '${exp.receipt_path || ''}')" class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ══════════════════════════════════════════════
// Chart
// ══════════════════════════════════════════════
function setChartType(type) {
    chartType = type;
    document.getElementById('chartTogglePie').className = `px-3 py-1.5 text-xs font-semibold rounded-lg ${type === 'pie' ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'} transition`;
    document.getElementById('chartToggleBar').className = `px-3 py-1.5 text-xs font-semibold rounded-lg ${type === 'bar' ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100'} transition`;
    renderChart();
}

function renderChart() {
    const canvas = document.getElementById('expenseChart');
    const ctx = canvas.getContext('2d');
    const chartEmpty = document.getElementById('chartEmpty');

    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
    }

    // Aggregate by category
    const catTotals = {};
    const filtered = getFilteredExpenses();
    for (const exp of filtered) {
        const key = exp.category || 'other';
        catTotals[key] = (catTotals[key] || 0) + parseFloat(exp.amount);
    }

    const keys = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

    if (keys.length === 0) {
        chartEmpty.classList.remove('hidden');
        canvas.style.display = 'none';
        return;
    }

    chartEmpty.classList.add('hidden');
    canvas.style.display = 'block';

    const labels = keys.map(k => (CATEGORY_CONFIG[k] || CATEGORY_CONFIG['other']).label);
    const data = keys.map(k => catTotals[k]);
    const colors = keys.map(k => (CATEGORY_CONFIG[k] || CATEGORY_CONFIG['other']).color);

    if (chartType === 'pie') {
        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.map(c => c + '30'),
                    borderColor: colors,
                    borderWidth: 2,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { usePointStyle: true, padding: 16, font: { size: 11, family: 'Inter' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: $${ctx.raw.toFixed(2)}`
                        }
                    }
                }
            }
        });
    } else {
        expenseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Expenses',
                    data,
                    backgroundColor: colors.map(c => c + '40'),
                    borderColor: colors,
                    borderWidth: 1.5,
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `$${ctx.raw.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => '$' + v, font: { size: 11, family: 'Inter' } },
                        grid: { color: '#f1f5f9' }
                    },
                    x: {
                        ticks: { font: { size: 10, family: 'Inter' }, maxRotation: 45 },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

// ══════════════════════════════════════════════
// Expense Modal (Add / Edit)
// ══════════════════════════════════════════════
function openExpenseModal(expense = null) {
    editingExpenseId = expense ? expense.id : null;
    document.getElementById('modalTitle').textContent = expense ? 'Edit Expense' : 'Add Expense';
    document.getElementById('submitBtn').textContent = expense ? 'Update Expense' : 'Save Expense';
    document.getElementById('expenseId').value = expense ? expense.id : '';

    // Fill form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expDate').value = expense ? expense.date : today;
    document.getElementById('expAmount').value = expense ? expense.amount : '';
    document.getElementById('expCategory').value = expense ? expense.category : '';
    document.getElementById('expDescription').value = expense ? expense.description || '' : '';
    document.getElementById('expVendor').value = expense ? expense.vendor || '' : '';
    document.getElementById('expRecurring').checked = expense ? expense.is_recurring : false;
    document.getElementById('recurrenceRow').classList.toggle('hidden', !(expense && expense.is_recurring));
    document.getElementById('expRecurrenceInterval').value = expense ? expense.recurrence_interval || 'monthly' : 'monthly';
    document.getElementById('expNotes').value = expense ? expense.notes || '' : '';

    // Mileage fields
    const isMileage = expense && expense.category === 'travel-mileage';
    document.getElementById('mileageSection').classList.toggle('hidden', !isMileage);
    document.getElementById('expMiles').value = expense ? expense.miles_driven || '' : '';
    document.getElementById('expTripFrom').value = expense ? expense.trip_from || '' : '';
    document.getElementById('expTripTo').value = expense ? expense.trip_to || '' : '';
    if (isMileage && expense.miles_driven) {
        document.getElementById('mileageDeduction').textContent = '$' + (parseFloat(expense.miles_driven) * IRS_MILEAGE_RATE).toFixed(2);
    } else {
        document.getElementById('mileageDeduction').textContent = '$0.00';
    }

    // Meals hint
    const mealsHint = document.getElementById('mealsHint');
    if (mealsHint) mealsHint.classList.toggle('hidden', !(expense && expense.category === 'meals'));

    // Reset receipt
    selectedReceipt = null;
    document.getElementById('receiptPreview').classList.add('hidden');
    document.getElementById('receiptDropZone').classList.remove('hidden');
    document.getElementById('receiptInput').value = '';
    document.getElementById('uploadProgress').classList.add('hidden');

    // If editing and has receipt, show existing
    if (expense && expense.receipt_path) {
        document.getElementById('receiptPreview').classList.remove('hidden');
        document.getElementById('receiptDropZone').classList.add('hidden');
        document.getElementById('receiptName').textContent = expense.receipt_path.split('/').pop();
        document.getElementById('receiptSize').textContent = 'Existing receipt';
    }

    document.getElementById('expenseModal').classList.remove('hidden');
}

function closeExpenseModal() {
    document.getElementById('expenseModal').classList.add('hidden');
    editingExpenseId = null;
    selectedReceipt = null;
}

window.editExpense = function (id) {
    const exp = allExpenses.find(e => e.id === id);
    if (exp) openExpenseModal(exp);
};

// ══════════════════════════════════════════════
// Receipt Handling
// ══════════════════════════════════════════════
function handleReceiptSelect(e) {
    if (e.target.files.length) validateAndSetReceipt(e.target.files[0]);
}

function handleReceiptDrop(e) {
    e.preventDefault();
    document.getElementById('receiptDropZone').classList.remove('drag-over');
    if (e.dataTransfer.files.length) validateAndSetReceipt(e.dataTransfer.files[0]);
}

function validateAndSetReceipt(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
        showError('Only PDF, PNG, JPG, and WebP files are allowed.');
        return;
    }
    if (file.size > MAX_FILE_SIZE) {
        showError('File must be under 10MB.');
        return;
    }

    selectedReceipt = file;
    document.getElementById('receiptPreview').classList.remove('hidden');
    document.getElementById('receiptDropZone').classList.add('hidden');
    document.getElementById('receiptName').textContent = file.name;
    document.getElementById('receiptSize').textContent = formatFileSize(file.size);
}

function clearReceipt() {
    selectedReceipt = null;
    document.getElementById('receiptPreview').classList.add('hidden');
    document.getElementById('receiptDropZone').classList.remove('hidden');
    document.getElementById('receiptInput').value = '';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// ══════════════════════════════════════════════
// Save (Create / Update)
// ══════════════════════════════════════════════
async function handleSaveExpense(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    progressDiv.classList.remove('hidden');
    progressBar.style.width = '20%';
    progressText.textContent = 'Saving expense...';

    try {
        const date = document.getElementById('expDate').value;
        const amount = parseFloat(document.getElementById('expAmount').value);
        const category = document.getElementById('expCategory').value;
        const description = document.getElementById('expDescription').value.trim();
        const vendor = document.getElementById('expVendor').value.trim();
        const isRecurring = document.getElementById('expRecurring').checked;
        const recurrenceInterval = isRecurring ? document.getElementById('expRecurrenceInterval').value : null;
        const notes = document.getElementById('expNotes').value.trim();
        const scheduleCLine = CATEGORY_CONFIG[category]?.line || null;

        // Mileage fields
        const isMileageCat = category === 'travel-mileage';
        const milesDriven = isMileageCat ? parseFloat(document.getElementById('expMiles').value) || null : null;
        const tripFrom = isMileageCat ? document.getElementById('expTripFrom').value.trim() || null : null;
        const tripTo = isMileageCat ? document.getElementById('expTripTo').value.trim() || null : null;
        const mileageRate = isMileageCat ? IRS_MILEAGE_RATE : null;

        let receiptPath = editingExpenseId
            ? (allExpenses.find(e => e.id === editingExpenseId)?.receipt_path || null)
            : null;

        // Upload receipt if new file selected
        if (selectedReceipt) {
            progressBar.style.width = '40%';
            progressText.textContent = 'Uploading receipt...';

            const ext = selectedReceipt.name.split('.').pop().toLowerCase();
            const path = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

            const { error: uploadErr } = await supabaseClient.storage
                .from(RECEIPT_BUCKET)
                .upload(path, selectedReceipt, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadErr) throw uploadErr;
            receiptPath = path;
        }

        progressBar.style.width = '70%';
        progressText.textContent = 'Saving record...';

        const record = {
            date,
            amount,
            category,
            description: description || null,
            vendor: vendor || null,
            receipt_path: receiptPath,
            schedule_c_line: scheduleCLine,
            is_recurring: isRecurring,
            recurrence_interval: recurrenceInterval,
            notes: notes || null,
            miles_driven: milesDriven,
            mileage_rate: mileageRate,
            trip_from: tripFrom,
            trip_to: tripTo,
        };

        if (editingExpenseId) {
            // Update
            const { error } = await supabaseClient
                .from('llc_expenses')
                .update(record)
                .eq('id', editingExpenseId);
            if (error) throw error;
        } else {
            // Insert
            record.created_by = currentUser.id;
            const { error } = await supabaseClient
                .from('llc_expenses')
                .insert(record);
            if (error) throw error;
        }

        progressBar.style.width = '100%';
        progressText.textContent = 'Done!';

        closeExpenseModal();
        showSuccess(editingExpenseId ? 'Expense updated!' : 'Expense added!');
        await loadExpenses();

    } catch (err) {
        console.error('Save expense error:', err);
        showError('Failed to save expense: ' + (err.message || 'Unknown error'));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editingExpenseId ? 'Update Expense' : 'Save Expense';
        progressDiv.classList.add('hidden');
    }
}

// ══════════════════════════════════════════════
// Delete
// ══════════════════════════════════════════════
window.confirmDelete = function (id, receiptPath) {
    pendingDeleteId = id;
    pendingDeleteReceiptPath = receiptPath || null;
    document.getElementById('deleteModal').classList.remove('hidden');
};

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    pendingDeleteId = null;
    pendingDeleteReceiptPath = null;
}

async function handleDeleteConfirm() {
    if (!pendingDeleteId) return;

    const btn = document.getElementById('deleteConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
        // Delete receipt from storage
        if (pendingDeleteReceiptPath) {
            await supabaseClient.storage.from(RECEIPT_BUCKET).remove([pendingDeleteReceiptPath]);
        }

        // Delete record
        const { error } = await supabaseClient
            .from('llc_expenses')
            .delete()
            .eq('id', pendingDeleteId);

        if (error) throw error;

        closeDeleteModal();
        showSuccess('Expense deleted.');
        await loadExpenses();

    } catch (err) {
        console.error('Delete error:', err);
        showError('Failed to delete: ' + (err.message || 'Unknown error'));
    } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
    }
}

// ══════════════════════════════════════════════
// View Receipt
// ══════════════════════════════════════════════
window.viewReceipt = async function (path) {
    if (!path) return;

    const container = document.getElementById('receiptViewContent');
    container.innerHTML = '<div class="flex items-center justify-center py-8"><div class="skeleton h-40 w-40 rounded-lg"></div></div>';
    document.getElementById('receiptViewModal').classList.remove('hidden');

    try {
        const { data, error } = await supabaseClient.storage
            .from(RECEIPT_BUCKET)
            .createSignedUrl(path, 3600); // 1 hour

        if (error) throw error;

        const ext = path.split('.').pop().toLowerCase();
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
            container.innerHTML = `<img src="${data.signedUrl}" alt="Receipt" class="max-w-full rounded-lg">`;
        } else {
            container.innerHTML = `<iframe src="${data.signedUrl}" class="w-full rounded-lg" style="height: 500px;" frameborder="0"></iframe>`;
        }
    } catch (err) {
        container.innerHTML = `<p class="text-red-500 text-sm p-4">Failed to load receipt: ${err.message}</p>`;
    }
};

function closeReceiptView() {
    document.getElementById('receiptViewModal').classList.add('hidden');
}

// ══════════════════════════════════════════════
// CSV Export
// ══════════════════════════════════════════════
function exportCSV() {
    const filtered = getFilteredExpenses();
    if (filtered.length === 0) {
        showError('No expenses to export.');
        return;
    }

    const headers = ['Date', 'Amount', 'Deductible Amount', 'Category', 'Schedule C Line', 'Description', 'Vendor', 'Recurring', 'Frequency', 'Miles', 'Mileage Rate', 'Trip From', 'Trip To', 'Has Receipt', 'Notes'];
    const rows = filtered.map(e => {
        const cat = CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG['other'];
        const pct = cat.pct ?? 1;
        const deductible = (parseFloat(e.amount) * pct).toFixed(2);
        return [
            e.date,
            parseFloat(e.amount).toFixed(2),
            deductible,
            cat.label,
            e.schedule_c_line || '',
            `"${(e.description || '').replace(/"/g, '""')}"`,
            `"${(e.vendor || '').replace(/"/g, '""')}"`,
            e.is_recurring ? 'Yes' : 'No',
            e.recurrence_interval || '',
            e.miles_driven || '',
            e.mileage_rate || '',
            `"${(e.trip_from || '').replace(/"/g, '""')}"`,
            `"${(e.trip_to || '').replace(/"/g, '""')}"`,
            e.receipt_path ? 'Yes' : 'No',
            `"${(e.notes || '').replace(/"/g, '""')}"`
        ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const yearFilter = document.getElementById('filterYear').value;
    const fname = yearFilter ? `llc-expenses-${yearFilter}.csv` : 'llc-expenses.csv';

    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);

    showSuccess(`Exported ${filtered.length} expenses to ${fname}`);
}

// ══════════════════════════════════════════════
// Schedule C Tax Summary
// ══════════════════════════════════════════════
function renderScheduleCSummary() {
    const container = document.getElementById('scheduleCBody');
    if (!container) return;

    // Group by tax year — default to current selected filter year or current year
    const yearFilter = document.getElementById('filterYear').value;
    const targetYear = yearFilter ? parseInt(yearFilter) : new Date().getFullYear();

    const yearExpenses = allExpenses.filter(e => new Date(e.date).getFullYear() === targetYear);

    // Aggregate by Schedule C line
    const lineTotals = {};
    for (const exp of yearExpenses) {
        const cat = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG['other'];
        const line = cat.line || 'Line 27';
        if (!lineTotals[line]) {
            lineTotals[line] = { line, label: cat.label, icon: cat.icon, color: cat.color, total: 0, deductible: 0, count: 0, categories: {} };
        }
        const amt = parseFloat(exp.amount);
        const pct = cat.pct ?? 1;
        lineTotals[line].total += amt;
        lineTotals[line].deductible += amt * pct;
        lineTotals[line].count++;
        // Track sub-categories within same line
        if (!lineTotals[line].categories[exp.category]) {
            lineTotals[line].categories[exp.category] = { label: cat.label, icon: cat.icon, total: 0, deductible: 0, pct };
        }
        lineTotals[line].categories[exp.category].total += amt;
        lineTotals[line].categories[exp.category].deductible += amt * pct;
    }

    // Sort by line number
    const sorted = Object.values(lineTotals).sort((a, b) => {
        const numA = parseInt(a.line.replace(/\D/g, '')) || 99;
        const numB = parseInt(b.line.replace(/\D/g, '')) || 99;
        return numA - numB;
    });

    const grandTotal = sorted.reduce((s, l) => s + l.total, 0);
    const grandDeductible = sorted.reduce((s, l) => s + l.deductible, 0);

    // Update header
    const headerEl = document.getElementById('scheduleCYear');
    if (headerEl) headerEl.textContent = targetYear;
    const totalEl = document.getElementById('scheduleCTotal');
    if (totalEl) totalEl.textContent = '$' + grandDeductible.toFixed(2);

    if (sorted.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-gray-400">No expenses for this year yet</td></tr>';
        return;
    }

    container.innerHTML = sorted.map(item => {
        const cats = Object.values(item.categories);
        // Show sub-categories if there are multiple in the same line
        const subRows = cats.length > 1 ? cats.map(c =>
            `<div class="text-[10px] text-gray-400 ml-5">${c.icon} ${c.label}: $${c.total.toFixed(2)}${c.pct < 1 ? ` → $${c.deductible.toFixed(2)} (${Math.round(c.pct * 100)}%)` : ''}</div>`
        ).join('') : '';
        const hasPartial = cats.some(c => c.pct < 1);
        return `
            <tr class="border-b border-gray-50 hover:bg-surface-50/50 transition">
                <td class="px-4 py-3 text-xs font-mono font-semibold text-gray-500">${item.line}</td>
                <td class="px-4 py-3">
                    <div class="text-sm font-medium text-gray-900">${cats.map(c => c.icon).join(' ')} ${cats.map(c => c.label).join(', ')}</div>
                    ${subRows}
                </td>
                <td class="px-4 py-3 text-center text-xs text-gray-500">${item.count}</td>
                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-700">$${item.total.toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-sm font-bold ${hasPartial ? 'text-pink-700' : 'text-emerald-700'}">$${item.deductible.toFixed(2)}${hasPartial ? ' *' : ''}</td>
            </tr>
        `;
    }).join('') + `
        <tr class="border-t-2 border-gray-200 bg-gray-50/70">
            <td class="px-4 py-3 font-bold text-xs text-gray-700" colspan="3">TOTAL DEDUCTIONS</td>
            <td class="px-4 py-3 text-right text-sm font-bold text-gray-500">$${grandTotal.toFixed(2)}</td>
            <td class="px-4 py-3 text-right text-base font-extrabold text-emerald-700">$${grandDeductible.toFixed(2)}</td>
        </tr>
    `;
}

// ══════════════════════════════════════════════
// Messages
// ══════════════════════════════════════════════
function showSuccess(msg) {
    const el = document.getElementById('successMsg');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('errorMsg').classList.add('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('successMsg').classList.add('hidden');
    setTimeout(() => el.classList.add('hidden'), 6000);
}
