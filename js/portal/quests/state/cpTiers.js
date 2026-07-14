// Credit Point tier data + helpers (ES module)

export const CP_TIERS = [
    {
        key: 'bronze',
        name: 'Bronze Member',
        emoji: '🥉',
        minCP: 0,
        color: 'amber-700',
        ringColor: 'border-amber-600',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        gradientFrom: 'from-amber-600',
        gradientTo: 'to-amber-700',
        perks: ['Base access', 'Standard loan terms (when available)'],
    },
    {
        key: 'silver',
        name: 'Silver Member',
        emoji: '🥈',
        minCP: 100,
        color: 'gray-400',
        ringColor: 'border-gray-400',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-500',
        gradientFrom: 'from-gray-400',
        gradientTo: 'to-gray-500',
        perks: ['Priority lending queue', '1.5× loan limit', 'Silver profile ring'],
    },
    {
        key: 'gold',
        name: 'Gold Member',
        emoji: '🥇',
        minCP: 250,
        color: 'yellow-500',
        ringColor: 'border-yellow-500',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-600',
        gradientFrom: 'from-yellow-400',
        gradientTo: 'to-yellow-600',
        perks: ['2× loan limits', 'Lower interest rate', 'Voting weight bonus', 'Gold profile ring'],
    },
    {
        key: 'diamond',
        name: 'Diamond Member',
        emoji: '💎',
        minCP: 500,
        color: 'cyan-500',
        ringColor: 'border-cyan-400',
        bgColor: 'bg-cyan-100',
        textColor: 'text-cyan-600',
        gradientFrom: 'from-cyan-400',
        gradientTo: 'to-blue-500',
        perks: ['Max loan limits', 'Lowest interest rate', 'First access to new features', 'Diamond profile ring'],
    },
];

export function getCPTier(points) {
    for (let i = CP_TIERS.length - 1; i >= 0; i--) {
        if (points >= CP_TIERS[i].minCP) return CP_TIERS[i];
    }
    return CP_TIERS[0];
}

export function getNextCPTier(points) {
    const current = getCPTier(points);
    const idx = CP_TIERS.indexOf(current);
    return idx < CP_TIERS.length - 1 ? CP_TIERS[idx + 1] : null;
}

export function getCPProgress(points) {
    const current = getCPTier(points);
    const next = getNextCPTier(points);
    if (!next) return 100;
    const range = next.minCP - current.minCP;
    const progress = points - current.minCP;
    return Math.min(100, Math.round((progress / range) * 100));
}
