// Admin Profits — P&L dashboard
// Pulls revenue from invoices + manual_deposits, expenses from llc_expenses
// Computes net profit, margin, monthly trend, Schedule C summary

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Revenue milestones ──
const REVENUE_MILESTONES = [
    { target: 2500,  label: '$2,500/yr',  icon: '📊', note: 'Consider upgrading Supabase, basic bookkeeping' },
    { target: 5000,  label: '$5,000/yr',  icon: '📈', note: 'LLC restructuring finalized, formal tax prep' },
    { target: 10000, label: '$10,000/yr', icon: '🔥', note: 'Consider S-Corp election for tax savings' },
    { target: 25000, label: '$25,000/yr', icon: '💪', note: 'Hire CPA, quarterly estimated tax payments' },
    { target: 50000, label: '$50,000/yr', icon: '🏦', note: 'Full business infrastructure, lending program' },
];

let allInvoices = [];
let allDeposits = [];
let allExpenses = [];
let selectedYear = new Date().getFullYear();
let trendChart = null;
let revenueChart = null;
let expenseChart = null;

// ── Init ──
document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth(true);
    if (!user) return;

    // Verify admin
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        window.location.href = '/portal/index.html';
        return;
    }

    await loadAllData();
    populateYearFilter();
    renderAll();

    // Year filter
    document.getElementById('yearFilter').addEventListener('change', (e) => {
        selectedYear = parseInt(e.target.value);
        renderAll();
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportCSV);
});

// ── Load Data ──
async function loadAllData() {
    const [invoiceRes, depositRes, expenseRes] = await Promise.all([
        supabaseClient
            .from('invoices')
            .select('amount_paid_cents, stripe_fee_cents, status, created_at, payment_type')
            .eq('status', 'paid')
            .order('created_at', { ascending: true }),
        supabaseClient
            .from('manual_deposits')
            .select('amount_cents, deposit_date, notes')
            .order('deposit_date', { ascending: true }),
        supabaseClient
            .from('llc_expenses')
            .select('amount, category, date, schedule_c_line')
            .order('date', { ascending: true }),
    ]);

    allInvoices = invoiceRes.data || [];
    allDeposits = depositRes.data || [];
    allExpenses = expenseRes.data || [];
}

// ── Year filter ──
function populateYearFilter() {
    const years = new Set();
    allInvoices.forEach(i => years.add(new Date(i.created_at).getFullYear()));
    allDeposits.forEach(d => years.add(new Date(d.deposit_date).getFullYear()));
    allExpenses.forEach(e => years.add(new Date(e.date).getFullYear()));
    years.add(new Date().getFullYear());

    const sorted = [...years].sort((a, b) => b - a);
    const sel = document.getElementById('yearFilter');
    sel.innerHTML = sorted.map(y =>
        `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`
    ).join('');
}

// ── Render All ──
function renderAll() {
    const yearInvoices = allInvoices.filter(i => new Date(i.created_at).getFullYear() === selectedYear);
    const yearDeposits = allDeposits.filter(d => new Date(d.deposit_date).getFullYear() === selectedYear);
    const yearExpenses = allExpenses.filter(e => new Date(e.date).getFullYear() === selectedYear);

    // Build monthly data
    const months = buildMonthlyData(yearInvoices, yearDeposits, yearExpenses);

    renderHeroStats(months, yearInvoices, yearDeposits, yearExpenses);
    renderTrendChart(months);
    renderRevenueBreakdown(yearInvoices, yearDeposits);
    renderExpenseBreakdown(yearExpenses);
    renderPLTable(months);
    renderMilestones(yearInvoices, yearDeposits);
    renderScheduleC(yearInvoices, yearDeposits, yearExpenses);

    document.getElementById('plYearLabel').textContent = selectedYear;
    document.getElementById('scheduleCYear').textContent = selectedYear;
}

// ── Build monthly data ──
function buildMonthlyData(invoices, deposits, expenses) {
    const months = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        revenue: 0,
        subscriptionRevenue: 0,
        depositRevenue: 0,
        stripeFees: 0,
        expenses: 0,
    }));

    invoices.forEach(inv => {
        const m = new Date(inv.created_at).getMonth();
        const amt = (inv.amount_paid_cents || 0) / 100;
        months[m].revenue += amt;
        months[m].subscriptionRevenue += amt;
        months[m].stripeFees += (inv.stripe_fee_cents || 0) / 100;
    });

    deposits.forEach(dep => {
        const m = new Date(dep.deposit_date).getMonth();
        const amt = (dep.amount_cents || 0) / 100;
        months[m].revenue += amt;
        months[m].depositRevenue += amt;
    });

    expenses.forEach(exp => {
        const m = new Date(exp.date).getMonth();
        months[m].expenses += parseFloat(exp.amount) || 0;
    });

    return months;
}

// ── Hero Stats ──
function renderHeroStats(months, yearInvoices, yearDeposits, yearExpenses) {
    const totalRev = months.reduce((s, m) => s + m.revenue, 0);
    const totalExp = months.reduce((s, m) => s + m.expenses, 0);
    const netProfit = totalRev - totalExp;
    const margin = totalRev > 0 ? (netProfit / totalRev * 100) : 0;

    document.getElementById('statRevenue').textContent = fmtDollars(totalRev);
    document.getElementById('statExpenses').textContent = fmtDollars(totalExp);

    const profitEl = document.getElementById('statProfit');
    profitEl.textContent = fmtDollars(netProfit);
    profitEl.className = `text-xl sm:text-2xl font-extrabold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`;

    document.getElementById('statMargin').textContent = margin.toFixed(1) + '%';

    // Margin note
    const marginEl = document.getElementById('statProfitMargin');
    if (totalRev > 0) {
        marginEl.textContent = `${margin.toFixed(1)}% margin`;
    } else {
        marginEl.textContent = '';
    }

    // Average monthly expenses
    const currentMonth = selectedYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    const avgMonthlyExp = totalExp / Math.max(currentMonth, 1);
    const runwayMonths = avgMonthlyExp > 0 ? Math.floor(netProfit / avgMonthlyExp) : '∞';
    document.getElementById('statRunway').textContent = avgMonthlyExp > 0
        ? `~${runwayMonths} month${runwayMonths !== 1 ? 's' : ''} runway`
        : '';

    // MRR (current month's subscription revenue)
    const now = new Date();
    if (selectedYear === now.getFullYear()) {
        const currentMonthRev = months[now.getMonth()].subscriptionRevenue;
        document.getElementById('statRevenueChange').textContent = `MRR: ${fmtDollars(currentMonthRev)}`;
    } else {
        const avgRev = totalRev / 12;
        document.getElementById('statRevenueChange').textContent = `Avg: ${fmtDollars(avgRev)}/mo`;
    }

    document.getElementById('statExpensesChange').textContent = `Avg: ${fmtDollars(avgMonthlyExp)}/mo`;
}

// ── Trend Chart ──
function renderTrendChart(months) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const currentMonth = selectedYear === new Date().getFullYear() ? new Date().getMonth() : 11;
    const labels = MONTH_NAMES.slice(0, currentMonth + 1);
    const revenueData = months.slice(0, currentMonth + 1).map(m => m.revenue);
    const expenseData = months.slice(0, currentMonth + 1).map(m => m.expenses);
    const profitData = months.slice(0, currentMonth + 1).map(m => m.revenue - m.expenses);

    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenueData,
                    backgroundColor: 'rgba(52, 211, 153, 0.7)',
                    borderRadius: 6,
                    order: 2,
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(248, 113, 113, 0.7)',
                    borderRadius: 6,
                    order: 3,
                },
                {
                    label: 'Net Profit',
                    data: profitData,
                    type: 'line',
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366f1',
                    fill: true,
                    tension: 0.3,
                    order: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${fmtDollars(ctx.parsed.y)}`,
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => '$' + v.toFixed(0), font: { size: 11 } },
                    grid: { color: 'rgba(0,0,0,0.04)' },
                },
                x: {
                    ticks: { font: { size: 11 } },
                    grid: { display: false },
                },
            },
        },
    });
}

// ── Revenue Breakdown (donut) ──
function renderRevenueBreakdown(invoices, deposits) {
    const subRev = invoices.reduce((s, i) => s + (i.amount_paid_cents || 0) / 100, 0);
    const depRev = deposits.reduce((s, d) => s + (d.amount_cents || 0) / 100, 0);
    const total = subRev + depRev;

    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChart) revenueChart.destroy();

    if (total === 0) {
        ctx.canvas.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-gray-400">No revenue data</div>';
        document.getElementById('revenueBreakdownList').innerHTML = '';
        return;
    }

    revenueChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Subscriptions', 'Manual Deposits'],
            datasets: [{
                data: [subRev, depRev],
                backgroundColor: ['#34d399', '#60a5fa'],
                borderWidth: 0,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${fmtDollars(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1)}%)`,
                    },
                },
            },
        },
    });

    const items = [
        { label: 'Subscriptions', amount: subRev, color: '#34d399', pct: total > 0 ? (subRev / total * 100).toFixed(1) : 0 },
        { label: 'Manual Deposits', amount: depRev, color: '#60a5fa', pct: total > 0 ? (depRev / total * 100).toFixed(1) : 0 },
    ].filter(i => i.amount > 0);

    document.getElementById('revenueBreakdownList').innerHTML = items.map(i => `
        <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${i.color}"></span>
                <span class="text-gray-700 font-medium">${i.label}</span>
            </div>
            <div class="text-right">
                <span class="font-bold text-gray-900">${fmtDollars(i.amount)}</span>
                <span class="text-gray-400 text-xs ml-1">${i.pct}%</span>
            </div>
        </div>
    `).join('');
}

// ── Expense Breakdown (donut) ──
function renderExpenseBreakdown(expenses) {
    const catTotals = {};
    expenses.forEach(e => {
        const cat = e.category || 'other';
        catTotals[cat] = (catTotals[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);

    const ctx = document.getElementById('expenseChart').getContext('2d');
    if (expenseChart) expenseChart.destroy();

    if (total === 0) {
        ctx.canvas.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-gray-400">No expense data</div>';
        document.getElementById('expenseBreakdownList').innerHTML = '';
        return;
    }

    const colors = ['#f87171','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#818cf8','#c084fc','#f472b6','#94a3b8'];

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sorted.map(([c]) => prettyCat(c)),
            datasets: [{
                data: sorted.map(([, v]) => v),
                backgroundColor: sorted.map((_, i) => colors[i % colors.length]),
                borderWidth: 0,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${fmtDollars(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1)}%)`,
                    },
                },
            },
        },
    });

    document.getElementById('expenseBreakdownList').innerHTML = sorted.slice(0, 6).map(([cat, amt], i) => `
        <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${colors[i % colors.length]}"></span>
                <span class="text-gray-700 font-medium">${prettyCat(cat)}</span>
            </div>
            <div class="text-right">
                <span class="font-bold text-gray-900">${fmtDollars(amt)}</span>
                <span class="text-gray-400 text-xs ml-1">${(amt / total * 100).toFixed(1)}%</span>
            </div>
        </div>
    `).join('');
}

// ── P&L Table ──
function renderPLTable(months) {
    const currentMonth = selectedYear === new Date().getFullYear() ? new Date().getMonth() : 11;
    const tbody = document.getElementById('plTableBody');
    let totalRev = 0, totalExp = 0;

    const rows = [];
    for (let i = 0; i <= currentMonth; i++) {
        const m = months[i];
        const net = m.revenue - m.expenses;
        const margin = m.revenue > 0 ? (net / m.revenue * 100).toFixed(1) : '—';
        totalRev += m.revenue;
        totalExp += m.expenses;

        rows.push(`
            <tr class="hover:bg-surface-50 transition border-b border-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">${MONTH_FULL[i]}</td>
                <td class="text-right px-4 py-3 text-gray-700">${fmtDollars(m.revenue)}</td>
                <td class="text-right px-4 py-3 text-red-600">${m.expenses > 0 ? fmtDollars(m.expenses) : '—'}</td>
                <td class="text-right px-4 py-3 font-semibold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}">${fmtDollars(net)}</td>
                <td class="text-right px-4 py-3 text-gray-500">${margin}${margin !== '—' ? '%' : ''}</td>
            </tr>
        `);
    }

    tbody.innerHTML = rows.length > 0 ? rows.join('') :
        '<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-gray-400">No data for this year</td></tr>';

    // Footer
    const foot = document.getElementById('plTableFoot');
    if (rows.length > 0) {
        const totalNet = totalRev - totalExp;
        const totalMargin = totalRev > 0 ? (totalNet / totalRev * 100).toFixed(1) + '%' : '—';
        document.getElementById('footRevenue').textContent = fmtDollars(totalRev);
        document.getElementById('footExpenses').textContent = fmtDollars(totalExp);
        const fp = document.getElementById('footProfit');
        fp.textContent = fmtDollars(totalNet);
        fp.className = `text-right px-4 py-3 text-sm font-bold ${totalNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`;
        document.getElementById('footMargin').textContent = totalMargin;
        foot.classList.remove('hidden');
    } else {
        foot.classList.add('hidden');
    }
}

// ── Revenue Milestones ──
function renderMilestones(invoices, deposits) {
    // Calculate projected annual revenue
    const now = new Date();
    const ytdRev = invoices.reduce((s, i) => s + (i.amount_paid_cents || 0) / 100, 0)
                 + deposits.reduce((s, d) => s + (d.amount_cents || 0) / 100, 0);

    const monthsElapsed = selectedYear === now.getFullYear()
        ? now.getMonth() + (now.getDate() / 30)
        : 12;
    const projectedAnnual = monthsElapsed > 0 ? (ytdRev / monthsElapsed) * 12 : 0;

    const container = document.getElementById('milestonesContainer');
    container.innerHTML = REVENUE_MILESTONES.map(ms => {
        const pct = Math.min((projectedAnnual / ms.target) * 100, 100);
        const achieved = projectedAnnual >= ms.target;
        return `
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl ${achieved ? 'bg-emerald-100' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0 text-lg">
                    ${achieved ? '✅' : ms.icon}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-bold ${achieved ? 'text-emerald-600' : 'text-gray-900'}">${ms.label}</span>
                        <span class="text-xs font-semibold ${achieved ? 'text-emerald-500' : 'text-gray-400'}">${pct.toFixed(0)}%</span>
                    </div>
                    <div class="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div class="h-full rounded-full transition-all duration-500 ${achieved ? 'bg-emerald-400' : 'bg-amber-400'}" style="width:${pct}%"></div>
                    </div>
                    <p class="text-[10px] text-gray-400">${ms.note}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ── Schedule C ──
function renderScheduleC(invoices, deposits, expenses) {
    const totalRev = invoices.reduce((s, i) => s + (i.amount_paid_cents || 0) / 100, 0)
                   + deposits.reduce((s, d) => s + (d.amount_cents || 0) / 100, 0);
    const totalStripeFees = invoices.reduce((s, i) => s + (i.stripe_fee_cents || 0) / 100, 0);
    const totalExpenseAmt = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const netProfit = totalRev - totalExpenseAmt;
    const seTax = Math.max(netProfit * 0.9235 * 0.153, 0);

    const tbody = document.getElementById('scheduleCBody');
    tbody.innerHTML = `
        <tr class="border-b border-gray-100">
            <td class="px-5 py-3 text-gray-500 font-medium">Line 1 — Gross Receipts</td>
            <td class="px-5 py-3 text-right font-bold text-gray-900">${fmtDollars(totalRev)}</td>
        </tr>
        <tr class="border-b border-gray-100 bg-red-50/30">
            <td class="px-5 py-3 text-gray-500 font-medium">Line 28 — Total Expenses</td>
            <td class="px-5 py-3 text-right font-bold text-red-600">(${fmtDollars(totalExpenseAmt)})</td>
        </tr>
        <tr class="border-b border-gray-200 bg-emerald-50/30">
            <td class="px-5 py-3 text-emerald-700 font-bold">Line 31 — Net Profit</td>
            <td class="px-5 py-3 text-right font-extrabold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}">${fmtDollars(netProfit)}</td>
        </tr>
        <tr class="border-b border-gray-100">
            <td class="px-5 py-3 text-gray-400 text-xs">Schedule SE — Self-Employment Tax (15.3% × 92.35%)</td>
            <td class="px-5 py-3 text-right text-gray-500 text-xs font-semibold">~${fmtDollars(seTax)}</td>
        </tr>
        <tr>
            <td class="px-5 py-3 text-gray-400 text-xs">After SE Tax</td>
            <td class="px-5 py-3 text-right text-gray-900 font-bold">${fmtDollars(netProfit - seTax)}</td>
        </tr>
    `;
}

// ── Export CSV ──
function exportCSV() {
    const yearInvoices = allInvoices.filter(i => new Date(i.created_at).getFullYear() === selectedYear);
    const yearDeposits = allDeposits.filter(d => new Date(d.deposit_date).getFullYear() === selectedYear);
    const yearExpenses = allExpenses.filter(e => new Date(e.date).getFullYear() === selectedYear);
    const months = buildMonthlyData(yearInvoices, yearDeposits, yearExpenses);

    const currentMonth = selectedYear === new Date().getFullYear() ? new Date().getMonth() : 11;
    let csv = 'Month,Revenue,Expenses,Net Profit,Margin\n';
    let totalRev = 0, totalExp = 0;
    for (let i = 0; i <= currentMonth; i++) {
        const m = months[i];
        const net = m.revenue - m.expenses;
        const margin = m.revenue > 0 ? (net / m.revenue * 100).toFixed(1) + '%' : '0%';
        csv += `${MONTH_FULL[i]},${m.revenue.toFixed(2)},${m.expenses.toFixed(2)},${net.toFixed(2)},${margin}\n`;
        totalRev += m.revenue;
        totalExp += m.expenses;
    }
    const totalNet = totalRev - totalExp;
    const totalMargin = totalRev > 0 ? (totalNet / totalRev * 100).toFixed(1) + '%' : '0%';
    csv += `\nYTD Total,${totalRev.toFixed(2)},${totalExp.toFixed(2)},${totalNet.toFixed(2)},${totalMargin}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `PL_${selectedYear}.csv`;
    a.click();
}

// ── Helpers ──
function fmtDollars(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

function prettyCat(cat) {
    const MAP = {
        'commissions': 'Stripe Fees',
        'software': 'Software & SaaS',
        'office': 'Office Supplies',
        'professional-services': 'Professional Services',
        'travel-mileage': 'Travel & Mileage',
        'phone-internet': 'Phone & Internet',
        'advertising': 'Advertising',
        'bank-fees': 'Bank Fees',
        'member-payouts': 'Member Payouts',
        'insurance': 'Insurance',
        'education': 'Education',
        'supplies': 'Supplies',
        'meals': 'Meals & Entertainment',
        'depreciation': 'Depreciation',
        'interest': 'Interest',
        'repairs': 'Repairs & Maintenance',
        'other': 'Other',
    };
    return MAP[cat] || cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
