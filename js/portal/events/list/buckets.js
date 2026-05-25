// Portal Events — List event buckets (Phase 5M.2C)

'use strict';

const H = window.EventsHelpers || {};
const Card = window.EventsCard;
const E_BUCKET_TRUNCATE = 6;

function api() {
    return window.PortalEventsListBucketsApi || {};
}

const E_BUCKET_EMOJI = {
    'tonight':            '🌜',
    'today':              '🔥',
    'tomorrow':           '⏭️',
    'this week':          '✨',
    'this weekend':       '🎡',
    'next week':          '🗓️',
    'later this month':   '📅',
    'this month':         '📅',
    'next month':         '🌱',
    'future':             '🗓️',
    'past':               '🕰️',
    'earlier':            '🕰️',
};
function bucketLabelEmoji(label) {
    if (!label) return '';
    const l = String(label).toLowerCase().trim();
    if (/^results for/i.test(label)) return '🔎 ' + label;
    const e = E_BUCKET_EMOJI[l];
    return e ? (e + ' ' + label) : label;
}

function renderBucket(label, events, rsvps, attendees) {
    if (!events.length) return '';
    const slug = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const useVlift = document.body.classList.contains('evt-vlift');

    // E11 — Truncate vlift buckets over threshold unless this bucket is expanded
    const total = events.length;
    const isExpanded = ((api().getExpandedBucket?.() ?? null) === slug);
    const truncated = useVlift && total > E_BUCKET_TRUNCATE && !isExpanded;
    const visible = truncated ? events.slice(0, E_BUCKET_TRUNCATE) : events;

    const counts = window.evtAttendeeCounts || {};
    const cards = visible.map(ev => Card.render(ev, {
        rsvp: rsvps[ev.id] || null,
        href: ev.slug ? ('?event=' + encodeURIComponent(ev.slug)) : 'javascript:void(0)',
        variant: 'portal',
        attendees: attendees[ev.id] || [],
        goingCount: counts[ev.id] || (attendees[ev.id] || []).length,
    })).join('');

    // F8 — Create-event tile: prepend to the first upcoming-tab bucket when user can create
    let createTile = '';
    if (useVlift && !(api().getCreateTileInjected?.()) && (window.evtActiveTab || 'upcoming') === 'upcoming') {
        const canCreate = typeof canCreateEvents === 'function' && canCreateEvents();
        if (canCreate) {
            createTile =
                '<button type="button" data-evt-create-tile class="evt-create-tile" aria-label="Create new event">' +
                    '<span class="evt-create-tile__plus" aria-hidden="true">+</span>' +
                    '<span class="evt-create-tile__label">Create Event</span>' +
                    '<span class="evt-create-tile__hint">Add a new event to the calendar</span>' +
                '</button>';
            api().setCreateTileInjected?.(true);
        }
    }

    // F9 — vlift bucket header: drop emoji prefix, add "N events" count pill
    const displayLabel = useVlift ? String(label) : label;
    const safeLabel = (H.escapeHtml || (s => s))(displayLabel);
    const countPill = useVlift
        ? '<span class="evt-bucket-count">' + total + (total === 1 ? ' event' : ' events') + '</span>'
        : '';

    // E11 — Header link: "See all (N) →" when truncated, "Show less" when expanded
    let headerLink = '';
    if (useVlift && total > E_BUCKET_TRUNCATE) {
        if (truncated) {
            headerLink = '<button type="button" data-evt-bucket-toggle="' + slug +
                '" class="evt-bucket-seeall text-xs font-semibold text-brand-600 hover:text-brand-700">' +
                'See all (' + total + ') →</button>';
        } else {
            headerLink = '<button type="button" data-evt-bucket-toggle="' + slug +
                '" class="evt-bucket-seeall text-xs font-semibold text-brand-600 hover:text-brand-700">' +
                'Show less ↑</button>';
        }
    }
    const headerCls = useVlift
        ? 'evt-bucket-head flex items-end justify-between mb-3'
        : '';
    const titleCls = useVlift
        ? 'evt-bucket-title'
        : 'text-xs font-bold uppercase tracking-[0.14em] text-gray-500';

    const header = useVlift
        ? '<header class="' + headerCls + '"><h2 class="' + titleCls + '">' + safeLabel + '</h2><div class="flex items-center gap-2">' + countPill + headerLink + '</div></header>'
        : '<h2 class="' + titleCls + ' mb-3">' + safeLabel + '</h2>';

    return '<section data-bucket="' + slug + '">' +
        header +
        '<div class="evt-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + cards + createTile + '</div>' +
    '</section>';
}

// =========================================================
// =========================================================

export const PortalEventsListBuckets = {
    renderBucket,
    bucketLabelEmoji,
    E_BUCKET_TRUNCATE,
};
globalThis.PortalEventsListBuckets = PortalEventsListBuckets;
