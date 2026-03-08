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
 * Estimate months to reach a threshold given current value and monthly contributions.
 * Assumes ~7% annual portfolio growth compounded monthly.
 */
function estimateMonthsToReach(currentCents, targetCents, monthlyPaceCents) {
    if (currentCents >= targetCents) return 0;
    if (monthlyPaceCents <= 0) return Infinity;

    const monthlyRate = 0.07 / 12; // ~7% annual growth
    let balance = currentCents;
    let months = 0;
    const maxMonths = 12 * 100; // 100-year cap

    while (balance < targetCents && months < maxMonths) {
        balance = balance * (1 + monthlyRate) + monthlyPaceCents;
        months++;
    }
    return months >= maxMonths ? Infinity : months;
}

/**
 * Format months into a readable ETA string.
 */
function formatETA(months) {
    if (months === 0) return 'Achieved!';
    if (months === Infinity || months > 1200) return 'Long-term goal';
    if (months < 1) return 'Almost there!';
    if (months <= 2) return '~1-2 months';
    if (months < 12) return `~${Math.round(months)} months`;
    const years = months / 12;
    if (years < 2) return `~${Math.round(months)} months`;
    if (years < 10) return `~${years.toFixed(1)} years`;
    return `~${Math.round(years)} years`;
}

/**
 * Render the full milestone roadmap list with expandable detail cards.
 */
function renderMilestoneRoadmap(totalCents, monthlyPaceCents) {
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

        // Chevron icon (down arrow that rotates on expand)
        const chevron = `<svg class="milestone-chevron w-4 h-4 sm:w-5 sm:h-5 ${isUnlocked ? 'text-emerald-400' : isNext ? 'text-amber-400' : 'text-gray-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;

        // Estimated arrival for locked tiers
        const etaMonths = isUnlocked ? 0 : estimateMonthsToReach(totalCents, tier.threshold, monthlyPaceCents || 0);
        const etaStr    = formatETA(etaMonths);

        // Detail section (tier.details)
        const d = tier.details || {};
        const detailDescription = d.description || '';
        const detailIncludes    = d.includes || [];
        const detailWhyCounts   = d.whyCounts || '';

        const includesHtml = detailIncludes.length > 0
            ? `<div class="mt-3">
                   <p class="text-[11px] sm:text-xs font-semibold ${isUnlocked ? 'text-emerald-700' : 'text-gray-600'} uppercase tracking-wide mb-1.5">What's Included</p>
                   <ul class="space-y-1">
                       ${detailIncludes.map(item => `
                           <li class="flex items-start gap-2 text-[11px] sm:text-sm ${isUnlocked ? 'text-emerald-600' : 'text-gray-500'}">
                               <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isUnlocked ? 'text-emerald-400' : 'text-gray-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path></svg>
                               <span>${item}</span>
                           </li>
                       `).join('')}
                   </ul>
               </div>`
            : '';

        const etaBadge = !isUnlocked
            ? `<div class="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${isNext ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}">
                   <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   Est. arrival: ${etaStr}
               </div>`
            : '';

        const detailSection = `
            <div class="milestone-detail" data-tier="${i}">
                <div class="milestone-detail-inner">
                    <div class="detail-content border-t ${isUnlocked ? 'border-emerald-200/60' : isNext ? 'border-amber-200/60' : 'border-gray-100'} pt-3">
                        <p class="text-[11px] sm:text-sm ${isUnlocked ? 'text-emerald-700' : 'text-gray-600'} leading-relaxed">${detailDescription}</p>
                        ${includesHtml}
                        ${etaBadge}
                        ${detailWhyCounts ? `<p class="mt-3 text-[10px] sm:text-xs ${isUnlocked ? 'text-emerald-500' : 'text-gray-400'} italic">📊 ${detailWhyCounts}</p>` : ''}
                    </div>
                </div>
            </div>`;

        return `
            <div class="relative ${i < MILESTONE_TIERS.length - 1 ? 'mb-2 sm:mb-3' : ''}">
                <div class="milestone-card flex flex-col rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition ${cardCls} ${isNext ? 'ring-2 ring-amber-200/60' : ''}" data-tier-idx="${i}" role="button" aria-expanded="false" tabindex="0">
                    <div class="flex items-start gap-2.5 sm:gap-4">
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
                                <div class="flex items-center gap-1.5">
                                    ${statusLabel}
                                    ${chevron}
                                </div>
                            </div>
                            <div class="text-[11px] sm:text-sm ${perkCls} mt-0.5 line-clamp-1">${tier.perk}</div>
                            <div class="flex items-center gap-2 mt-1 sm:mt-1.5">
                                <span class="text-[11px] sm:text-xs font-semibold ${isUnlocked ? 'text-emerald-600' : 'text-gray-400'}">${formatCurrency(tier.threshold)}</span>
                            </div>
                            ${progressBar}
                        </div>
                    </div>
                    ${detailSection}
                </div>
                ${connector}
            </div>
        `;
    }).join('');

    // Wire up expand/collapse handlers
    container.querySelectorAll('.milestone-card').forEach(card => {
        const handler = () => {
            const idx = card.dataset.tierIdx;
            const detail = card.querySelector('.milestone-detail');
            const chevronEl = card.querySelector('.milestone-chevron');
            const isExpanded = detail.classList.contains('expanded');

            // Collapse any other open card
            container.querySelectorAll('.milestone-detail.expanded').forEach(d => {
                if (d !== detail) {
                    d.classList.remove('expanded');
                    const parentCard = d.closest('.milestone-card');
                    if (parentCard) {
                        parentCard.setAttribute('aria-expanded', 'false');
                        const otherChevron = parentCard.querySelector('.milestone-chevron');
                        if (otherChevron) otherChevron.classList.remove('expanded');
                    }
                }
            });

            // Toggle this card
            detail.classList.toggle('expanded');
            card.setAttribute('aria-expanded', !isExpanded);
            if (chevronEl) chevronEl.classList.toggle('expanded');
        };

        card.addEventListener('click', handler);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handler();
            }
        });
    });
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
