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
        // Fetch current portfolio value (contributions are invested into ETFs,
        // so portfolio = the single source of truth for family wealth)
        const { data: snapshots } = await supabaseClient
            .from('investment_snapshots')
            .select('total_value_cents')
            .order('snapshot_date', { ascending: false })
            .limit(1);

        const totalAssets = snapshots?.[0]?.total_value_cents || 0;

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
