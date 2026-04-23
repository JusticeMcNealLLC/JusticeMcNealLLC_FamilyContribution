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
    // events_003 §7.3 — muted, photographic-feeling palette.
    // Each gradient is anchored on a deeper, darker color so the
    // white text + emoji watermark remains legible without the
    // saturated, cartoony feel of the previous palette.
    const CATEGORY_GRADIENT = {
        birthday:   'linear-gradient(135deg,#831843,#ec4899)',  // wine → rose
        party:      'linear-gradient(135deg,#1e1b4b,#6366f1)',  // deep indigo → brand
        hangout:    'linear-gradient(135deg,#14532d,#4ade80)',  // forest → light green
        game_night: 'linear-gradient(135deg,#0f172a,#475569)',  // slate
        cookout:    'linear-gradient(135deg,#7c2d12,#f97316)',  // rust → amber
        trip:       'linear-gradient(135deg,#0c4a6e,#0ea5e9)',  // deep teal → sky
        retreat:    'linear-gradient(135deg,#0c4a6e,#0ea5e9)',  // deep teal → sky
        dinner:     'linear-gradient(135deg,#422006,#d97706)',  // umber → amber
        holiday:    'linear-gradient(135deg,#052e16,#16a34a)',  // forest → green
        investment: 'linear-gradient(135deg,#0f172a,#475569)',  // slate
        annual:     'linear-gradient(135deg,#1e1b4b,#6366f1)',  // deep indigo → brand
        celebration:'linear-gradient(135deg,#4a044e,#d946ef)',  // deep purple → fuchsia
        competition:'linear-gradient(135deg,#052e16,#16a34a)',  // forest → green
        fundraiser: 'linear-gradient(135deg,#422006,#d97706)',  // umber → amber
        volunteer:  'linear-gradient(135deg,#14532d,#4ade80)',  // forest → light green
        meeting:    'linear-gradient(135deg,#0f172a,#475569)',  // slate
        other:      'linear-gradient(135deg,#1f2937,#6b7280)',  // charcoal
    };
    const DEFAULT_GRADIENT = 'linear-gradient(135deg,#1f2937,#6b7280)';

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
