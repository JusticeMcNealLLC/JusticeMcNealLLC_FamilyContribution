// Admin Hub - Quick Stats + Navigation

document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth(true);
    if (!user) return;

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // Load all stats in parallel
    await Promise.all([
        loadMemberStats(),
        loadFinancialStats(),
        loadPortfolioStat(),
    ]);
});

async function loadMemberStats() {
    try {
        const { data, error } = await supabaseClient
            .from('subscriptions')
            .select('id')
            .in('status', ['active', 'trialing']);

        if (!error && data) {
            document.getElementById('statActive').textContent = data.length;
        }
    } catch (err) {
        console.error('Failed to load member stats:', err);
        document.getElementById('statActive').textContent = '—';
    }
}

async function loadFinancialStats() {
    try {
        const { data: invoices, error } = await supabaseClient
            .from('invoices')
            .select('amount_paid_cents, created_at, status')
            .eq('status', 'paid');

        if (error) throw error;

        const allTimeTotal = (invoices || []).reduce((s, i) => s + (i.amount_paid_cents || 0), 0);
        document.getElementById('statAllTime').textContent = formatCurrency(allTimeTotal);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthTotal = (invoices || [])
            .filter(i => new Date(i.created_at) >= startOfMonth)
            .reduce((s, i) => s + (i.amount_paid_cents || 0), 0);
        document.getElementById('statMonthly').textContent = formatCurrency(thisMonthTotal);
    } catch (err) {
        console.error('Failed to load financial stats:', err);
        document.getElementById('statAllTime').textContent = '—';
        document.getElementById('statMonthly').textContent = '—';
    }
}

async function loadPortfolioStat() {
    try {
        const { data, error } = await supabaseClient
            .from('investment_snapshots')
            .select('total_value_cents')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            document.getElementById('statPortfolio').textContent = formatCurrency(data.total_value_cents);
        } else {
            document.getElementById('statPortfolio').textContent = '$0.00';
        }
    } catch (err) {
        console.error('Failed to load portfolio stat:', err);
        document.getElementById('statPortfolio').textContent = '—';
    }
}
