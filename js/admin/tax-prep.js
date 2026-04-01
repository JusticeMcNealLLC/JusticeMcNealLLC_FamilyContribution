// Admin Tax Prep — Schedule C, SE Tax, Quarterly Estimates, Filing Checklist
// Pulls revenue from invoices + manual_deposits, expenses from llc_expenses
// Tracks quarterly estimated payments from tax_quarterly_payments table

// ── IRS Schedule C Category Map (mirrored from expenses.js) ──
const CATEGORIES = {
    'advertising':      { label: 'Advertising',            line: '8',   pct: 1 },
    'travel-mileage':   { label: 'Travel & Mileage',       line: '9',   pct: 1 },
    'commissions':      { label: 'Commissions & Fees',     line: '10',  pct: 1 },
    'contract-labor':   { label: 'Contract Labor',         line: '11',  pct: 1 },
    'depreciation':     { label: 'Depreciation',           line: '13',  pct: 1 },
    'insurance':        { label: 'Insurance',              line: '15',  pct: 1 },
    'interest':         { label: 'Interest (Business)',     line: '16a', pct: 1 },
    'legal':            { label: 'Legal & Professional',    line: '17',  pct: 1 },
    'office':           { label: 'Office & Software',       line: '18',  pct: 1 },
    'rent-hosting':     { label: 'Rent / Hosting / SaaS',   line: '20b', pct: 1 },
    'repairs':          { label: 'Repairs & Maintenance',   line: '21',  pct: 1 },
    'supplies':         { label: 'Supplies',                line: '22',  pct: 1 },
    'taxes-licenses':   { label: 'Taxes & Licenses',        line: '23',  pct: 1 },
    'meals':            { label: 'Meals (50% Deductible)',   line: '24b', pct: 0.5 },
    'utilities':        { label: 'Utilities (Internet)',     line: '25',  pct: 1 },
    'member-payouts':   { label: 'Member Payouts & Prizes', line: '27',  pct: 1 },
    'other':            { label: 'Other Expenses',           line: '27',  pct: 1 },
};

// ── Tax Calendar ──
function getTaxCalendar(year) {
    return [
        { date: `Jan 15, ${year}`,   label: `Q4 ${year - 1} Estimated Tax Payment`, icon: '💰', type: 'payment' },
        { date: `Jan 31, ${year}`,   label: 'Issue 1099s (if any contractor paid $600+)', icon: '📄', type: 'filing' },
        { date: `Apr 15, ${year}`,   label: 'File Form 1040 + Schedule C (or extension)', icon: '📋', type: 'filing' },
        { date: `Apr 15, ${year}`,   label: `Q1 ${year} Estimated Tax Payment`, icon: '💰', type: 'payment' },
        { date: `Jun 15, ${year}`,   label: `Q2 ${year} Estimated Tax Payment`, icon: '💰', type: 'payment' },
        { date: `Sep 15, ${year}`,   label: `Q3 ${year} Estimated Tax Payment`, icon: '💰', type: 'payment' },
        { date: `Oct 15, ${year}`,   label: 'Extended return due (if filed extension)', icon: '📋', type: 'filing' },
        { date: `Jan 15, ${year + 1}`, label: `Q4 ${year} Estimated Tax Payment`, icon: '💰', type: 'payment' },
    ];
}

// ── Revenue Level Actions ──
const LEVEL_UPS = [
    { threshold: 5000,   label: 'Under $5k/yr',   action: 'DIY with TurboTax or FreeTaxUSA, basic Schedule C', icon: '📝' },
    { threshold: 10000,  label: '$5k – $10k/yr',  action: 'Consider CPA review, start quarterly estimated payments', icon: '👀' },
    { threshold: 40000,  label: '$10k – $40k/yr', action: 'Hire a CPA, maximize deductions, quarterly payments required', icon: '🧾' },
    { threshold: 100000, label: '$40k+/yr',       action: 'Evaluate S-Corp election to save on self-employment tax', icon: '🏢' },
    { threshold: Infinity,label: '$100k+/yr',     action: 'Full tax strategy, retirement accounts (SEP IRA / Solo 401k)', icon: '🏦' },
];

// ── Filing Checklist Items ──
const CHECKLIST_ITEMS = [
    { group: 'Income Documentation', items: [
        { key: 'stripe_payouts',      label: 'Download total Stripe payouts for the year' },
        { key: '1099k',               label: 'Collect 1099-K from Stripe (if over $600)' },
        { key: 'other_income',        label: 'Document any other income sources' },
        { key: 'reconcile_revenue',   label: 'Reconcile portal revenue with bank deposits' },
    ]},
    { group: 'Expense Documentation', items: [
        { key: 'receipts_uploaded',   label: 'All receipts uploaded and categorized' },
        { key: 'stripe_fees',         label: 'Verify total Stripe fees for the year' },
        { key: 'software_costs',      label: 'Document software/subscription costs' },
        { key: 'domain_receipt',      label: 'Domain renewal receipt' },
        { key: 'llc_fees',            label: 'LLC registration/filing fees' },
        { key: 'contractor_1099s',    label: 'Contractor W-9s collected (for 1099 filing)' },
        { key: 'home_office',         label: 'Home office calculation (if claiming)' },
        { key: 'internet_pct',        label: 'Internet bill — calculate business %' },
        { key: 'mileage_log',         label: 'Mileage log (if applicable)' },
    ]},
    { group: 'Filing', items: [
        { key: 'calc_net_profit',     label: 'Calculate net profit (revenue − expenses)' },
        { key: 'calc_se_tax',         label: 'Calculate self-employment tax' },
        { key: 'quarterly_needed',    label: 'Determine if quarterly estimated payments needed' },
        { key: 'file_schedule_c',     label: 'File Schedule C with Form 1040' },
        { key: 'file_schedule_se',    label: 'File Schedule SE' },
        { key: 'file_ga_500',         label: 'File Georgia Form 500' },
        { key: 'pay_balance',         label: 'Pay any balance due' },
        { key: 'save_copies',         label: 'Save copies of everything (digital + backup)' },
    ]},
];

let allInvoices = [];
let allDeposits = [];
let allExpenses = [];
let quarterlyPayments = [];
let checklistState = {};
let selectedYear = new Date().getFullYear();

// ── Init ──
document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth({ permission: 'finance.tax_prep' });
    if (!user) return;

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

    document.getElementById('yearFilter').addEventListener('change', (e) => {
        selectedYear = parseInt(e.target.value);
        renderAll();
    });

    document.getElementById('exportBtn').addEventListener('click', exportScheduleC);
});

// ── Load Data ──
async function loadAllData() {
    const [invoiceRes, depositRes, expenseRes, qPayRes, checkRes] = await Promise.all([
        supabaseClient
            .from('invoices')
            .select('amount_paid_cents, stripe_fee_cents, status, created_at, payment_type')
            .eq('status', 'paid')
            .order('created_at', { ascending: true }),
        supabaseClient
            .from('manual_deposits')
            .select('amount_cents, deposit_date')
            .order('deposit_date', { ascending: true }),
        supabaseClient
            .from('llc_expenses')
            .select('amount, category, date, schedule_c_line')
            .order('date', { ascending: true }),
        supabaseClient
            .from('tax_quarterly_payments')
            .select('*')
            .order('quarter', { ascending: true }),
        supabaseClient
            .from('tax_checklist')
            .select('*'),
    ]);

    allInvoices = invoiceRes.data || [];
    allDeposits = depositRes.data || [];
    allExpenses = expenseRes.data || [];
    quarterlyPayments = qPayRes.data || [];
    checklistState = {};
    (checkRes.data || []).forEach(c => {
        if (!checklistState[c.tax_year]) checklistState[c.tax_year] = {};
        checklistState[c.tax_year][c.item_key] = c;
    });
}

// ── Year Filter ──
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

    const grossIncome = yearInvoices.reduce((s, i) => s + (i.amount_paid_cents || 0) / 100, 0)
                      + yearDeposits.reduce((s, d) => s + (d.amount_cents || 0) / 100, 0);

    // Build expense totals by category with deductible %
    const catTotals = {};
    yearExpenses.forEach(e => {
        const cat = e.category || 'other';
        const cfg = CATEGORIES[cat] || CATEGORIES['other'];
        const amt = (parseFloat(e.amount) || 0) * cfg.pct;
        catTotals[cat] = (catTotals[cat] || 0) + amt;
    });

    const totalDeductibleExpenses = Object.values(catTotals).reduce((s, v) => s + v, 0);
    const netProfit = grossIncome - totalDeductibleExpenses;
    const seTaxable = Math.max(netProfit * 0.9235, 0);
    const seTax = seTaxable * 0.153;
    const seDeduction = seTax / 2;

    // Hero stats
    renderHeroStats(grossIncome, totalDeductibleExpenses, netProfit, seTax);

    // Schedule C
    renderScheduleC(grossIncome, catTotals, totalDeductibleExpenses, netProfit);

    // SE Tax Breakdown
    renderSETax(netProfit, seTaxable, seTax, seDeduction);

    // Quarterly Payments
    renderQuarterlyPayments(seTax);

    // Calendar
    renderCalendar();

    // Filing Checklist
    renderChecklist();

    // Level Up
    renderLevelUp(grossIncome);

    document.getElementById('scheduleCYear').textContent = selectedYear;
    document.getElementById('calendarYear').textContent = selectedYear;
}

// ── Hero Stats ──
function renderHeroStats(grossIncome, totalExpenses, netProfit, seTax) {
    document.getElementById('statGrossIncome').textContent = fmtDollars(grossIncome);
    document.getElementById('statTotalExpenses').textContent = fmtDollars(totalExpenses);

    const profitEl = document.getElementById('statNetProfit');
    profitEl.textContent = fmtDollars(netProfit);
    profitEl.className = `text-xl sm:text-2xl font-extrabold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`;

    document.getElementById('statSETax').textContent = fmtDollars(seTax);
}

// ── Schedule C ──
function renderScheduleC(grossIncome, catTotals, totalExpenses, netProfit) {
    const tbody = document.getElementById('scheduleCBody');
    const rows = [];

    // Part I — Income
    rows.push(sectionRow('Part I — Income'));
    rows.push(lineRow('1', 'Gross receipts or sales', grossIncome, 'font-semibold'));
    rows.push(lineRow('4', 'Cost of goods sold', 0, '', true));
    rows.push(lineRow('7', 'Gross income', grossIncome, 'font-bold text-gray-900 bg-gray-50/50'));

    // Part II — Expenses
    rows.push(sectionRow('Part II — Expenses'));

    // Build sorted lines
    const lineItems = [];
    const lineMap = {
        '8': 'Advertising',
        '9': 'Car & truck expenses (mileage)',
        '10': 'Commissions and fees',
        '11': 'Contract labor',
        '13': 'Depreciation',
        '15': 'Insurance',
        '16a': 'Interest (mortgage/other)',
        '17': 'Legal and professional services',
        '18': 'Office expense',
        '20b': 'Rent or lease (other business)',
        '21': 'Repairs and maintenance',
        '22': 'Supplies',
        '23': 'Taxes and licenses',
        '24b': 'Meals (50%)',
        '25': 'Utilities',
        '27': 'Other expenses',
    };

    // Aggregate expenses by schedule C line
    const lineTotals = {};
    for (const [cat, total] of Object.entries(catTotals)) {
        const cfg = CATEGORIES[cat] || CATEGORIES['other'];
        const ln = cfg.line;
        lineTotals[ln] = (lineTotals[ln] || 0) + total;
    }

    // Sort by line number
    const lineOrder = ['8','9','10','11','13','15','16a','17','18','20b','21','22','23','24b','25','27'];
    for (const ln of lineOrder) {
        const amt = lineTotals[ln] || 0;
        if (amt > 0) {
            rows.push(lineRow(ln, lineMap[ln] || `Line ${ln}`, amt, 'text-red-600'));
        }
    }

    rows.push(lineRow('28', 'Total expenses', totalExpenses, 'font-bold text-red-600 bg-red-50/30'));

    // Net profit
    rows.push(sectionRow('Net Profit'));
    rows.push(lineRow('31', 'Net profit (or loss)', netProfit,
        `font-extrabold text-lg ${netProfit >= 0 ? 'text-emerald-600 bg-emerald-50/30' : 'text-red-600 bg-red-50/30'}`));

    tbody.innerHTML = rows.join('');
}

function sectionRow(title) {
    return `<tr class="bg-surface-100/80 border-b border-gray-100"><td colspan="3" class="px-5 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">${title}</td></tr>`;
}

function lineRow(line, desc, amount, cls = '', isNA = false) {
    const amtText = isNA ? '<span class="text-gray-300">N/A</span>' : fmtDollars(amount);
    return `
        <tr class="border-b border-gray-50 hover:bg-surface-50/50 transition ${cls.includes('bg-') ? cls.split(' ').filter(c => c.startsWith('bg-')).join(' ') : ''}">
            <td class="px-5 py-2.5 text-gray-400 font-mono text-xs w-16">${line}</td>
            <td class="px-5 py-2.5 text-gray-700 ${cls.replace(/bg-\S+/g, '')}">${desc}</td>
            <td class="px-5 py-2.5 text-right font-semibold ${cls.replace(/bg-\S+/g, '')}">${amtText}</td>
        </tr>
    `;
}

// ── SE Tax ──
function renderSETax(netProfit, seTaxable, seTax, seDeduction) {
    const effectiveRate = netProfit > 0 ? (seTax / netProfit * 100).toFixed(1) : '0.0';
    const afterSE = netProfit - seTax;
    const tbody = document.getElementById('seTaxBody');

    tbody.innerHTML = `
        <tr class="border-b border-gray-50">
            <td class="px-5 py-3 text-gray-600">Net Profit (Schedule C, Line 31)</td>
            <td class="px-5 py-3 text-right font-bold text-gray-900">${fmtDollars(netProfit)}</td>
        </tr>
        <tr class="border-b border-gray-50">
            <td class="px-5 py-3 text-gray-500 text-sm">× 92.35% (adjustment factor)</td>
            <td class="px-5 py-3 text-right font-semibold text-gray-700">${fmtDollars(seTaxable)}</td>
        </tr>
        <tr class="border-b border-gray-50">
            <td class="px-5 py-3 text-gray-500 text-sm">× 15.3% (12.4% SS + 2.9% Medicare)</td>
            <td class="px-5 py-3 text-right font-bold text-orange-600">${fmtDollars(seTax)}</td>
        </tr>
        <tr class="border-b border-gray-100 bg-orange-50/30">
            <td class="px-5 py-3 font-bold text-orange-700">Self-Employment Tax</td>
            <td class="px-5 py-3 text-right font-extrabold text-orange-600">${fmtDollars(seTax)}</td>
        </tr>
        <tr class="border-b border-gray-50">
            <td class="px-5 py-3 text-gray-400 text-xs">50% SE Tax Deduction (Form 1040)</td>
            <td class="px-5 py-3 text-right text-emerald-600 font-semibold text-sm">−${fmtDollars(seDeduction)}</td>
        </tr>
        <tr class="border-b border-gray-50">
            <td class="px-5 py-3 text-gray-400 text-xs">Effective SE Rate on Net Profit</td>
            <td class="px-5 py-3 text-right text-gray-500 font-semibold text-sm">${effectiveRate}%</td>
        </tr>
        <tr class="bg-gray-50/50">
            <td class="px-5 py-3 font-bold text-gray-900">After SE Tax</td>
            <td class="px-5 py-3 text-right font-extrabold ${afterSE >= 0 ? 'text-emerald-600' : 'text-red-600'}">${fmtDollars(afterSE)}</td>
        </tr>
    `;
}

// ── Quarterly Estimated Payments ──
function renderQuarterlyPayments(annualSETax) {
    const quarters = [
        { q: 1, label: 'Q1', due: `Apr 15, ${selectedYear}`, months: 'Jan – Mar' },
        { q: 2, label: 'Q2', due: `Jun 15, ${selectedYear}`, months: 'Apr – Jun' },
        { q: 3, label: 'Q3', due: `Sep 15, ${selectedYear}`, months: 'Jul – Sep' },
        { q: 4, label: 'Q4', due: `Jan 15, ${selectedYear + 1}`, months: 'Oct – Dec' },
    ];

    const suggestedPerQ = annualSETax / 4;
    const tbody = document.getElementById('quarterlyBody');
    const now = new Date();
    let totalSuggested = 0, totalPaid = 0;

    const rows = quarters.map(q => {
        const payment = quarterlyPayments.find(p => p.tax_year === selectedYear && p.quarter === q.q);
        const paid = payment ? parseFloat(payment.amount_paid) || 0 : 0;
        const dueDate = new Date(q.due);
        const isPast = now > dueDate;

        let status, statusCls;
        if (paid >= suggestedPerQ && suggestedPerQ > 0) {
            status = '✅ Paid';
            statusCls = 'text-emerald-600';
        } else if (paid > 0) {
            status = '⚠️ Partial';
            statusCls = 'text-amber-600';
        } else if (isPast && suggestedPerQ > 0) {
            status = '❌ Missed';
            statusCls = 'text-red-600';
        } else if (suggestedPerQ <= 0) {
            status = '—';
            statusCls = 'text-gray-400';
        } else {
            status = '⏳ Upcoming';
            statusCls = 'text-gray-400';
        }

        totalSuggested += suggestedPerQ;
        totalPaid += paid;

        return `
            <tr class="border-b border-gray-50 hover:bg-surface-50 transition">
                <td class="px-5 py-3">
                    <span class="font-semibold text-gray-900">${q.label}</span>
                    <span class="text-gray-400 text-xs ml-1">${q.months}</span>
                </td>
                <td class="px-5 py-3 text-gray-600 text-sm">${q.due}</td>
                <td class="px-5 py-3 text-right font-semibold text-gray-700">${fmtDollars(suggestedPerQ)}</td>
                <td class="px-5 py-3 text-right font-bold ${paid > 0 ? 'text-emerald-600' : 'text-gray-300'}">${paid > 0 ? fmtDollars(paid) : '—'}</td>
                <td class="px-5 py-3 text-center text-sm font-semibold ${statusCls}">${status}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rows.join('');

    // Footer
    const foot = document.getElementById('quarterlyFoot');
    foot.classList.remove('hidden');
    document.getElementById('qSuggestedTotal').textContent = fmtDollars(totalSuggested);
    document.getElementById('qPaidTotal').textContent = totalPaid > 0 ? fmtDollars(totalPaid) : '—';

    const remaining = Math.max(totalSuggested - totalPaid, 0);
    const remEl = document.getElementById('qRemainingBadge');
    if (remaining > 0) {
        remEl.innerHTML = `<span class="text-xs font-bold text-red-600">${fmtDollars(remaining)} remaining</span>`;
    } else if (totalSuggested > 0) {
        remEl.innerHTML = `<span class="text-xs font-bold text-emerald-600">All paid ✓</span>`;
    } else {
        remEl.textContent = '—';
    }
}

// ── Tax Calendar ──
function renderCalendar() {
    const items = getTaxCalendar(selectedYear);
    const now = new Date();
    const container = document.getElementById('calendarBody');

    container.innerHTML = items.map(item => {
        const d = new Date(item.date);
        const isPast = now > d;
        const isSoon = !isPast && (d - now) < 30 * 24 * 60 * 60 * 1000;

        let badge = '';
        if (isPast) badge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-semibold">Past</span>';
        else if (isSoon) badge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold animate-pulse">Soon</span>';
        else badge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 font-semibold">Upcoming</span>';

        return `
            <div class="flex items-center gap-4 px-5 py-3 ${isPast ? 'opacity-50' : ''}">
                <div class="w-8 h-8 rounded-lg ${item.type === 'payment' ? 'bg-orange-100' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0 text-sm">
                    ${item.icon}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-gray-900 ${isPast ? 'line-through' : ''}">${item.label}</div>
                    <div class="text-xs text-gray-400">${item.date}</div>
                </div>
                ${badge}
            </div>
        `;
    }).join('');
}

// ── Filing Checklist ──
function renderChecklist() {
    const yearState = checklistState[selectedYear] || {};
    const container = document.getElementById('checklistBody');
    let totalItems = 0, checkedItems = 0;

    const groups = CHECKLIST_ITEMS.map(group => {
        const items = group.items.map(item => {
            totalItems++;
            const checked = yearState[item.key]?.completed || false;
            if (checked) checkedItems++;

            return `
                <label class="flex items-center gap-3 px-5 py-3 hover:bg-surface-50/50 transition cursor-pointer group">
                    <input type="checkbox" class="checklist-item w-5 h-5 rounded-lg border-2 border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer transition"
                        data-key="${item.key}" ${checked ? 'checked' : ''}>
                    <span class="text-sm text-gray-700 group-hover:text-gray-900 transition ${checked ? 'line-through text-gray-400' : ''}">${item.label}</span>
                </label>
            `;
        }).join('');

        return `
            <div class="border-b border-gray-100 last:border-b-0">
                <div class="px-5 py-2.5 bg-surface-100/50">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">${group.group}</span>
                </div>
                ${items}
            </div>
        `;
    }).join('');

    container.innerHTML = groups;

    // Update progress
    const pct = totalItems > 0 ? (checkedItems / totalItems * 100) : 0;
    document.getElementById('checklistProgress').textContent = `${checkedItems}/${totalItems}`;
    document.getElementById('checklistBar').style.width = `${pct}%`;

    // Attach listeners
    container.querySelectorAll('.checklist-item').forEach(cb => {
        cb.addEventListener('change', async (e) => {
            const key = e.target.dataset.key;
            const completed = e.target.checked;
            await toggleChecklistItem(key, completed);

            // Update strikethrough
            const label = e.target.closest('label').querySelector('span');
            if (completed) {
                label.classList.add('line-through', 'text-gray-400');
            } else {
                label.classList.remove('line-through', 'text-gray-400');
            }

            // Recount
            const allChecked = container.querySelectorAll('.checklist-item:checked').length;
            const allTotal = container.querySelectorAll('.checklist-item').length;
            document.getElementById('checklistProgress').textContent = `${allChecked}/${allTotal}`;
            document.getElementById('checklistBar').style.width = `${allTotal > 0 ? (allChecked / allTotal * 100) : 0}%`;
        });
    });
}

async function toggleChecklistItem(key, completed) {
    // Upsert into tax_checklist
    const { error } = await supabaseClient
        .from('tax_checklist')
        .upsert({
            tax_year: selectedYear,
            item_key: key,
            completed,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'tax_year,item_key' });

    if (error) console.error('Failed to save checklist item:', error);

    // Update local state
    if (!checklistState[selectedYear]) checklistState[selectedYear] = {};
    checklistState[selectedYear][key] = { completed };
}

// ── Level Up ──
function renderLevelUp(annualRevenue) {
    const container = document.getElementById('levelUpBody');
    container.innerHTML = LEVEL_UPS.map((level, i) => {
        const prevThreshold = i > 0 ? LEVEL_UPS[i - 1].threshold : 0;
        const isCurrent = annualRevenue < level.threshold && annualRevenue >= prevThreshold;
        const isBelow = annualRevenue < prevThreshold;

        return `
            <div class="flex items-start gap-3 ${isCurrent ? 'bg-emerald-50 -mx-2 px-2 py-2 rounded-xl' : ''}">
                <div class="w-8 h-8 rounded-lg ${isCurrent ? 'bg-emerald-200' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0 text-sm">
                    ${isCurrent ? '👈' : level.icon}
                </div>
                <div>
                    <span class="text-sm font-bold ${isCurrent ? 'text-emerald-700' : 'text-gray-700'}">${level.label}</span>
                    ${isCurrent ? '<span class="text-[10px] ml-2 px-2 py-0.5 bg-emerald-200 text-emerald-700 rounded-full font-bold">YOU ARE HERE</span>' : ''}
                    <p class="text-xs text-gray-500 mt-0.5">${level.action}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ── Export Schedule C as CSV ──
function exportScheduleC() {
    const yearInvoices = allInvoices.filter(i => new Date(i.created_at).getFullYear() === selectedYear);
    const yearDeposits = allDeposits.filter(d => new Date(d.deposit_date).getFullYear() === selectedYear);
    const yearExpenses = allExpenses.filter(e => new Date(e.date).getFullYear() === selectedYear);

    const grossIncome = yearInvoices.reduce((s, i) => s + (i.amount_paid_cents || 0) / 100, 0)
                      + yearDeposits.reduce((s, d) => s + (d.amount_cents || 0) / 100, 0);

    const catTotals = {};
    yearExpenses.forEach(e => {
        const cat = e.category || 'other';
        const cfg = CATEGORIES[cat] || CATEGORIES['other'];
        catTotals[cat] = (catTotals[cat] || 0) + (parseFloat(e.amount) || 0) * cfg.pct;
    });

    const totalExp = Object.values(catTotals).reduce((s, v) => s + v, 0);
    const netProfit = grossIncome - totalExp;
    const seTax = Math.max(netProfit * 0.9235 * 0.153, 0);

    let csv = `Schedule C Summary — Tax Year ${selectedYear}\n\n`;
    csv += 'Line,Description,Amount\n';
    csv += `1,Gross receipts or sales,${grossIncome.toFixed(2)}\n`;
    csv += `7,Gross income,${grossIncome.toFixed(2)}\n\n`;

    csv += 'Expenses\n';
    const lineOrder = ['8','9','10','11','13','15','16a','17','18','20b','21','22','23','24b','25','27'];
    const lineMap = { '8':'Advertising','9':'Car/truck','10':'Commissions','11':'Contract labor','13':'Depreciation','15':'Insurance','16a':'Interest','17':'Legal/professional','18':'Office','20b':'Rent/hosting','21':'Repairs','22':'Supplies','23':'Taxes/licenses','24b':'Meals (50%)','25':'Utilities','27':'Other' };

    const lineTotals = {};
    for (const [cat, total] of Object.entries(catTotals)) {
        const cfg = CATEGORIES[cat] || CATEGORIES['other'];
        lineTotals[cfg.line] = (lineTotals[cfg.line] || 0) + total;
    }

    for (const ln of lineOrder) {
        if (lineTotals[ln] > 0) csv += `${ln},${lineMap[ln]},${lineTotals[ln].toFixed(2)}\n`;
    }

    csv += `\n28,Total expenses,${totalExp.toFixed(2)}\n`;
    csv += `31,Net profit,${netProfit.toFixed(2)}\n\n`;
    csv += `SE Tax (Schedule SE),${seTax.toFixed(2)}\n`;
    csv += `After SE Tax,${(netProfit - seTax).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ScheduleC_${selectedYear}.csv`;
    a.click();
}

// ── Helpers ──
function fmtDollars(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}
