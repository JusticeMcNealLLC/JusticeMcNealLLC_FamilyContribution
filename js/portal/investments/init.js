// ══════════════════════════════════════════
// Investments – Initialization & Data Loading
// Load order: config.js → charts.js → renders.js → init.js
// ══════════════════════════════════════════

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

async function loadContributionTotals(userId) {
    try {
        const { data: familyTotal, error: famErr } = await supabaseClient
            .rpc('get_family_contribution_total');

        if (famErr) throw famErr;

        document.getElementById('familyContributed').textContent = formatCurrency(familyTotal || 0);

        const { data: userTotal, error: myErr } = await supabaseClient
            .rpc('get_member_total_contributions', { target_member_id: userId });

        if (myErr) throw myErr;

        document.getElementById('yourContributed').textContent = formatCurrency(userTotal || 0);
    } catch (err) {
        console.error('Failed to load contribution totals:', err);
    }
}
