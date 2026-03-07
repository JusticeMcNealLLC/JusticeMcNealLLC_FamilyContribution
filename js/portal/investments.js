// Portal Investment Dashboard
// Displays portfolio data for all authenticated members

// Ticker → Proper Fund Name lookup (Fidelity CSVs often store the account name instead)
const FUND_NAME_MAP = {
    'VTI': 'Vanguard Total Stock Market ETF',
    'VXUS': 'Vanguard Total International Stock ETF',
    'VIG': 'Vanguard Dividend Appreciation ETF',
    'SPAXX': 'Fidelity Government Money Market',
    'SPAXX**': 'Fidelity Government Money Market',
    'VOO': 'Vanguard S&P 500 ETF',
    'VNQ': 'Vanguard Real Estate ETF',
    'BND': 'Vanguard Total Bond Market ETF',
    'VBTLX': 'Vanguard Total Bond Market Index',
    'FXAIX': 'Fidelity 500 Index Fund',
    'FSKAX': 'Fidelity Total Market Index Fund',
    'FTIHX': 'Fidelity Total International Index Fund',
};

function resolveFundName(ticker, rawName) {
    if (FUND_NAME_MAP[ticker]) return FUND_NAME_MAP[ticker];
    // If the raw name looks like a generic account name, fall back to ticker
    if (!rawName || rawName.toLowerCase().includes('limited liability') || rawName.toLowerCase().includes('individual') || rawName.toLowerCase().includes('account')) {
        return ticker;
    }
    return rawName;
}

const FUND_COLORS = [
    { bg: 'bg-brand-500', hex: '#6366f1', label: 'bg-brand-100 text-brand-700' },
    { bg: 'bg-emerald-500', hex: '#10b981', label: 'bg-emerald-100 text-emerald-700' },
    { bg: 'bg-amber-500', hex: '#f59e0b', label: 'bg-amber-100 text-amber-700' },
    { bg: 'bg-rose-500', hex: '#f43f5e', label: 'bg-rose-100 text-rose-700' },
    { bg: 'bg-cyan-500', hex: '#06b6d4', label: 'bg-cyan-100 text-cyan-700' },
    { bg: 'bg-violet-500', hex: '#8b5cf6', label: 'bg-violet-100 text-violet-700' },
    { bg: 'bg-orange-500', hex: '#f97316', label: 'bg-orange-100 text-orange-700' },
    { bg: 'bg-teal-500', hex: '#14b8a6', label: 'bg-teal-100 text-teal-700' },
];

document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth(false);
    if (!user) return;

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    await Promise.all([
        loadInvestmentData(),
        loadContributionTotals(user.id),
    ]);
});

async function loadInvestmentData() {
    try {
        // Get all snapshots (for history) ordered by date descending
        const { data: snapshots, error: snapErr } = await supabaseClient
            .from('investment_snapshots')
            .select('*')
            .order('snapshot_date', { ascending: false });

        if (snapErr) throw snapErr;

        if (!snapshots || snapshots.length === 0) {
            showNoData();
            return;
        }

        const latest = snapshots[0];

        // Get holdings for latest snapshot
        const { data: holdings, error: holdErr } = await supabaseClient
            .from('investment_holdings')
            .select('*')
            .eq('snapshot_id', latest.id)
            .order('market_value_cents', { ascending: false });

        if (holdErr) throw holdErr;

        renderPortfolioTotal(latest);
        renderHoldings(holdings || []);
        renderAllocationChart(holdings || []);
        renderPerformanceSummary(snapshots);
        renderTopPerformer(holdings || []);
        renderGrowthChart(snapshots);
        renderGrowthHistory(snapshots);

    } catch (err) {
        console.error('Failed to load investment data:', err);
        showNoData();
    }
}

function renderPortfolioTotal(snapshot) {
    const total = snapshot.total_value_cents / 100;
    document.getElementById('portfolioTotal').textContent = '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const date = new Date(snapshot.snapshot_date + 'T00:00:00');
    const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('portfolioDate').textContent = `As of ${formatted}`;
}

async function loadContributionTotals(userId) {
    try {
        // Family total via SECURITY DEFINER function (bypasses RLS so all members see the real total)
        const { data: familyTotal, error: famErr } = await supabaseClient
            .rpc('get_family_contribution_total');

        if (famErr) throw famErr;

        document.getElementById('familyContributed').textContent = formatCurrency(familyTotal || 0);

        // Current user's contributions (RLS naturally scopes to own rows)
        const { data: myInvoices, error: myErr } = await supabaseClient
            .from('invoices')
            .select('amount_paid_cents')
            .eq('status', 'paid')
            .eq('user_id', userId);

        if (myErr) throw myErr;

        const userTotal = (myInvoices || []).reduce((s, i) => s + (i.amount_paid_cents || 0), 0);
        document.getElementById('yourContributed').textContent = formatCurrency(userTotal);
    } catch (err) {
        console.error('Failed to load contribution totals:', err);
    }
}

function renderHoldings(holdings) {
    const grid = document.getElementById('holdingsGrid');
    if (holdings.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 text-sm py-4">No individual holdings data available.</p>';
        return;
    }

    grid.innerHTML = holdings.map((h, i) => {
        const color = FUND_COLORS[i % FUND_COLORS.length];
        const value = (h.market_value_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const price = (h.price_per_share_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const alloc = h.allocation_percent ? h.allocation_percent.toFixed(1) + '%' : '';

        return `<div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 card-hover fade-in overflow-hidden" style="animation-delay: ${i * 60}ms">
            <div class="flex items-center gap-2.5 sm:gap-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 ${color.label.split(' ')[0]} rounded-xl flex items-center justify-center flex-shrink-0">
                    <span class="text-[10px] sm:text-xs font-bold ${color.label.split(' ')[1]}">${h.fund_ticker}</span>
                </div>
                <div class="flex-1 min-w-0 overflow-hidden">
                    <div class="font-semibold text-gray-900 text-xs sm:text-base truncate">${resolveFundName(h.fund_ticker, h.fund_name)}</div>
                    <div class="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">${h.shares?.toFixed(4) || '—'} shares @ ${price}</div>
                </div>
                <div class="text-right flex-shrink-0 pl-1">
                    <div class="font-bold text-sm sm:text-base text-gray-900 whitespace-nowrap">${value}</div>
                    ${alloc ? `<div class="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">${alloc}</div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderAllocationChart(holdings) {
    if (holdings.length === 0) return;

    document.getElementById('allocationSection').style.display = '';

    const bar = document.getElementById('allocationBar');
    const legend = document.getElementById('allocationLegend');

    const totalValue = holdings.reduce((s, h) => s + (h.market_value_cents || 0), 0);
    if (totalValue === 0) return;

    bar.innerHTML = holdings.map((h, i) => {
        const pct = ((h.market_value_cents / totalValue) * 100).toFixed(1);
        const color = FUND_COLORS[i % FUND_COLORS.length];
        return `<div class="${color.bg}" style="width: ${pct}%" title="${h.fund_ticker}: ${pct}%"></div>`;
    }).join('');

    legend.innerHTML = holdings.map((h, i) => {
        const pct = ((h.market_value_cents / totalValue) * 100).toFixed(1);
        const color = FUND_COLORS[i % FUND_COLORS.length];
        return `<div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-sm ${color.bg} flex-shrink-0"></span>
            <span class="text-sm text-gray-700">${h.fund_ticker} <span class="text-gray-400">${pct}%</span></span>
        </div>`;
    }).join('');
}

function renderGrowthChart(snapshots) {
    if (snapshots.length < 1) return;

    document.getElementById('chartSection').style.display = '';

    // Snapshots come in desc order — reverse for chronological chart
    const sorted = [...snapshots].reverse();

    const labels = sorted.map(s => {
        const d = new Date(s.snapshot_date + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    });

    const values = sorted.map(s => s.total_value_cents / 100);

    const ctx = document.getElementById('growthChart').getContext('2d');

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Portfolio Value',
                data: values,
                borderColor: '#6366f1',
                backgroundColor: gradient,
                borderWidth: 2.5,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: snapshots.length <= 12 ? 5 : 3,
                pointHoverRadius: 7,
                tension: 0.3,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e1b4b',
                    titleColor: '#e0e7ff',
                    bodyColor: '#fff',
                    bodyFont: { weight: '600', size: 14 },
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => '$' + ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 }),
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 11, family: 'Inter' },
                        color: '#94a3b8',
                        maxTicksLimit: 8,
                    },
                    border: { display: false },
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: {
                        font: { size: 11, family: 'Inter' },
                        color: '#94a3b8',
                        callback: (v) => '$' + v.toLocaleString('en-US'),
                        maxTicksLimit: 6,
                    },
                    border: { display: false },
                    beginAtZero: false,
                }
            }
        }
    });
}

function renderGrowthHistory(snapshots) {
    if (snapshots.length === 0) return;

    document.getElementById('growthSection').style.display = '';

    const tbody = document.getElementById('growthTableBody');
    const mobileList = document.getElementById('growthMobileList');

    let tableHtml = '';
    let mobileHtml = '';

    snapshots.forEach((snap, i) => {
        const value = (snap.total_value_cents / 100);
        const valueStr = value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const date = new Date(snap.snapshot_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const source = snap.source === 'csv_upload' ? 'CSV' : 'Manual';

        let changeHtml = '';
        let changeMobileHtml = '';
        if (i < snapshots.length - 1) {
            const prev = snapshots[i + 1].total_value_cents;
            const diff = snap.total_value_cents - prev;
            const pctChange = prev > 0 ? ((diff / prev) * 100).toFixed(1) : '—';
            if (diff > 0) {
                const diffStr = '+$' + (diff / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
                changeHtml = `<span class="text-emerald-600 font-medium">${diffStr}</span> <span class="text-xs text-gray-400">(+${pctChange}%)</span>`;
                changeMobileHtml = `<span class="text-xs font-medium text-emerald-600">${diffStr}</span>`;
            } else if (diff < 0) {
                const diffStr = '-$' + (Math.abs(diff) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
                changeHtml = `<span class="text-red-600 font-medium">${diffStr}</span> <span class="text-xs text-gray-400">(${pctChange}%)</span>`;
                changeMobileHtml = `<span class="text-xs font-medium text-red-600">${diffStr}</span>`;
            }
        } else if (snapshots.length === 1) {
            changeHtml = '<span class="text-gray-400">—</span>';
        } else {
            changeHtml = '<span class="text-xs text-gray-400">First entry</span>';
            changeMobileHtml = '<span class="text-xs text-gray-400">First</span>';
        }

        const isLatest = i === 0;

        tableHtml += `<tr class="border-b border-gray-100 last:border-0 ${isLatest ? 'bg-brand-50/30' : ''}">
            <td class="px-5 py-3.5 font-medium text-gray-900">${date}${isLatest ? ' <span class="text-[10px] bg-brand-100 text-brand-600 font-semibold px-1.5 py-0.5 rounded-full ml-1">LATEST</span>' : ''}</td>
            <td class="px-5 py-3.5 text-right font-bold text-gray-900">${valueStr}</td>
            <td class="px-5 py-3.5 text-right">${changeHtml}</td>
            <td class="px-5 py-3.5 text-gray-500">${source}</td>
        </tr>`;

        mobileHtml += `<div class="px-4 py-3.5 ${isLatest ? 'bg-brand-50/30' : ''}">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-medium text-gray-900 text-sm">${date}</div>
                    <div class="text-xs text-gray-500 mt-0.5">${source}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-gray-900">${valueStr}</div>
                    ${changeMobileHtml}
                </div>
            </div>
        </div>`;
    });

    tbody.innerHTML = tableHtml;
    mobileList.innerHTML = mobileHtml;
}

// ---------- Performance Summary (30d / 90d / All-Time) ----------

function renderPerformanceSummary(snapshots) {
    if (snapshots.length < 2) return;

    // snapshots are desc by date — latest first
    const latest = snapshots[0];
    const latestVal = latest.total_value_cents;
    const latestDate = new Date(latest.snapshot_date + 'T00:00:00');

    // Sort ascending for lookups
    const sorted = [...snapshots].reverse();
    const earliest = sorted[0];

    // Helper: find the snapshot closest to N days ago
    function findClosest(daysAgo) {
        const target = new Date(latestDate);
        target.setDate(target.getDate() - daysAgo);
        let best = null;
        let bestDiff = Infinity;
        for (const s of sorted) {
            const d = new Date(s.snapshot_date + 'T00:00:00');
            const diff = Math.abs(d - target);
            if (diff < bestDiff) { bestDiff = diff; best = s; }
        }
        // Only use if it's actually older than latest
        return (best && best.id !== latest.id) ? best : null;
    }

    // Helper: render a perf card
    function renderCard(prefix, currentCents, previousCents) {
        const valEl = document.getElementById(prefix + 'Value');
        const changeEl = document.getElementById(prefix + 'Change');
        const badgeEl = document.getElementById(prefix + 'Badge');

        const currentVal = currentCents / 100;
        valEl.textContent = '$' + currentVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if (!previousCents || previousCents === 0) return;

        const diff = currentCents - previousCents;
        const pct = ((diff / previousCents) * 100).toFixed(1);
        const isPositive = diff >= 0;

        const sign = isPositive ? '+' : '-';
        const diffStr = sign + '$' + (Math.abs(diff) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const pctStr = (isPositive ? '+' : '') + pct + '%';

        changeEl.textContent = diffStr;
        changeEl.className = 'text-sm font-medium ' + (isPositive ? 'text-emerald-600' : 'text-red-600');

        badgeEl.textContent = pctStr;
        badgeEl.className = 'text-xs px-1.5 py-0.5 rounded-full font-semibold ' +
            (isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700');
        badgeEl.style.display = '';
    }

    // 30 days
    const snap30 = findClosest(30);
    if (snap30) renderCard('perf1m', latestVal, snap30.total_value_cents);

    // 90 days
    const snap90 = findClosest(90);
    if (snap90) renderCard('perf3m', latestVal, snap90.total_value_cents);

    // All-time (first snapshot ever)
    renderCard('perfAll', latestVal, earliest.total_value_cents);

    // Show the section if we rendered at least one
    if (snap30 || snap90 || earliest.id !== latest.id) {
        document.getElementById('performanceSection').style.display = '';
    }

    // Also update the all-time gain badge on the hero card
    if (earliest.id !== latest.id) {
        const diff = latestVal - earliest.total_value_cents;
        const pct = ((diff / earliest.total_value_cents) * 100).toFixed(1);
        const isPositive = diff >= 0;
        const sign = isPositive ? '+' : '-';
        const diffStr = sign + '$' + (Math.abs(diff) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const pctStr = (isPositive ? '+' : '') + pct + '%';

        const gainEl = document.getElementById('allTimeGainValue');
        const badgeWrap = document.getElementById('allTimeGainBadge');
        if (gainEl && badgeWrap) {
            gainEl.textContent = diffStr + ' (' + pctStr + ')';
            gainEl.className = 'text-sm font-semibold ' + (isPositive ? 'text-emerald-300' : 'text-red-300');
            badgeWrap.style.display = '';
        }
    }
}

// ---------- Top Performer (largest holding) ----------

function renderTopPerformer(holdings) {
    if (!holdings || holdings.length === 0) return;

    // Find holding with the highest market value
    const top = holdings.reduce((a, b) => (b.market_value_cents > a.market_value_cents ? b : a), holdings[0]);
    if (!top || top.market_value_cents === 0) return;

    document.getElementById('topPerformerSection').style.display = '';
    document.getElementById('topPerformerName').textContent = resolveFundName(top.fund_ticker, top.fund_name);
    document.getElementById('topPerformerValue').textContent =
        (top.market_value_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    document.getElementById('topPerformerAlloc').textContent =
        top.allocation_percent ? top.allocation_percent.toFixed(1) + '% of portfolio' : '';
}

function showNoData() {
    // Hide data sections
    document.getElementById('holdingsSection').style.display = 'none';
    document.getElementById('allocationSection').style.display = 'none';
    document.getElementById('chartSection').style.display = 'none';
    document.getElementById('growthSection').style.display = 'none';
    document.getElementById('performanceSection').style.display = 'none';
    document.getElementById('topPerformerSection').style.display = 'none';

    // Hide portfolio total skeleton
    document.getElementById('portfolioTotal').textContent = '$0.00';
    document.getElementById('portfolioDate').textContent = 'No data yet';

    // Show empty state
    document.getElementById('noInvestmentData').classList.remove('hidden');
}
