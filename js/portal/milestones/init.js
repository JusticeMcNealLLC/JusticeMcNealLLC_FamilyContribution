// ══════════════════════════════════════════
// Milestones – Initialization & Data Loading
// Load order: config.js → renders.js → celebration.js → history.js → init.js
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
        const [snapshotRes, memberCountRes] = await Promise.all([
            supabaseClient
                .from('investment_snapshots')
                .select('total_value_cents')
                .order('snapshot_date', { ascending: false })
                .limit(1),
            supabaseClient
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('subscription_status', 'active'),
        ]);

        const totalAssets = snapshotRes.data?.[0]?.total_value_cents || 0;

        // Monthly contribution pace = active members × minimum monthly amount
        const activeMembers = memberCountRes.count || 0;
        const minAmountCents = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.MIN_AMOUNT)
            ? APP_CONFIG.MIN_AMOUNT * 100
            : 3000; // fallback $30
        const monthlyPaceCents = activeMembers * minAmountCents;

        // Render everything
        renderProgressHero(totalAssets);
        renderStatsRow(totalAssets);
        renderMilestoneRoadmap(totalAssets, monthlyPaceCents);

        // Load milestone history timeline (derived from snapshot history)
        const achievements = await loadMilestoneHistory();
        renderMilestoneTimeline(achievements);
        const countEl = document.getElementById('achievementCount');
        if (countEl) countEl.textContent = `${achievements.length} achieved`;

        // Check for new milestones → confetti + toast if newly crossed
        const currentIdx = getCurrentTierIndex(totalAssets);
        checkForNewMilestones(currentIdx);

        // Show the content, hide loading
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('milestonesContent')?.classList.remove('hidden');

    } catch (err) {
        console.error('Failed to load milestones data:', err);
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('errorState')?.classList.remove('hidden');
    }
}
