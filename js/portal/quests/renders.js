// ══════════════════════════════════════════
// Quests – Render Functions
// Load order: config.js → renders.js → init.js
// ══════════════════════════════════════════

// ─── CP Hero Card ────────────────────────────────────────
function renderCPHero(cpBalance, earnedBadges, profile) {
    const container = document.getElementById('cpHero');
    if (!container) return;

    const tier = getCPTier(cpBalance);
    const next = getNextCPTier(cpBalance);
    const progress = getCPProgress(cpBalance);

    const firstName  = profile?.first_name  || '';
    const lastName   = profile?.last_name   || '';
    const photoUrl   = profile?.profile_picture_url || null;
    const initials   = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || '?';

    container.innerHTML = `
        <div class="w-full bg-gradient-to-br ${tier.gradientFrom} ${tier.gradientTo} text-white relative overflow-hidden">
            <!-- Dot grid overlay -->
            <div class="absolute inset-0 pointer-events-none" style="background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px); background-size: 22px 22px;"></div>
            <!-- Orb decoration -->
            <div class="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none" style="background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%); transform: translate(35%, -35%);"></div>

            <div class="relative px-5 pb-6" style="padding-top: max(2.5rem, calc(env(safe-area-inset-top, 0px) + 1rem));">

                <!-- Avatar + Rank + Name row -->
                <div class="flex items-center gap-4 mb-5">
                    <!-- Profile photo -->
                    <div class="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/30 flex-shrink-0 bg-white/20 flex items-center justify-center shadow-lg">
                        ${photoUrl
                            ? `<img src="${photoUrl}" class="w-full h-full object-cover" alt="">`
                            : `<span class="text-white text-xl font-bold">${initials}</span>`
                        }
                    </div>
                    <!-- Name + Rank -->
                    <div class="flex-1 min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">${tier.emoji} ${tier.name}</div>
                        <div class="text-2xl font-extrabold text-white leading-tight truncate">${firstName || 'Member'}</div>
                    </div>
                    <!-- CP count -->
                    <div class="text-right flex-shrink-0">
                        <div class="text-2xl font-extrabold leading-none">${cpBalance}</div>
                        <div class="text-[11px] text-white/60 mt-0.5">Credit Points</div>
                    </div>
                </div>

                <!-- Tier progress bar -->
                ${next ? `
                <div>
                    <div class="flex items-center justify-between text-xs mb-1.5">
                        <span class="text-white/70">Next: ${next.emoji} ${next.name}</span>
                        <span class="font-semibold text-white/90">${progress}%</span>
                    </div>
                    <div class="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                        <div class="h-full bg-white/90 rounded-full transition-all duration-1000 ease-out" style="width: ${progress}%"></div>
                    </div>
                    <div class="text-[10px] text-white/50 mt-1.5">${next.minCP - cpBalance} CP to go</div>
                </div>` : `
                <div class="text-sm text-white/70">You've reached the highest tier! 👑</div>`}
            </div>
        </div>
    `;
}

// ─── Stats Row ───────────────────────────────────────────
function renderQuestStats(completedCount, totalQuests, cpBalance) {
    const container = document.getElementById('questStats');
    if (!container) return;

    const tier = getCPTier(cpBalance);

    container.innerHTML = `
        <div class="grid grid-cols-3 gap-3">
            <div class="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-4 text-center">
                <div class="text-xl sm:text-2xl font-extrabold text-emerald-600">${completedCount}</div>
                <div class="text-xs text-gray-500 mt-0.5">Completed</div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-4 text-center">
                <div class="text-xl sm:text-2xl font-extrabold text-gray-900">${totalQuests}</div>
                <div class="text-xs text-gray-500 mt-0.5">Available</div>
            </div>
            <div class="bg-white rounded-xl border border-gray-200/80 p-3 sm:p-4 text-center">
                <div class="text-xl sm:text-2xl font-extrabold ${tier.textColor}">${tier.emoji}</div>
                <div class="text-xs text-gray-500 mt-0.5">${tier.name.split(' ')[0]}</div>
            </div>
        </div>
    `;
}

// ─── Filter Tabs ─────────────────────────────────────────
function renderQuestFilters(activeFilter) {
    const container = document.getElementById('questFilters');
    if (!container) return;

    const filters = [
        { key: 'all',       label: 'All Quests' },
        { key: 'available', label: 'Available' },
        { key: 'active',    label: 'In Progress' },
        { key: 'completed', label: 'Completed' },
    ];

    container.innerHTML = `
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            ${filters.map(f => {
                const isActive = f.key === activeFilter;
                return `<button data-filter="${f.key}" class="quest-filter-btn px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                    isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600'
                }">${f.label}</button>`;
            }).join('')}
        </div>
    `;

    // Wire up filter handlers
    container.querySelectorAll('.quest-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            if (typeof handleQuestFilter === 'function') handleQuestFilter(filter);
        });
    });
}

// ─── Quest Grid (3-column circles) ───────────────────────
function renderQuestList(quests, memberQuests, filter) {
    const container = document.getElementById('questList');
    if (!container) return;

    // Merge quest data with member progress
    const merged = quests.map(q => {
        const mq = memberQuests.find(mq => mq.quest_id === q.id);
        return { ...q, memberQuest: mq || null };
    });

    // Apply filter
    let filtered;
    switch (filter) {
        case 'available':
            filtered = merged.filter(q => !q.memberQuest || q.memberQuest.status === 'available');
            break;
        case 'active':
            filtered = merged.filter(q => q.memberQuest && ['in_progress', 'submitted'].includes(q.memberQuest.status));
            break;
        case 'completed':
            filtered = merged.filter(q => q.memberQuest && q.memberQuest.status === 'completed');
            break;
        default:
            filtered = merged;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-4xl mb-3">${filter === 'completed' ? '🏆' : '🔍'}</div>
                <div class="text-gray-500 text-sm">${
                    filter === 'completed' ? 'No completed quests yet. Start earning!' :
                    filter === 'active' ? 'No quests in progress.' :
                    'No quests available right now.'
                }</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `<div class="grid grid-cols-3 gap-4">${filtered.map(q => renderQuestCard(q)).join('')}</div>`;

    // Wire up card interactions (locked quests use pointer-events-none so no handler needed)
    container.querySelectorAll('[data-quest-id]').forEach(card => {
        card.addEventListener('click', () => {
            const questId = card.dataset.questId;
            if (typeof openQuestDetail === 'function') openQuestDetail(questId);
        });
    });
}

function renderQuestCard(quest) {
    const mq = quest.memberQuest;
    const status = mq ? mq.status : 'available';
    const isCompleted = status === 'completed';
    const isInProgress = ['in_progress', 'submitted'].includes(status);

    // ── Contributor gate ──────────────────────────────────
    const isContributorLocked =
        !_isContributor && (
            quest.contributor_required ||
            (quest.auto_detect_key &&
             typeof CONTRIBUTOR_REQUIRED_QUESTS !== 'undefined' &&
             CONTRIBUTOR_REQUIRED_QUESTS.has(quest.auto_detect_key))
        );

    // Circle bg + ring based on status
    let circleBg, ringCss;
    if (isContributorLocked) {
        circleBg = 'bg-gray-100';
        ringCss  = '';
    } else if (isCompleted) {
        circleBg = 'bg-emerald-100';
        ringCss  = 'ring-2 ring-emerald-300 ring-offset-2';
    } else if (isInProgress) {
        circleBg = 'bg-amber-50';
        ringCss  = 'ring-2 ring-amber-300 ring-offset-2';
    } else {
        circleBg = 'bg-brand-50';
        ringCss  = 'ring-2 ring-brand-200 ring-offset-2';
    }

    const emojiContent = isContributorLocked ? '🔒' : (quest.emoji || '🎯');

    // Completed checkmark badge
    const completedBadge = isCompleted ? `
        <div class="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
            <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </div>` : '';

    // CP label in corner (only for uncompleted, unlocked)
    const cpBadge = (!isCompleted && !isContributorLocked) ? `
        <div class="absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 leading-none shadow-sm">+${quest.cp_reward}</div>` : '';

    return `
        <div data-quest-id="${quest.id}" class="flex flex-col items-center gap-2 cursor-pointer group ${isContributorLocked ? 'opacity-40 pointer-events-none' : ''}">
            <div class="relative w-full aspect-square rounded-full ${circleBg} ${ringCss} flex items-center justify-center text-3xl group-hover:scale-105 transition-transform">
                <span class="${isContributorLocked ? 'grayscale opacity-60' : ''}">${emojiContent}</span>
                ${completedBadge}
                ${cpBadge}
            </div>
            <span class="text-[10px] font-medium text-gray-600 text-center leading-tight line-clamp-2 w-full">${quest.title}</span>
        </div>
    `;
}

// ─── Quest Detail Modal ──────────────────────────────────
function renderQuestDetail(quest, memberQuest) {
    const modal = document.getElementById('questDetailModal');
    if (!modal) return;

    const status = memberQuest ? memberQuest.status : 'available';
    const statusCfg = getQuestStatusConfig(status);
    const isCompleted = status === 'completed';

    // Detect founding-member quest (badge + banner reward, limited time)
    const isFoundingQuest = quest.badge_reward_key === 'founding_member';

    modal.innerHTML = `
        <div class="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" id="questModalBackdrop">
            <div class="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto slide-up">

                <!-- ── Header ── -->
                <div class="relative overflow-hidden sm:rounded-t-2xl" style="background: linear-gradient(135deg, #4338ca 0%, #4f46e5 60%, #6366f1 100%); min-height: 140px;">
                    <!-- Subtle dot grid overlay -->
                    <div class="absolute inset-0 pointer-events-none" style="background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 20px 20px;"></div>
                    <!-- Orb decoration -->
                    <div class="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style="background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%); transform: translate(30%, -30%);"></div>

                    <!-- Close button -->
                    <button id="closeQuestDetail" class="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10 transition hover:bg-white/20" style="background: rgba(255,255,255,0.15);">
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>

                    <!-- Quest type tag -->
                    <div class="px-5 pt-5 pb-1">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-white/60">${getQuestTypeLabel(quest.quest_type)} Quest</span>
                    </div>

                    <!-- Emoji + title -->
                    <div class="px-5 pt-2 pb-5 flex items-end gap-4">
                        <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg" style="background: rgba(255,255,255,0.2);">
                            ${quest.emoji || '🎯'}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-extrabold text-white text-xl leading-tight mb-2">${quest.title}</h3>
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">${statusCfg.label}</span>
                                <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-400/90 text-amber-900">⚡ +${quest.cp_reward} CP</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ── Body ── -->
                <div class="p-5 space-y-4">

                    <!-- Description -->
                    <p class="text-sm text-gray-600">${quest.description || ''}</p>

                    <!-- ── Rewards: CP (always) ── -->
                    <div class="rounded-xl border border-amber-100 overflow-hidden">
                        <div class="bg-amber-50 px-4 py-2.5 flex items-center gap-2 border-b border-amber-100">
                            <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-amber-700">Quest Reward</span>
                        </div>
                        <div class="p-4 bg-white">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                                    <span class="text-base">⚡</span>
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-brand-700">+${quest.cp_reward} Credit Points</div>
                                    <div class="text-xs text-gray-400">${quest.quest_type === 'recurring_monthly' ? 'Earned each qualifying month' : 'Permanent, one-time reward'}</div>
                                </div>
                                ${_questEarnedBadges.length > 0 || isCompleted ? '' : ''}
                            </div>
                        </div>
                    </div>

                    <!-- ── Founding Member Exclusive Rewards (badge + banner, limited-time) ── -->
                    ${isFoundingQuest ? (() => {
                        const br = getBadge('founding_member');
                        const brRarity = getBadgeRarity('founding_member');
                        const badgeEarned = _questEarnedBadges.some(b => b.badge_key === 'founding_member');
                        return `
                    <div class="rounded-xl border border-brand-200 overflow-hidden">
                        <div class="bg-brand-600 px-4 py-2.5 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-white text-sm">🏆</span>
                                <span class="text-[11px] font-bold uppercase tracking-wider text-white">Founding Member Exclusives</span>
                            </div>
                            <span class="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">⏳ Year 1 Only</span>
                        </div>
                        <div class="bg-brand-50 px-4 py-2 border-b border-brand-100">
                            <p class="text-[11px] text-brand-700">These rewards are only available to members who activate their contribution before the founding window closes. They cannot be earned after Year 1.</p>
                        </div>
                        <div class="bg-white p-4 space-y-3">
                            <!-- Badge row -->
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                                    ${buildBadgeChip('founding_member', 'md')}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="text-sm font-bold text-gray-900">${br.name}</span>
                                        <span class="badge-rarity-legendary text-[9px] font-bold px-1.5 py-0.5 rounded-full">${brRarity.label}</span>
                                        ${badgeEarned ? '<span class="text-[10px] font-semibold text-emerald-600">✓ Earned</span>' : ''}
                                    </div>
                                    <div class="text-xs text-gray-400 mt-0.5">${br.description}</div>
                                </div>
                            </div>
                            <div class="border-t border-gray-100"></div>
                            <!-- Banner row -->
                            <div class="flex items-start gap-3">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap mb-2">
                                        <span class="text-sm font-bold text-gray-900">Founders Constellation</span>
                                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Animated Banner</span>
                                        ${badgeEarned ? '<span class="text-[10px] font-semibold text-emerald-600">✓ Earned</span>' : ''}
                                    </div>
                                    <!-- Full-width banner preview -->
                                    <div class="relative rounded-xl overflow-hidden w-full" style="height: 80px;" id="questFounderBannerPreview">
                                        <div class="founders-banner-preview w-full h-full"></div>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-1.5">Exclusive animated profile banner with sparkle constellation effect</div>
                                </div>
                            </div>
                        </div>
                    </div>`;
                    })() : quest.badge_reward_key ? (() => {
                        // Non-founding badge reward
                        const br = getBadge(quest.badge_reward_key);
                        const brRarity = getBadgeRarity(quest.badge_reward_key);
                        const alreadyEarned = _questEarnedBadges.some(b => b.badge_key === quest.badge_reward_key);
                        return `
                    <div class="rounded-xl border border-purple-100 overflow-hidden">
                        <div class="bg-purple-50 px-4 py-2.5 flex items-center gap-2 border-b border-purple-100">
                            <span class="text-purple-500 text-sm">🏅</span>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-purple-700">Badge Reward</span>
                        </div>
                        <div class="bg-white p-4">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                                    ${buildBadgeChip(quest.badge_reward_key, 'md')}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="text-sm font-bold text-gray-900">${br.emoji} ${br.name}</span>
                                        <span class="${brRarity.cssClass} text-[9px] font-bold px-1.5 py-0.5 rounded-full">${brRarity.label}</span>
                                        ${alreadyEarned ? '<span class="text-[10px] font-semibold text-emerald-600">✓ Earned</span>' : ''}
                                    </div>
                                    <div class="text-xs text-gray-400 mt-0.5">${br.description}</div>
                                </div>
                            </div>
                        </div>
                    </div>`;
                    })() : ''}

                    <!-- ── Progress (tracked quests) ── -->
                    ${memberQuest && memberQuest.progress_target > 0 && !isCompleted ? (() => {
                        const pCurrent = memberQuest.progress_current || 0;
                        const pTarget = memberQuest.progress_target || 1;
                        const pPct = Math.min(100, Math.round((pCurrent / pTarget) * 100));
                        const pNote = memberQuest.progress_note || '';
                        const segments = pTarget <= 12 ? pTarget : null;
                        return `
                    <div class="rounded-xl border border-brand-100 overflow-hidden">
                        <div class="bg-brand-50 px-4 py-2.5 flex items-center gap-2 border-b border-brand-100">
                            <span class="text-brand-500 text-sm">📊</span>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-brand-700">Progress</span>
                        </div>
                        <div class="bg-white p-4">
                            <div class="flex items-end justify-between mb-3">
                                <div class="text-2xl font-extrabold text-brand-600">${pCurrent}<span class="text-sm font-semibold text-brand-300">/${pTarget}</span></div>
                                <div class="text-sm font-bold text-brand-500">${pPct}%</div>
                            </div>
                            ${segments ? `
                            <div class="flex gap-1 mb-2">
                                ${Array.from({length: segments}, (_, i) => `<div class="flex-1 h-2 rounded-sm ${i < pCurrent ? 'bg-brand-500' : 'bg-brand-100'}"></div>`).join('')}
                            </div>` : `
                            <div class="w-full h-2 bg-brand-100 rounded-full overflow-hidden mb-2">
                                <div class="h-full bg-brand-500 rounded-full transition-all duration-1000 ease-out" style="width:${pPct}%"></div>
                            </div>`}
                            ${pNote ? `<div class="text-xs text-brand-600 mt-1">${pNote}</div>` : ''}
                        </div>
                    </div>`;
                    })() : ''}

                    <!-- ── Completion Banner ── -->
                    ${isCompleted && memberQuest ? `
                    <div class="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <div>
                                <div class="text-sm font-bold text-emerald-800">Quest Complete!</div>
                                <div class="text-xs text-emerald-600">+${quest.cp_reward} CP earned ${memberQuest.completed_at ? 'on ' + formatDate(memberQuest.completed_at) : ''}</div>
                            </div>
                        </div>
                    </div>` : ''}

                    <!-- ── Instructions ── -->
                    ${quest.instructions ? `
                    <div class="rounded-xl border border-gray-100 overflow-hidden">
                        <div class="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                            <span class="text-gray-400 text-sm">📋</span>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-gray-500">How to Complete</span>
                        </div>
                        <div class="bg-white p-4">
                            <p class="text-sm text-gray-600">${quest.instructions}</p>
                        </div>
                    </div>` : ''}

                    <!-- ── Proof Upload ── -->
                    ${quest.requires_proof && !isCompleted ? `
                    <div class="rounded-xl border border-gray-100 overflow-hidden">
                        <div class="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                            <span class="text-gray-400 text-sm">📎</span>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-gray-500">Submit Proof</span>
                        </div>
                        <div class="bg-white p-4">
                            <div class="border-2 border-dashed border-brand-200 rounded-xl p-6 text-center hover:border-brand-400 transition cursor-pointer bg-brand-50/40" id="proofUploadArea">
                                <svg class="w-8 h-8 text-brand-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <p class="text-sm text-brand-600 font-medium">Tap to upload a screenshot</p>
                                <p class="text-xs text-gray-400 mt-1">JPG, PNG, or WebP</p>
                                <input type="file" id="proofFileInput" accept="image/jpeg,image/png,image/webp" class="hidden">
                            </div>
                            <div id="proofPreview" class="hidden mt-3">
                                <img id="proofPreviewImg" class="w-full rounded-xl border border-gray-200" alt="Proof preview">
                            </div>
                            <textarea id="proofNote" class="w-full mt-3 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition resize-none" placeholder="Add a note (optional)" rows="2"></textarea>
                        </div>
                    </div>` : ''}

                    <!-- ── Admin Feedback ── -->
                    ${memberQuest && memberQuest.status === 'rejected' && memberQuest.admin_note ? `
                    <div class="bg-red-50 rounded-xl p-4 border border-red-100">
                        <h4 class="text-[11px] font-bold uppercase tracking-wider text-red-600 mb-2">⚠️ Admin Feedback</h4>
                        <p class="text-sm text-red-700">${memberQuest.admin_note}</p>
                    </div>` : ''}

                    <!-- ── Meta Info ── -->
                    <div class="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                        <span>${getQuestTypeLabel(quest.quest_type)}</span>
                        <span>•</span>
                        <span>${(QUEST_CATEGORIES[quest.category] || QUEST_CATEGORIES.general).label}</span>
                        ${quest.requires_proof ? '<span>•</span><span class="text-amber-500">📎 Proof required</span>' : ''}
                    </div>

                    <!-- ── Action Buttons ── -->
                    <div id="questDetailActions">
                        ${renderQuestActions(quest, memberQuest)}
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');

    // Wire up close
    document.getElementById('closeQuestDetail')?.addEventListener('click', closeQuestDetail);
    document.getElementById('questModalBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'questModalBackdrop') closeQuestDetail();
    });

    // Wire up proof upload
    const uploadArea = document.getElementById('proofUploadArea');
    const fileInput = document.getElementById('proofFileInput');
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleProofFileSelect);
    }

    // Wire up action buttons
    wireQuestActions(quest, memberQuest);

    // Apply Lottie animations to legendary/epic badge chips in modal
    if (typeof LottieEffects !== 'undefined') {
        setTimeout(() => {
            LottieEffects.applyBadgeEffects();
            // Animate the founding member banner preview thumbnail
            const bannerPreview = document.getElementById('questFounderBannerPreview');
            if (bannerPreview) {
                LottieEffects.renderBannerEffect(bannerPreview, 'sparkle', { opacity: 0.9 });
            }
        }, 80);
    }
}

function renderQuestActions(quest, memberQuest) {
    const status = memberQuest ? memberQuest.status : 'available';

    switch (status) {
        case 'available':
            if (quest.auto_detect_key && !quest.requires_proof) {
                return `<div class="text-center text-sm py-3 rounded-xl font-medium text-gray-500 bg-gray-50 border border-gray-200">🔍 Auto-tracked — no action needed</div>`;
            }
            return `<button id="startQuestBtn" class="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-3.5 px-5 rounded-xl transition text-sm">Start Quest</button>`;

        case 'in_progress':
            if (quest.requires_proof) {
                return `<button id="submitProofBtn" class="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-3.5 px-5 rounded-xl transition text-sm">📤 Submit for Review</button>`;
            }
            if (quest.auto_detect_key) {
                return `<div class="text-center text-sm py-3 rounded-xl font-medium text-brand-600 bg-brand-50 border border-brand-100">🔍 Tracking your progress automatically...</div>`;
            }
            return `<button id="completeQuestBtn" class="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3.5 px-5 rounded-xl transition text-sm">✅ Mark as Complete</button>`;

        case 'submitted':
            return `<div class="text-center text-sm py-3 rounded-xl font-medium text-amber-700 bg-amber-50 border border-amber-100">⏳ Waiting for admin review...</div>`;

        case 'completed':
            return `<div class="text-center text-sm py-3 rounded-xl font-medium text-emerald-700 bg-emerald-50 border border-emerald-100">✅ Quest completed!</div>`;

        case 'rejected':
            return `<button id="resubmitQuestBtn" class="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-3.5 px-5 rounded-xl transition text-sm">🔄 Resubmit Proof</button>`;

        default:
            return '';
    }
}

function wireQuestActions(quest, memberQuest) {
    document.getElementById('startQuestBtn')?.addEventListener('click', () => startQuest(quest.id));
    document.getElementById('submitProofBtn')?.addEventListener('click', () => submitQuestProof(quest.id));
    document.getElementById('completeQuestBtn')?.addEventListener('click', () => completeQuest(quest.id));
    document.getElementById('resubmitQuestBtn')?.addEventListener('click', () => submitQuestProof(quest.id));
}

function closeQuestDetail() {
    const modal = document.getElementById('questDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.innerHTML = '';
    }
}

// ─── Badge Collection Render ─────────────────────────────
let _questBadgeFilter = 'all';
let _questBadgePage = 0;
let _questEarnedBadges = [];
const Q_BADGES_PER_PAGE = 6;

function renderBadgeCollection(earnedBadges) {
    const container = document.getElementById('badgeCollection');
    if (!container) return;

    _questEarnedBadges = earnedBadges || [];
    _questBadgePage = 0;
    _questBadgeFilter = 'all';

    _renderQuestBadgeInner();
}

function _renderQuestBadgeInner() {
    const container = document.getElementById('badgeCollection');
    if (!container) return;

    const allKeys = Object.keys(BADGE_CATALOG);
    const earnedBadges = _questEarnedBadges;

    // Filter bar + grid + pagination
    const filterBar = `
        <div class="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar" id="questBadgeFilterBar">
            ${['all','common','rare','epic','legendary'].map(f => {
                const label = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1);
                return `<button class="badge-filter-pill ${_questBadgeFilter === f ? 'active' : ''}" data-qfilter="${f}">${label}</button>`;
            }).join('')}
        </div>
    `;

    // Apply filter
    const filtered = _questBadgeFilter === 'all'
        ? allKeys
        : allKeys.filter(k => (getBadge(k).rarity || 'common') === _questBadgeFilter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / Q_BADGES_PER_PAGE));
    if (_questBadgePage >= totalPages) _questBadgePage = totalPages - 1;
    if (_questBadgePage < 0) _questBadgePage = 0;
    const start = _questBadgePage * Q_BADGES_PER_PAGE;
    const pageKeys = filtered.slice(start, start + Q_BADGES_PER_PAGE);

    let gridHTML = '';
    if (pageKeys.length === 0) {
        gridHTML = '<div class="col-span-full text-center py-6 text-sm text-gray-400">No badges in this category yet</div>';
    } else {
        gridHTML = pageKeys.map(key => {
            const badge = getBadge(key);
            const rarity = getBadgeRarity(key);
            const earned = earnedBadges.find(b => b.badge_key === key);
            const isDisplayed = earned && earned.is_displayed;
            const isEarned = !!earned;

            return `
                <div class="badge-picker-card ${isDisplayed ? 'badge-active' : ''} ${!isEarned ? 'badge-locked' : ''} bg-white rounded-xl border-2 ${isDisplayed ? 'border-brand-500' : isEarned ? 'border-gray-200 hover:border-brand-300' : 'border-gray-100'} p-3 text-center"
                     data-qbadge-detail="${key}" ${isEarned ? `data-badge-key="${key}"` : ''}>
                    <div class="flex justify-center mb-1.5">
                        ${buildBadgeChip(key, 'lg')}
                    </div>
                    <div class="text-[10px] font-semibold text-gray-700 leading-tight mb-0.5 truncate">${badge.name}</div>
                    <div class="text-[9px] font-medium rarity-${badge.rarity || 'common'}">${rarity.label}</div>
                    ${isDisplayed ? '<div class="text-[9px] text-brand-600 font-semibold mt-0.5">✓ Displayed</div>' : ''}
                    ${!isEarned ? '<div class="text-[9px] text-gray-400 mt-0.5">🔒 Locked</div>' : ''}
                </div>
            `;
        }).join('');
    }

    // Pagination controls
    let paginationHTML = '';
    if (totalPages > 1) {
        const dots = Array.from({ length: totalPages }, (_, i) =>
            `<div class="badge-page-dot ${i === _questBadgePage ? 'active' : ''}" data-qpage="${i}"></div>`
        ).join('');
        paginationHTML = `
            <div class="flex items-center justify-center gap-3 mt-3">
                <button class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition ${_questBadgePage <= 0 ? 'opacity-30 pointer-events-none' : ''}" id="qBadgePrev">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <div class="flex gap-1.5">${dots}</div>
                <button class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition ${_questBadgePage >= totalPages - 1 ? 'opacity-30 pointer-events-none' : ''}" id="qBadgeNext">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
            </div>
        `;
    }

    container.innerHTML = filterBar + `<div class="grid grid-cols-3 gap-3">${gridHTML}</div>` + paginationHTML;

    // Wire filter pills
    container.querySelectorAll('[data-qfilter]').forEach(pill => {
        pill.addEventListener('click', () => {
            _questBadgeFilter = pill.dataset.qfilter;
            _questBadgePage = 0;
            _renderQuestBadgeInner();
        });
    });

    // Wire pagination
    container.querySelectorAll('[data-qpage]').forEach(dot => {
        dot.addEventListener('click', () => { _questBadgePage = parseInt(dot.dataset.qpage); _renderQuestBadgeInner(); });
    });
    const prevBtn = container.querySelector('#qBadgePrev');
    const nextBtn = container.querySelector('#qBadgeNext');
    if (prevBtn) prevBtn.addEventListener('click', () => { _questBadgePage--; _renderQuestBadgeInner(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { _questBadgePage++; _renderQuestBadgeInner(); });

    // Wire earned badge selection
    container.querySelectorAll('[data-badge-key]').forEach(el => {
        el.addEventListener('click', () => {
            const key = el.dataset.badgeKey;
            if (typeof setDisplayedBadge === 'function') setDisplayedBadge(key);
        });
    });

    // Wire detail click on locked badges
    container.querySelectorAll('.badge-locked[data-qbadge-detail]').forEach(el => {
        el.addEventListener('click', () => _openQuestBadgeDetail(el.dataset.qbadgeDetail));
    });
}

/** Open badge detail modal from quest page. */
function _openQuestBadgeDetail(badgeKey) {
    const badge = getBadge(badgeKey);
    const rarity = getBadgeRarity(badgeKey);
    const isEarned = _questEarnedBadges.some(b => b.badge_key === badgeKey);

    const existing = document.getElementById('badgeDetailModal');
    if (existing) existing.remove();

    const rarityBg = { common: '#f3f4f6', rare: '#eff6ff', epic: '#faf5ff', legendary: '#fffbeb' };
    const backdrop = document.createElement('div');
    backdrop.id = 'badgeDetailModal';
    backdrop.className = 'badge-detail-backdrop';
    backdrop.innerHTML = `
        <div class="badge-detail-card">
            <div class="p-6 text-center" style="background: ${rarityBg[badge.rarity] || rarityBg.common}">
                <div class="flex justify-center mb-3">${buildBadgeChip(badgeKey, 'lg')}</div>
                <div class="text-base font-bold text-gray-900">${badge.name}</div>
                <div class="text-xs font-semibold rarity-${badge.rarity || 'common'} mt-1">${rarity.label}</div>
            </div>
            <div class="p-5">
                <div class="text-sm text-gray-600 leading-relaxed mb-4">
                    ${isEarned
                        ? `<span class="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs mb-2"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg> Earned</span><br>`
                        : '<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">How to earn</div>'}
                    ${badge.description}
                </div>
                <button class="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition" id="qBadgeDetailClose">${isEarned ? 'Close' : 'Got it'}</button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) _closeQuestBadgeDetail(); });
    backdrop.querySelector('#qBadgeDetailClose')?.addEventListener('click', _closeQuestBadgeDetail);
}

function _closeQuestBadgeDetail() {
    const modal = document.getElementById('badgeDetailModal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 150);
}

// ─── CP History ──────────────────────────────────────────
function renderCPHistory(cpLog) {
    const container = document.getElementById('cpHistory');
    if (!container) return;

    if (!cpLog || cpLog.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400 text-sm">
                No Credit Points earned yet. Complete quests to start earning!
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="space-y-2">
            ${cpLog.map(entry => {
                const isExpired = new Date(entry.expires_at) < new Date();
                const isPositive = entry.points > 0;
                return `
                    <div class="flex items-center justify-between py-2.5 px-3 rounded-xl ${isExpired ? 'opacity-40 bg-gray-50' : 'bg-white'}">
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium text-gray-900 ${isExpired ? 'line-through' : ''}">${entry.reason}</div>
                            <div class="text-xs text-gray-400 mt-0.5">${formatDate(entry.created_at)}${isExpired ? ' · Expired' : ''}</div>
                        </div>
                        <div class="text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'} ml-3">
                            ${isPositive ? '+' : ''}${entry.points} CP
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
