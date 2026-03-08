// ══════════════════════════════════════════
// Milestones – History Timeline
// Derives milestone achievement dates from investment_snapshots.
// Load order: config.js → renders.js → celebration.js → history.js → init.js
// ══════════════════════════════════════════

/**
 * Load all investment snapshots and derive when each milestone was first achieved.
 * Returns an array of { tierIndex, tier, achievedDate } objects (oldest first).
 */
async function loadMilestoneHistory() {
    const { data: snapshots, error } = await supabaseClient
        .from('investment_snapshots')
        .select('snapshot_date, total_value_cents')
        .order('snapshot_date', { ascending: true });

    if (error || !snapshots || snapshots.length === 0) return [];

    const achievements = [];
    let nextTierIdx = 0;

    for (const snap of snapshots) {
        // Walk through tiers, marking each one achieved as value crosses thresholds
        while (nextTierIdx < MILESTONE_TIERS.length && snap.total_value_cents >= MILESTONE_TIERS[nextTierIdx].threshold) {
            achievements.push({
                tierIndex: nextTierIdx,
                tier: MILESTONE_TIERS[nextTierIdx],
                achievedDate: snap.snapshot_date,
            });
            nextTierIdx++;
        }
        // Once we've attributed all reachable tiers for this snapshot, continue
    }

    return achievements;
}

/**
 * Render the milestone history timeline into the DOM.
 */
function renderMilestoneTimeline(achievements) {
    const container = document.getElementById('milestoneTimeline');
    if (!container) return;

    if (achievements.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 sm:py-12">
                <div class="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <svg class="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <p class="text-sm sm:text-base font-semibold text-gray-700">No milestones achieved yet</p>
                <p class="text-xs sm:text-sm text-gray-400 mt-1">Keep contributing — the first milestone is just around the corner!</p>
            </div>
        `;
        return;
    }

    // Reverse so most recent is at the top
    const reversed = [...achievements].reverse();

    container.innerHTML = reversed.map((a, i) => {
        const date = new Date(a.achievedDate + 'T00:00:00');
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const relativeStr = getRelativeDate(date);
        const isLatest = i === 0;

        return `
            <div class="flex gap-3 sm:gap-4 ${i < reversed.length - 1 ? 'pb-4 sm:pb-5' : ''}">
                <!-- Timeline line + dot -->
                <div class="flex flex-col items-center">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-xl flex items-center justify-center flex-shrink-0 ${isLatest ? 'bg-emerald-100 ring-2 ring-emerald-300' : 'bg-emerald-50'}">
                        <span class="text-base sm:text-lg leading-none">${a.tier.emoji}</span>
                    </div>
                    ${i < reversed.length - 1 ? `<div class="w-0.5 flex-1 mt-1.5 bg-emerald-200 rounded-full min-h-[12px]"></div>` : ''}
                </div>
                <!-- Content -->
                <div class="flex-1 min-w-0 pb-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs sm:text-sm font-bold text-gray-900">${a.tier.name}</span>
                        ${isLatest ? '<span class="text-[9px] sm:text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Latest</span>' : ''}
                    </div>
                    <div class="text-[11px] sm:text-xs text-gray-500 mt-0.5">${a.tier.perk}</div>
                    <div class="flex items-center gap-1.5 mt-1">
                        <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span class="text-[10px] sm:text-xs text-gray-400 font-medium">${dateStr}</span>
                        <span class="text-[10px] sm:text-xs text-gray-300">·</span>
                        <span class="text-[10px] sm:text-xs text-gray-400">${relativeStr}</span>
                    </div>
                </div>
                <!-- Amount badge -->
                <div class="flex-shrink-0 pt-0.5">
                    <span class="text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">${formatCurrency(a.tier.threshold)}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Helper: get relative date string ("3 days ago", "2 months ago", etc.)
 */
function getRelativeDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}
