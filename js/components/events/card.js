/* ════════════════════════════════════════════════════════════
   Events — Shared Event Card Renderer
   String-returning card renderer used by:
     • portal/events list grid (M1, redesigned events_003)
     • admin/events card grid  (M3)

   Mobile-first. Heavy inline Tailwind. Returns HTML string.

   Usage:
     EventsCard.render(event, {
       rsvp: rsvpRecordOrNull,
       href: '?event=' + event.slug,
       variant: 'portal' | 'admin',
       adminMeta: { rsvps: 12, revenue: 14000 },        // admin only
       attendees: [{ profile_picture_url, first_name }] // portal only, optional
     })

   Surface namespace : window.EventsCard
   Depends on        : window.EventsConstants, window.EventsHelpers,
                       window.EventsPills
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const H = window.EventsHelpers   || {};
    const P = window.EventsPills     || {};

    // ─── Helpers ──────────────────────────────────────────
    function _startDate(event) {
        const raw = event.start_date || event.start_at || event.starts_at;
        if (!raw) return null;
        const d = new Date(raw);
        return isNaN(d) ? null : d;
    }

    function _bannerBg(event) {
        if (event.banner_url) {
            return `background:linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.45)),url('${H.escapeHtml(event.banner_url)}') center/cover`;
        }
        const grad = (C.CATEGORY_GRADIENT && C.CATEGORY_GRADIENT[event.category]) ||
                     C.DEFAULT_GRADIENT ||
                     'linear-gradient(135deg,#1f2937,#6b7280)';
        return `background:${grad}`;
    }

    function _emptyBannerEmoji(event) {
        if (event.banner_url) return '';
        const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[event.category]) || '📅';
        return `<div class="absolute inset-0 flex items-center justify-center text-6xl opacity-40 pointer-events-none select-none">${emoji}</div>`;
    }

    // Date stamp (header row, NOT overlay) — events_003 §8.6
    function _dateStamp(event) {
        const d = _startDate(event);
        if (!d) return '<div class="w-11"></div>';
        const day = d.getDate();
        const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        return `<div class="shrink-0 text-center min-w-[44px]">
            <div class="text-[20px] leading-none font-extrabold text-gray-900">${day}</div>
            <div class="text-[10px] tracking-wider font-bold text-brand-600 mt-0.5">${mon}</div>
        </div>`;
    }

    function _relativeLabel(event) {
        const d = _startDate(event);
        if (!d || !H.relativeDate) return '';
        const lbl = H.relativeDate(d);
        if (!lbl) return '';
        return `<span class="text-[12px] font-semibold text-gray-500">${lbl}</span>`;
    }

    // Meta row: "Category · Type · Location" (text, not chips)
    function _meta(event) {
        const parts = [];
        const catLabel = (C.CATEGORY_TAG && C.CATEGORY_TAG[event.category]?.label) || null;
        if (catLabel) parts.push(catLabel);
        const tc = (C.TYPE_COLORS_PORTAL && C.TYPE_COLORS_PORTAL[event.event_type]);
        if (tc?.label) parts.push(tc.label);
        const loc = event.location_nickname || event.location_text;
        if (loc) parts.push(H.escapeHtml ? H.escapeHtml(loc) : loc);
        const time = _startDate(event);
        if (time && H.formatDate) parts.push(H.formatDate(time, 'time'));
        if (!parts.length) return '';
        return `<p class="text-[13px] text-gray-500 truncate mt-1">${parts.join(' · ')}</p>`;
    }

    // Avatar stack — events_003 §8.6 (max 4 + overflow count)
    function _avatarStack(attendees) {
        const list = Array.isArray(attendees) ? attendees : [];
        if (!list.length) return '';
        const visible = list.slice(0, 4);
        const overflow = Math.max(0, list.length - 4);
        const pieces = visible.map((a) => {
            const name = H.escapeHtml ? H.escapeHtml(a.first_name || '') : (a.first_name || '');
            if (a.profile_picture_url) {
                const url = H.escapeHtml ? H.escapeHtml(a.profile_picture_url) : a.profile_picture_url;
                return `<img src="${url}" alt="${name}" loading="lazy" class="w-7 h-7 rounded-full ring-2 ring-white object-cover bg-gray-100">`;
            }
            const initial = (a.first_name || '?').trim().charAt(0).toUpperCase() || '?';
            return `<span class="w-7 h-7 rounded-full ring-2 ring-white bg-brand-100 text-brand-700 text-[11px] font-bold inline-flex items-center justify-center">${initial}</span>`;
        });
        if (overflow > 0) {
            pieces.push(`<span class="w-7 h-7 rounded-full ring-2 ring-white bg-gray-100 text-gray-600 text-[11px] font-bold inline-flex items-center justify-center">+${overflow}</span>`);
        }
        return `<div class="flex -space-x-2">${pieces.join('')}</div>`;
    }

    // Going ribbon (top of card) — events_003 §8.6
    function _goingRibbon(rsvp) {
        if (!rsvp || rsvp.status !== 'going') return '';
        return `<div class="bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider px-4 py-1 flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>You're going
        </div>`;
    }

    function _adminFooter(event, adminMeta) {
        const rsvps   = adminMeta?.rsvps   ?? 0;
        const revenue = adminMeta?.revenue ?? 0;
        const revStr  = H.formatMoney ? H.formatMoney(revenue) : `$${(revenue/100).toFixed(0)}`;
        return `<div class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
            <span class="font-semibold text-gray-700">${rsvps}</span> RSVPs
            <span class="text-gray-300">·</span>
            <span class="font-semibold text-gray-700">${revStr}</span> revenue
            <span class="ml-auto">${P.statusPill ? P.statusPill(event.status) : ''}</span>
        </div>`;
    }

    // ─── Main render (events_003 §8.6) ────────────────────
    function render(event, opts = {}) {
        if (!event) return '';
        const variant = opts.variant || 'portal';
        const href    = opts.href || `?event=${encodeURIComponent(event.slug || '')}`;
        const title   = H.escapeHtml ? H.escapeHtml(event.title || 'Untitled event') : (event.title || '');

        const stateP    = P.statePill     ? P.statePill(event)            : '';
        const countP    = (variant === 'portal' && P.countdownChip)
                            ? P.countdownChip(event) : '';
        const ribbon    = (variant === 'portal') ? _goingRibbon(opts.rsvp) : '';
        const stack     = (variant === 'portal') ? _avatarStack(opts.attendees) : '';

        return `<a href="${href}" data-evt-card="${event.id}" class="group block bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition md:hover:shadow-md md:hover:-translate-y-0.5">
            ${ribbon}
            <div class="px-4 pt-3 pb-2 flex items-center gap-3">
                ${_dateStamp(event)}
                <div class="flex-1 min-w-0 flex items-center justify-end">
                    ${_relativeLabel(event)}
                </div>
            </div>
            <div class="relative w-full aspect-[16/9]" style="${_bannerBg(event)}">
                ${_emptyBannerEmoji(event)}
                ${stateP ? `<div class="absolute top-3 right-3">${stateP}</div>` : ''}
            </div>
            <div class="p-4">
                <h3 class="text-base font-bold text-gray-900 line-clamp-2 leading-snug">${title}</h3>
                ${_meta(event)}
                ${(stack || countP) ? `<div class="mt-3 flex items-center justify-between gap-3">
                    <div class="min-w-0">${stack}</div>
                    <div class="shrink-0">${countP}</div>
                </div>` : ''}
                ${variant === 'admin' ? _adminFooter(event, opts.adminMeta) : ''}
            </div>
        </a>`;
    }

    // ─── Skeleton placeholder ─────────────────────────────
    function skeleton() {
        return `<div class="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden animate-pulse">
            <div class="px-4 pt-3 pb-2 flex items-center gap-3">
                <div class="w-11 h-9 bg-gray-100 rounded"></div>
                <div class="flex-1"></div>
                <div class="w-14 h-3 bg-gray-100 rounded"></div>
            </div>
            <div class="w-full aspect-[16/9] bg-gray-100"></div>
            <div class="p-4 space-y-2">
                <div class="h-4 bg-gray-100 rounded w-3/4"></div>
                <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                <div class="h-7 bg-gray-100 rounded-full w-1/3 mt-3"></div>
            </div>
        </div>`;
    }

    window.EventsCard = { render, skeleton };
})();

