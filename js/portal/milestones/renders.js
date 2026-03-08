// ══════════════════════════════════════════
// Milestones – Render Functions
// Load order: config.js → renders.js → init.js
// ══════════════════════════════════════════

/**
 * Render the hero "Next Unlock" progress card at the top.
 */
function renderProgressHero(totalCents) {
    const heroEl      = document.getElementById('progressHero');
    const currentEl   = document.getElementById('heroCurrentTotal');
    const nextNameEl  = document.getElementById('heroNextName');
    const nextAmtEl   = document.getElementById('heroNextAmount');
    const remainEl    = document.getElementById('heroRemaining');
    const barEl       = document.getElementById('heroProgressBar');
    const pctEl       = document.getElementById('heroProgressPct');
    const tierBadgeEl = document.getElementById('heroCurrentTier');

    if (!heroEl) return;

    const currentIdx = getCurrentTierIndex(totalCents);
    const next = getNextTier(totalCents);
    const pct = getProgressToNext(totalCents);

    // Current total
    if (currentEl) currentEl.textContent = formatCurrency(totalCents);

    // Current tier badge
    if (tierBadgeEl) {
        if (currentIdx >= 0) {
            const tier = MILESTONE_TIERS[currentIdx];
            tierBadgeEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-white/20 text-white">${tier.emoji} ${tier.name}</span>`;
        } else {
            tierBadgeEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-white/20 text-white">🚀 Getting Started</span>`;
        }
    }

    if (next) {
        if (nextNameEl) nextNameEl.textContent = `${next.emoji} ${next.name}`;
        if (nextAmtEl) nextAmtEl.textContent = formatCurrency(next.threshold);
        const remaining = next.threshold - totalCents;
        if (remainEl) remainEl.textContent = `${formatCurrency(remaining)} to go`;
    } else {
        // All tiers achieved!
        if (nextNameEl) nextNameEl.textContent = '🎉 All milestones achieved!';
        if (nextAmtEl) nextAmtEl.textContent = '';
        if (remainEl) remainEl.textContent = 'Generational wealth unlocked.';
    }

    // Progress bar
    if (barEl) {
        barEl.style.width = '0%';
        // Animate after a brief delay
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                barEl.style.width = pct.toFixed(1) + '%';
            });
        });
    }
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
}

/**
 * Render the full milestone roadmap list.
 */
function renderMilestoneRoadmap(totalCents) {
    const container = document.getElementById('milestoneRoadmap');
    if (!container) return;

    const currentIdx = getCurrentTierIndex(totalCents);

    container.innerHTML = MILESTONE_TIERS.map((tier, i) => {
        const isUnlocked = totalCents >= tier.threshold;
        const isCurrent  = i === currentIdx;
        const isNext     = i === currentIdx + 1;

        // Progress within this specific tier's segment
        let segmentPct = 0;
        if (isUnlocked) {
            segmentPct = 100;
        } else if (isNext) {
            segmentPct = getProgressToNext(totalCents);
        }

        // Visual states
        const ringCls = isUnlocked
            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
            : isCurrent || isNext
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-gray-50 border-gray-200 text-gray-400';

        const cardCls = isUnlocked
            ? 'border-emerald-200/80 bg-emerald-50/40'
            : isNext
                ? 'border-amber-200/80 bg-amber-50/30'
                : 'border-gray-200/80 bg-white';

        const nameCls = isUnlocked ? 'text-emerald-800' : isNext ? 'text-gray-900' : 'text-gray-500';
        const perkCls = isUnlocked ? 'text-emerald-600' : isNext ? 'text-gray-500' : 'text-gray-400';
        const barBg   = isUnlocked ? 'bg-emerald-500' : 'bg-amber-500';

        const checkOrLock = isUnlocked
            ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>'
            : isNext
                ? `<span class="text-lg leading-none">${tier.emoji}</span>`
                : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>';

        const connector = i < MILESTONE_TIERS.length - 1
            ? `<div class="absolute left-[17px] sm:left-[27px] top-full w-0.5 h-2 sm:h-3 ${isUnlocked ? 'bg-emerald-300' : 'bg-gray-200'}"></div>`
            : '';

        const statusLabel = isUnlocked
            ? '<span class="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Unlocked</span>'
            : isNext
                ? `<span class="text-[10px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">${Math.round(segmentPct)}% there</span>`
                : '<span class="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Locked</span>';

        const progressBar = (isNext && segmentPct > 0 && segmentPct < 100)
            ? `<div class="mt-2.5 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                   <div class="${barBg} h-full rounded-full transition-all duration-1000 ease-out" style="width: ${segmentPct.toFixed(1)}%"></div>
               </div>`
            : '';

        return `
            <div class="relative ${i < MILESTONE_TIERS.length - 1 ? 'mb-2 sm:mb-3' : ''}">
                <div class="flex items-start gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition ${cardCls} ${isNext ? 'ring-2 ring-amber-200/60' : ''}">
                    <!-- Icon -->
                    <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${ringCls}">
                        ${checkOrLock}
                    </div>
                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap">
                            <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <span class="text-xs sm:text-base font-bold ${nameCls}">${isUnlocked ? tier.emoji + ' ' : ''}${tier.name}</span>
                            </div>
                            ${statusLabel}
                        </div>
                        <div class="text-[11px] sm:text-sm ${perkCls} mt-0.5 line-clamp-1">${tier.perk}</div>
                        <div class="flex items-center gap-2 mt-1 sm:mt-1.5">
                            <span class="text-[11px] sm:text-xs font-semibold ${isUnlocked ? 'text-emerald-600' : 'text-gray-400'}">${formatCurrency(tier.threshold)}</span>
                        </div>
                        ${progressBar}
                    </div>
                </div>
                ${connector}
            </div>
        `;
    }).join('');
}

/**
 * Render the stats row at the top: current tier, tiers unlocked, total assets.
 */
function renderStatsRow(totalCents) {
    const currentIdx = getCurrentTierIndex(totalCents);
    const unlocked = currentIdx + 1;
    const total = MILESTONE_TIERS.length;

    const tierNameEl = document.getElementById('statCurrentTier');
    const unlockedEl = document.getElementById('statUnlocked');
    const totalEl    = document.getElementById('statTotalAssets');

    if (tierNameEl) {
        tierNameEl.textContent = currentIdx >= 0 ? MILESTONE_TIERS[currentIdx].name : 'None yet';
    }
    if (unlockedEl) {
        unlockedEl.textContent = `${unlocked} / ${total}`;
    }
    if (totalEl) {
        totalEl.textContent = formatCurrency(totalCents);
    }
}
