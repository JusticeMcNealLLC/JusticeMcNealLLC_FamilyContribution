// Admin Hub - Quick Stats + Navigation

document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth({ permission: 'admin.dashboard' });
    if (!user) return;

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // Hide hub tiles the user lacks permission for
    document.querySelectorAll('[data-permission]').forEach(el => {
        if (!hasPermission(el.dataset.permission)) el.remove();
    });

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
        // All Time — combined Stripe + manual deposits via SECURITY DEFINER function
        const { data: allTimeTotal, error: rpcErr } = await supabaseClient
            .rpc('get_family_contribution_total');

        if (rpcErr) throw rpcErr;
        document.getElementById('statAllTime').textContent = formatCurrency(allTimeTotal || 0);

        // Fee breakdown
        const [netRes, feeRes] = await Promise.all([
            supabaseClient.rpc('get_family_net_total'),
            supabaseClient.rpc('get_total_stripe_fees')
        ]);
        const netTotal = netRes.data || 0;
        const totalFees = feeRes.data || 0;
        const feeEl = document.getElementById('statFeeBreakdown');
        if (feeEl && (netTotal > 0 || totalFees > 0)) {
            feeEl.innerHTML = `Net: <span class="text-emerald-600 font-semibold">${formatCurrency(netTotal)}</span> · Fees: <span class="text-red-500 font-semibold">${formatCurrency(totalFees)}</span>`;
        }

        // This Month — Stripe invoices + manual deposits from current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startStr = startOfMonth.toISOString();

        const [invoiceRes, depositRes] = await Promise.all([
            supabaseClient
                .from('invoices')
                .select('amount_paid_cents, created_at')
                .eq('status', 'paid')
                .gte('created_at', startStr),
            supabaseClient
                .from('manual_deposits')
                .select('amount_cents, deposit_date')
                .gte('deposit_date', startOfMonth.toISOString().split('T')[0])
        ]);

        const monthInvoices = (invoiceRes.data || []).reduce((s, i) => s + (i.amount_paid_cents || 0), 0);
        const monthDeposits = (depositRes.data || []).reduce((s, d) => s + (d.amount_cents || 0), 0);
        document.getElementById('statMonthly').textContent = formatCurrency(monthInvoices + monthDeposits);
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
