// Portal Events — List right rail: mini calendar, RSVPs, stats (Phase 5M.2A)
(function () {
    'use strict';

    const H = window.EventsHelpers || {};

    function api() {
        return window.PortalEventsListRightRailApi || {};
    }

    function _toIsoDate(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function renderMiniCalendar() {
        const mount = document.getElementById('evtRailSlotCalendar');
        if (!mount) return;
        if (!document.body.classList.contains('evt-vlift')) { mount.innerHTML = ''; return; }

        const today = new Date();
        let miniCalMonth = api().getMiniCalMonth?.();
        if (!miniCalMonth) {
            miniCalMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            api().setMiniCalMonth?.(miniCalMonth);
        }
        const monthStart = new Date(miniCalMonth);
        const year = monthStart.getFullYear();
        const month = monthStart.getMonth();
        const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const evtDays = new Set();
        (window.evtAllEvents || []).forEach(ev => {
            if (!ev || !ev.start_date) return;
            const d = new Date(ev.start_date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                evtDays.add(_toIsoDate(d));
            }
        });

        const firstDow = monthStart.getDay();
        const gridStart = new Date(year, month, 1 - firstDow);
        const todayIso = _toIsoDate(today);
        const activeDay = api().getActiveDay?.() || '';

        const dayHeaders = ['SUN','MON','TUE','WED','THU','FRI','SAT']
            .map(d => '<div class="evt-mcal-dow">' + d + '</div>').join('');

        let cells = '';
        for (let i = 0; i < 42; i++) {
            const d = new Date(gridStart);
            d.setDate(gridStart.getDate() + i);
            const iso = _toIsoDate(d);
            const isOther = d.getMonth() !== month;
            const isToday = iso === todayIso;
            const hasEvt = evtDays.has(iso);
            const isActive = iso === activeDay;
            const cls = ['evt-mcal-day'];
            if (isOther) cls.push('evt-mcal-day--other');
            if (isToday) cls.push('evt-mcal-day--today');
            if (hasEvt) cls.push('evt-mcal-day--has');
            if (isActive) cls.push('evt-mcal-day--active');
            cells += '<button type="button" class="' + cls.join(' ') +
                '" data-mcal-day="' + iso + '" aria-label="' +
                d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) +
                '">' + d.getDate() + '</button>';
        }

        mount.innerHTML =
            '<div class="evt-mcal" role="group" aria-label="Mini calendar">' +
                '<p class="evt-mcal-section-heading">Calendar</p>' +
                '<div class="evt-mcal-head">' +
                    '<button type="button" class="evt-mcal-nav" data-mcal-prev aria-label="Previous month">&lsaquo;</button>' +
                    '<span class="evt-mcal-title">' + monthLabel + '</span>' +
                    '<button type="button" class="evt-mcal-nav" data-mcal-next aria-label="Next month">&rsaquo;</button>' +
                '</div>' +
                '<div class="evt-mcal-dow-row">' + dayHeaders + '</div>' +
                '<div class="evt-mcal-grid">' + cells + '</div>' +
                (activeDay
                    ? '<button type="button" class="evt-mcal-clear" data-mcal-clear>Clear day filter</button>'
                    : '') +
            '</div>';

        mount.querySelector('[data-mcal-prev]')?.addEventListener('click', () => {
            api().setMiniCalMonth?.(new Date(year, month - 1, 1));
            renderMiniCalendar();
        });
        mount.querySelector('[data-mcal-next]')?.addEventListener('click', () => {
            api().setMiniCalMonth?.(new Date(year, month + 1, 1));
            renderMiniCalendar();
        });
        mount.querySelector('[data-mcal-clear]')?.addEventListener('click', () => {
            api().setActiveDay?.('');
            api().renderEvents?.();
        });
        mount.querySelectorAll('[data-mcal-day]').forEach(btn => {
            btn.addEventListener('click', () => {
                const iso = btn.getAttribute('data-mcal-day');
                const cur = api().getActiveDay?.() || '';
                api().setActiveDay?.((cur === iso) ? '' : iso);
                api().renderEvents?.();
            });
        });

        const rail = document.getElementById('evtRightRail');
        if (rail) rail.classList.remove('hidden');
    }

    function renderMyRsvps() {
        const mount = document.getElementById('evtRailSlotRsvps');
        if (!mount) return;
        if (!document.body.classList.contains('evt-vlift')) { mount.innerHTML = ''; return; }

        const all   = window.evtAllEvents || [];
        const rsvps = window.evtAllRsvps  || {};
        const esc   = H.escapeHtml || (s => String(s == null ? '' : s));
        const now   = Date.now();

        const mine = all
            .filter(ev => {
                const r = rsvps[ev.id];
                if (!r || r.status !== 'going') return false;
                const t = new Date(ev.start_date).getTime();
                return !isNaN(t) && t >= now;
            })
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        if (!mine.length) { mount.innerHTML = ''; return; }

        const total = mine.length;
        const rows = mine.slice(0, 3).map(ev => {
            const d = new Date(ev.start_date);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const hasBanner = !!ev.banner_url;
            const thumbStyle = hasBanner
                ? ('background: url(\'' + esc(ev.banner_url) + '\') center/cover;')
                : 'background: linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);';
            return '<button type="button" class="evt-myrsvp-row" data-evt-myrsvp="' + esc(ev.id) + '">' +
                '<span class="evt-myrsvp-thumb" aria-hidden="true" style="' + thumbStyle + '"></span>' +
                '<span class="evt-myrsvp-body">' +
                    '<span class="evt-myrsvp-title">' + esc(ev.title || 'Untitled event') + '</span>' +
                    '<span class="evt-myrsvp-meta">' + esc(dateStr) + ', ' + esc(timeStr) + '</span>' +
                '</span>' +
            '</button>';
        }).join('');

        mount.innerHTML =
            '<div class="evt-myrsvps">' +
                '<div class="evt-myrsvps-head">' +
                    '<h3 class="evt-myrsvps-title">Your Upcoming RSVPs</h3>' +
                    '<span class="evt-myrsvps-count">' + total + '</span>' +
                '</div>' +
                '<div class="evt-myrsvps-list">' + rows + '</div>' +
                '<button type="button" class="evt-myrsvps-all" data-evt-myrsvps-all>View All My Events</button>' +
            '</div>';

        mount.querySelectorAll('[data-evt-myrsvp]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-evt-myrsvp');
                const ev = all.find(e => e.id === id);
                if (!ev) return;
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });
        mount.querySelector('[data-evt-myrsvps-all]')?.addEventListener('click', () => {
            document.querySelector('[data-filter="going"]')?.click();
        });

        const rail = document.getElementById('evtRightRail');
        if (rail) rail.classList.remove('hidden');
    }

    function renderStatsCard() {
        const mount = document.getElementById('evtRailSlotStats');
        if (!mount) return;
        if (!document.body.classList.contains('evt-vlift')) { mount.innerHTML = ''; return; }

        const all   = window.evtAllEvents || [];
        const rsvps = window.evtAllRsvps  || {};

        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();

        const thisMonth = all.filter(ev => {
            const d = new Date(ev.start_date);
            return d.getFullYear() === y && d.getMonth() === m;
        }).length;

        const going = Object.values(rsvps).filter(r => r && r.status === 'going').length;

        const communities = new Set();
        all.forEach(ev => { if (ev && ev.event_type) communities.add(ev.event_type); });

        mount.innerHTML =
            '<div class="evt-stats">' +
                '<h3 class="evt-stats-title">Events Overview</h3>' +
                '<div class="evt-stats-row">' +
                    '<span class="evt-stats-icon evt-stats-icon--purple" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
                    '</span>' +
                    '<span class="evt-stats-body"><span class="evt-stats-label">This Month</span><span class="evt-stats-sub">Upcoming events</span></span>' +
                    '<span class="evt-stats-value">' + thisMonth + '</span>' +
                '</div>' +
                '<div class="evt-stats-row">' +
                    '<span class="evt-stats-icon evt-stats-icon--green" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
                    '</span>' +
                    '<span class="evt-stats-body"><span class="evt-stats-label">You\u2019re Going</span><span class="evt-stats-sub">Events</span></span>' +
                    '<span class="evt-stats-value">' + going + '</span>' +
                '</div>' +
                '<div class="evt-stats-row">' +
                    '<span class="evt-stats-icon evt-stats-icon--blue" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
                    '</span>' +
                    '<span class="evt-stats-body"><span class="evt-stats-label">Communities</span><span class="evt-stats-sub">Active communities</span></span>' +
                    '<span class="evt-stats-value">' + communities.size + '</span>' +
                '</div>' +
                '<button type="button" class="evt-stats-link" data-evt-stats-all>View Full Calendar</button>' +
            '</div>';

        mount.querySelector('[data-evt-stats-all]')?.addEventListener('click', () => {
            const viewBtn = document.querySelector('[data-view="calendar"]');
            if (viewBtn) viewBtn.click();
        });

        const rail = document.getElementById('evtRightRail');
        if (rail) rail.classList.remove('hidden');
    }

    window.PortalEventsListRightRail = {
        renderMiniCalendar,
        renderMyRsvps,
        renderStatsCard,
    };
})();
