import { getNextTier, getProgressToNext } from '../../../portal/milestones/state/tiers.js';

export async function loadNextMilestone() {
    try {
        const { data: snapshots } = await supabaseClient
            .from('investment_snapshots')
            .select('total_value_cents')
            .order('snapshot_date', { ascending: false })
            .limit(1);

        const totalAssets = snapshots?.[0]?.total_value_cents || 0;
        const next = getNextTier(totalAssets);
        if (!next) return;

        const pct = getProgressToNext(totalAssets);
        const remaining = next.threshold - totalAssets;

        const card = document.getElementById('nextMilestoneCard');
        const emojiEl = document.getElementById('nextMilestoneEmoji');
        const nameEl = document.getElementById('nextMilestoneName');
        const pctEl = document.getElementById('nextMilestonePct');
        const barEl = document.getElementById('nextMilestoneBar');
        const remainEl = document.getElementById('nextMilestoneRemaining');

        if (!card) return;

        if (emojiEl) emojiEl.textContent = next.emoji;
        if (nameEl) nameEl.textContent = `Next: ${next.name}`;
        if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
        if (remainEl) {
            remainEl.textContent = `${formatCurrency(remaining)} to go · ${formatCurrency(next.threshold)} goal`;
        }

        card.classList.remove('hidden');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (barEl) barEl.style.width = `${pct.toFixed(1)}%`;
            });
        });
    } catch (err) {
        console.error('Error loading next milestone:', err);
    }
}
