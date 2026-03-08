// ══════════════════════════════════════════
// Quests – Initialization, Data Loading & Actions
// Load order: config.js → renders.js → init.js
// ══════════════════════════════════════════

let _questsData = [];
let _memberQuestsData = [];
let _cpLog = [];
let _earnedBadges = [];
let _cpBalance = 0;
let _currentFilter = 'all';
let _currentUserId = null;
let _selectedProofFile = null;

// ─── Entry Point ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth(false);
    if (!user) return;
    _currentUserId = user.id;
    await loadQuestData();
});

// ─── Data Loading ────────────────────────────────────────
async function loadQuestData() {
    try {
        // Parallel fetch: quests, member_quests, cp_log, badges
        const [questsRes, memberQuestsRes, cpLogRes, badgesRes, cpBalRes] = await Promise.all([
            supabaseClient
                .from('quests')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
            supabaseClient
                .from('member_quests')
                .select('*')
                .eq('user_id', _currentUserId),
            supabaseClient
                .from('credit_points_log')
                .select('*')
                .eq('user_id', _currentUserId)
                .order('created_at', { ascending: false })
                .limit(50),
            supabaseClient
                .from('member_badges')
                .select('*')
                .eq('user_id', _currentUserId),
            supabaseClient
                .rpc('get_member_cp_balance', { target_user_id: _currentUserId }),
        ]);

        _questsData = questsRes.data || [];
        _memberQuestsData = memberQuestsRes.data || [];
        _cpLog = cpLogRes.data || [];
        _earnedBadges = badgesRes.data || [];
        _cpBalance = cpBalRes.data || 0;

        // Run auto-detection (may create member_quests + award CP)
        await runAutoDetection();

        // Re-fetch ALL data fresh after auto-detection to pick up any new completions
        const [freshMQ, freshCP, freshBadges, freshBal] = await Promise.all([
            supabaseClient.from('member_quests').select('*').eq('user_id', _currentUserId),
            supabaseClient.from('credit_points_log').select('*').eq('user_id', _currentUserId).order('created_at', { ascending: false }).limit(50),
            supabaseClient.from('member_badges').select('*').eq('user_id', _currentUserId),
            supabaseClient.rpc('get_member_cp_balance', { target_user_id: _currentUserId }),
        ]);
        _memberQuestsData = freshMQ.data || [];
        _cpLog = freshCP.data || [];
        _earnedBadges = freshBadges.data || [];
        _cpBalance = freshBal.data || 0;

        // Render everything with guaranteed-fresh data
        renderCPHero(_cpBalance, _earnedBadges);
        renderQuestStats(
            _memberQuestsData.filter(mq => mq.status === 'completed').length,
            _questsData.length,
            _cpBalance
        );
        renderQuestFilters(_currentFilter);
        renderQuestList(_questsData, _memberQuestsData, _currentFilter);
        renderBadgeCollection(_earnedBadges);
        renderCPHistory(_cpLog);

        // Show content, hide loading
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('questsContent')?.classList.remove('hidden');
    } catch (err) {
        console.error('Failed to load quest data:', err);
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('errorState')?.classList.remove('hidden');
    }
}

// ─── Filter Handler ──────────────────────────────────────
function handleQuestFilter(filter) {
    _currentFilter = filter;
    renderQuestFilters(filter);
    renderQuestList(_questsData, _memberQuestsData, filter);
}

// ─── Quest Detail ────────────────────────────────────────
function openQuestDetail(questId) {
    const quest = _questsData.find(q => q.id === questId);
    if (!quest) return;
    const mq = _memberQuestsData.find(m => m.quest_id === questId);
    renderQuestDetail(quest, mq);
}

// ─── Quest Actions ───────────────────────────────────────
async function startQuest(questId) {
    try {
        const existing = _memberQuestsData.find(m => m.quest_id === questId);
        if (existing) {
            // Update status
            const { error } = await supabaseClient
                .from('member_quests')
                .update({ status: 'in_progress', started_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            // Insert new
            const { error } = await supabaseClient
                .from('member_quests')
                .insert({
                    quest_id: questId,
                    user_id: _currentUserId,
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                    period_key: null,
                });
            if (error) throw error;
        }
        closeQuestDetail();
        await loadQuestData();
    } catch (err) {
        console.error('Failed to start quest:', err);
        alert('Failed to start quest. Please try again.');
    }
}

async function completeQuest(questId) {
    try {
        const mq = _memberQuestsData.find(m => m.quest_id === questId);
        const quest = _questsData.find(q => q.id === questId);
        if (!mq || !quest) return;

        // Update member_quest to completed
        const { error: mqErr } = await supabaseClient
            .from('member_quests')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', mq.id);
        if (mqErr) throw mqErr;

        // Award CP
        await awardCP(quest.cp_reward, `Completed: ${quest.title}`, quest.id, mq.id);

        closeQuestDetail();
        await loadQuestData();
    } catch (err) {
        console.error('Failed to complete quest:', err);
        alert('Failed to complete quest. Please try again.');
    }
}

async function submitQuestProof(questId) {
    try {
        const mq = _memberQuestsData.find(m => m.quest_id === questId);
        let proofUrl = mq?.proof_url || null;
        const proofNote = document.getElementById('proofNote')?.value || '';

        // Upload proof file if selected
        if (_selectedProofFile) {
            proofUrl = await uploadProofFile(_selectedProofFile, questId);
        }

        if (!proofUrl) {
            alert('Please upload proof before submitting.');
            return;
        }

        if (mq) {
            const { error } = await supabaseClient
                .from('member_quests')
                .update({
                    status: 'submitted',
                    proof_url: proofUrl,
                    proof_note: proofNote,
                    submitted_at: new Date().toISOString(),
                })
                .eq('id', mq.id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('member_quests')
                .insert({
                    quest_id: questId,
                    user_id: _currentUserId,
                    status: 'submitted',
                    proof_url: proofUrl,
                    proof_note: proofNote,
                    started_at: new Date().toISOString(),
                    submitted_at: new Date().toISOString(),
                    period_key: null,
                });
            if (error) throw error;
        }

        _selectedProofFile = null;
        closeQuestDetail();
        await loadQuestData();
    } catch (err) {
        console.error('Failed to submit proof:', err);
        alert('Failed to submit proof. Please try again.');
    }
}

// ─── Proof File Upload ───────────────────────────────────
function handleProofFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    _selectedProofFile = file;

    // Show preview
    const preview = document.getElementById('proofPreview');
    const previewImg = document.getElementById('proofPreviewImg');
    if (preview && previewImg) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

async function uploadProofFile(file, questId) {
    const ext = file.name.split('.').pop();
    const path = `quest-proofs/${_currentUserId}/${questId}_${Date.now()}.${ext}`;

    const { data, error } = await supabaseClient.storage
        .from('profile-pictures')  // reuse existing bucket
        .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabaseClient.storage
        .from('profile-pictures')
        .getPublicUrl(path);

    return urlData.publicUrl;
}

// ─── CP Award Helper ─────────────────────────────────────
async function awardCP(points, reason, questId, memberQuestId) {
    const { error } = await supabaseClient
        .from('credit_points_log')
        .insert({
            user_id: _currentUserId,
            points: points,
            reason: reason,
            quest_id: questId || null,
            member_quest_id: memberQuestId || null,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        });
    if (error) console.error('Failed to award CP:', error);
}

// ─── Badge Management ────────────────────────────────────
async function setDisplayedBadge(badgeKey) {
    try {
        // Clear all displayed flags for this user
        await supabaseClient
            .from('member_badges')
            .update({ is_displayed: false })
            .eq('user_id', _currentUserId);

        // Set the selected one as displayed
        await supabaseClient
            .from('member_badges')
            .update({ is_displayed: true })
            .eq('user_id', _currentUserId)
            .eq('badge_key', badgeKey);

        // Update profiles.displayed_badge for quick access
        await supabaseClient
            .from('profiles')
            .update({ displayed_badge: badgeKey })
            .eq('id', _currentUserId);

        // Update nav badge overlays immediately
        if (typeof _renderBadgeOverlays === 'function') {
            _renderBadgeOverlays(badgeKey);
        }

        // Refresh
        await loadQuestData();
    } catch (err) {
        console.error('Failed to set displayed badge:', err);
    }
}

async function awardBadge(badgeKey) {
    try {
        const existing = _earnedBadges.find(b => b.badge_key === badgeKey);
        if (existing) return; // Already earned

        const { error } = await supabaseClient
            .from('member_badges')
            .insert({
                user_id: _currentUserId,
                badge_key: badgeKey,
                is_displayed: _earnedBadges.length === 0, // Auto-display if first badge
            });
        if (error && error.code !== '23505') throw error; // Ignore unique constraint
    } catch (err) {
        console.error('Failed to award badge:', err);
    }
}

// ─── Auto-Detection Engine ───────────────────────────────
async function runAutoDetection() {
    try {
        // Fetch profile for detection checks
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, birthday, profile_picture_url, setup_completed, created_at')
            .eq('id', _currentUserId)
            .single();

        if (!profile) return;

        // Fetch subscription for payment checks
        const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .select('status, current_amount_cents, created_at')
            .eq('user_id', _currentUserId)
            .maybeSingle();

        // Fetch paid invoice count for streak detection
        const { data: invoices } = await supabaseClient
            .from('invoices')
            .select('paid_at, period_start')
            .eq('user_id', _currentUserId)
            .eq('status', 'paid')
            .order('period_start', { ascending: true });

        const paidInvoices = invoices || [];

        // Check each auto-detect quest (wrapped per-quest so one failure doesn't block others)
        for (const quest of _questsData) {
            if (!quest.auto_detect_key) continue;

            try {
                // Re-read member quest status each iteration (may have been updated by a previous auto-complete)
                const mq = _memberQuestsData.find(m => m.quest_id === quest.id && !m.period_key);
                if (mq && mq.status === 'completed') continue; // Already done

                let shouldComplete = false;

                switch (quest.auto_detect_key) {
                    case 'activate_subscription':
                        shouldComplete = subscription && ['active', 'trialing'].includes(subscription.status);
                        break;

                    case 'upload_photo':
                        shouldComplete = !!profile.profile_picture_url;
                        break;

                    case 'complete_onboarding':
                        shouldComplete = !!(profile.first_name && profile.last_name && profile.birthday && profile.profile_picture_url);
                        break;

                    case 'on_time_payment': {
                        // Backfill ALL paid months — not just the current one.
                        // This ensures members who joined before the quest system get full credit.
                        for (const inv of paidInvoices) {
                            const d = new Date(inv.period_start || inv.paid_at);
                            const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            const monthlyMq = _memberQuestsData.find(m => m.quest_id === quest.id && m.period_key === period);
                            if (!monthlyMq || monthlyMq.status !== 'completed') {
                                await autoCompleteRecurring(quest, period);
                            }
                        }
                        continue; // Skip the generic shouldComplete flow
                    }

                    case 'increase_contribution':
                        shouldComplete = subscription && subscription.current_amount_cents > (APP_CONFIG.MIN_AMOUNT * 100);
                        break;

                    case 'streak_3':
                        shouldComplete = paidInvoices.length >= 3 && checkConsecutiveMonths(paidInvoices, 3);
                        break;

                    case 'streak_6':
                        shouldComplete = paidInvoices.length >= 6 && checkConsecutiveMonths(paidInvoices, 6);
                        break;
                }

                if (shouldComplete) {
                    await autoCompleteQuest(quest, mq);
                }
            } catch (questErr) {
                console.error('Auto-detect failed for quest:', quest.title, questErr);
            }
        }

        // Badge auto-awards
        if (profile.profile_picture_url) {
            await awardBadge('shutterbug');
        }

        // Founding member: joined within the first year (2025)
        if (profile.created_at) {
            const joinDate = new Date(profile.created_at);
            if (joinDate.getFullYear() <= 2025 || (joinDate.getFullYear() === 2026 && joinDate.getMonth() < 6)) {
                await awardBadge('founding_member');
            }
        }

        // Streak badges
        if (paidInvoices.length >= 6 && checkConsecutiveMonths(paidInvoices, 6)) {
            await awardBadge('streak_master');
        }
        if (paidInvoices.length >= 12 && checkConsecutiveMonths(paidInvoices, 12)) {
            await awardBadge('streak_legend');
        }

        // Quest champion: 10+ completed
        const completedCount = _memberQuestsData.filter(mq => mq.status === 'completed').length;
        if (completedCount >= 10) {
            await awardBadge('quest_champion');
        }

        // Reload data if any badges were newly awarded
        const { data: freshBadges } = await supabaseClient
            .from('member_badges')
            .select('*')
            .eq('user_id', _currentUserId);
        _earnedBadges = freshBadges || [];

    } catch (err) {
        console.error('Auto-detection error:', err);
    }
}

async function autoCompleteQuest(quest, existingMQ) {
    try {
        let mqId;
        if (existingMQ) {
            const { error } = await supabaseClient
                .from('member_quests')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', existingMQ.id);
            if (error) throw error;
            mqId = existingMQ.id;
        } else {
            const { data, error } = await supabaseClient
                .from('member_quests')
                .insert({
                    quest_id: quest.id,
                    user_id: _currentUserId,
                    status: 'completed',
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    period_key: null,
                })
                .select()
                .single();
            if (error) throw error;
            mqId = data.id;
        }

        // Award CP (check if already awarded for this quest)
        const { data: existingCP } = await supabaseClient
            .from('credit_points_log')
            .select('id')
            .eq('user_id', _currentUserId)
            .eq('quest_id', quest.id)
            .limit(1);

        if (!existingCP || existingCP.length === 0) {
            await awardCP(quest.cp_reward, `Completed: ${quest.title}`, quest.id, mqId);
        }

        // Refresh member quests
        const { data: freshMQ } = await supabaseClient
            .from('member_quests')
            .select('*')
            .eq('user_id', _currentUserId);
        _memberQuestsData = freshMQ || [];

        // Refresh CP balance
        const { data: cpBal } = await supabaseClient
            .rpc('get_member_cp_balance', { target_user_id: _currentUserId });
        _cpBalance = cpBal || 0;
    } catch (err) {
        console.error('Auto-complete error for quest:', quest.title, err);
    }
}

async function autoCompleteRecurring(quest, periodKey) {
    try {
        // Check if already completed for this period
        const { data: existing } = await supabaseClient
            .from('member_quests')
            .select('id, status')
            .eq('quest_id', quest.id)
            .eq('user_id', _currentUserId)
            .eq('period_key', periodKey)
            .maybeSingle();

        if (existing && existing.status === 'completed') return;

        let mqId;
        if (existing) {
            const { error } = await supabaseClient
                .from('member_quests')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
            mqId = existing.id;
        } else {
            const { data, error } = await supabaseClient
                .from('member_quests')
                .insert({
                    quest_id: quest.id,
                    user_id: _currentUserId,
                    status: 'completed',
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    period_key: periodKey,
                })
                .select()
                .single();
            if (error) throw error;
            mqId = data.id;
        }

        // Award CP for this period
        const { data: existingCP } = await supabaseClient
            .from('credit_points_log')
            .select('id')
            .eq('user_id', _currentUserId)
            .eq('quest_id', quest.id)
            .eq('member_quest_id', mqId)
            .limit(1);

        if (!existingCP || existingCP.length === 0) {
            await awardCP(quest.cp_reward, `${quest.title} (${periodKey})`, quest.id, mqId);
        }
    } catch (err) {
        console.error('Auto-complete recurring error:', err);
    }
}

// ─── Streak Helper ───────────────────────────────────────
function checkConsecutiveMonths(paidInvoices, requiredStreak) {
    if (paidInvoices.length < requiredStreak) return false;

    // Build a set of paid months
    const months = new Set();
    for (const inv of paidInvoices) {
        const d = new Date(inv.period_start || inv.paid_at);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Check for consecutive streak ending at the most recent month
    const sorted = [...months].sort().reverse();
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
        const [y1, m1] = sorted[i - 1].split('-').map(Number);
        const [y2, m2] = sorted[i].split('-').map(Number);
        const prev = new Date(y1, m1 - 1, 1);
        prev.setMonth(prev.getMonth() - 1);
        if (prev.getFullYear() === y2 && prev.getMonth() + 1 === m2) {
            streak++;
            if (streak >= requiredStreak) return true;
        } else {
            streak = 1;
        }
    }
    return streak >= requiredStreak;
}
