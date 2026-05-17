// ═══════════════════════════════════════════════════════════
// Portal Events — Constants
// ═══════════════════════════════════════════════════════════

const CATEGORY_EMOJI = {
    party: '🎉', birthday: '🎂', hangout: '🤝', game_night: '🎮',
    cookout: '🍖', trip: '🏔️', retreat: '🏖️', dinner: '🍽️',
    holiday: '🎄', other: '📌'
};

const TYPE_COLORS = {
    llc:         { bg: 'bg-amber-100', text: 'text-amber-700', label: 'LLC' },
    member:      { bg: 'bg-brand-100', text: 'text-brand-700', label: 'Member' },
    competition: { bg: 'bg-rose-100',  text: 'text-rose-700',  label: 'Competition' },
};

const STATUS_COLORS = {
    draft:     'bg-gray-100 text-gray-600',
    open:      'bg-emerald-100 text-emerald-700',
    confirmed: 'bg-blue-100 text-blue-700',
    active:    'bg-violet-100 text-violet-700',
    completed: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-red-100 text-red-600',
};

// ── Phase 2 bridge — PortalEvents namespace exposure ─────────────────────────
// Bare const declarations above are preserved as-is so classic-script
// consumers (e.g. detail.js referencing TYPE_COLORS as a bare identifier)
// continue to work without any changes. This block adds a namespaced alias
// for future import/bridge use in Phase 5.
window.PortalEvents = window.PortalEvents || {};
window.PortalEvents.constants = {
    CATEGORY_EMOJI,
    TYPE_COLORS,
    STATUS_COLORS,
};
