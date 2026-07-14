import { getCPTier, getNextCPTier, getCPProgress } from '../../../portal/quests/state/cpTiers.js';

export async function loadCPStatus(userId) {
    try {
        const { data: cpBalance } = await supabaseClient
            .rpc('get_member_cp_balance', { target_user_id: userId });

        const points = cpBalance || 0;
        const tier = getCPTier(points);
        const next = getNextCPTier(points);
        const progress = getCPProgress(points);

        const card = document.getElementById('cpStatusCard');
        const iconEl = document.getElementById('cpTierIcon');
        const nameEl = document.getElementById('cpTierName');
        const pointsEl = document.getElementById('cpTierPoints');
        const barEl = document.getElementById('cpTierBar');
        const nextInfo = document.getElementById('cpTierNextInfo');

        if (!card) return;

        if (iconEl) iconEl.textContent = tier.emoji;
        if (nameEl) nameEl.textContent = tier.name;
        if (pointsEl) pointsEl.textContent = `${points} CP`;
        if (nextInfo) {
            nextInfo.textContent = next
                ? `${next.minCP - points} CP to ${next.name}`
                : 'Max tier reached!';
        }

        card.classList.remove('hidden');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (barEl) barEl.style.width = `${progress}%`;
            });
        });
    } catch (err) {
        console.error('Error loading CP status:', err);
    }
}
