// ══════════════════════════════════════════
// Milestones – Configuration & Tier Data
// Load order: config.js → renders.js → init.js
// ══════════════════════════════════════════

// Threshold values are in cents to match the rest of the app
const MILESTONE_TIERS = [
    { threshold:     50000, emoji: '🌱', name: 'First Seed',              perk: 'Social feed launches — members can post & interact' },
    { threshold:    100000, emoji: '💵', name: 'Four Figures',            perk: 'Events system opens — plan family gatherings' },
    { threshold:    250000, emoji: '📈', name: 'Gaining Ground',          perk: 'Family gallery unlocked — store & share memories' },
    { threshold:    500000, emoji: '🔥', name: 'Halfway to Five Figures', perk: 'Quest system opens — earn Credit Points for tasks' },
    { threshold:   1000000, emoji: '🏅', name: 'Five Figures',            perk: 'Milestone celebration event — family dinner / outing' },
    { threshold:   2500000, emoji: '💪', name: 'Building Momentum',       perk: 'Lending program opens — members can borrow from the fund' },
    { threshold:   5000000, emoji: '🏦', name: 'Mini Bank',               perk: 'Emergency fund access for members in need' },
    { threshold:   7500000, emoji: '🛡️', name: 'Safety Net',              perk: 'Trust formation begins — consult estate attorney' },
    { threshold:  10000000, emoji: '🎉', name: 'Six Figures',             perk: 'Family vehicle program evaluation begins' },
    { threshold:  25000000, emoji: '🚗', name: 'Fleet Ready',             perk: 'Real estate research & land acquisition planning' },
    { threshold:  50000000, emoji: '🏠', name: 'Compound Vision',         perk: 'Scholarships, life insurance, compound planning' },
    { threshold: 100000000, emoji: '👑', name: 'Generational',            perk: 'Full benefits suite — generational wealth achieved' },
];

/**
 * Return the index of the current tier (last tier whose threshold is <= total).
 * Returns -1 if no tier is reached yet.
 */
function getCurrentTierIndex(totalCents) {
    let idx = -1;
    for (let i = 0; i < MILESTONE_TIERS.length; i++) {
        if (totalCents >= MILESTONE_TIERS[i].threshold) idx = i;
        else break;
    }
    return idx;
}

/**
 * For a given total, return the next tier to unlock (or null if all are reached).
 */
function getNextTier(totalCents) {
    for (const tier of MILESTONE_TIERS) {
        if (totalCents < tier.threshold) return tier;
    }
    return null;
}

/**
 * Percentage progress toward the next tier (0–100).
 */
function getProgressToNext(totalCents) {
    const currentIdx = getCurrentTierIndex(totalCents);
    const prevThreshold = currentIdx >= 0 ? MILESTONE_TIERS[currentIdx].threshold : 0;
    const next = getNextTier(totalCents);
    if (!next) return 100; // all tiers achieved
    const range = next.threshold - prevThreshold;
    const progress = totalCents - prevThreshold;
    return Math.min(100, Math.max(0, (progress / range) * 100));
}
