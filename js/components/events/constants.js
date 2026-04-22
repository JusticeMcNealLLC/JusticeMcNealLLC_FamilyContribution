/* ════════════════════════════════════════════════════════════
   Events — Shared Constants
   Single source of truth for category emoji, type colors,
   gradients, status colors, and tag labels.

   Used by: portal/events, /events/ (public), admin/events.
   Loaded BEFORE all surface-specific event modules.

   Surface namespace : window.EventsConstants
   Legacy aliases    : window.PUB_*, window.EVT_*, etc.
                       (legacy modules redefine these locally
                        — that's fine, values are identical)
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // ─── Category → emoji ─────────────────────────────────
    const CATEGORY_EMOJI = {
        party:      '🎉',
        birthday:   '🎂',
        hangout:    '🤝',
        game_night: '🎮',
        cookout:    '🍖',
        trip:       '🏔️',
        retreat:    '🏖️',
        dinner:     '🍽️',
        holiday:    '🎄',
        investment: '💼',
        annual:     '📅',
        other:      '📌',
    };

    // ─── Category → modern tag classes (portal cards) ─────
    const CATEGORY_TAG = {
        birthday:   { cls: 'evt-tag--pink',   label: 'Birthday' },
        party:      { cls: 'evt-tag--orange', label: 'Party' },
        hangout:    { cls: 'evt-tag--green',  label: 'Hangout' },
        game_night: { cls: 'evt-tag--purple', label: 'Game Night' },
        cookout:    { cls: 'evt-tag--orange', label: 'Cookout' },
        trip:       { cls: 'evt-tag--teal',   label: 'Trip' },
        retreat:    { cls: 'evt-tag--teal',   label: 'Retreat' },
        dinner:     { cls: 'evt-tag--blue',   label: 'Dinner' },
        holiday:    { cls: 'evt-tag--blue',   label: 'Holiday' },
        investment: { cls: 'evt-tag--blue',   label: 'Investment' },
        annual:     { cls: 'evt-tag--purple', label: 'Annual' },
    };
    const DEFAULT_TAG = { cls: 'evt-tag--purple', label: 'Event' };

    // ─── Category → card gradient (no banner fallback) ────
    const CATEGORY_GRADIENT = {
        birthday:   'linear-gradient(135deg,#7c3aed,#a855f7)',
        party:      'linear-gradient(135deg,#ea580c,#f97316)',
        hangout:    'linear-gradient(135deg,#059669,#10b981)',
        game_night: 'linear-gradient(135deg,#312e81,#4f46e5)',
        cookout:    'linear-gradient(135deg,#92400e,#b45309)',
        trip:       'linear-gradient(135deg,#0f766e,#14b8a6)',
        retreat:    'linear-gradient(135deg,#0369a1,#0ea5e9)',
        dinner:     'linear-gradient(135deg,#1d4ed8,#3b82f6)',
        holiday:    'linear-gradient(135deg,#166534,#22c55e)',
        investment: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
        annual:     'linear-gradient(135deg,#312e81,#4f46e5)',
    };
    const DEFAULT_GRADIENT = 'linear-gradient(135deg,#374151,#6b7280)';

    // ─── Event type → color tokens ────────────────────────
    // Portal flavor (Tailwind classes) and Public flavor (raw colors).
    const TYPE_COLORS_PORTAL = {
        llc:         { bg: 'bg-amber-100', text: 'text-amber-700', label: 'LLC' },
        member:      { bg: 'bg-brand-100', text: 'text-brand-700', label: 'Member' },
        competition: { bg: 'bg-rose-100',  text: 'text-rose-700',  label: 'Competition' },
    };
    const TYPE_COLORS_PUBLIC = {
        llc:         { bg: '#f7f7f7', color: '#222', label: 'LLC Event' },
        member:      { bg: '#f7f7f7', color: '#222', label: 'Member Event' },
        competition: { bg: '#f7f7f7', color: '#222', label: 'Competition' },
    };

    // ─── Event status → Tailwind chip class ───────────────
    const STATUS_COLORS = {
        draft:     'bg-gray-100 text-gray-600',
        open:      'bg-emerald-100 text-emerald-700',
        confirmed: 'bg-blue-100 text-blue-700',
        active:    'bg-violet-100 text-violet-700',
        completed: 'bg-gray-100 text-gray-500',
        cancelled: 'bg-red-100 text-red-600',
    };

    // ─── Pricing modes (from events_001.md) ───────────────
    const PRICING_MODES = {
        fully_paid:           { label: 'Fully Paid' },
        free_event_paid_raffle: { label: 'Free Event · Paid Raffle' },
        fully_free:           { label: 'Fully Free' },
    };

    // ─── Public exports ───────────────────────────────────
    const EventsConstants = {
        CATEGORY_EMOJI,
        CATEGORY_TAG,
        DEFAULT_TAG,
        CATEGORY_GRADIENT,
        DEFAULT_GRADIENT,
        TYPE_COLORS_PORTAL,
        TYPE_COLORS_PUBLIC,
        STATUS_COLORS,
        PRICING_MODES,
    };

    window.EventsConstants = EventsConstants;
})();
