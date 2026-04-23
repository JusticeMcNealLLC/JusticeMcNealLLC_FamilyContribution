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

    // C2 — Tappable category chip overlay (events_003 §3.11 / §8.5)
    // Shows on every card with a category. Sets _activeCategory via
    // data-evt-cat click handler wired in list.js _wireCardClicks.
    function _categoryChip(event) {
        if (!event || !event.category) return '';
        const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[event.category]) || '📅';
        const label = (C.CATEGORY_TAG && C.CATEGORY_TAG[event.category]?.label) || event.category;
        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        return `<button type="button" data-evt-cat="${esc(event.category)}"
            class="evt-cat-chip absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-center text-base leading-none hover:scale-110 active:scale-95 transition-transform"
            aria-label="Filter by ${esc(label)}" title="Filter by ${esc(label)}">${emoji}</button>`;
    }

    // Date stamp (header row, NOT overlay) — events_003 §8.6
    // Pinned LLC events get a small 📌 overlay — events_003 §8.8
    function _dateStamp(event) {
        const d = _startDate(event);
        if (!d) return '<div class="w-11"></div>';
        const day = d.getDate();
        const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const isPinnedLlc = event && event.is_pinned && event.event_type === 'llc';
        const pin = isPinnedLlc
            ? '<span class="evt-date-pin" aria-label="Pinned LLC event" title="Pinned">📌</span>'
            : '';
        return `<div class="relative shrink-0 text-center min-w-[44px]">
            ${pin}
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
        return `<p class="text-[13px] text-gray-500 truncate mt-1" data-evt-legacy-meta>${parts.join(' · ')}</p>`;
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

        // F7 — vlift date overlay chip (vertical white card on banner top-left)
        const _d = _startDate(event);
        const _day = _d ? _d.getDate() : '';
        const _mon = _d ? _d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
        const _dow = _d ? _d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : '';
        const dataDate = _d ? ` data-evt-day="${_day}" data-evt-mon="${_mon}"` : '';
        const dateChipOverlay = _d
            ? `<div class="evt-card-date-chip" aria-hidden="true"><span class="evt-card-date-mon">${_mon}</span><span class="evt-card-date-day">${_day}</span><span class="evt-card-date-dow" data-f15-dow>${_dow}</span></div>`
            : '';
        // F7 — RSVP footer outline button (portal vlift only; rendered for all, CSS gates)
        const isGoing = !!(opts.rsvp && opts.rsvp.status === 'going');
        const rsvpFooter = (variant === 'portal')
            ? `<button type="button" data-evt-card-rsvp="${event.id}" class="evt-card-rsvp${isGoing ? ' evt-card-rsvp--on' : ''}" aria-pressed="${isGoing ? 'true' : 'false'}">${isGoing ? '✓ Going' : 'RSVP'}</button>`
            : '';

        // F15 — Split meta (vlift): type/host line, then icon rows for location + time.
        // Legacy _meta() still emitted (hidden under vlift) so non-vlift stays intact.
        const _tcLabel = (C.TYPE_COLORS_PORTAL && C.TYPE_COLORS_PORTAL[event.event_type]?.label) || '';
        const _catLabel = (C.CATEGORY_TAG && C.CATEGORY_TAG[event.category]?.label) || '';
        const f15TypeHost = (_tcLabel || _catLabel)
            ? `<p class="evt-card-f15-type" data-f15-type>${[_tcLabel, _catLabel].filter(Boolean).map(s => H.escapeHtml ? H.escapeHtml(s) : s).join(' \u00B7 ')}</p>`
            : '';
        const _f15Loc = event.location_nickname || event.location_text || '';
        const _f15Time = (_d && H.formatDate) ? H.formatDate(_d, 'time') : '';
        const f15LocRow = _f15Loc
            ? `<p class="evt-card-f15-row" data-f15-loc><svg class="evt-card-f15-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg><span class="truncate">${H.escapeHtml ? H.escapeHtml(_f15Loc) : _f15Loc}</span></p>`
            : '';
        const f15TimeRow = _f15Time
            ? `<p class="evt-card-f15-row" data-f15-time><svg class="evt-card-f15-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3 2"/></svg><span>${H.escapeHtml ? H.escapeHtml(_f15Time) : _f15Time}</span></p>`
            : '';
        const f15Body = (f15TypeHost || f15LocRow || f15TimeRow)
            ? `<div class="evt-card-f15" data-f15>${f15TypeHost}${f15LocRow}${f15TimeRow}</div>`
            : '';
        // F15 — Compact footer (vlift): attendee cluster + "N going" left, compact RSVP pill right.
        const _goingCount = Array.isArray(opts.attendees) ? opts.attendees.length : 0;
        const f15GoingLabel = _goingCount > 0
            ? `<span class="evt-card-f15-going">${_goingCount} going</span>`
            : '';
        const f15RsvpPill = (variant === 'portal')
            ? `<button type="button" data-evt-card-rsvp="${event.id}" data-f15-rsvp class="evt-card-f15-rsvp${isGoing ? ' evt-card-f15-rsvp--on' : ''}" aria-pressed="${isGoing ? 'true' : 'false'}">${isGoing ? '✓ Going' : 'RSVP'}</button>`
            : '';
        const f15Footer = (variant === 'portal')
            ? `<div class="evt-card-f15-foot" data-f15-foot><div class="evt-card-f15-foot__left">${stack}${f15GoingLabel}</div>${f15RsvpPill}</div>`
            : '';

        return `<a href="${href}" data-evt-card="${event.id}"${dataDate} class="group block bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition md:hover:shadow-md md:hover:-translate-y-0.5">
            ${ribbon}
            <div class="px-4 pt-3 pb-2 flex items-center gap-3 evt-card-header-row">
                ${_dateStamp(event)}
                <div class="flex-1 min-w-0 flex items-center justify-end">
                    ${_relativeLabel(event)}
                </div>
            </div>
            <div class="relative w-full aspect-[16/9] evt-card-banner" style="${_bannerBg(event)}">
                ${_emptyBannerEmoji(event)}
                ${dateChipOverlay}
                ${_categoryChip(event)}
                ${stateP ? `<div class="absolute top-3 right-3">${stateP}</div>` : ''}
            </div>
            <div class="p-4">
                <h3 class="text-base font-bold text-gray-900 line-clamp-2 leading-snug">${title}</h3>
                ${f15Body}
                ${_meta(event)}
                ${(stack || countP) ? `<div class="mt-3 flex items-center justify-between gap-3" data-evt-legacy-stack>
                    <div class="min-w-0">${stack}</div>
                    <div class="shrink-0">${countP}</div>
                </div>` : ''}
                ${rsvpFooter}
                ${f15Footer}
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

