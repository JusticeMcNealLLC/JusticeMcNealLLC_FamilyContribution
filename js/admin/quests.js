// ══════════════════════════════════════════
// Admin — Quest Management
// CRUD quests, review submissions, view member CP status
// ══════════════════════════════════════════

let _allQuests = [];
let _allSubmissions = [];
let _allProfiles = [];
let _currentTab = 'submissions';

document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth(true);
    if (!user) return;

    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // Tab switching
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Create quest buttons
    document.getElementById('createQuestBtn')?.addEventListener('click', () => openQuestForm());
    document.getElementById('createQuestBtnMobile')?.addEventListener('click', () => openQuestForm());

    await loadAllData();
});

// ─── Data Loading ────────────────────────────────────────

async function loadAllData() {
    try {
        const [questsRes, subsRes, profilesRes, cpLogRes] = await Promise.all([
            supabaseClient.from('quests').select('*').order('sort_order'),
            supabaseClient.from('member_quests').select('*, profiles!member_quests_user_id_fkey(first_name, last_name, profile_picture_url)').order('submitted_at', { ascending: false }),
            supabaseClient.from('profiles').select('id, first_name, last_name, profile_picture_url, displayed_badge'),
            supabaseClient.from('credit_points_log').select('*').order('created_at', { ascending: false }),
        ]);

        _allQuests = questsRes.data || [];
        _allSubmissions = subsRes.data || [];
        _allProfiles = profilesRes.data || [];

        // Compute stats
        const pending = _allSubmissions.filter(s => s.status === 'submitted').length;
        const completed = _allSubmissions.filter(s => s.status === 'completed').length;
        const totalCP = (cpLogRes.data || []).reduce((sum, entry) => sum + (entry.points || 0), 0);

        document.getElementById('statTotalQuests').textContent = _allQuests.length;
        document.getElementById('statPendingReview').textContent = pending;
        document.getElementById('statCompletions').textContent = completed;
        document.getElementById('statCPAwarded').textContent = totalCP.toLocaleString();

        renderCurrentTab();
    } catch (err) {
        console.error('Failed to load quest admin data:', err);
    }
}

// ─── Tab Switching ───────────────────────────────────────

function switchTab(tab) {
    _currentTab = tab;
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.className = 'admin-tab-btn px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white';
        } else {
            btn.className = 'admin-tab-btn px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200';
        }
    });

    document.getElementById('submissionsPanel').classList.toggle('hidden', tab !== 'submissions');
    document.getElementById('questsPanel').classList.toggle('hidden', tab !== 'quests');
    document.getElementById('membersPanel').classList.toggle('hidden', tab !== 'members');

    renderCurrentTab();
}

function renderCurrentTab() {
    switch (_currentTab) {
        case 'submissions': renderSubmissions(); break;
        case 'quests':      renderAllQuests();   break;
        case 'members':     renderMemberStatus(); break;
    }
}

// ─── Submissions Panel ───────────────────────────────────

function renderSubmissions() {
    const panel = document.getElementById('submissionsPanel');
    const pending = _allSubmissions.filter(s => s.status === 'submitted');

    if (pending.length === 0) {
        panel.innerHTML = `
            <div class="bg-white rounded-2xl border border-gray-200/80 p-8 text-center">
                <div class="text-4xl mb-3">✅</div>
                <div class="text-lg font-bold text-gray-900 mb-1">All Caught Up!</div>
                <div class="text-sm text-gray-500">No pending submissions to review.</div>
            </div>`;
        return;
    }

    panel.innerHTML = pending.map(sub => {
        const quest = _allQuests.find(q => q.id === sub.quest_id);
        const profile = sub.profiles || {};
        const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown';
        const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase() || '?';
        const submittedDate = sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A';

        return `
            <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        ${profile.profile_picture_url
                            ? `<img src="${profile.profile_picture_url}" class="w-full h-full object-cover" alt="">`
                            : `<span class="text-brand-600 text-xs font-bold">${initials}</span>`
                        }
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-gray-900">${name}</span>
                            <span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Pending Review</span>
                        </div>
                        <div class="text-sm text-gray-600 mt-1">
                            ${quest ? quest.emoji : '🎯'} ${quest ? quest.title : 'Unknown Quest'}
                            <span class="text-gray-400 ml-1">· ${submittedDate}</span>
                        </div>
                        ${sub.proof_note ? `<div class="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5 italic">"${sub.proof_note}"</div>` : ''}
                        ${sub.proof_url ? `
                            <div class="mt-2">
                                <a href="${sub.proof_url}" target="_blank" class="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    View Proof
                                </a>
                            </div>` : ''}
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">+${quest ? quest.cp_reward : 0} CP</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <input type="text" id="note-${sub.id}" placeholder="Admin note (optional)" class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                    <button onclick="approveSubmission('${sub.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Approve</button>
                    <button onclick="rejectSubmission('${sub.id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold px-4 py-2 rounded-lg transition">Reject</button>
                </div>
            </div>`;
    }).join('');
}

async function approveSubmission(memberQuestId) {
    const sub = _allSubmissions.find(s => s.id === memberQuestId);
    if (!sub) return;

    const quest = _allQuests.find(q => q.id === sub.quest_id);
    const noteEl = document.getElementById(`note-${memberQuestId}`);
    const adminNote = noteEl?.value || '';

    try {
        const { data: session } = await supabaseClient.auth.getSession();
        const adminId = session.session.user.id;

        // Update member quest to completed
        const { error: updateErr } = await supabaseClient
            .from('member_quests')
            .update({
                status: 'completed',
                admin_note: adminNote || null,
                verified_by: adminId,
                completed_at: new Date().toISOString(),
            })
            .eq('id', memberQuestId);

        if (updateErr) throw updateErr;

        // Award CP
        const cpReward = quest?.cp_reward || 10;
        const { error: cpErr } = await supabaseClient
            .from('credit_points_log')
            .insert({
                user_id: sub.user_id,
                points: cpReward,
                reason: `Completed: ${quest?.title || 'Quest'}`,
                quest_id: sub.quest_id,
                member_quest_id: memberQuestId,
                expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            });

        if (cpErr) throw cpErr;

        // Refresh
        await loadAllData();
    } catch (err) {
        console.error('Failed to approve submission:', err);
        alert('Failed to approve. Please try again.');
    }
}

async function rejectSubmission(memberQuestId) {
    const noteEl = document.getElementById(`note-${memberQuestId}`);
    const adminNote = noteEl?.value || '';

    if (!adminNote.trim()) {
        alert('Please add a note explaining why the submission was rejected.');
        noteEl?.focus();
        return;
    }

    try {
        const { data: session } = await supabaseClient.auth.getSession();
        const adminId = session.session.user.id;

        const { error } = await supabaseClient
            .from('member_quests')
            .update({
                status: 'rejected',
                admin_note: adminNote,
                verified_by: adminId,
            })
            .eq('id', memberQuestId);

        if (error) throw error;
        await loadAllData();
    } catch (err) {
        console.error('Failed to reject submission:', err);
        alert('Failed to reject. Please try again.');
    }
}

// ─── All Quests Panel ────────────────────────────────────

function renderAllQuests() {
    const panel = document.getElementById('questsPanel');
    const active = _allQuests.filter(q => q.is_active);
    const inactive = _allQuests.filter(q => !q.is_active);

    let html = '';

    if (active.length > 0) {
        html += `<div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Active Quests (${active.length})</div>`;
        html += active.map(q => renderQuestRow(q)).join('');
    }

    if (inactive.length > 0) {
        html += `<div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-6">Inactive Quests (${inactive.length})</div>`;
        html += inactive.map(q => renderQuestRow(q)).join('');
    }

    if (_allQuests.length === 0) {
        html = `
            <div class="bg-white rounded-2xl border border-gray-200/80 p-8 text-center">
                <div class="text-4xl mb-3">📋</div>
                <div class="text-lg font-bold text-gray-900 mb-1">No Quests Yet</div>
                <div class="text-sm text-gray-500">Create your first quest to get started.</div>
            </div>`;
    }

    panel.innerHTML = html;
}

function renderQuestRow(quest) {
    const completions = _allSubmissions.filter(s => s.quest_id === quest.id && s.status === 'completed').length;
    const pending = _allSubmissions.filter(s => s.quest_id === quest.id && s.status === 'submitted').length;
    const catConfig = QUEST_CATEGORIES[quest.category] || QUEST_CATEGORIES.general;
    const typeLabel = getQuestTypeLabel(quest.quest_type);

    return `
        <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 mb-3 ${!quest.is_active ? 'opacity-60' : ''}">
            <div class="flex items-start gap-3">
                <div class="text-2xl flex-shrink-0">${quest.emoji}</div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-gray-900">${quest.title}</span>
                        <span class="text-xs px-2 py-0.5 bg-${catConfig.color}-100 text-${catConfig.color}-700 rounded-full font-medium">${catConfig.label}</span>
                        <span class="text-xs text-gray-400">${typeLabel}</span>
                    </div>
                    <div class="text-sm text-gray-500 mt-1 line-clamp-2">${quest.description || ''}</div>
                    <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span class="font-semibold text-brand-600">+${quest.cp_reward} CP</span>
                        <span>${completions} completed</span>
                        ${pending > 0 ? `<span class="text-amber-600 font-medium">${pending} pending</span>` : ''}
                        ${quest.requires_proof ? '<span>📎 Requires proof</span>' : ''}
                        ${quest.auto_detect_key ? '<span>⚡ Auto-detect</span>' : ''}
                    </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button onclick="openQuestForm('${quest.id}')" class="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="toggleQuestActive('${quest.id}', ${!quest.is_active})" class="p-2 text-gray-400 hover:text-${quest.is_active ? 'red' : 'emerald'}-600 hover:bg-${quest.is_active ? 'red' : 'emerald'}-50 rounded-lg transition" title="${quest.is_active ? 'Deactivate' : 'Activate'}">
                        ${quest.is_active
                            ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>'
                            : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                        }
                    </button>
                </div>
            </div>
        </div>`;
}

async function toggleQuestActive(questId, newState) {
    try {
        const { error } = await supabaseClient
            .from('quests')
            .update({ is_active: newState })
            .eq('id', questId);
        if (error) throw error;
        await loadAllData();
    } catch (err) {
        console.error('Failed to toggle quest:', err);
        alert('Failed to update quest status.');
    }
}

// ─── Member Status Panel ─────────────────────────────────

async function renderMemberStatus() {
    const panel = document.getElementById('membersPanel');

    // Fetch CP balances for all members
    const memberRows = await Promise.all(_allProfiles.map(async (profile) => {
        const { data: cpBalance } = await supabaseClient.rpc('get_member_cp_balance', { target_user_id: profile.id });
        const completedCount = _allSubmissions.filter(s => s.user_id === profile.id && s.status === 'completed').length;
        const badgesRes = await supabaseClient.from('member_badges').select('badge_key').eq('user_id', profile.id);
        const badges = badgesRes.data || [];

        return { profile, cpBalance: cpBalance || 0, completedCount, badges };
    }));

    // Sort by CP balance descending
    memberRows.sort((a, b) => b.cpBalance - a.cpBalance);

    panel.innerHTML = memberRows.map((row, idx) => {
        const { profile, cpBalance, completedCount, badges } = row;
        const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown';
        const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase() || '?';
        const tier = getCPTier(cpBalance);
        const badgeEmojis = badges.map(b => {
            const cat = BADGE_CATALOG[b.badge_key];
            return cat ? cat.emoji : '🏅';
        }).join(' ');

        return `
            <div class="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <div class="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border-2 ${tier.ringColor}">
                            ${profile.profile_picture_url
                                ? `<img src="${profile.profile_picture_url}" class="w-full h-full object-cover" alt="">`
                                : `<span class="text-brand-600 text-sm font-bold">${initials}</span>`
                            }
                        </div>
                        <div class="absolute -bottom-1 -right-1 text-sm">${tier.emoji}</div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-gray-900">${name}</span>
                            <span class="text-xs px-2 py-0.5 ${tier.bgColor} ${tier.textColor} rounded-full font-medium">${tier.name}</span>
                        </div>
                        <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span class="font-semibold text-brand-600">${cpBalance} CP</span>
                            <span>${completedCount} quests completed</span>
                            <span>${badges.length} badges</span>
                        </div>
                        ${badgeEmojis ? `<div class="mt-1 text-sm">${badgeEmojis}</div>` : ''}
                    </div>
                    <div class="text-2xl font-extrabold text-gray-200 flex-shrink-0">#${idx + 1}</div>
                </div>
            </div>`;
    }).join('');

    if (memberRows.length === 0) {
        panel.innerHTML = `
            <div class="bg-white rounded-2xl border border-gray-200/80 p-8 text-center">
                <div class="text-4xl mb-3">👥</div>
                <div class="text-lg font-bold text-gray-900 mb-1">No Members</div>
                <div class="text-sm text-gray-500">Members will appear here once they join.</div>
            </div>`;
    }
}

// ─── Quest Create/Edit Modal ─────────────────────────────

function openQuestForm(questId) {
    const quest = questId ? _allQuests.find(q => q.id === questId) : null;
    const isEdit = !!quest;
    const modal = document.getElementById('questFormModal');

    modal.innerHTML = `
        <div class="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onclick="closeQuestForm(event)">
            <div class="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <h2 class="text-lg font-bold text-gray-900">${isEdit ? 'Edit Quest' : 'Create New Quest'}</h2>
                    <button onclick="closeQuestForm()" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form id="questForm" class="p-5 space-y-4" onsubmit="saveQuest(event, '${questId || ''}')">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input type="text" name="title" required maxlength="100" value="${quest?.title || ''}" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" placeholder="e.g. Open Fidelity Account">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                            <input type="text" name="emoji" maxlength="4" value="${quest?.emoji || '🎯'}" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-center text-xl">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">CP Reward *</label>
                            <input type="number" name="cp_reward" required min="1" max="500" value="${quest?.cp_reward || 10}" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" rows="2" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" placeholder="Brief description shown in quest list">${quest?.description || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                        <textarea name="instructions" rows="3" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none" placeholder="Detailed how-to shown in quest detail view">${quest?.instructions || ''}</textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select name="category" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white">
                                ${Object.entries(QUEST_CATEGORIES).map(([key, cat]) =>
                                    `<option value="${key}" ${quest?.category === key ? 'selected' : ''}>${cat.icon} ${cat.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select name="quest_type" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white">
                                <option value="one_time" ${quest?.quest_type === 'one_time' ? 'selected' : ''}>One-Time</option>
                                <option value="recurring_monthly" ${quest?.quest_type === 'recurring_monthly' ? 'selected' : ''}>Recurring Monthly</option>
                                <option value="per_event" ${quest?.quest_type === 'per_event' ? 'selected' : ''}>Per Event</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Auto-Detect Key</label>
                            <input type="text" name="auto_detect_key" value="${quest?.auto_detect_key || ''}" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" placeholder="e.g. upload_photo">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                            <input type="number" name="sort_order" min="0" value="${quest?.sort_order || 0}" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="requires_proof" ${quest?.requires_proof ? 'checked' : ''} class="w-4 h-4 text-brand-600 rounded focus:ring-brand-500">
                            <span class="text-sm text-gray-700">Requires proof upload</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="is_active" ${quest?.is_active !== false ? 'checked' : ''} class="w-4 h-4 text-brand-600 rounded focus:ring-brand-500">
                            <span class="text-sm text-gray-700">Active</span>
                        </label>
                    </div>
                    <div class="flex gap-3 pt-2">
                        <button type="submit" id="saveQuestBtn" class="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition text-sm">${isEdit ? 'Save Changes' : 'Create Quest'}</button>
                        <button type="button" onclick="closeQuestForm()" class="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
                    </div>
                </form>
            </div>
        </div>`;

    modal.classList.remove('hidden');
}

function closeQuestForm(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('questFormModal').classList.add('hidden');
}

async function saveQuest(event, questId) {
    event.preventDefault();
    const form = document.getElementById('questForm');
    const formData = new FormData(form);
    const btn = document.getElementById('saveQuestBtn');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const questData = {
        title: formData.get('title'),
        description: formData.get('description') || null,
        instructions: formData.get('instructions') || null,
        emoji: formData.get('emoji') || '🎯',
        cp_reward: parseInt(formData.get('cp_reward')) || 10,
        quest_type: formData.get('quest_type'),
        category: formData.get('category'),
        auto_detect_key: formData.get('auto_detect_key') || null,
        requires_proof: form.querySelector('[name="requires_proof"]').checked,
        is_active: form.querySelector('[name="is_active"]').checked,
        sort_order: parseInt(formData.get('sort_order')) || 0,
    };

    try {
        if (questId) {
            // Update
            const { error } = await supabaseClient.from('quests').update(questData).eq('id', questId);
            if (error) throw error;
        } else {
            // Create — also set created_by
            const { data: session } = await supabaseClient.auth.getSession();
            questData.created_by = session.session.user.id;
            const { error } = await supabaseClient.from('quests').insert(questData);
            if (error) throw error;
        }

        closeQuestForm();
        await loadAllData();
    } catch (err) {
        console.error('Failed to save quest:', err);
        alert('Failed to save quest. Please try again.');
        btn.disabled = false;
        btn.textContent = origText;
    }
}
