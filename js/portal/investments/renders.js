// ══════════════════════════════════════════
// Investments – Render Functions
// Depends on: config.js (FUND_COLORS, resolveFundName)
// ══════════════════════════════════════════

function renderPortfolioTotal(snapshot) {
    const total = snapshot.total_value_cents / 100;
    document.getElementById('portfolioTotal').textContent = '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const date = new Date(snapshot.snapshot_date + 'T00:00:00');
    const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('portfolioDate').textContent = `As of ${formatted}`;
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

function renderPerformanceSummary(snapshots) {
    if (snapshots.length < 2) return;

    const latest = snapshots[0];
    const latestVal = latest.total_value_cents;
    const latestDate = new Date(latest.snapshot_date + 'T00:00:00');

    const sorted = [...snapshots].reverse();
    const earliest = sorted[0];

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
        return (best && best.id !== latest.id) ? best : null;
    }

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

    const snap30 = findClosest(30);
    if (snap30) renderCard('perf1m', latestVal, snap30.total_value_cents);

    const snap90 = findClosest(90);
    if (snap90) renderCard('perf3m', latestVal, snap90.total_value_cents);

    renderCard('perfAll', latestVal, earliest.total_value_cents);

    if (snap30 || snap90 || earliest.id !== latest.id) {
        document.getElementById('performanceSection').style.display = '';
    }

    // Update all-time gain badge on the hero card
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

function renderTopPerformer(holdings) {
    if (!holdings || holdings.length === 0) return;

    const top = holdings.reduce((a, b) => (b.market_value_cents > a.market_value_cents ? b : a), holdings[0]);
    if (!top || top.market_value_cents === 0) return;

    document.getElementById('topPerformerSection').style.display = '';
    document.getElementById('topPerformerName').textContent = resolveFundName(top.fund_ticker, top.fund_name);
    document.getElementById('topPerformerValue').textContent =
        (top.market_value_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    document.getElementById('topPerformerAlloc').textContent =
        top.allocation_percent ? top.allocation_percent.toFixed(1) + '% of portfolio' : '';
}
