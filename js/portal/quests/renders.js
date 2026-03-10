// ══════════════════════════════════════════
// Quests – Render Functions
// Load order: config.js → renders.js → init.js
// ══════════════════════════════════════════

// ─── CP Hero Card ────────────────────────────────────────
function renderCPHero(cpBalance, earnedBadges) {
    const container = document.getElementById('cpHero');
    if (!container) return;

    const tier = getCPTier(cpBalance);
    const next = getNextCPTier(cpBalance);
    const progress = getCPProgress(cpBalance);
    const displayedBadge = earnedBadges.find(b => b.is_displayed);

    container.innerHTML = `
        <div class="bg-gradient-to-br ${tier.gradientFrom} ${tier.gradientTo} rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12"></div>
            <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
            <div class="relative">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="text-3xl">${tier.emoji}</div>
                        <div>
                            <div class="text-sm font-medium text-white/80">Current Status</div>
                            <div class="text-xl font-extrabold">${tier.name}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-3xl font-extrabold">${cpBalance}</div>
                        <div class="text-sm text-white/70">Credit Points</div>
                    </div>
                </div>
                ${next ? `
                <div class="mt-3">
                    <div class="flex items-center justify-between text-sm mb-1.5">
                        <span class="text-white/80">Next: ${next.emoji} ${next.name}</span>
                        <span class="font-semibold">${progress}%</span>
                    </div>
                    <div class="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                        <div class="h-full bg-white/90 rounded-full transition-all duration-1000 ease-out" style="width: ${progress}%"></div>
                    </div>
                    <div class="text-xs text-white/60 mt-1">${next.minCP - cpBalance} CP to go</div>
                </div>` : `
                <div class="mt-3 text-sm text-white/80">You've reached the highest tier! 👑</div>`}
                ${displayedBadge ? `
                <div class="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
                    <span class="text-lg">${getBadge(displayedBadge.badge_key).emoji}</span>
                    <span class="text-sm text-white/80">Displaying: <strong class="text-white">${getBadge(displayedBadge.badge_key).name}</strong></span>
                </div>` : ''}
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

// ─── Quest Cards ─────────────────────────────────────────
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

    container.innerHTML = filtered.map(q => renderQuestCard(q)).join('');

    // Wire up card interactions
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
    const statusCfg = getQuestStatusConfig(status);
    const catCfg = QUEST_CATEGORIES[quest.category] || QUEST_CATEGORIES.general;
    const isCompleted = status === 'completed';

    // ── Contributor gate ──────────────────────────────────
    // Certain finance / streak quests are only meaningful for active contributors.
    // Show a locked card to non-contributors so they know the quest exists but
    // understand they need an active contribution to unlock it.
    const isContributorLocked =
        !_isContributor &&
        quest.auto_detect_key &&
        typeof CONTRIBUTOR_REQUIRED_QUESTS !== 'undefined' &&
        CONTRIBUTOR_REQUIRED_QUESTS.has(quest.auto_detect_key);

    if (isContributorLocked) {
        return `
        <div class="group bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-5 opacity-60 select-none" title="Activate your contribution to unlock this quest">
            <div class="flex items-start gap-3.5">
                <div class="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl grayscale">
                    ${quest.emoji || '🎯'}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2 mb-1">
                        <h3 class="font-bold text-gray-400 text-sm leading-tight">${quest.title}</h3>
                        <span class="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                            🔒 Members Only
                        </span>
                    </div>
                    <p class="text-xs text-gray-400 mb-2">Activate your contribution to unlock this quest and start earning CP.</p>
                    <div class="flex items-center gap-3 text-xs text-gray-300">
                        <span>+${quest.cp_reward} CP</span>
                        <span>•</span>
                        <span>${getQuestTypeLabel(quest.quest_type)}</span>
                    </div>
                </div>
                <svg class="w-5 h-5 text-gray-200 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
        </div>`;
    }

    // Progress bar for streak / tracked quests
    const hasProgress = mq && mq.progress_target > 0 && !isCompleted;
    const progressPct = hasProgress ? Math.min(100, Math.round((mq.progress_current / mq.progress_target) * 100)) : 0;
    const progressLabel = hasProgress ? `${mq.progress_current}/${mq.progress_target}` : '';

    // Progress note (e.g. "Next payment: Apr 1, 2026")
    const progressNote = mq && mq.progress_note && !isCompleted ? mq.progress_note : '';

    return `
        <div data-quest-id="${quest.id}" class="group bg-white rounded-2xl border ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200/80'} p-4 sm:p-5 cursor-pointer card-hover transition">
            <div class="flex items-start gap-3.5">
                <div class="w-12 h-12 rounded-xl ${isCompleted ? 'bg-emerald-100' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0 text-xl group-hover:scale-105 transition-transform">
                    ${quest.emoji || '🎯'}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2 mb-1">
                        <h3 class="font-bold text-gray-900 text-sm leading-tight ${isCompleted ? 'line-through text-gray-400' : ''}">${quest.title}</h3>
                        <span class="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}">${statusCfg.label}</span>
                    </div>
                    <p class="text-xs text-gray-500 mb-2 line-clamp-2">${quest.description || ''}</p>
                    ${hasProgress ? `
                    <div class="mb-2">
                        <div class="flex items-center justify-between text-[10px] mb-1">
                            <span class="font-semibold text-brand-600">${progressLabel} months</span>
                            <span class="text-gray-400">${progressPct}%</span>
                        </div>
                        <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-700 ease-out" style="width: ${progressPct}%"></div>
                        </div>
                    </div>` : ''}
                    ${progressNote ? `<div class="text-[10px] text-gray-400 mb-1.5">${progressNote}</div>` : ''}
                    <div class="flex items-center gap-3 text-xs">
                        <span class="font-semibold text-brand-600">+${quest.cp_reward} CP</span>
                        <span class="text-gray-400">•</span>
                        <span class="text-gray-400">${getQuestTypeLabel(quest.quest_type)}</span>
                        ${quest.requires_proof ? '<span class="text-gray-400">•</span><span class="text-amber-600">📎 Proof required</span>' : ''}
                    </div>
                    ${mq && mq.completed_at ? `<div class="text-xs text-emerald-600 mt-1.5">✓ Completed ${formatDate(mq.completed_at)}</div>` : ''}
                </div>
                <svg class="w-5 h-5 text-gray-300 group-hover:text-brand-500 flex-shrink-0 mt-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
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

    modal.innerHTML = `
        <div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" id="questModalBackdrop">
            <div class="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto slide-up">
                <!-- Header -->
                <div class="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10 sm:rounded-t-2xl">
                    <h2 class="font-bold text-gray-900">Quest Details</h2>
                    <button id="closeQuestDetail" class="p-1.5 hover:bg-gray-100 rounded-lg transition">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div class="p-5 sm:p-6">
                    <!-- Quest Info -->
                    <div class="flex items-start gap-4 mb-5">
                        <div class="w-14 h-14 rounded-xl ${isCompleted ? 'bg-emerald-100' : 'bg-gray-100'} flex items-center justify-center text-2xl flex-shrink-0">
                            ${quest.emoji || '🎯'}
                        </div>
                        <div>
                            <h3 class="font-extrabold text-gray-900 text-lg">${quest.title}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}">${statusCfg.label}</span>
                                <span class="text-sm font-bold text-brand-600">+${quest.cp_reward} CP</span>
                            </div>
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="mb-5">
                        <p class="text-sm text-gray-600">${quest.description || ''}</p>
                    </div>

                    <!-- Instructions -->
                    ${quest.instructions ? `
                    <div class="mb-5 bg-brand-50 rounded-xl p-4">
                        <h4 class="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-2">How to Complete</h4>
                        <p class="text-sm text-brand-900">${quest.instructions}</p>
                    </div>` : ''}

                    <!-- Proof Upload (if required and not completed) -->
                    ${quest.requires_proof && !isCompleted ? `
                    <div class="mb-5">
                        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Submit Proof</h4>
                        <div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand-300 transition cursor-pointer" id="proofUploadArea">
                            <svg class="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <p class="text-sm text-gray-500">Tap to upload a screenshot</p>
                            <p class="text-xs text-gray-400 mt-1">JPG, PNG, or WebP</p>
                            <input type="file" id="proofFileInput" accept="image/jpeg,image/png,image/webp" class="hidden">
                        </div>
                        <div id="proofPreview" class="hidden mt-3">
                            <img id="proofPreviewImg" class="w-full rounded-xl border border-gray-200" alt="Proof preview">
                        </div>
                        <textarea id="proofNote" class="w-full mt-3 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition" placeholder="Add a note (optional)" rows="2"></textarea>
                    </div>` : ''}

                    <!-- Admin Feedback (if rejected) -->
                    ${memberQuest && memberQuest.status === 'rejected' && memberQuest.admin_note ? `
                    <div class="mb-5 bg-red-50 rounded-xl p-4">
                        <h4 class="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Admin Feedback</h4>
                        <p class="text-sm text-red-800">${memberQuest.admin_note}</p>
                    </div>` : ''}

                    <!-- Completion Info -->
                    ${isCompleted && memberQuest ? `
                    <div class="mb-5 bg-emerald-50 rounded-xl p-4">
                        <div class="flex items-center gap-2">
                            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            <div>
                                <div class="text-sm font-semibold text-emerald-800">Quest Completed!</div>
                                <div class="text-xs text-emerald-600">+${quest.cp_reward} CP earned ${memberQuest.completed_at ? 'on ' + formatDate(memberQuest.completed_at) : ''}</div>
                            </div>
                        </div>
                    </div>` : ''}

                    <!-- Progress Tracker (streak / tracked quests) -->
                    ${memberQuest && memberQuest.progress_target > 0 && !isCompleted ? (() => {
                        const pCurrent = memberQuest.progress_current || 0;
                        const pTarget = memberQuest.progress_target || 1;
                        const pPct = Math.min(100, Math.round((pCurrent / pTarget) * 100));
                        const pNote = memberQuest.progress_note || '';
                        return `
                    <div class="mb-5 bg-brand-50 rounded-xl p-4">
                        <h4 class="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">Progress</h4>
                        <div class="flex items-end justify-between mb-2">
                            <div class="text-2xl font-extrabold text-brand-600">${pCurrent}<span class="text-sm font-semibold text-brand-400">/${pTarget}</span></div>
                            <div class="text-sm font-bold text-brand-500">${pPct}%</div>
                        </div>
                        <div class="w-full h-2.5 bg-brand-100 rounded-full overflow-hidden mb-2">
                            <div class="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-1000 ease-out" style="width: ${pPct}%"></div>
                        </div>
                        ${pNote ? `<div class="text-xs text-brand-600 mt-1">${pNote}</div>` : ''}
                    </div>`;
                    })() : ''}

                    <!-- Meta Info -->
                    <div class="flex items-center gap-4 text-xs text-gray-400 mb-6">
                        <span>${getQuestTypeLabel(quest.quest_type)}</span>
                        <span>•</span>
                        <span>${(QUEST_CATEGORIES[quest.category] || QUEST_CATEGORIES.general).label}</span>
                        ${quest.requires_proof ? '<span>•</span><span>📎 Proof required</span>' : ''}
                    </div>

                    <!-- Action Buttons -->
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
}

function renderQuestActions(quest, memberQuest) {
    const status = memberQuest ? memberQuest.status : 'available';

    switch (status) {
        case 'available':
            if (quest.auto_detect_key && !quest.requires_proof) {
                return `<div class="text-center text-sm text-gray-500 py-2">This quest completes automatically — no action needed!</div>`;
            }
            return `<button id="startQuestBtn" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-5 rounded-xl transition text-sm">Start Quest</button>`;

        case 'in_progress':
            if (quest.requires_proof) {
                return `<button id="submitProofBtn" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-5 rounded-xl transition text-sm">Submit for Review</button>`;
            }
            if (quest.auto_detect_key) {
                return `<div class="text-center text-sm text-gray-500 py-2">Tracking your progress automatically...</div>`;
            }
            return `<button id="completeQuestBtn" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-5 rounded-xl transition text-sm">Mark as Complete</button>`;

        case 'submitted':
            return `<div class="text-center text-sm text-amber-600 py-2">⏳ Waiting for admin review...</div>`;

        case 'completed':
            return `<div class="text-center text-sm text-emerald-600 py-2">✅ Quest completed!</div>`;

        case 'rejected':
            return `<button id="resubmitQuestBtn" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-5 rounded-xl transition text-sm">Resubmit Proof</button>`;

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
