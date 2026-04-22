/* ════════════════════════════════════════════════════════════
   Events — Shared Pill / Badge Renderers
   String-returning helpers for status, type, and RSVP pills.
   These are the canonical visual vocabulary used by every
   event surface (portal list/detail, public, admin).

   Surface namespace : window.EventsPills
   Depends on        : window.EventsConstants
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.EventsConstants || {};

    // ─── Status pill ──────────────────────────────────────
    // Reflects event lifecycle status (draft / open / etc.)
    function statusPill(status) {
        const cls = (C.STATUS_COLORS && C.STATUS_COLORS[status]) ||
                    'bg-gray-100 text-gray-600';
        const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}">${label}</span>`;
    }

    // ─── Live / Soon / Past / Cancelled state pill ────────
    // Distinct from `statusPill` — this is time-derived, not
    // lifecycle-derived. Use `evt-pill--*` CSS classes.
    function statePill(event) {
        if (!event) return '';
        if (event.status === 'cancelled') {
            return `<span class="evt-pill evt-pill--cancelled">Cancelled</span>`;
        }
        const now    = new Date();
        const start  = event.start_date ? new Date(event.start_date) : null;
        const end    = event.end_date   ? new Date(event.end_date)   : null;
        if (!start) return '';
        if (start <= now && (!end || end >= now)) {
            return `<span class="evt-pill evt-pill--live">Live</span>`;
        }
        if (end && end < now) {
            return `<span class="evt-pill evt-pill--past">Past</span>`;
        }
        const ms = start - now;
        if (ms <= 86_400_000) {
            return `<span class="evt-pill evt-pill--soon">Soon</span>`;
        }
        return '';
    }

    // ─── Type pill (LLC / Member / Competition) ───────────
    // `flavor` = 'portal' (Tailwind chip) | 'public' (raw style)
    function typePill(eventType, flavor = 'portal') {
        if (flavor === 'public') {
            const tc = (C.TYPE_COLORS_PUBLIC && C.TYPE_COLORS_PUBLIC[eventType]) ||
                       C.TYPE_COLORS_PUBLIC?.llc ||
                       { bg: '#f7f7f7', color: '#222', label: 'Event' };
            return `<span class="evt-tag" style="background:${tc.bg};color:${tc.color}">${tc.label}</span>`;
        }
        const tc = (C.TYPE_COLORS_PORTAL && C.TYPE_COLORS_PORTAL[eventType]) ||
                   C.TYPE_COLORS_PORTAL?.llc ||
                   { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Event' };
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${tc.bg} ${tc.text} whitespace-nowrap">${tc.label}</span>`;
    }

    // ─── Category tag (uses .evt-tag--* classes) ──────────
    function categoryTag(category) {
        const tag = (C.CATEGORY_TAG && C.CATEGORY_TAG[category]) ||
                    C.DEFAULT_TAG ||
                    { cls: 'evt-tag--purple', label: 'Event' };
        return `<span class="evt-tag ${tag.cls}">${tag.label}</span>`;
    }

    // ─── RSVP-status chip (Going / Maybe / Waitlist / —) ──
    function rsvpChip(rsvp) {
        if (!rsvp || !rsvp.status) return '';
        const map = {
            going:        { cls: 'bg-brand-50 text-brand-700',    label: '✓ Going' },
            maybe:        { cls: 'bg-amber-50 text-amber-700',    label: '~ Maybe' },
            not_going:    { cls: 'bg-gray-100 text-gray-500',     label: 'Not going' },
            waitlist:     { cls: 'bg-violet-50 text-violet-700',  label: 'Waitlisted' },
            cancelled:    { cls: 'bg-red-50 text-red-600',        label: 'Cancelled' },
        };
        const m = map[rsvp.status];
        if (!m) return '';
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${m.cls}">${m.label}</span>`;
    }

    // ─── Public exports ───────────────────────────────────
    const EventsPills = {
        statusPill,
        statePill,
        typePill,
        categoryTag,
        rsvpChip,
    };

    window.EventsPills = EventsPills;
})();
