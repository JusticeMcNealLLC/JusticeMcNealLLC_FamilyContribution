// ══════════════════════════════════════════
// Investments – Config & Shared Helpers
// ══════════════════════════════════════════

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

function showNoData() {
    document.getElementById('holdingsSection').style.display = 'none';
    document.getElementById('allocationSection').style.display = 'none';
    document.getElementById('chartSection').style.display = 'none';
    document.getElementById('growthSection').style.display = 'none';
    document.getElementById('performanceSection').style.display = 'none';
    document.getElementById('topPerformerSection').style.display = 'none';

    document.getElementById('portfolioTotal').textContent = '$0.00';
    document.getElementById('portfolioDate').textContent = 'No data yet';

    document.getElementById('noInvestmentData').classList.remove('hidden');
}
