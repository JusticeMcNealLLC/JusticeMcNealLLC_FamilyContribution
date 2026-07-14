// Milestones – legacy global bridge (load as type="module")
// Tier data lives in state/tiers.js

import {
    MILESTONE_TIERS,
    getCurrentTierIndex,
    getNextTier,
    getProgressToNext,
} from './state/tiers.js';

Object.assign(globalThis, {
    MILESTONE_TIERS,
    getCurrentTierIndex,
    getNextTier,
    getProgressToNext,
});
