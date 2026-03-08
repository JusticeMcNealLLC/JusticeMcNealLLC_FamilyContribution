// ══════════════════════════════════════════
// Milestones – Initialization & Data Loading
// Load order: config.js → renders.js → init.js
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth(false);
    if (!user) return;

    await loadMilestonesData();
});

async function loadMilestonesData() {
    try {
        // Fetch net contributions (gross − Stripe fees) + portfolio value in parallel
        const [netRes, portfolioRes] = await Promise.all([
            supabaseClient.rpc('get_family_net_total'),
            supabaseClient
                .from('investment_snapshots')
                .select('total_value_cents')
                .order('snapshot_date', { ascending: false })
                .limit(1),
        ]);

        const netContributions = netRes.data || 0;
        const portfolioValue   = portfolioRes.data?.[0]?.total_value_cents || 0;

        // Total family assets = net contributions + current portfolio value
        const totalAssets = netContributions + portfolioValue;

        // Render everything
        renderProgressHero(totalAssets);
        renderStatsRow(totalAssets);
        renderMilestoneRoadmap(totalAssets);

        // Show the content, hide loading
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('milestonesContent')?.classList.remove('hidden');

    } catch (err) {
        console.error('Failed to load milestones data:', err);
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('errorState')?.classList.remove('hidden');
    }
}
