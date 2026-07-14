// ══════════════════════════════════════════
// Quests – Configuration, Tiers & Badge Definitions
// Load as type="module" — exposes globals for legacy scripts
// ══════════════════════════════════════════

import { CP_TIERS, getCPTier, getNextCPTier, getCPProgress } from './state/cpTiers.js';

// ─── Badge Definitions ───────────────────────────────────
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

const CONTRIBUTOR_REQUIRED_QUESTS = new Set([
    'on_time_payment',
    'increase_contribution',
    'streak_3',
    'streak_6',
    'streak_12',
]);

const QUEST_CATEGORIES = {
    general:  { label: 'General',  color: 'gray',    icon: '🎯' },
    finance:  { label: 'Finance',  color: 'emerald', icon: '💰' },
    profile:  { label: 'Profile',  color: 'brand',   icon: '👤' },
    fidelity: { label: 'Fidelity', color: 'blue',    icon: '🏦' },
    streak:   { label: 'Streak',   color: 'orange',  icon: '🔥' },
};

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

function getBadge(key) {
    return BADGE_CATALOG[key] || { emoji: '❓', name: key, description: 'Unknown badge', rarity: 'common' };
}

function getBadgeRarity(key) {
    const badge = getBadge(key);
    return BADGE_RARITY[badge.rarity] || BADGE_RARITY.common;
}

function buildBadgeChip(badgeKey, size = 'sm') {
    if (!badgeKey) return '';
    const badge = getBadge(badgeKey);
    const rarity = getBadgeRarity(badgeKey);
    const sizeMap = { sm: 'w-5 h-5 text-[10px]', md: 'w-6 h-6 text-xs', lg: 'w-8 h-8 text-sm' };
    const sizeClass = sizeMap[size] || sizeMap.sm;
    return `<div class="badge-chip ${rarity.cssClass} ${sizeClass}" title="${badge.name} (${rarity.label})">${badge.emoji}</div>`;
}

function buildNavBadgeOverlay(badgeKey) {
    if (!badgeKey) return '';
    const badge = getBadge(badgeKey);
    const rarity = getBadgeRarity(badgeKey);
    return `<div class="badge-chip-overlay ${rarity.cssClass}" title="${badge.name}">${badge.emoji}</div>`;
}

function getQuestTypeLabel(type) {
    switch (type) {
        case 'one_time':          return 'One-time';
        case 'recurring_monthly': return 'Monthly';
        case 'per_event':         return 'Per event';
        default:                  return type;
    }
}

Object.assign(globalThis, {
    CP_TIERS,
    getCPTier,
    getNextCPTier,
    getCPProgress,
    BADGE_RARITY,
    BADGE_CATALOG,
    CONTRIBUTOR_REQUIRED_QUESTS,
    QUEST_CATEGORIES,
    getQuestStatusConfig,
    getBadge,
    getBadgeRarity,
    buildBadgeChip,
    buildNavBadgeOverlay,
    getQuestTypeLabel,
});
