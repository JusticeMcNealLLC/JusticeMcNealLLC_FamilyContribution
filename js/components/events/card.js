/* ════════════════════════════════════════════════════════════
   Events — Shared Event Card Renderer
   String-returning card renderer used by:
     • portal/events list grid (M1)
     • admin/events card grid  (M3)

   Mobile-first. Heavy inline Tailwind. Returns HTML string.

   Usage:
     EventsCard.render(event, {
       rsvp: rsvpRecordOrNull,
       href: '?event=' + event.slug,
       variant: 'portal' | 'admin',
       adminMeta: { rsvps: 12, revenue: 14000 },  // admin only
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

    const SVG_PIN =
        '<svg class="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/>' +
          '<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>' +
        '</svg>';

    function _dateChip(startDate) {
        if (!startDate) return '';
        const d = new Date(startDate);
        if (isNaN(d)) return '';
        const day = d.getDate();
        const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        return `<div class="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl shadow-md px-2.5 py-1.5 text-center min-w-[44px]">
            <div class="text-[18px] leading-none font-extrabold text-gray-900">${day}</div>
            <div class="text-[10px] tracking-wider font-bold text-brand-600 mt-0.5">${mon}</div>
        </div>`;
    }

    function _bannerBg(event) {
        if (event.banner_url) {
            return `background:linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.25)),url('${H.escapeHtml(event.banner_url)}') center/cover`;
        }
        const grad = (C.CATEGORY_GRADIENT && C.CATEGORY_GRADIENT[event.category]) ||
                     C.DEFAULT_GRADIENT ||
                     'linear-gradient(135deg,#374151,#6b7280)';
        return `background:${grad}`;
    }

    function _emptyBannerEmoji(event) {
        if (event.banner_url) return '';
        const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[event.category]) || '📅';
        return `<div class="absolute inset-0 flex items-center justify-center text-5xl opacity-60 pointer-events-none">${emoji}</div>`;
    }

    function _meta(event) {
        const dateStr = H.formatDate ? H.formatDate(event.start_date, 'datetime') : '';
        const loc = event.location_nickname || event.location_text || '';
        const locStr = loc ? ` · ${H.escapeHtml ? H.escapeHtml(loc) : loc}` : '';
        return `<p class="text-sm text-gray-500 truncate mt-1">${dateStr}${locStr}</p>`;
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

    function render(event, opts = {}) {
        if (!event) return '';
        const variant = opts.variant || 'portal';
        const href = opts.href || `?event=${encodeURIComponent(event.slug || '')}`;
        const title = H.escapeHtml ? H.escapeHtml(event.title || 'Untitled event') : (event.title || '');

        const typeP   = P.typePill  ? P.typePill(event.event_type, 'portal') : '';
        const stateP  = P.statePill ? P.statePill(event)                     : '';
        const rsvpP   = (variant === 'portal' && opts.rsvp && P.rsvpChip)
                          ? P.rsvpChip(opts.rsvp) : '';

        return `<a href="${href}" class="group block bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition md:hover:shadow-md md:hover:-translate-y-0.5">
            <div class="relative w-full h-44 sm:h-48" style="${_bannerBg(event)}">
                ${_emptyBannerEmoji(event)}
                ${_dateChip(event.start_date)}
                <div class="absolute top-3 right-3 flex items-center gap-1.5">
                    ${stateP}
                    ${typeP}
                </div>
            </div>
            <div class="p-4">
                <h3 class="text-base font-bold text-gray-900 line-clamp-2 leading-snug">${title}</h3>
                ${_meta(event)}
                ${rsvpP ? `<div class="mt-2 flex items-center gap-2">${rsvpP}</div>` : ''}
                ${variant === 'admin' ? _adminFooter(event, opts.adminMeta) : ''}
            </div>
        </a>`;
    }

    // ─── Skeleton placeholder (for loading state) ─────────
    function skeleton() {
        return `<div class="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden animate-pulse">
            <div class="w-full h-44 sm:h-48 bg-gray-100"></div>
            <div class="p-4 space-y-2">
                <div class="h-4 bg-gray-100 rounded w-3/4"></div>
                <div class="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
        </div>`;
    }

    window.EventsCard = { render, skeleton };
})();
