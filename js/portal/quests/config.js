// ══════════════════════════════════════════
// Quests – Configuration, Tiers & Badge Definitions
// Load order: config.js → renders.js → init.js
// ══════════════════════════════════════════

// ─── Credit Point Tiers (Rolling 3-Month Window) ─────────
const CP_TIERS = [
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

// ─── Badge Definitions ───────────────────────────────────
// Rarity tiers control the CSS animation on the badge chip:
//   common    — static (no animation)
//   rare      — subtle shimmer
//   epic      — pulse glow
//   legendary — rainbow border + sparkle
const BADGE_RARITY = {
    common:    { label: 'Common',    color: 'gray',    cssClass: 'badge-rarity-common' },
    rare:      { label: 'Rare',      color: 'blue',    cssClass: 'badge-rarity-rare' },
    epic:      { label: 'Epic',      color: 'purple',  cssClass: 'badge-rarity-epic' },
    legendary: { label: 'Legendary', color: 'amber',   cssClass: 'badge-rarity-legendary' },
};

const BADGE_CATALOG = {
    founding_member:  { emoji: '🏅', name: 'Founding Member',    description: 'Joined during year 1 of the LLC',            rarity: 'legendary' },
    shutterbug:       { emoji: '📸', name: 'Shutterbug',         description: 'Uploaded a profile picture',                  rarity: 'common' },
    streak_master:    { emoji: '🔥', name: 'Streak Master',      description: '6+ consecutive on-time months',               rarity: 'epic' },
    streak_legend:    { emoji: '⚡', name: 'Streak Legend',      description: '12+ consecutive on-time months',              rarity: 'legendary' },
    first_seed:       { emoji: '🌱', name: 'First Seed Witness', description: 'Active member when $500 milestone hit',       rarity: 'rare' },
    four_figures:     { emoji: '💵', name: 'Four Figure Club',   description: 'Active when $1,000 milestone hit',            rarity: 'epic' },
    quest_champion:   { emoji: '🎯', name: 'Quest Champion',     description: 'Completed 10+ quests',                        rarity: 'epic' },
    fidelity_linked:  { emoji: '🏦', name: 'Fidelity Linked',    description: 'Opened Fidelity account & linked cashback',   rarity: 'rare' },
    birthday_vip:     { emoji: '🎂', name: 'Birthday VIP',       description: 'Linked bank for birthday payouts',            rarity: 'rare' },
};

// ─── Contributor-Required Quests ─────────────────────────
// Quests whose auto_detect_key is in this set are locked behind
// an active contribution (subscription).  Profile / onboarding
// quests remain open so non-contributors can still make progress
// and see the path to becoming a contributor.
const CONTRIBUTOR_REQUIRED_QUESTS = new Set([
    'on_time_payment',
    'increase_contribution',
    'streak_3',
    'streak_6',
    'streak_12',
]);

// ─── Quest Category Config ───────────────────────────────
const QUEST_CATEGORIES = {
    general:  { label: 'General',  color: 'gray',    icon: '🎯' },
    finance:  { label: 'Finance',  color: 'emerald', icon: '💰' },
    profile:  { label: 'Profile',  color: 'brand',   icon: '👤' },
    fidelity: { label: 'Fidelity', color: 'blue',    icon: '🏦' },
    streak:   { label: 'Streak',   color: 'orange',  icon: '🔥' },
};

// ─── Helper Functions ────────────────────────────────────

/** Get the CP tier object for a given point balance. */
function getCPTier(points) {
    for (let i = CP_TIERS.length - 1; i >= 0; i--) {
        if (points >= CP_TIERS[i].minCP) return CP_TIERS[i];
    }
    return CP_TIERS[0];
}

/** Get the next CP tier object, or null if already at max. */
function getNextCPTier(points) {
    const current = getCPTier(points);
    const idx = CP_TIERS.indexOf(current);
    return idx < CP_TIERS.length - 1 ? CP_TIERS[idx + 1] : null;
}

/** Get progress percentage toward the next tier. */
function getCPProgress(points) {
    const current = getCPTier(points);
    const next = getNextCPTier(points);
    if (!next) return 100;
    const range = next.minCP - current.minCP;
    const progress = points - current.minCP;
    return Math.min(100, Math.round((progress / range) * 100));
}

/** Format a quest status into a human-readable label + style. */
function getQuestStatusConfig(status) {
    switch (status) {
        case 'available':   return { label: 'Available',     bg: 'bg-gray-100',    text: 'text-gray-600' };
        case 'in_progress': return { label: 'In Progress',   bg: 'bg-blue-100',    text: 'text-blue-700' };
        case 'submitted':   return { label: 'Under Review',  bg: 'bg-amber-100',   text: 'text-amber-700' };
        case 'completed':   return { label: 'Completed',     bg: 'bg-emerald-100', text: 'text-emerald-700' };
        case 'rejected':    return { label: 'Needs Revision', bg: 'bg-red-100',    text: 'text-red-700' };
        default:            return { label: status,           bg: 'bg-gray-100',    text: 'text-gray-600' };
    }
}

/** Get a badge definition from the catalog. */
function getBadge(key) {
    return BADGE_CATALOG[key] || { emoji: '❓', name: key, description: 'Unknown badge', rarity: 'common' };
}

/** Get rarity config for a badge key. */
function getBadgeRarity(key) {
    const badge = getBadge(key);
    return BADGE_RARITY[badge.rarity] || BADGE_RARITY.common;
}

/**
 * Build badge chip HTML — the small animated circle that overlays on avatars.
 * @param {string} badgeKey — key in BADGE_CATALOG
 * @param {'sm'|'md'|'lg'} size — sm = nav (18px), md = settings (24px), lg = profile card (32px)
 * @returns {string} HTML string
 */
function buildBadgeChip(badgeKey, size = 'sm') {
    if (!badgeKey) return '';
    const badge = getBadge(badgeKey);
    const rarity = getBadgeRarity(badgeKey);
    const sizeMap = { sm: 'w-5 h-5 text-[10px]', md: 'w-6 h-6 text-xs', lg: 'w-8 h-8 text-sm' };
    const sizeClass = sizeMap[size] || sizeMap.sm;
    return `<div class="badge-chip ${rarity.cssClass} ${sizeClass}" title="${badge.name} (${rarity.label})">${badge.emoji}</div>`;
}

/**
 * Build badge chip for nav avatar overlay — positioned at bottom-right.
 * @param {string} badgeKey
 * @returns {string} HTML string (empty if no badge)
 */
function buildNavBadgeOverlay(badgeKey) {
    if (!badgeKey) return '';
    const badge = getBadge(badgeKey);
    const rarity = getBadgeRarity(badgeKey);
    return `<div class="badge-chip-overlay ${rarity.cssClass}" title="${badge.name}">${badge.emoji}</div>`;
}

/** Format quest type label. */
function getQuestTypeLabel(type) {
    switch (type) {
        case 'one_time':          return 'One-time';
        case 'recurring_monthly': return 'Monthly';
        case 'per_event':         return 'Per event';
        default:                  return type;
    }
}
