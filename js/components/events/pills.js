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
    // lifecycle-derived. Inline Tailwind utilities (no CSS deps).
    // Reads either `start_date`/`end_date` or `start_at`/`end_at`.
    function statePill(event) {
        if (!event) return '';
        const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap';
        if (event.status === 'cancelled') {
            return `<span class="${base} bg-red-50 text-red-700">Cancelled</span>`;
        }
        const now    = new Date();
        const startRaw = event.start_date || event.start_at || event.starts_at;
        const endRaw   = event.end_date   || event.end_at   || event.ends_at;
        const start  = startRaw ? new Date(startRaw) : null;
        const end    = endRaw   ? new Date(endRaw)   : null;
        if (!start || isNaN(start)) return '';
        if (start <= now && (!end || end >= now)) {
            return `<span class="${base} bg-rose-50 text-rose-700">`
                 + `<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>Live</span>`;
        }
        if (end && end < now) {
            return `<span class="${base} bg-gray-100 text-gray-500">Past</span>`;
        }
        const ms = start - now;
        if (ms <= 86_400_000) {
            return `<span class="${base} bg-amber-50 text-amber-700">Soon</span>`;
        }
        return '';
    }

    // ─── Countdown chip (events_003 §8.6) ─────────────────
    // Compact "starts in N" chip for ≤72h-out events. Returns
    // '' when out of window so card footer collapses cleanly.
    function countdownChip(event) {
        if (!event || event.status === 'cancelled') return '';
        const startRaw = event.start_date || event.start_at || event.starts_at;
        if (!startRaw) return '';
        const start = new Date(startRaw);
        if (isNaN(start)) return '';
        const ms = start - new Date();
        if (ms <= 0) return ''; // already started — statePill handles "Live"
        if (ms > 72 * 3_600_000) return '';

        const hours = ms / 3_600_000;
        let label;
        if (hours < 1) {
            const m = Math.max(1, Math.round(ms / 60_000));
            label = `Starts in ${m}m`;
        } else if (hours < 24) {
            label = `Starts in ${Math.round(hours)}h`;
        } else {
            const days = Math.round(hours / 24);
            label = days === 1 ? 'Tomorrow' : `In ${days} days`;
        }
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-brand-50 text-brand-700">`
             + `<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">`
             + `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`
             + `</svg>${label}</span>`;
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
        countdownChip,
    };

    window.EventsPills = EventsPills;
})();
