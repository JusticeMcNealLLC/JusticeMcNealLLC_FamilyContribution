// ══════════════════════════════════════════
// Investments – Charts (Growth Line + Allocation Bar)
// Depends on: config.js (FUND_COLORS)
// ══════════════════════════════════════════

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
