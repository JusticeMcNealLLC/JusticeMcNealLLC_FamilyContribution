// ═══════════════════════════════════════════════════════════
// Profile – Milestones Timeline Tab
// ═══════════════════════════════════════════════════════════

window.ProfileApp = window.ProfileApp || {};

window.ProfileApp.loadMilestonesTab = async function loadMilestonesTab() {
    const S = window.ProfileApp.state;
    const getTimeAgo = window.ProfileApp.getTimeAgo;

    const timeline = document.getElementById('milestonesTimeline');
    const empty = document.getElementById('milestonesEmpty');

    // Load badges earned
    const { data: badges } = await supabaseClient
        .from('member_badges')
        .select('badge_key, earned_at')
        .eq('user_id', S.viewingUserId)
        .order('earned_at', { ascending: false });

    // Load quest completions
    const { data: quests } = await supabaseClient
        .from('member_quests')
        .select('quest_id, completed_at, quest:quests(title, emoji)')
        .eq('user_id', S.viewingUserId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

    const items = [];

    (badges || []).forEach(b => {
        const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[b.badge_key]) || { emoji: '🏅', name: b.badge_key };
        items.push({
            date: b.earned_at,
            emoji: badge.emoji,
            title: badge.name,
            subtitle: 'Badge earned',
            color: 'amber',
        });
    });

    (quests || []).forEach(q => {
        items.push({
            date: q.completed_at,
            emoji: q.quest?.emoji || '✅',
            title: q.quest?.title || 'Quest',
            subtitle: 'Quest completed',
            color: 'emerald',
        });
    });

    // Sort by date
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (items.length === 0) {
        timeline.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    timeline.innerHTML = items.map(item => `
        <div class="flex items-start gap-3 bg-white rounded-xl border border-gray-200/80 p-4">
            <div class="w-10 h-10 rounded-xl bg-${item.color}-100 flex items-center justify-center text-lg flex-shrink-0">${item.emoji}</div>
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">${item.title}</p>
                <p class="text-xs text-gray-500">${item.subtitle}</p>
            </div>
            <span class="text-xs text-gray-400 flex-shrink-0">${getTimeAgo(item.date)}</span>
        </div>
    `).join('');
};
