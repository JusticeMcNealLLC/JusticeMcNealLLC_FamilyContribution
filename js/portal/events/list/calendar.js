// Portal Events — List full calendar view + day modal (Phase 5M.2B)
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function api() {
        return window.PortalEventsListCalendarApi || {};
    }

    function localDateKey(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function groupEventsByDay(events) {
        const F = window.PortalEventsListFilters;
        const map = {};
        events.forEach(ev => {
            if (!ev || !ev.start_date || ev.status === 'cancelled') return;
            if (api().notHidden && !api().notHidden(ev)) return;
            if (F && !F.matchesType(ev)) return;
            if (F && !F.matchesCategory(ev)) return;
            const k = localDateKey(new Date(ev.start_date));
            (map[k] = map[k] || []).push(ev);
        });
        Object.keys(map).forEach(k => {
            map[k].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        });
        return map;
    }

    function closeDayModal() {
        const modal = document.getElementById('evtDayModal');
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    function openDayModal(dateKey) {
        const modal = document.getElementById('evtDayModal');
        const title = document.getElementById('evtDayModalTitle');
        const body  = document.getElementById('evtDayModalBody');
        if (!modal || !title || !body) return;

        const all = window.evtAllEvents || [];
        const attendees = window.evtAttendees || {};
        const counts = window.evtAttendeeCounts || {};
        const byDay = groupEventsByDay(all);
        const items = byDay[dateKey] || [];
        const miniCard = api().miniCard;

        const [y, m, d] = dateKey.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        title.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        if (!items.length) {
            body.innerHTML = '<div class="text-center text-sm text-gray-500 py-6">No events on this day.</div>';
        } else if (typeof miniCard === 'function') {
            body.innerHTML = '<div class="flex flex-col gap-2">' +
                items.map(ev => miniCard(ev, attendees[ev.id] || [], counts[ev.id])
                    .replace('snap-start shrink-0 w-[76%] sm:w-64', 'w-full')
                ).join('') +
            '</div>';
        } else {
            body.innerHTML = '<div class="text-center text-sm text-gray-500 py-6">No events on this day.</div>';
        }

        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        if (!modal.dataset.wired) {
            modal.dataset.wired = '1';
            modal.addEventListener('click', (e) => {
                if (e.target.closest('[data-day-close]')) { closeDayModal(); }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeDayModal();
            });
        }
    }

    function wireCalendarClicks() {
        const mount = document.getElementById('evtCalendarMount');
        if (!mount || mount.dataset.calWired === '1') return;
        mount.dataset.calWired = '1';
        mount.addEventListener('click', (e) => {
            const nav = e.target.closest('[data-cal-nav]');
            if (nav) {
                e.preventDefault();
                const dir = nav.getAttribute('data-cal-nav');
                let calMonth = api().getCalMonth?.();
                if (dir === 'today') {
                    const now = new Date();
                    calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                } else if (calMonth) {
                    const delta = (dir === 'prev') ? -1 : 1;
                    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1);
                }
                api().setCalMonth?.(calMonth);
                renderCalendar();
                return;
            }
            const dayBtn = e.target.closest('[data-cal-day]');
            if (dayBtn) {
                e.preventDefault();
                openDayModal(dayBtn.getAttribute('data-cal-day'));
            }
        });
    }

    function renderCalendar() {
        const mount = document.getElementById('evtCalendarMount');
        if (!mount) return;

        const esc = (window.EventsHelpers && window.EventsHelpers.escapeHtml) || (s => String(s == null ? '' : s));
        let calMonth = api().getCalMonth?.();
        if (!calMonth) {
            const now = new Date();
            calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            api().setCalMonth?.(calMonth);
        }
        const year  = calMonth.getFullYear();
        const month = calMonth.getMonth();
        const first = new Date(year, month, 1);
        const last  = new Date(year, month + 1, 0);
        const leadBlank = first.getDay();
        const daysInMonth = last.getDate();
        const todayKey = localDateKey(new Date());

        const all = window.evtAllEvents || [];
        const byDay = groupEventsByDay(all);

        const parts = [];
        parts.push(
            '<div class="evt-cal-header flex items-center justify-between mb-3">' +
                '<div class="flex items-center gap-1">' +
                    '<button type="button" class="evt-cal-nav" data-cal-nav="prev" aria-label="Previous month">' +
                        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
                    '</button>' +
                    '<button type="button" class="evt-cal-nav" data-cal-nav="next" aria-label="Next month">' +
                        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
                    '</button>' +
                '</div>' +
                '<h3 class="evt-cal-title text-base font-semibold text-gray-900">' + MONTH_NAMES[month] + ' ' + year + '</h3>' +
                '<button type="button" class="evt-cal-today text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-md hover:bg-brand-50" data-cal-nav="today">Today</button>' +
            '</div>'
        );

        parts.push('<div class="evt-cal-weekdays grid grid-cols-7 gap-1 mb-1">');
        DAY_SHORT.forEach(d => {
            parts.push('<div class="text-center text-[11px] font-semibold tracking-wide text-gray-500 py-1">' + d + '</div>');
        });
        parts.push('</div>');

        parts.push('<div class="evt-cal-grid grid grid-cols-7 gap-1">');
        for (let i = 0; i < leadBlank; i++) {
            parts.push('<div class="evt-cal-cell evt-cal-cell--blank" aria-hidden="true"></div>');
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const key = localDateKey(dateObj);
            const dayEvents = byDay[key] || [];
            const count = dayEvents.length;
            const isToday = (key === todayKey);
            const hasEv = count > 0;

            let dots = '';
            if (hasEv) {
                const shown = dayEvents.slice(0, 3);
                dots = '<div class="evt-cal-dots">' +
                    shown.map(ev => {
                        const grad = (C.CATEGORY_GRADIENT && C.CATEGORY_GRADIENT[ev.category]) || C.DEFAULT_GRADIENT || 'linear-gradient(135deg,#6366f1,#8b5cf6)';
                        const m = /#([0-9a-f]{3,6})/i.exec(grad);
                        const color = m ? ('#' + m[1]) : '#6366f1';
                        return '<span class="evt-cal-dot" style="background:' + color + '"></span>';
                    }).join('') +
                    (count > 3 ? '<span class="evt-cal-dot-more">+' + (count - 3) + '</span>' : '') +
                '</div>';
            }

            const clsCell = 'evt-cal-cell' +
                (hasEv ? ' evt-cal-cell--has' : '') +
                (isToday ? ' evt-cal-cell--today' : '');

            parts.push(
                '<button type="button" class="' + clsCell + '" data-cal-day="' + key + '" ' +
                    (hasEv ? 'aria-label="' + count + ' event' + (count > 1 ? 's' : '') + ' on ' + esc(dateObj.toDateString()) + '"' : 'aria-label="' + esc(dateObj.toDateString()) + '"') +
                    (hasEv ? '' : ' aria-disabled="false"') +
                '>' +
                    '<span class="evt-cal-daynum">' + d + '</span>' +
                    dots +
                '</button>'
            );
        }
        parts.push('</div>');

        mount.innerHTML = parts.join('');
        wireCalendarClicks();
    }

    window.PortalEventsListCalendar = {
        renderCalendar,
        wireCalendarClicks,
        openDayModal,
        closeDayModal,
        groupEventsByDay,
        localDateKey,
    };
})();
