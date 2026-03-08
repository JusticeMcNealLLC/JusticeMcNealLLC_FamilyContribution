// ══════════════════════════════════════════
// Milestones – Configuration & Tier Data
// Load order: config.js → renders.js → init.js
// ══════════════════════════════════════════

// Threshold values are in cents to match the rest of the app
const MILESTONE_TIERS = [
    {
        threshold: 50000,
        emoji: '🌱',
        name: 'First Seed',
        perk: 'Social feed launches — members can post & interact',
        details: {
            description: 'The family\'s first major step. Once our portfolio hits $500, the Social Feed goes live — every member can share posts, react, and stay connected.',
            includes: ['Family social feed', 'Text & image posts', 'Like & comment on posts', 'Admin announcements'],
            whyCounts: 'Portfolio value of all invested ETFs (VTI, VXUS, VIG, SPAXX) tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 100000,
        emoji: '💵',
        name: 'Four Figures',
        perk: 'Events system opens — plan family gatherings',
        details: {
            description: 'At $1,000 we unlock the Events system. Create, RSVP, and coordinate family gatherings, birthdays, and trips — all inside the portal.',
            includes: ['Create & manage events', 'RSVP system', 'Event reminders', 'Trip deposit collection'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 250000,
        emoji: '📈',
        name: 'Gaining Ground',
        perk: 'Family gallery unlocked — store & share memories',
        details: {
            description: 'A shared family photo & video gallery. Upload memories from events, vacations, and everyday life — a private family archive that grows over time.',
            includes: ['Shared photo albums', 'Video uploads', 'Tag family members', 'Event photo collections'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 500000,
        emoji: '🔥',
        name: 'Halfway to Five Figures',
        perk: 'Quest system opens — earn Credit Points for tasks',
        details: {
            description: 'The Quest system brings gamification to wealth building. Complete tasks like linking a Fidelity card, maintaining budget streaks, and attending events to earn Credit Points and climb the status tiers.',
            includes: ['Quest board with tasks', 'Credit Points (CP) earning', 'Status tiers: Bronze → Diamond', 'Leaderboard & badges'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 1000000,
        emoji: '🏅',
        name: 'Five Figures',
        perk: 'Milestone celebration event — family dinner / outing',
        details: {
            description: 'Hitting $10,000 is a huge deal — this unlocks a real-world family celebration funded by the LLC. Dinner, outing, or activity, voted on by members.',
            includes: ['LLC-funded family event', 'Members vote on the activity', 'Event automatically created in the portal', 'Commemorative badge for all members'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 2500000,
        emoji: '💪',
        name: 'Building Momentum',
        perk: 'Lending program opens — members can borrow from the fund',
        details: {
            description: 'At $25,000, the LLC can safely lend small amounts to members. Emergency car repair, medical bills, or bridging a paycheck — interest-free or low-interest, with clear terms.',
            includes: ['Member loan requests', 'Admin approval workflow', 'Repayment tracking', 'Interest-free for small amounts', 'Loan limits based on fund size'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 5000000,
        emoji: '🏦',
        name: 'Mini Bank',
        perk: 'Emergency fund access for members in need',
        details: {
            description: 'A dedicated emergency reserve within the fund. Members facing genuine hardship can access emergency funds with simplified approval — the family has each other\'s back.',
            includes: ['Emergency fund pool', 'Expedited approval for emergencies', 'Partial grant / partial loan options', 'Hardship documentation'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 7500000,
        emoji: '🛡️',
        name: 'Safety Net',
        perk: 'Trust formation begins — consult estate attorney',
        details: {
            description: 'At $75,000, we begin the process of forming a Family Trust. This protects assets, establishes succession planning, and ensures the wealth passes to future generations.',
            includes: ['Consultation with estate attorney', 'Trust structure planning', 'Succession framework', 'Asset protection strategy'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 10000000,
        emoji: '🎉',
        name: 'Six Figures',
        perk: 'Family vehicle program evaluation begins',
        details: {
            description: 'With $100,000 in the portfolio, we evaluate the feasibility of an LLC-owned vehicle program — shared family vehicles that reduce everyone\'s transportation costs.',
            includes: ['Vehicle program feasibility study', 'Cost-benefit analysis', 'Insurance & liability research', 'Member usage scheduling concept'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 25000000,
        emoji: '🚗',
        name: 'Fleet Ready',
        perk: 'Real estate research & land acquisition planning',
        details: {
            description: 'At $250,000, we start serious real estate research — evaluating land, rental properties, or a family compound. Real estate is the foundation of generational wealth.',
            includes: ['Market research & location scouting', 'Rental property analysis', 'Land acquisition planning', 'Family compound feasibility study'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 50000000,
        emoji: '🏠',
        name: 'Compound Vision',
        perk: 'Scholarships, life insurance, compound planning',
        details: {
            description: 'Half a million unlocks the big-picture benefits: family scholarships for education, group life insurance policies, and active planning for a family compound or property.',
            includes: ['Family scholarship fund', 'Group life insurance evaluation', 'Compound / property planning', 'Education fund for next generation'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
    {
        threshold: 100000000,
        emoji: '👑',
        name: 'Generational',
        perk: 'Full benefits suite — generational wealth achieved',
        details: {
            description: 'One million dollars. The full benefits suite activates — every program, every perk, every safety net. The McNeal family has built true generational wealth.',
            includes: ['All previous perks active', 'Full lending & emergency programs', 'Real estate portfolio', 'Trust fully established', 'Legacy planning for next generation'],
            whyCounts: 'Portfolio value of all invested ETFs tracked via Fidelity snapshots.',
        },
    },
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
