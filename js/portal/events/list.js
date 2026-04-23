/* ════════════════════════════════════════════════════════════
   Portal Events — List view  (events_003 A2 + A3 rewrite)

   • Editorial hero card per spec §4.3 LOCKED selection rule
   • Bucketed groups via H.groupByBucket (Today / This week /
     Later this month / Next month / Future)
   • Segmented control (Upcoming / Past / Going) + collapsed
     search + type-menu popover
   • Single scoped attendee query per spec §12.1 (no N+1)
   • Two-tier search per spec §4.4 LOCKED
   • Going rail + live banner CONTAINERS rendered (population
     deferred to Phase B)

   Surface namespace : window.PortalEvents.list
   Globals preserved : evtLoadEvents, evtRenderEvents,
                       evtRenderFeatured (no-op stub),
                       evtUpdateHeroStats (no-op stub),
                       evtSetupSearch, evtInitFilterChips,
                       evtRenderCard
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const H = window.EventsHelpers   || {};
    const P = window.EventsPills     || {};
    const Card = window.EventsCard;

    // ─── Local UI state ───────────────────────────────────
    let _searchQuery    = '';
    let _activeType     = 'all';
    let _activeCategory = '';   // C2 — tap-category-emoji-to-filter
    let _activeView     = 'list'; // D1 — 'list' | 'calendar'
    let _calMonth       = null;   // D1 — Date at first of viewed month
    let _searchDebounce = null;
    let _expandedBucket = null;   // E11 — slug of bucket the user "See all"-ed; null = normal
    let _createTileInjected = false; // F8 — ensures only one Create tile per render
    let _miniCalMonth = null;     // F10 — Date pointing to first day of displayed month
    let _activeDay = '';          // F10 — ISO yyyy-mm-dd filter from mini calendar click
    const E_BUCKET_TRUNCATE = 6;  // E11 — show "See all" link when bucket > N (vlift only)

    // C3 — sessionStorage persistence key (events_003 §3.11 / §8.5)
    const STATE_KEY = 'evt_list_state_v1';
    function _persistState() {
        try {
            sessionStorage.setItem(STATE_KEY, JSON.stringify({
                q:   _searchQuery,
                t:   _activeType,
                c:   _activeCategory,
                v:   _activeView,
                tab: window.evtActiveTab || 'upcoming',
            }));
        } catch (_) { /* quota / private mode — silent */ }
    }
    function _restoreState() {
        try {
            const raw = sessionStorage.getItem(STATE_KEY);
            if (!raw) return;
            const s = JSON.parse(raw) || {};
            if (typeof s.q === 'string') _searchQuery = s.q;
            if (typeof s.t === 'string') _activeType = s.t;
            if (typeof s.c === 'string') _activeCategory = s.c;
            if (typeof s.v === 'string' && (s.v === 'list' || s.v === 'calendar')) _activeView = s.v;
            if (typeof s.tab === 'string' && ['upcoming','past','going','saved'].includes(s.tab)) {
                window.evtActiveTab = s.tab;
            }
        } catch (_) { /* corrupt payload — ignore */ }
    }
    // Restore immediately at IIFE load so downstream init reads correct values
    _restoreState();

    // =========================================================
    // D3 — Search history & suggestions (events_004 §D3)
    // =========================================================
    const SEARCH_HIST_KEY = 'evt_search_hist_v1';
    const SEARCH_HIST_MAX = 8;
    const SEARCH_HIST_SHOW = 5;
    const QUICK_CATS = ['cookout', 'birthday', 'trip', 'party'];

    function _readHistory() {
        try {
            const raw = sessionStorage.getItem(SEARCH_HIST_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
        } catch (_) { return []; }
    }
    function _writeHistory(arr) {
        try { sessionStorage.setItem(SEARCH_HIST_KEY, JSON.stringify(arr.slice(0, SEARCH_HIST_MAX))); }
        catch (_) { /* quota / private */ }
    }
    function _pushHistory(q) {
        const s = (q || '').trim();
        if (s.length < 2) return;
        const lc = s.toLowerCase();
        const list = _readHistory().filter(x => x.toLowerCase() !== lc);
        list.unshift(s);
        _writeHistory(list);
    }
    function _removeHistory(q) {
        const lc = (q || '').toLowerCase();
        _writeHistory(_readHistory().filter(x => x.toLowerCase() !== lc));
    }
    function _clearHistory() { try { sessionStorage.removeItem(SEARCH_HIST_KEY); } catch (_) {} }

    function _escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function _renderSearchSuggest() {
        const expand = document.getElementById('evtSearchExpand');
        const input  = document.getElementById('evtSearchInput');
        if (!expand || !input) return;
        if (expand.classList.contains('hidden')) { _hideSearchSuggest(); return; }
        if ((input.value || '').trim() !== '') { _hideSearchSuggest(); return; }

        let host = document.getElementById('evtSearchSuggest');
        if (!host) {
            host = document.createElement('div');
            host.id = 'evtSearchSuggest';
            host.className = 'evt-search-suggest absolute left-0 right-0 mt-2 top-full rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden z-40';
            host.setAttribute('role', 'listbox');
            expand.appendChild(host);
        }

        const hist = _readHistory().slice(0, SEARCH_HIST_SHOW);
        const parts = [];

        if (hist.length) {
            parts.push('<div class="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-gray-500">Recent</div>');
            parts.push('<ul>');
            hist.forEach(q => {
                const qa = _escapeAttr(q);
                parts.push(
                    '<li class="evt-suggest-row flex items-center gap-2 px-3 py-2 hover:bg-brand-50 cursor-pointer" data-suggest-q="' + qa + '" role="option">' +
                        '<span class="text-gray-400" aria-hidden="true">🕐</span>' +
                        '<span class="flex-1 min-w-0 truncate text-sm text-gray-800">' + qa + '</span>' +
                        '<button type="button" class="evt-suggest-remove p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" data-suggest-rm="' + qa + '" aria-label="Remove from history" title="Remove">' +
                            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
                        '</button>' +
                    '</li>'
                );
            });
            parts.push(
                '<li class="evt-suggest-clear flex items-center gap-2 px-3 py-2 border-t border-gray-100 hover:bg-gray-50 cursor-pointer text-xs text-gray-500" data-suggest-clear="1" role="option">' +
                    '<span aria-hidden="true">🗑</span><span>Clear search history</span>' +
                '</li>'
            );
            parts.push('</ul>');
        }

        parts.push('<div class="px-3 ' + (hist.length ? 'pt-3' : 'pt-2') + ' pb-1 text-[11px] uppercase tracking-wide text-gray-500">Quick categories</div>');
        parts.push('<div class="evt-suggest-chip-row flex flex-wrap gap-2 px-3 pb-3">');
        QUICK_CATS.forEach(cat => {
            const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[cat]) || '📅';
            const label = (C.CATEGORY_TAG && C.CATEGORY_TAG[cat]?.label) || cat;
            parts.push(
                '<button type="button" class="evt-suggest-chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-brand-50 border border-gray-200 text-sm text-gray-700" data-suggest-cat="' + cat + '">' +
                    '<span aria-hidden="true">' + emoji + '</span><span>' + label + '</span>' +
                '</button>'
            );
        });
        parts.push('</div>');

        host.innerHTML = parts.join('');
    }
    function _hideSearchSuggest() {
        const host = document.getElementById('evtSearchSuggest');
        if (host) host.innerHTML = '';
    }
    function _wireSuggestClicks() {
        const expand = document.getElementById('evtSearchExpand');
        if (!expand || expand.dataset.suggestWired === '1') return;
        expand.dataset.suggestWired = '1';
        expand.addEventListener('click', (e) => {
            const rm = e.target.closest('[data-suggest-rm]');
            if (rm) {
                e.preventDefault(); e.stopPropagation();
                _removeHistory(rm.getAttribute('data-suggest-rm'));
                _renderSearchSuggest();
                return;
            }
            const clr = e.target.closest('[data-suggest-clear]');
            if (clr) {
                e.preventDefault(); e.stopPropagation();
                _clearHistory();
                _renderSearchSuggest();
                return;
            }
            const row = e.target.closest('[data-suggest-q]');
            if (row) {
                e.preventDefault(); e.stopPropagation();
                const q = row.getAttribute('data-suggest-q') || '';
                const input = document.getElementById('evtSearchInput');
                const clear = document.getElementById('evtSearchClear');
                if (input) { input.value = q; clear?.classList.toggle('hidden', !q); }
                _searchQuery = q;
                _pushHistory(q);
                _persistState();
                _hideSearchSuggest();
                renderEvents();
                return;
            }
            const chip = e.target.closest('[data-suggest-cat]');
            if (chip) {
                e.preventDefault(); e.stopPropagation();
                const cat = chip.getAttribute('data-suggest-cat') || '';
                _activeCategory = (_activeCategory === cat) ? '' : cat;
                _persistState();
                _hideSearchSuggest();
                renderEvents();
            }
        });
        // Outside-click closes suggest but leaves pill open
        document.addEventListener('click', (e) => {
            const host = document.getElementById('evtSearchSuggest');
            if (!host || !host.innerHTML) return;
            if (expand.contains(e.target) || document.getElementById('evtSearchToggle')?.contains(e.target)) return;
            _hideSearchSuggest();
        });
    }

    // =========================================================
    // D1 — Calendar / agenda view toggle (events_004 §D1)
    // =========================================================
    const MONTH_NAMES = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
    const DAY_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    function _localDateKey(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function _groupEventsByDay(events) {
        const map = {};
        events.forEach(ev => {
            if (!ev || !ev.start_date || ev.status === 'cancelled') return;
            if (!_notHidden(ev)) return;
            if (!_matchesType(ev)) return;
            if (!_matchesCategory(ev)) return;
            const k = _localDateKey(new Date(ev.start_date));
            (map[k] = map[k] || []).push(ev);
        });
        // Sort each day's events by start time
        Object.keys(map).forEach(k => {
            map[k].sort((a,b) => new Date(a.start_date) - new Date(b.start_date));
        });
        return map;
    }

    function _renderCalendar() {
        const mount = document.getElementById('evtCalendarMount');
        if (!mount) return;

        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        if (!_calMonth) {
            const now = new Date();
            _calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        const year  = _calMonth.getFullYear();
        const month = _calMonth.getMonth();
        const first = new Date(year, month, 1);
        const last  = new Date(year, month + 1, 0);
        const leadBlank = first.getDay();           // 0..6 (Sun..Sat)
        const daysInMonth = last.getDate();
        const todayKey = _localDateKey(new Date());

        const all = window.evtAllEvents || [];
        const byDay = _groupEventsByDay(all);

        const parts = [];
        // Header: prev / title / next / today
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

        // Weekday labels
        parts.push('<div class="evt-cal-weekdays grid grid-cols-7 gap-1 mb-1">');
        DAY_SHORT.forEach(d => {
            parts.push('<div class="text-center text-[11px] font-semibold tracking-wide text-gray-500 py-1">' + d + '</div>');
        });
        parts.push('</div>');

        // Grid
        parts.push('<div class="evt-cal-grid grid grid-cols-7 gap-1">');
        for (let i = 0; i < leadBlank; i++) {
            parts.push('<div class="evt-cal-cell evt-cal-cell--blank" aria-hidden="true"></div>');
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const key = _localDateKey(dateObj);
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
                        // Extract first color for solid dot
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
        _wireCalendarClicks();
    }

    function _wireCalendarClicks() {
        const mount = document.getElementById('evtCalendarMount');
        if (!mount || mount.dataset.calWired === '1') return;
        mount.dataset.calWired = '1';
        mount.addEventListener('click', (e) => {
            const nav = e.target.closest('[data-cal-nav]');
            if (nav) {
                e.preventDefault();
                const dir = nav.getAttribute('data-cal-nav');
                if (dir === 'today') {
                    const now = new Date();
                    _calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                } else if (_calMonth) {
                    const delta = (dir === 'prev') ? -1 : 1;
                    _calMonth = new Date(_calMonth.getFullYear(), _calMonth.getMonth() + delta, 1);
                }
                _renderCalendar();
                return;
            }
            const dayBtn = e.target.closest('[data-cal-day]');
            if (dayBtn) {
                e.preventDefault();
                _openDayModal(dayBtn.getAttribute('data-cal-day'));
            }
        });
    }

    function _openDayModal(dateKey) {
        const modal = document.getElementById('evtDayModal');
        const title = document.getElementById('evtDayModalTitle');
        const body  = document.getElementById('evtDayModalBody');
        if (!modal || !title || !body) return;

        const all = window.evtAllEvents || [];
        const attendees = window.evtAttendees || {};
        const byDay = _groupEventsByDay(all);
        const items = byDay[dateKey] || [];

        const [y, m, d] = dateKey.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        title.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        if (!items.length) {
            body.innerHTML = '<div class="text-center text-sm text-gray-500 py-6">No events on this day.</div>';
        } else {
            // Reuse existing _miniCard for consistent rendering
            body.innerHTML = '<div class="flex flex-col gap-2">' +
                items.map(ev => _miniCard(ev, attendees[ev.id] || [])
                    .replace('snap-start shrink-0 w-[76%] sm:w-64', 'w-full')
                ).join('') +
            '</div>';
        }

        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        if (!modal.dataset.wired) {
            modal.dataset.wired = '1';
            modal.addEventListener('click', (e) => {
                if (e.target.closest('[data-day-close]')) { _closeDayModal(); }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !modal.classList.contains('hidden')) _closeDayModal();
            });
        }
    }
    function _closeDayModal() {
        const modal = document.getElementById('evtDayModal');
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    function _initViewToggle() {
        const btn = document.getElementById('evtViewToggle');
        if (!btn || btn.dataset.wired === '1') return;
        btn.dataset.wired = '1';
        btn.addEventListener('click', () => {
            _activeView = (_activeView === 'calendar') ? 'list' : 'calendar';
            _persistState();
            _applyViewChrome();
            renderEvents();
        });
    }

    function _applyViewChrome() {
        const btn = document.getElementById('evtViewToggle');
        const listIcon = btn?.querySelector('.evt-view-icon--list');
        const calIcon  = btn?.querySelector('.evt-view-icon--calendar');
        if (btn) {
            btn.setAttribute('aria-pressed', _activeView === 'calendar' ? 'true' : 'false');
            btn.setAttribute('data-view', _activeView);
            btn.setAttribute('aria-label', _activeView === 'calendar' ? 'Switch to list view' : 'Switch to calendar view');
        }
        // When in calendar view, show the calendar icon label (indicates what clicking does — NO, show list icon so user knows they'll return to list)
        // UX: show the icon of the *other* view, i.e. what you'll switch to.
        if (listIcon && calIcon) {
            listIcon.classList.toggle('hidden', _activeView === 'list');       // show list icon when in calendar (to return)
            calIcon.classList.toggle('hidden', _activeView === 'calendar');    // show calendar icon when in list (to go to cal)
        }
        document.body.classList.toggle('evt-view--calendar', _activeView === 'calendar');
    }

    // =========================================================
    // E1/E4/E9 — Phase E premium visual lift (flagged via ?vlift=1
    // or localStorage('evt_vlift'='1')). Items shipped:
    //   E1  Gradient editorial header
    //   E4  Emoji-tagged bucket labels
    //   E9  Header fade-in motion polish (reduced-motion respected)
    // Toggle is sticky once enabled via query string.
    // =========================================================
    const VLIFT_KEY = 'evt_vlift';
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
    function _bucketLabelEmoji(label) {
        if (!label) return '';
        const l = String(label).toLowerCase().trim();
        if (/^results for/i.test(label)) return '🔎 ' + label;
        const e = E_BUCKET_EMOJI[l];
        return e ? (e + ' ' + label) : label;
    }
    function _readVlift() {
        // Default ON. Opt-out via ?vlift=0 (sticky in localStorage as '0').
        try {
            const url = new URL(window.location.href);
            const q = url.searchParams.get('vlift');
            if (q === '1') {
                try { localStorage.setItem(VLIFT_KEY, '1'); } catch (_) {}
                return true;
            }
            if (q === '0') {
                try { localStorage.setItem(VLIFT_KEY, '0'); } catch (_) {}
                return false;
            }
            const stored = (() => { try { return localStorage.getItem(VLIFT_KEY); } catch (_) { return null; } })();
            if (stored === '0') return false;     // explicit opt-out persists
            return true;                           // default ON
        } catch (_) { return true; }
    }
    function _initVlift() {
        const on = _readVlift();
        try {
            document.body.classList.toggle('evt-vlift', on);
            if (on) document.documentElement.dataset.vlift = '1';
            else delete document.documentElement.dataset.vlift;
        } catch (_) {}
        try { window.evtSetVlift = function (v) {
            try { localStorage.setItem(VLIFT_KEY, v ? '1' : '0'); } catch (_) {}
            document.body.classList.toggle('evt-vlift', !!v);
        }; } catch (_) {}
        try { window.evtIsVlift = function () { return document.body.classList.contains('evt-vlift'); }; } catch (_) {}
    }

    // =========================================================
    // F1 — Greeting hydration (vlift only)
    // Reads first name from the global nav (#navName, hydrated by
    // layout.js → loadNavProfile after auth). Falls back to "there".
    // =========================================================
    function _initGreeting() {
        if (!document.body.classList.contains('evt-vlift')) return;
        const slot = document.querySelector('#evtGreetingHello [data-greeting-name]');
        if (!slot) return;
        const apply = () => {
            const fromState = (window.evtCurrentUserName || '').trim();
            if (fromState) { slot.textContent = fromState; return true; }
            const navEl = document.getElementById('navName');
            const name = (navEl && navEl.textContent || '').trim();
            if (name) { slot.textContent = name; return true; }
            return false;
        };
        if (apply()) return;
        // Poll briefly (nav mounts async via pageShell + loadNavProfile)
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            if (apply() || tries > 20) clearInterval(t);
        }, 300);
    }

    // =========================================================
    // D2 — Swipe gestures + long-press context sheet (events_004 §D2)
    // Mobile-only. Touch-only. Reduced-motion respected.
    // =========================================================
    const _hiddenIds = new Set();   // session-only hide list
    const SWIPE_THRESHOLD = 56;     // px to commit reveal
    const SWIPE_MAX       = 120;    // px max drag
    const LONGPRESS_MS    = 500;
    const LONGPRESS_MOVE  = 8;      // px tolerance before cancelling long-press
    let _activeSwipe = null;        // { card, startX, startY, dx, locked }
    let _longPressTimer = null;
    let _longPressFired = false;

    function _isMobileTouch() {
        return ('ontouchstart' in window) && window.innerWidth < 640;
    }
    function _prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // Filter helper used by going-rail render to drop session-hidden ids.
    function _notHidden(ev) { return !_hiddenIds.has(ev?.id); }

    function _resetSwipeCard(card) {
        if (!card) return;
        card.classList.remove('evt-swipe--revealed', 'evt-swipe--dragging');
        card.style.transform = '';
        const action = card.querySelector('.evt-swipe-action');
        if (action) action.style.opacity = '';
    }

    function _ensureSwipeAction(card, eventId) {
        let action = card.querySelector('.evt-swipe-action');
        if (action) return action;
        action = document.createElement('button');
        action.type = 'button';
        action.className = 'evt-swipe-action';
        action.setAttribute('data-swipe-cancel', eventId);
        action.setAttribute('aria-label', 'Cancel RSVP');
        action.innerHTML =
            '<span class="evt-swipe-action__icon" aria-hidden="true">' +
                '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
            '</span>' +
            '<span class="evt-swipe-action__label">Cancel</span>';
        // Wrap card content so we can translate it independently
        card.classList.add('evt-swipe-host');
        card.appendChild(action);
        return action;
    }

    function _initSwipeGestures() {
        if (!_isMobileTouch()) return;

        // ── Swipe-left on going-rail mini cards ─────────────
        const rail = document.getElementById('evtGoingRailScroll');
        if (rail && rail.dataset.swipeWired !== '1') {
            rail.dataset.swipeWired = '1';
            rail.addEventListener('touchstart', (e) => {
                const card = e.target.closest('a[data-evt-mini]');
                if (!card) return;
                // Reset any other revealed card
                rail.querySelectorAll('.evt-swipe--revealed').forEach(c => { if (c !== card) _resetSwipeCard(c); });
                const t = e.touches[0];
                _activeSwipe = { card, startX: t.clientX, startY: t.clientY, dx: 0, locked: null };
                _ensureSwipeAction(card, card.getAttribute('data-evt-mini') || '');
            }, { passive: true });

            rail.addEventListener('touchmove', (e) => {
                if (!_activeSwipe) return;
                const t = e.touches[0];
                const dx = t.clientX - _activeSwipe.startX;
                const dy = t.clientY - _activeSwipe.startY;
                if (_activeSwipe.locked === null) {
                    // Lock axis after small movement; vertical scroll wins by default
                    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                    _activeSwipe.locked = (Math.abs(dx) > Math.abs(dy)) ? 'x' : 'y';
                    if (_activeSwipe.locked === 'x') _activeSwipe.card.classList.add('evt-swipe--dragging');
                }
                if (_activeSwipe.locked !== 'x') return;
                // Only allow leftward drag
                const clamped = Math.max(-SWIPE_MAX, Math.min(0, dx));
                _activeSwipe.dx = clamped;
                _activeSwipe.card.style.transform = 'translateX(' + clamped + 'px)';
                const action = _activeSwipe.card.querySelector('.evt-swipe-action');
                if (action) action.style.opacity = String(Math.min(1, Math.abs(clamped) / SWIPE_THRESHOLD));
            }, { passive: true });

            const finish = () => {
                if (!_activeSwipe) return;
                const { card, dx, locked } = _activeSwipe;
                _activeSwipe = null;
                if (locked !== 'x') { _resetSwipeCard(card); return; }
                if (Math.abs(dx) >= SWIPE_THRESHOLD) {
                    card.classList.remove('evt-swipe--dragging');
                    card.classList.add('evt-swipe--revealed');
                    card.style.transform = '';   // CSS class drives final position
                    const action = card.querySelector('.evt-swipe-action');
                    if (action) action.style.opacity = '1';
                } else {
                    _resetSwipeCard(card);
                }
            };
            rail.addEventListener('touchend', finish, { passive: true });
            rail.addEventListener('touchcancel', finish, { passive: true });

            // Tap on revealed action → confirm cancel; tap on revealed card → reset
            rail.addEventListener('click', (e) => {
                const cancelBtn = e.target.closest('[data-swipe-cancel]');
                if (cancelBtn) {
                    e.preventDefault(); e.stopPropagation();
                    const id = cancelBtn.getAttribute('data-swipe-cancel') || '';
                    _confirmCancelRsvp(id);
                    return;
                }
                const revealed = e.target.closest('.evt-swipe--revealed');
                if (revealed) {
                    e.preventDefault(); e.stopPropagation();
                    _resetSwipeCard(revealed);
                }
            });
        }

        // ── Long-press on any list card → context sheet ────
        const groups = document.getElementById('evtGroups');
        if (groups && groups.dataset.lpWired !== '1') {
            groups.dataset.lpWired = '1';
            const cancelLp = () => {
                if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
            };
            groups.addEventListener('touchstart', (e) => {
                const card = e.target.closest('a[data-evt-card], a[data-evt-mini], a[data-evt-hero]');
                if (!card) return;
                _longPressFired = false;
                const t = e.touches[0];
                const startX = t.clientX, startY = t.clientY;
                cancelLp();
                _longPressTimer = setTimeout(() => {
                    _longPressFired = true;
                    const id = card.getAttribute('data-evt-card') || card.getAttribute('data-evt-mini') || card.getAttribute('data-evt-hero') || '';
                    _openContextSheet(id);
                }, LONGPRESS_MS);
                const moveHandler = (mv) => {
                    const m = mv.touches[0];
                    if (Math.abs(m.clientX - startX) > LONGPRESS_MOVE || Math.abs(m.clientY - startY) > LONGPRESS_MOVE) cancelLp();
                };
                const endHandler = () => {
                    cancelLp();
                    groups.removeEventListener('touchmove', moveHandler);
                    groups.removeEventListener('touchend', endHandler);
                    groups.removeEventListener('touchcancel', endHandler);
                };
                groups.addEventListener('touchmove', moveHandler, { passive: true });
                groups.addEventListener('touchend', endHandler, { passive: true });
                groups.addEventListener('touchcancel', endHandler, { passive: true });
            }, { passive: true });

            // Suppress nav click immediately after a long-press fires
            groups.addEventListener('click', (e) => {
                if (_longPressFired) {
                    _longPressFired = false;
                    e.preventDefault(); e.stopPropagation();
                }
            }, true);
        }
    }

    async function _confirmCancelRsvp(eventId) {
        if (!eventId) return;
        const all = window.evtAllEvents || [];
        const ev  = all.find(x => x.id === eventId);
        const title = (ev && ev.title) ? ev.title : 'this event';
        if (!window.confirm('Cancel your RSVP for "' + title + '"?')) return;
        try {
            if (typeof window.evtHandleRsvp === 'function') {
                // evtHandleRsvp toggles off when called with the existing status
                await window.evtHandleRsvp(eventId, 'going');
            }
        } catch (err) {
            console.error('Cancel RSVP failed', err);
        }
    }

    // =========================================================
    // D2 — Context sheet (long-press menu)
    // =========================================================
    function _ensureContextSheet() {
        let sheet = document.getElementById('evtContextSheet');
        if (sheet) return sheet;
        sheet = document.createElement('div');
        sheet.id = 'evtContextSheet';
        sheet.className = 'evt-context-sheet hidden fixed inset-0 z-[75]';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.innerHTML =
            '<div class="absolute inset-0 bg-black/40" data-ctx-close="1"></div>' +
            '<div class="evt-context-sheet__panel absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:max-w-sm sm:h-fit sm:rounded-2xl bg-white rounded-t-2xl shadow-2xl overflow-hidden">' +
                '<div class="px-4 pt-3 pb-2 border-b border-gray-100">' +
                    '<h3 id="evtContextTitle" class="text-sm font-semibold text-gray-900 truncate"></h3>' +
                '</div>' +
                '<ul class="py-1">' +
                    '<li><button type="button" data-ctx-act="share"   class="evt-context-row"><span aria-hidden="true">🔗</span><span>Share link</span></button></li>' +
                    '<li><button type="button" data-ctx-act="copy"    class="evt-context-row"><span aria-hidden="true">📋</span><span>Copy link</span></button></li>' +
                    '<li><button type="button" data-ctx-act="ics"     class="evt-context-row"><span aria-hidden="true">📅</span><span>Add to calendar</span></button></li>' +
                    '<li><button type="button" data-ctx-act="hide"    class="evt-context-row evt-context-row--danger"><span aria-hidden="true">🙈</span><span>Hide from list</span></button></li>' +
                    '<li class="border-t border-gray-100 mt-1"><button type="button" data-ctx-close="1" class="evt-context-row evt-context-row--cancel"><span>Cancel</span></button></li>' +
                '</ul>' +
            '</div>';
        document.body.appendChild(sheet);
        sheet.addEventListener('click', (e) => {
            if (e.target.closest('[data-ctx-close]')) { _closeContextSheet(); return; }
            const row = e.target.closest('[data-ctx-act]');
            if (!row) return;
            const act = row.getAttribute('data-ctx-act');
            const id  = sheet.dataset.eventId || '';
            _runContextAction(act, id);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !sheet.classList.contains('hidden')) _closeContextSheet();
        });
        return sheet;
    }

    function _openContextSheet(eventId) {
        if (!eventId) return;
        const all = window.evtAllEvents || [];
        const ev  = all.find(x => x.id === eventId);
        if (!ev) return;
        const sheet = _ensureContextSheet();
        sheet.dataset.eventId = eventId;
        const title = sheet.querySelector('#evtContextTitle');
        if (title) title.textContent = ev.title || 'Event';
        sheet.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }
    function _closeContextSheet() {
        const sheet = document.getElementById('evtContextSheet');
        if (!sheet) return;
        sheet.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    async function _runContextAction(act, eventId) {
        const all = window.evtAllEvents || [];
        const ev  = all.find(x => x.id === eventId);
        if (!ev) { _closeContextSheet(); return; }
        const url = _eventShareUrl(ev);

        if (act === 'share') {
            try {
                if (navigator.share) {
                    await navigator.share({ title: ev.title || 'Event', url });
                } else {
                    await _copyToClipboard(url);
                    _toast('Link copied');
                }
            } catch (_) { /* user dismissed */ }
            _closeContextSheet();
            return;
        }
        if (act === 'copy') {
            await _copyToClipboard(url);
            _toast('Link copied');
            _closeContextSheet();
            return;
        }
        if (act === 'ics') {
            _downloadIcs(ev);
            _closeContextSheet();
            return;
        }
        if (act === 'hide') {
            _hiddenIds.add(eventId);
            _toast('Hidden for this session');
            _closeContextSheet();
            renderEvents();
            return;
        }
    }

    function _eventShareUrl(ev) {
        const origin = location.origin;
        const base = origin + (location.pathname.includes('/portal/') ? location.pathname.split('?')[0] : '/portal/events.html');
        return ev.slug ? (base + '?event=' + encodeURIComponent(ev.slug)) : base;
    }

    async function _copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_) { /* fall through */ }
        try {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return true;
        } catch (_) { return false; }
    }

    function _toast(msg) {
        let t = document.getElementById('evtToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'evtToast';
            t.className = 'evt-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('evt-toast--show');
        clearTimeout(t._hideT);
        t._hideT = setTimeout(() => t.classList.remove('evt-toast--show'), 1800);
    }

    function _icsDate(d) {
        const pad = n => String(n).padStart(2, '0');
        return d.getUTCFullYear()
            + pad(d.getUTCMonth() + 1)
            + pad(d.getUTCDate()) + 'T'
            + pad(d.getUTCHours())
            + pad(d.getUTCMinutes())
            + pad(d.getUTCSeconds()) + 'Z';
    }
    function _icsEscape(s) {
        return String(s == null ? '' : s)
            .replace(/\\/g, '\\\\')
            .replace(/\r?\n/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;');
    }
    function _downloadIcs(ev) {
        const start = new Date(ev.start_date);
        const endRaw = ev.end_date || ev.end_at || ev.ends_at;
        const end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
        const uid = (ev.id || ('evt-' + Date.now())) + '@justicemcneal';
        const url = _eventShareUrl(ev);
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//JusticeMcNeal//Portal Events//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            'UID:' + uid,
            'DTSTAMP:' + _icsDate(new Date()),
            'DTSTART:' + _icsDate(start),
            'DTEND:'   + _icsDate(end),
            'SUMMARY:' + _icsEscape(ev.title || 'Event'),
            'DESCRIPTION:' + _icsEscape((ev.description || '') + '\n\n' + url),
            'URL:' + _icsEscape(url),
        ];
        if (ev.location_text || ev.location_nickname) {
            lines.push('LOCATION:' + _icsEscape(ev.location_text || ev.location_nickname));
        }
        lines.push('END:VEVENT', 'END:VCALENDAR');
        const ics = lines.join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const a = document.createElement('a');
        const slug = ev.slug || ev.id || 'event';
        a.href = URL.createObjectURL(blob);
        a.download = slug + '.ics';
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }

    // E3 — Sync chip rail active state to the given type.
    function _syncTypeChips(type) {
        const t = type || 'all';
        document.querySelectorAll('#evtTypeChips .evt-type-chip').forEach(c => {
            const on = (c.dataset.type || 'all') === t;
            c.classList.toggle('evt-type-chip--active', on);
            c.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }

    // C3 — Sync restored state into the UI chrome (input, segmented control,
    // type menu button, search-expand panel). Called after DOM is ready.
    function _applyRestoredUi() {
        // Lifecycle segmented control
        const tab = window.evtActiveTab || 'upcoming';
        document.querySelectorAll('#evtLifecycleSeg .evt-seg__btn').forEach(b => {
            const on = b.dataset.filter === tab;
            b.classList.toggle('evt-seg__btn--active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        // Type menu
        const menuBtn = document.getElementById('evtTypeMenuBtn');
        if (menuBtn) {
            menuBtn.dataset.type = _activeType;
            const opt = document.querySelector('#evtTypeMenu .evt-type-opt[data-type="' + _activeType + '"]');
            if (opt) {
                const label = opt.textContent.replace(/\s+events?$/i, '').trim();
                const labelEl = menuBtn.querySelector('[data-type-label]');
                if (labelEl) labelEl.textContent = label;
                document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
                    o.classList.toggle('evt-type-opt--active', o === opt)
                );
            }
            const sel = document.getElementById('typeFilter');
            if (sel) sel.value = _activeType;
        }
        // E3 — sync chip rail to restored type
        _syncTypeChips(_activeType);
        // Search input (only expand if there's a restored query)
        if (_searchQuery) {
            const input  = document.getElementById('evtSearchInput');
            const clear  = document.getElementById('evtSearchClear');
            const expand = document.getElementById('evtSearchExpand');
            const toggle = document.getElementById('evtSearchToggle');
            if (input) input.value = _searchQuery;
            if (clear) clear.classList.remove('hidden');
            if (expand) expand.classList.remove('hidden');
            if (toggle) toggle.setAttribute('aria-expanded', 'true');
        }
        // D1 — View toggle chrome
        _applyViewChrome();
    }

    // =========================================================
    // Data loading
    // =========================================================
    async function loadEvents() {
        try {
            const { data: events, error } = await supabaseClient
                .from('events')
                .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
                .in('status', ['open', 'confirmed', 'active', 'completed'])
                .order('start_date', { ascending: true });

            if (error) throw error;
            window.evtAllEvents = events || [];

            // Drafts (admin-created, only visible to creator)
            if (window.evtCurrentUserRole === 'admin' && window.evtCurrentUser) {
                const { data: drafts } = await supabaseClient
                    .from('events')
                    .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
                    .eq('status', 'draft')
                    .eq('created_by', window.evtCurrentUser.id)
                    .order('created_at', { ascending: false });
                if (drafts && drafts.length) {
                    window.evtAllEvents = [...drafts, ...window.evtAllEvents];
                }
            }

            const ids = window.evtAllEvents.map(e => e.id);

            // User's own RSVPs
            window.evtAllRsvps = {};
            if (window.evtCurrentUser && ids.length) {
                const { data: rsvps } = await supabaseClient
                    .from('event_rsvps')
                    .select('*')
                    .eq('user_id', window.evtCurrentUser.id)
                    .in('event_id', ids);
                (rsvps || []).forEach(r => { window.evtAllRsvps[r.event_id] = r; });
            }

            // Scoped attendee query (events_003 §12.1 LOCKED)
            // ONE query — filtered by event_id IN currentIds + status='going'
            // Cap 5 / event client-side. Never N+1.
            window.evtAttendees = {};
            if (ids.length) {
                const { data: going, error: aErr } = await supabaseClient
                    .from('event_rsvps')
                    .select('event_id, profiles:user_id(profile_picture_url, first_name)')
                    .eq('status', 'going')
                    .in('event_id', ids);
                if (!aErr && going) {
                    going.forEach(row => {
                        if (!row.profiles) return;
                        const list = (window.evtAttendees[row.event_id] ||= []);
                        if (list.length < 5) list.push(row.profiles);
                    });
                }
            }

            renderEvents();
        } catch (err) {
            console.error('Failed to load events:', err);
            const groups = document.getElementById('evtGroups');
            if (groups) {
                groups.innerHTML = '<p class="text-sm text-red-500 text-center py-8">Failed to load events. Please refresh.</p>';
            }
        }
    }

    // =========================================================
    // Skeletons
    // =========================================================
    function renderSkeletons() {
        const groups = document.getElementById('evtGroups');
        if (!groups || !Card) return;
        let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">';
        for (let i = 0; i < 4; i++) html += Card.skeleton();
        html += '</div>';
        groups.innerHTML = html;
    }

    // =========================================================
    // Header count + personalized greeting (events_003 §8.1 / B5)
    // =========================================================
    function _renderHeaderCount() {
        const el = document.getElementById('evtHeaderCount');
        if (!el) return;
        const all = window.evtAllEvents || [];
        const rsvps = window.evtAllRsvps || {};
        const now = new Date();
        const upcoming = all.filter(e =>
            e.status !== 'cancelled' && e.status !== 'draft' &&
            new Date(e.start_date) >= now
        ).length;
        const going = Object.values(rsvps).filter(r => r.status === 'going').length;
        const parts = [];
        if (going) parts.push(going + ' going');
        parts.push(upcoming + ' upcoming');
        el.textContent = parts.join(' · ');

        _renderHeaderGreeting();
    }

    function _renderHeaderGreeting() {
        const title = document.getElementById('evtHeaderTitle');
        if (!title) return;
        const name = (window.evtCurrentUserName || '').trim();
        // F1 — when vlift is on, F1 greeting supersedes B5 "Hey {name} 👋"
        if (document.body.classList.contains('evt-vlift')) {
            const old = document.getElementById('evtHeaderGreeting');
            if (old) old.remove();
            // Also refresh F1 greeting slot with the latest name
            const slot = document.querySelector('#evtGreetingHello [data-greeting-name]');
            if (slot && name) slot.textContent = name;
            return;
        }
        let g = document.getElementById('evtHeaderGreeting');
        if (!name) { if (g) g.remove(); return; }
        if (!g) {
            g = document.createElement('small');
            g.id = 'evtHeaderGreeting';
            g.className = 'evt-header-greeting block text-xs text-gray-400 mb-1';
            title.parentNode.insertBefore(g, title);
        }
        const esc = (H.escapeHtml || (s => String(s == null ? '' : s)));
        g.textContent = 'Hey ' + esc(name) + ' 👋';
    }

    // E7 — "Interested" / Going avatar cluster (vlift hero overlay).
    // Uses up-to-5 profile records already cached in window.evtAttendees[id]
    // (scoped query in §12.1 LOCKED — no new query). Returns '' if empty.
    function _attendeeCluster(eventId) {
        const list = (window.evtAttendees && window.evtAttendees[eventId]) || [];
        if (!list.length) return '';
        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        const bubs = list.slice(0, 5).map((p, i) => {
            const pic = p && p.profile_picture_url;
            const first = (p && p.first_name) || '';
            const initial = (first.trim().charAt(0) || '?').toUpperCase();
            const ml = i === 0 ? '' : ' -ml-2';
            const inner = pic
                ? '<img src="' + esc(pic) + '" alt="" loading="lazy" class="w-full h-full object-cover" />'
                : '<span class="evt-hero-cluster-init">' + esc(initial) + '</span>';
            return '<span class="evt-hero-cluster-bub' + ml + '" title="' + esc(first) + '">' + inner + '</span>';
        }).join('');
        // We capped attendees client-side at 5; if at the cap, hint there may be more.
        const labelN = list.length >= 5 ? '5+' : String(list.length);
        return '<button type="button" data-evt-hero-going="' + esc(eventId) + '"' +
            ' class="evt-hero-cluster" aria-label="See who is going">' +
                '<span class="evt-hero-cluster-stack">' + bubs + '</span>' +
                '<span class="evt-hero-cluster-label">' + labelN + ' going</span>' +
            '</button>';
    }

    // E10 — In-header notification bell (vlift only). Mirrors unread state from
    // the global #notifBadge and forwards clicks to the global #notifBtn.
    let _evtBellObserver = null;
    function _initHeaderBell() {
        if (!document.body.classList.contains('evt-vlift')) return;
        const header = document.getElementById('evtPageHeader');
        if (!header) return;
        // Only render if the global notifications module is present
        const globalBtn = document.getElementById('notifBtn');
        if (!globalBtn) return;
        if (document.getElementById('evtHeaderBell')) return; // idempotent

        const wrap = header.querySelector('.flex.items-end.justify-between') || header.firstElementChild;
        if (!wrap) return;

        const bell = document.createElement('button');
        bell.id = 'evtHeaderBell';
        bell.type = 'button';
        bell.setAttribute('aria-label', 'Notifications');
        bell.className = 'evt-header-bell relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-white/90 hover:text-white shrink-0';
        bell.innerHTML =
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.17V11a6 6 0 10-12 0v3.17a2 2 0 01-.6 1.43L4 17h5m6 0a3 3 0 11-6 0"/>' +
            '</svg>' +
            '<span id="evtHeaderBellDot" class="evt-header-bell-dot hidden" aria-hidden="true"></span>';

        bell.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const target = document.getElementById('notifBtn');
            if (target) target.click();
        });

        // Insert before the Create button (or as last child of wrap)
        const createBtn = wrap.querySelector('#createEventBtn');
        if (createBtn) wrap.insertBefore(bell, createBtn);
        else wrap.appendChild(bell);

        _wireHeaderBellBadge();
    }

    function _wireHeaderBellBadge() {
        const badge = document.getElementById('notifBadge');
        const dot = document.getElementById('evtHeaderBellDot');
        if (!dot) return;
        const sync = () => {
            if (!badge) { dot.classList.add('hidden'); return; }
            // Unread when the global badge is not display:none AND has non-zero text content
            const txt = (badge.textContent || '').trim();
            const visible = !!txt && getComputedStyle(badge).display !== 'none';
            dot.classList.toggle('hidden', !visible);
        };
        sync();
        if (!badge) return;
        try { _evtBellObserver?.disconnect(); } catch (_) {}
        _evtBellObserver = new MutationObserver(sync);
        _evtBellObserver.observe(badge, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    }

    // =========================================================
    // Hero selection — events_003 §4.3 LOCKED rule
    //   1. Going within next 24h
    //   2. Pinned LLC future
    //   3. Soonest upcoming
    //   4. Otherwise null
    // =========================================================
    function _pickHero(events, rsvps) {
        const now = new Date();
        const upcoming = events.filter(e =>
            e.status !== 'cancelled' && e.status !== 'draft' &&
            new Date(e.start_date) >= now
        );
        if (!upcoming.length) return null;

        const byDateAsc = (a, b) => new Date(a.start_date) - new Date(b.start_date);
        const dayMs = 86_400_000;

        // Rule 1
        const goingSoon = upcoming.filter(e => {
            const r = rsvps[e.id];
            return r && r.status === 'going' &&
                   (new Date(e.start_date) - now) <= dayMs;
        }).sort(byDateAsc);
        if (goingSoon[0]) return goingSoon[0];

        // Rule 2
        const pinned = upcoming.filter(e =>
            e.is_pinned && e.event_type === 'llc'
        ).sort(byDateAsc);
        if (pinned[0]) return pinned[0];

        // Rule 3
        return upcoming.slice().sort(byDateAsc)[0] || null;
    }

    function _heroBg(event, stripGradient) {
        const url = event.banner_url;
        if (url) {
            const safe = String(url).replace(/'/g, "%27");
            if (stripGradient) {
                // vlift: ::before pseudo-element handles all darkening
                return "background: url('" + safe + "') center/cover;";
            }
            return "background: linear-gradient(0deg, rgba(0,0,0,.65), rgba(0,0,0,.05) 55%), url('" + safe + "') center/cover;";
        }
        const grad = (C.CATEGORY_GRADIENT && (C.CATEGORY_GRADIENT[event.category] || C.CATEGORY_GRADIENT.default))
                   || 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)';
        return "background: " + grad + ";";
    }

    function _renderHero(event, rsvp) {
        const heroEl = document.getElementById('evtHero');
        if (!heroEl) return;
        if (!event) { heroEl.innerHTML = ''; return; }

        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        const start = new Date(event.start_date);
        const rel = H.relativeDate ? H.relativeDate(start) : '';
        const time = H.formatDate ? H.formatDate(event.start_date, 'time') : '';
        const dateLine = [rel, time].filter(Boolean).join(' · ');
        const loc = event.location_nickname || event.location_text || '';
        const stateP = (P.statePill ? P.statePill(event) : '') || '';
        const countP = (P.countdownChip ? P.countdownChip(event) : '') || '';
        const goingRibbon = (rsvp && rsvp.status === 'going')
            ? '<div class="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">✓ Going</div>'
            : '';
        // E12 — Heart favorite (vlift hero only). Maps to RSVP status='maybe'
        // ↔ null since the rsvp_status enum is (going|maybe|not_going) — no
        // 'interested' value. 'maybe' is already wired as the ❤️ Interested
        // affordance in detail.js, so this is the same semantic state.
        const isFav = !!(rsvp && rsvp.status === 'maybe');
        const heartCls = 'evt-hero-heart' + (isFav ? ' evt-hero-heart--on' : '');
        const heartPath = isFav
            // Filled heart
            ? '<path d="M12 21s-7-4.35-9.5-8.5C.8 9.6 2.4 6 6 6c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.6 0 5.2 3.6 3.5 6.5C19 16.65 12 21 12 21z" fill="currentColor"/>'
            // Outline heart
            : '<path stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none" d="M12 21s-7-4.35-9.5-8.5C.8 9.6 2.4 6 6 6c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.6 0 5.2 3.6 3.5 6.5C19 16.65 12 21 12 21z"/>';
        const heartBtn = '<button type="button" data-evt-hero-heart="' + esc(event.id) + '"' +
            ' aria-label="' + (isFav ? 'Remove from interested' : 'Mark as interested') + '"' +
            ' aria-pressed="' + (isFav ? 'true' : 'false') + '"' +
            ' class="' + heartCls + '">' +
                '<svg viewBox="0 0 24 24" class="w-5 h-5" aria-hidden="true">' + heartPath + '</svg>' +
            '</button>';
        const href = event.slug
            ? ('?event=' + encodeURIComponent(event.slug))
            : 'javascript:void(0)';

        const useVlift = document.body.classList.contains('evt-vlift');

        if (useVlift) {
            // E6 — Festival hero: date/time row above title + bottom RSVP CTA bar
            const dateLong = (() => {
                try { return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
                catch (_) { return ''; }
            })();
            const timeShort = time || (() => {
                try { return start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
                catch (_) { return ''; }
            })();
            const calIcon = '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M3 9h18M8 3v4M16 3v4"/></svg>';
            const clkIcon = '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3 2"/></svg>';
            const pinIcon = loc
                ? '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>'
                : '';

            // CTA label/state
            const isGoing = (rsvp && rsvp.status === 'going');
            const isCompetition = event.event_type === 'competition';
            const ctaLabel = isGoing
                ? '✓ You\'re going'
                : (isCompetition ? 'Buy Raffle Ticket' : 'RSVP — I\'m going');
            const ctaCls = isGoing
                ? 'evt-hero-cta evt-hero-cta--going'
                : 'evt-hero-cta';

            // F14 — Featured-event hero refresh (vlift): kicker label, vertical
            // date chip, host line, right-side description block, solid View
            // Details button. All new elements gated by CSS under body.evt-vlift.
            const _titleCase = (s) => {
                if (!s) return '';
                const str = String(s);
                if (str.toLowerCase() === 'llc') return 'LLC';
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            };
            const hostTypeLabel = _titleCase(event.event_type || '');
            const hostCatLabel  = _titleCase(event.category || '');
            const hostLine = [
                hostTypeLabel ? ('Hosted by ' + hostTypeLabel) : '',
                hostCatLabel
            ].filter(Boolean).join(' \u00B7 ');
            const fDay = (() => { try { return start.getDate(); } catch(_) { return ''; } })();
            const fMon = (() => { try { return start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(); } catch(_) { return ''; } })();
            const fDow = (() => { try { return start.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(); } catch(_) { return ''; } })();
            const descRaw = event.description ? String(event.description).trim() : '';
            const descShort = descRaw.length > 180 ? (descRaw.slice(0, 177) + '\u2026') : descRaw;

            heroEl.innerHTML =
                '<div class="evt-hero-vlift relative">' +
                '<a href="' + href + '" data-evt-hero="' + esc(event.id) + '"' +
                ' class="block relative rounded-3xl overflow-hidden text-white shadow-[0_18px_50px_rgba(15,23,42,0.30)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"' +
                ' style="' + _heroBg(event, true) + '">' +
                    goingRibbon +
                    '<div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">' + heartBtn + countP + stateP + '</div>' +
                    // F14 — FEATURED EVENT kicker (vlift only; CSS shown)
                    '<span class="evt-hero-kicker" data-f14-kicker>FEATURED EVENT</span>' +
                    // F14 — Vertical date chip overlay (APR / 1 / WED)
                    '<div class="evt-hero-datechip" data-f14-datechip aria-hidden="true">' +
                        (fMon ? '<span class="evt-hero-datechip__mon">' + esc(fMon) + '</span>' : '') +
                        (fDay !== '' ? '<span class="evt-hero-datechip__day">' + esc(fDay) + '</span>' : '') +
                        (fDow ? '<span class="evt-hero-datechip__dow">' + esc(fDow) + '</span>' : '') +
                    '</div>' +
                    // Bottom-edge dark fade for legibility
                    '<div class="evt-hero-fade absolute inset-x-0 bottom-0 pointer-events-none" aria-hidden="true"></div>' +
                    '<div class="evt-hero-meta absolute inset-x-0 bottom-0 p-5 sm:p-6">' +
                        // E7 — Avatar cluster (Tomorrowland "Interested" pattern), above date/time
                        _attendeeCluster(event.id) +
                        // Date/time row ABOVE the title (Tomorrowland layout)
                        '<div class="flex items-center gap-3 text-[12px] font-semibold text-white/90 mb-2" data-f14-dtrow>' +
                            (dateLong ? '<span class="inline-flex items-center gap-1.5">' + calIcon + esc(dateLong) + '</span>' : '') +
                            (timeShort ? '<span class="inline-flex items-center gap-1.5">' + clkIcon + esc(timeShort) + '</span>' : '') +
                        '</div>' +
                        '<h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md line-clamp-2">' + esc(event.title || 'Untitled event') + '</h2>' +
                        // F14 — Host line ("Hosted by LLC \u00B7 Birthday Celebration")
                        (hostLine
                            ? '<p class="evt-hero-host" data-f14-host>' + esc(hostLine) + '</p>'
                            : '') +
                        (loc
                            ? '<p class="mt-2 inline-flex items-center gap-1.5 text-sm text-white/90 truncate">' + pinIcon + esc(loc) + '</p>'
                            : '') +
                    '</div>' +
                    // F14 — Right-side description block + solid View Details button (desktop only via CSS)
                    // NOTE: must NOT be an <a> — nested <a> inside the banner anchor causes
                    // the browser to auto-close the outer banner <a> early, breaking layout
                    // (DOM gets re-parented and the banner background ends up wrapping the
                    // description). Use a <span> styled as a button; the outer banner anchor
                    // already navigates to the same event detail page on click.
                    '<div class="evt-hero-side" data-f14-side>' +
                        (descShort ? '<p class="evt-hero-side__desc">' + esc(descShort) + '</p>' : '') +
                        '<span class="evt-hero-side__cta" data-f14-cta data-evt-hero-details="' + esc(event.id) + '" role="button" aria-hidden="true">View Details</span>' +
                    '</div>' +
                '</a>' +
                // Bottom CTA bar (sits visually attached to hero, but is a separate
                // button so the click isn't swallowed by the navigation anchor)
                '<button type="button" data-evt-hero-cta="' + esc(event.id) + '" class="' + ctaCls + '">' +
                    '<span>' + esc(ctaLabel) + '</span>' +
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
                '</button>' +
                '</div>';

            // Wire CTA → existing RSVP handler (no new flows)
            const ctaBtn = heroEl.querySelector('button[data-evt-hero-cta]');
            if (ctaBtn) {
                ctaBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof window.evtHandleRsvp !== 'function') return;
                    try {
                        ctaBtn.disabled = true;
                        // Toggling 'going' off when already going is handled by evtHandleRsvp
                        await window.evtHandleRsvp(event.id, 'going');
                    } catch (err) {
                        console.error('Hero RSVP failed', err);
                    } finally {
                        ctaBtn.disabled = false;
                    }
                });
            }

            // E7 — Wire cluster click → navigate to event detail (where the
            // existing Interested/Attendees card lives). No new modal added.
            const cluster = heroEl.querySelector('button[data-evt-hero-going]');
            if (cluster) {
                cluster.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof window.evtNavigateToEvent === 'function') {
                        window.evtNavigateToEvent(event);
                    } else if (typeof window.evtOpenDetail === 'function') {
                        window.evtOpenDetail(event);
                    } else if (event.slug) {
                        window.location.href = '?event=' + encodeURIComponent(event.slug);
                    }
                });
            }

            // E12 — Heart favorite toggles RSVP status='maybe' (semantic
            // "interested"; enum is going|maybe|not_going). evtHandleRsvp
            // toggles off when called with the existing status, so calling
            // it with 'maybe' when already maybe will clear it.
            const heart = heroEl.querySelector('button[data-evt-hero-heart]');
            if (heart) {
                heart.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof window.evtHandleRsvp !== 'function') return;
                    try {
                        heart.disabled = true;
                        await window.evtHandleRsvp(event.id, 'maybe');
                    } catch (err) {
                        console.error('Hero heart toggle failed', err);
                    } finally {
                        heart.disabled = false;
                    }
                });
            }
        } else {
            heroEl.innerHTML =
                '<a href="' + href + '" data-evt-hero="' + esc(event.id) + '"' +
                ' class="block relative rounded-3xl overflow-hidden text-white shadow-[0_10px_40px_rgba(79,70,229,0.18)] aspect-[4/5] sm:aspect-[16/10] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"' +
                ' style="' + _heroBg(event) + '">' +
                    goingRibbon +
                    '<div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">' + countP + stateP + '</div>' +
                    '<div class="absolute inset-x-0 bottom-0 p-5 sm:p-6">' +
                        '<div class="text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">' + esc(dateLine) + '</div>' +
                        '<h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 drop-shadow-sm line-clamp-2">' + esc(event.title || 'Untitled event') + '</h2>' +
                        (loc ? '<p class="text-sm text-white/85 mt-1 truncate">' + esc(loc) + '</p>' : '') +
                    '</div>' +
                '</a>';
        }

        // Click → detail navigation (preserve modifier-click for new tab)
        const link = heroEl.querySelector('a[data-evt-hero]');
        if (link) {
            link.addEventListener('click', e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (event.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(event.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(event.id);
                }
            });
        }
    }

    // =========================================================
    // Bucket renderer
    // =========================================================
    function _renderBucket(label, events, rsvps, attendees) {
        if (!events.length) return '';
        const slug = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const useVlift = document.body.classList.contains('evt-vlift');

        // E11 — Truncate vlift buckets over threshold unless this bucket is expanded
        const total = events.length;
        const isExpanded = (_expandedBucket === slug);
        const truncated = useVlift && total > E_BUCKET_TRUNCATE && !isExpanded;
        const visible = truncated ? events.slice(0, E_BUCKET_TRUNCATE) : events;

        const cards = visible.map(ev => Card.render(ev, {
            rsvp: rsvps[ev.id] || null,
            href: ev.slug ? ('?event=' + encodeURIComponent(ev.slug)) : 'javascript:void(0)',
            variant: 'portal',
            attendees: attendees[ev.id] || [],
        })).join('');

        // F8 — Create-event tile: prepend to the first upcoming-tab bucket when user can create
        let createTile = '';
        if (useVlift && !_createTileInjected && (window.evtActiveTab || 'upcoming') === 'upcoming') {
            const canCreate = (typeof hasPermission === 'function' && hasPermission('events.create')) ||
                              window.evtCurrentUserRole === 'admin';
            if (canCreate) {
                createTile =
                    '<button type="button" data-evt-create-tile class="evt-create-tile" aria-label="Create new event">' +
                        '<span class="evt-create-tile__plus" aria-hidden="true">+</span>' +
                        '<span class="evt-create-tile__label">Create Event</span>' +
                        '<span class="evt-create-tile__hint">Add a new event to the calendar</span>' +
                    '</button>';
                _createTileInjected = true;
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
            ? '<header class="' + headerCls + '"><div class="flex items-baseline gap-2"><h2 class="' + titleCls + '">' + safeLabel + '</h2>' + countPill + '</div>' + headerLink + '</header>'
            : '<h2 class="' + titleCls + ' mb-3">' + safeLabel + '</h2>';

        return '<section data-bucket="' + slug + '">' +
            header +
            '<div class="evt-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + createTile + cards + '</div>' +
        '</section>';
    }

    // =========================================================
    // F10 — Mini calendar (right rail, vlift only)
    // =========================================================
    function _toIsoDate(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }
    function _renderMiniCalendar() {
        const mount = document.getElementById('evtRailSlotCalendar');
        if (!mount) return;
        if (!document.body.classList.contains('evt-vlift')) { mount.innerHTML = ''; return; }

        const today = new Date();
        if (!_miniCalMonth) _miniCalMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthStart = new Date(_miniCalMonth);
        const year = monthStart.getFullYear();
        const month = monthStart.getMonth();
        const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Build a Set of ISO dates that have events (from current filtered set)
        const evtDays = new Set();
        (window.evtAllEvents || []).forEach(ev => {
            if (!ev || !ev.start_date) return;
            const d = new Date(ev.start_date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                evtDays.add(_toIsoDate(d));
            }
        });

        // Grid: 6 rows x 7 cols, starting at Sunday of week containing the 1st
        const firstDow = monthStart.getDay(); // 0=Sun
        const gridStart = new Date(year, month, 1 - firstDow);
        const todayIso = _toIsoDate(today);

        const dayHeaders = ['S','M','T','W','T','F','S']
            .map(d => '<div class="evt-mcal-dow">' + d + '</div>').join('');

        let cells = '';
        for (let i = 0; i < 42; i++) {
            const d = new Date(gridStart);
            d.setDate(gridStart.getDate() + i);
            const iso = _toIsoDate(d);
            const isOther = d.getMonth() !== month;
            const isToday = iso === todayIso;
            const hasEvt = evtDays.has(iso);
            const isActive = iso === _activeDay;
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
                '<div class="evt-mcal-head">' +
                    '<button type="button" class="evt-mcal-nav" data-mcal-prev aria-label="Previous month">&lsaquo;</button>' +
                    '<span class="evt-mcal-title">' + monthLabel + '</span>' +
                    '<button type="button" class="evt-mcal-nav" data-mcal-next aria-label="Next month">&rsaquo;</button>' +
                '</div>' +
                '<div class="evt-mcal-dow-row">' + dayHeaders + '</div>' +
                '<div class="evt-mcal-grid">' + cells + '</div>' +
                (_activeDay
                    ? '<button type="button" class="evt-mcal-clear" data-mcal-clear>Clear day filter</button>'
                    : '') +
            '</div>';

        mount.querySelector('[data-mcal-prev]')?.addEventListener('click', () => {
            _miniCalMonth = new Date(year, month - 1, 1);
            _renderMiniCalendar();
        });
        mount.querySelector('[data-mcal-next]')?.addEventListener('click', () => {
            _miniCalMonth = new Date(year, month + 1, 1);
            _renderMiniCalendar();
        });
        mount.querySelector('[data-mcal-clear]')?.addEventListener('click', () => {
            _activeDay = '';
            renderEvents();
        });
        mount.querySelectorAll('[data-mcal-day]').forEach(btn => {
            btn.addEventListener('click', () => {
                const iso = btn.getAttribute('data-mcal-day');
                _activeDay = (_activeDay === iso) ? '' : iso;
                renderEvents();
            });
        });

        // Reveal the right rail now that it has content
        const rail = document.getElementById('evtRightRail');
        if (rail) rail.classList.remove('hidden');
    }

    // =========================================================
    // F11 — "Your Upcoming RSVPs" rail card
    // =========================================================
    function _renderMyRsvps() {
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
                    '<span class="evt-myrsvp-meta">' + esc(dateStr) + ' · ' + esc(timeStr) + '</span>' +
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
            // Switch to "Going" tab
            document.querySelector('[data-filter="going"]')?.click();
        });

        const rail = document.getElementById('evtRightRail');
        if (rail) rail.classList.remove('hidden');
    }

    // =========================================================
    // F12 — "Events Overview" stats rail card
    // =========================================================
    function _renderStatsCard() {
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

        // Communities = distinct event_type values across all events
        const communities = new Set();
        all.forEach(ev => { if (ev && ev.event_type) communities.add(ev.event_type); });

        mount.innerHTML =
            '<div class="evt-stats">' +
                '<h3 class="evt-stats-title">Events Overview</h3>' +
                '<div class="evt-stats-row"><span class="evt-stats-label">This Month</span><span class="evt-stats-value">' + thisMonth + '</span></div>' +
                '<div class="evt-stats-row"><span class="evt-stats-label">You\u2019re Going</span><span class="evt-stats-value">' + going + '</span></div>' +
                '<div class="evt-stats-row"><span class="evt-stats-label">Communities</span><span class="evt-stats-value">' + communities.size + '</span></div>' +
                '<button type="button" class="evt-stats-link" data-evt-stats-all>View Full Calendar</button>' +
            '</div>';

        mount.querySelector('[data-evt-stats-all]')?.addEventListener('click', () => {
            const viewBtn = document.querySelector('[data-view="calendar"]');
            if (viewBtn) viewBtn.click();
        });

        const rail = document.getElementById('evtRightRail');
        if (rail) rail.classList.remove('hidden');
    }

    // Wire card click navigation (anchor hrefs are real but we hijack
    // for SPA detail-view open when running in the unified portal).
    function _wireCardClicks(scope, eventsById) {
        // F8 — Create-event tile click → existing create flow
        scope.querySelectorAll('button[data-evt-create-tile]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('createEventBtn')?.click();
            });
        });
        // E11 — bucket "See all" / "Show less" toggle (delegated)
        scope.querySelectorAll('button[data-evt-bucket-toggle]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                const slug = btn.getAttribute('data-evt-bucket-toggle');
                _expandedBucket = (_expandedBucket === slug) ? null : slug;
                renderEvents();
            });
        });
        scope.querySelectorAll('a[data-evt-card]').forEach(link => {
            const id = link.getAttribute('data-evt-card');
            const ev = eventsById[id];
            if (!ev) return;
            link.addEventListener('click', e => {
                // C2 — tap-category-emoji-to-filter: intercept before nav
                const catBtn = e.target.closest('button[data-evt-cat]');
                if (catBtn && link.contains(catBtn)) {
                    e.preventDefault();
                    e.stopPropagation();
                    const cat = catBtn.getAttribute('data-evt-cat');
                    _activeCategory = (_activeCategory === cat) ? '' : cat;
                    _persistState();
                    renderEvents();
                    return;
                }
                // F7 — RSVP footer button: toggle 'going' without navigating
                const rsvpBtn = e.target.closest('button[data-evt-card-rsvp]');
                if (rsvpBtn && link.contains(rsvpBtn)) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof window.evtHandleRsvp === 'function') {
                        rsvpBtn.disabled = true;
                        Promise.resolve(window.evtHandleRsvp(ev.id, 'going'))
                            .catch(err => console.error('Card RSVP failed', err))
                            .finally(() => { rsvpBtn.disabled = false; });
                    }
                    return;
                }
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });
    }

    // =========================================================
    // C2 — Active-filter pill strip (shows when _activeCategory set)
    // =========================================================
    function _renderActiveFilterPill() {
        let host = document.getElementById('evtActiveFilters');
        if (!host) {
            // Create pill host right after the filter strip on first use
            const strip = document.getElementById('evtFilterStrip');
            if (!strip || !strip.parentNode) return;
            host = document.createElement('div');
            host.id = 'evtActiveFilters';
            host.className = 'evt-active-filters mt-2 flex flex-wrap gap-2';
            strip.parentNode.insertBefore(host, strip.nextSibling);
        }
        if (!_activeCategory) { host.innerHTML = ''; return; }
        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[_activeCategory]) || '📅';
        const label = (C.CATEGORY_TAG && C.CATEGORY_TAG[_activeCategory]?.label) || _activeCategory;
        host.innerHTML =
            '<button type="button" data-clear-cat ' +
            'class="evt-active-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold hover:bg-brand-100">' +
                '<span aria-hidden="true">' + emoji + '</span>' +
                '<span>' + esc(label) + '</span>' +
                '<span aria-hidden="true" class="text-brand-500">×</span>' +
                '<span class="sr-only">Clear ' + esc(label) + ' filter</span>' +
            '</button>';
        host.querySelector('[data-clear-cat]')?.addEventListener('click', () => {
            _activeCategory = '';
            _persistState();
            renderEvents();
        });
    }

    // =========================================================
    // Phase B2 — Live banner (events_003 §5.3)
    //   Single-line banner above the filter strip whenever
    //   ≥ 1 event is currently in [start, end] window.
    // =========================================================
    function _renderLiveBanner(events) {
        const el = document.getElementById('evtLiveBanner');
        if (!el) return;
        const now = new Date();
        const live = (events || []).filter(e => {
            if (e.status === 'cancelled' || e.status === 'draft') return false;
            const start = new Date(e.start_date);
            if (isNaN(start) || start > now) return false;
            const endRaw = e.end_date || e.end_at || e.ends_at;
            const end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
            return now <= end;
        });
        if (!live.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }

        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        const first = live[0];
        const label = live.length === 1
            ? esc(first.title || 'An event') + ' is happening now'
            : live.length + ' events happening now';
        const href = (live.length === 1 && first.slug)
            ? '?event=' + encodeURIComponent(first.slug)
            : 'javascript:void(0)';

        el.classList.remove('hidden');
        el.innerHTML =
            '<a href="' + href + '" data-evt-live="' + esc(first.id) + '"' +
            ' class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">' +
                '<span class="relative flex w-2.5 h-2.5 shrink-0">' +
                    '<span class="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60"></span>' +
                    '<span class="relative rounded-full bg-rose-600 w-2.5 h-2.5"></span>' +
                '</span>' +
                '<span class="flex-1 truncate">' + label + '</span>' +
                (live.length === 1 ? '<span aria-hidden="true" class="text-rose-500">→</span>' : '') +
            '</a>';

        const link = el.querySelector('a[data-evt-live]');
        if (link && live.length === 1) {
            link.addEventListener('click', e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (first.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(first.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(first.id);
                }
            });
        }
    }

    // =========================================================
    // Phase B1 — "You're going" rail (events_003 §5.2)
    //   Shows events where user RSVP status='going', future
    //   only, excluding the hero event. Hidden when empty.
    // =========================================================
    function _renderGoingRail(events, rsvps, attendees, heroId, eventsById) {
        const rail   = document.getElementById('evtGoingRail');
        const scroll = document.getElementById('evtGoingRailScroll');
        if (!rail || !scroll) return;

        const now = new Date();
        const going = (events || []).filter(e => {
            if (e.id === heroId) return false;
            if (e.status === 'cancelled' || e.status === 'draft') return false;
            if (!_notHidden(e)) return false;
            const r = rsvps[e.id];
            if (!r || r.status !== 'going') return false;
            return new Date(e.start_date) >= now;
        }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        if (!going.length) { rail.classList.add('hidden'); scroll.innerHTML = ''; return; }

        rail.classList.remove('hidden');
        scroll.innerHTML = going.map(ev => _miniCard(ev, attendees[ev.id] || [])).join('');

        // Wire clicks
        scroll.querySelectorAll('a[data-evt-mini]').forEach(link => {
            const id = link.getAttribute('data-evt-mini');
            const ev = eventsById[id];
            if (!ev) return;
            link.addEventListener('click', e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });
    }

    function _miniCard(event, attendees) {
        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        const d = new Date(event.start_date);
        const day = d.getDate();
        const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const rel = H.relativeDate ? H.relativeDate(d) : '';
        const href = event.slug ? ('?event=' + encodeURIComponent(event.slug)) : 'javascript:void(0)';
        const title = esc(event.title || 'Untitled event');
        const loc = event.location_nickname || event.location_text || '';

        let bannerStyle;
        if (event.banner_url) {
            const safe = String(event.banner_url).replace(/'/g, '%27');
            bannerStyle = "background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55)), url('" + safe + "') center/cover;";
        } else {
            const grad = (C.CATEGORY_GRADIENT && (C.CATEGORY_GRADIENT[event.category] || C.DEFAULT_GRADIENT))
                       || 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)';
            bannerStyle = 'background: ' + grad + ';';
        }

        const attCount = (attendees || []).length;
        const attLine = attCount
            ? '<span class="text-[11px] text-gray-500 truncate">' + attCount + ' going</span>'
            : '';
        const isPinnedLlc = event.is_pinned && event.event_type === 'llc';
        const pin = isPinnedLlc
            ? '<span class="evt-date-pin evt-date-pin--mini" aria-label="Pinned LLC event" title="Pinned">📌</span>'
            : '';

        return '<a href="' + href + '" data-evt-mini="' + esc(event.id) + '"' +
            ' class="snap-start shrink-0 w-[76%] sm:w-64 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">' +
                '<div class="relative aspect-[16/9]" style="' + bannerStyle + '">' +
                    '<div class="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 text-center shadow-sm">' +
                        pin +
                        '<div class="text-[14px] leading-none font-extrabold text-gray-900">' + day + '</div>' +
                        '<div class="text-[9px] tracking-wider font-bold text-brand-600 mt-0.5">' + mon + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="p-3">' +
                    '<h3 class="text-sm font-bold text-gray-900 line-clamp-1 leading-snug">' + title + '</h3>' +
                    '<p class="text-[12px] text-gray-500 truncate mt-0.5">' + (rel ? esc(rel) : '') + (loc && rel ? ' · ' : '') + esc(loc) + '</p>' +
                    (attLine ? '<div class="mt-1.5">' + attLine + '</div>' : '') +
                '</div>' +
            '</a>';
    }

    // =========================================================
    // E5 — Top Picks rail (vlift only)
    //   Conditional on >=2 pinned-LLC future events (excluding hero).
    //   Hidden during search, on Past tab, on Going tab, when vlift off.
    // =========================================================
    function _renderTopPicks(events, attendees, heroId, eventsById) {
        const rail   = document.getElementById('evtTopPicks');
        const scroll = document.getElementById('evtTopPicksScroll');
        if (!rail || !scroll) return;

        const useVlift = document.body.classList.contains('evt-vlift');
        const tab = window.evtActiveTab || 'upcoming';
        const inSearch = !!(_searchQuery || '').trim();
        if (!useVlift || tab !== 'upcoming' || inSearch) {
            rail.classList.add('hidden');
            scroll.innerHTML = '';
            return;
        }

        const now = new Date();
        const picks = (events || []).filter(e =>
            e.id !== heroId &&
            e.is_pinned &&
            e.event_type === 'llc' &&
            e.status !== 'cancelled' && e.status !== 'draft' &&
            _notHidden(e) &&
            new Date(e.start_date) >= now
        ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        if (picks.length < 2) {
            rail.classList.add('hidden');
            scroll.innerHTML = '';
            return;
        }

        rail.classList.remove('hidden');
        scroll.innerHTML = picks.map(ev => _miniCard(ev, attendees[ev.id] || [])).join('');

        // Wire mini-card clicks (reuse same data-evt-mini hook as going rail)
        scroll.querySelectorAll('a[data-evt-mini]').forEach(link => {
            const id = link.getAttribute('data-evt-mini');
            const ev = eventsById[id];
            if (!ev) return;
            link.addEventListener('click', e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });

        // "See all" → activate LLC type filter (closest equivalent to "pinned-only")
        const seeAll = document.getElementById('evtTopPicksSeeAll');
        if (seeAll && !seeAll.dataset.wired) {
            seeAll.dataset.wired = '1';
            seeAll.addEventListener('click', e => {
                e.preventDefault();
                _activeType = 'llc';
                _syncTypeChips('llc');
                const menuBtn = document.getElementById('evtTypeMenuBtn');
                if (menuBtn) {
                    menuBtn.dataset.type = 'llc';
                    const labelEl = menuBtn.querySelector('[data-type-label]');
                    if (labelEl) labelEl.textContent = 'LLC';
                    document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
                        o.classList.toggle('evt-type-opt--active', o.dataset.type === 'llc')
                    );
                }
                const sel = document.getElementById('typeFilter');
                if (sel) sel.value = 'llc';
                _persistState();
                renderEvents();
            });
        }
    }

    // =========================================================
    // Filter helpers
    // =========================================================
    function _matchesType(ev) {
        if (_activeType === 'all') return true;
        return ev.event_type === _activeType;
    }

    function _matchesCategory(ev) {
        if (!_activeCategory) return true;
        return ev.category === _activeCategory;
    }

    function _matchesLifecycle(ev) {
        const tab = window.evtActiveTab || 'upcoming';
        const now = new Date();
        const start = new Date(ev.start_date);
        const rsvps = window.evtAllRsvps || {};
        if (tab === 'upcoming') {
            if (ev.status === 'completed') return false;
            return start >= now ||
                ev.status === 'active' ||
                ev.status === 'open' ||
                ev.status === 'confirmed' ||
                ev.status === 'draft';
        }
        if (tab === 'past') {
            return ev.status === 'completed' || start < now;
        }
        if (tab === 'going') {
            const r = rsvps[ev.id];
            return r && r.status === 'going';
        }
        if (tab === 'saved') {
            // F3 — Saved maps to rsvp.status='maybe' (same as E12 heart)
            const r = rsvps[ev.id];
            return r && r.status === 'maybe';
        }
        return true;
    }

    // =========================================================
    // MAIN render
    // =========================================================
    function renderEvents() {
        const groupsEl = document.getElementById('evtGroups');
        const heroEl   = document.getElementById('evtHero');
        const empty    = document.getElementById('emptyState');
        const calMount = document.getElementById('evtCalendarMount');
        if (!groupsEl || !Card) return;

        _createTileInjected = false; // F8 — reset per render so tile appears in first bucket only

        _renderHeaderCount();
        _renderActiveFilterPill();

        // ─── D1 CALENDAR MODE — events_004 §D1 ──────────────
        // Calendar is its own render surface. When active: hide the list/hero/rail/banner
        // and show the month grid. Respects _activeType + _activeCategory filters.
        if (_activeView === 'calendar') {
            if (heroEl) heroEl.innerHTML = '';
            const rail   = document.getElementById('evtGoingRail');
            const banner = document.getElementById('evtLiveBanner');
            if (rail)   rail.classList.add('hidden');
            if (banner) banner.classList.add('hidden');
            groupsEl.innerHTML = '';
            empty?.classList.add('hidden');
            if (calMount) calMount.classList.remove('hidden');
            _renderCalendar();
            return;
        }
        if (calMount) { calMount.classList.add('hidden'); calMount.innerHTML = ''; }

        const all       = window.evtAllEvents || [];
        const rsvps     = window.evtAllRsvps  || {};
        const attendees = window.evtAttendees || {};
        const eventsById = {};
        all.forEach(e => { eventsById[e.id] = e; });

        // ─── SEARCH MODE — events_003 §4.4 LOCKED ───────────
        // Non-empty query disables bucketing.
        // Two-tier flat sort: title-match → description-match,
        // both within tier sorted by date ascending.
        // Hide hero + going rail.
        if (_searchQuery) {
            if (heroEl) heroEl.innerHTML = '';
            const rail = document.getElementById('evtGoingRail');
            if (rail) rail.classList.add('hidden');
            const banner = document.getElementById('evtLiveBanner');
            if (banner) banner.classList.add('hidden');
            const picks = document.getElementById('evtTopPicks');
            if (picks) picks.classList.add('hidden');

            const q = _searchQuery.toLowerCase();
            const titleHits = [];
            const descHits  = [];
            all.forEach(e => {
                if (e.status === 'cancelled') return;
                if (!_notHidden(e)) return;
                if (!_matchesCategory(e)) return;
                if ((e.title || '').toLowerCase().includes(q)) {
                    titleHits.push(e);
                } else if ((e.description || '').toLowerCase().includes(q)) {
                    descHits.push(e);
                }
            });
            const byDateAsc = (a, b) => new Date(a.start_date) - new Date(b.start_date);
            titleHits.sort(byDateAsc);
            descHits.sort(byDateAsc);
            const flat = titleHits.concat(descHits);

            if (!flat.length) {
                groupsEl.innerHTML = '';
                empty?.classList.remove('hidden');
                _renderEmptyCopy();
                return;
            }
            empty?.classList.add('hidden');
            groupsEl.innerHTML = _renderBucket(
                'Results for "' + _searchQuery + '"',
                flat, rsvps, attendees
            );
            _wireCardClicks(groupsEl, eventsById);
            return;
        }

        // ─── NORMAL MODE — bucketed ─────────────────────────
        const filtered = all.filter(e => _matchesType(e) && _matchesCategory(e) && _matchesLifecycle(e) && _matchesDate(e) && _notHidden(e));
        const tab = window.evtActiveTab || 'upcoming';

        // Pick hero only on Upcoming tab
        const hero = (tab === 'upcoming') ? _pickHero(filtered, rsvps) : null;
        _renderHero(hero, hero ? rsvps[hero.id] : null);

        // Phase B1/B2 — Live banner + Going rail (upcoming tab only)
        if (tab === 'upcoming') {
            _renderLiveBanner(all);
            _renderGoingRail(all, rsvps, attendees, hero ? hero.id : null, eventsById);
            // E5 — Top Picks rail (vlift only; gated inside renderer)
            _renderTopPicks(filtered, attendees, hero ? hero.id : null, eventsById);
        } else {
            const rail = document.getElementById('evtGoingRail');
            if (rail) rail.classList.add('hidden');
            const banner = document.getElementById('evtLiveBanner');
            if (banner) banner.classList.add('hidden');
            const picks = document.getElementById('evtTopPicks');
            if (picks) picks.classList.add('hidden');
        }

        const rest = hero ? filtered.filter(e => e.id !== hero.id) : filtered;

        if (!rest.length && !hero) {
            groupsEl.innerHTML = '';
            empty?.classList.remove('hidden');
            _renderEmptyCopy();
            return;
        }
        empty?.classList.add('hidden');

        // Bucket the remaining events
        const mode = tab === 'past' ? 'past' : (tab === 'going' ? 'going' : 'upcoming');
        let groups;
        if (typeof H.groupByBucket === 'function') {
            groups = H.groupByBucket(rest, mode);
        } else {
            groups = [{ label: 'Events', events: rest }];
        }

        // Within each bucket: pinned LLC first, then by date (asc/desc by tab)
        const dir = (tab === 'past') ? -1 : 1;
        groups.forEach(g => {
            g.events.sort((a, b) => {
                const ap = (a.is_pinned && a.event_type === 'llc') ? 0 : 1;
                const bp = (b.is_pinned && b.event_type === 'llc') ? 0 : 1;
                if (ap !== bp) return ap - bp;
                return dir * (new Date(a.start_date) - new Date(b.start_date));
            });
        });

        // E11 — self-heal: if expanded slug no longer exists in current groups, clear it
        if (_expandedBucket) {
            const slugs = groups.map(g => String(g.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
            if (!slugs.includes(_expandedBucket)) _expandedBucket = null;
        }

        groupsEl.innerHTML = groups
            .filter(g => g.events.length)
            .filter(g => {
                // E11 — when a bucket is expanded, only render that one
                if (!_expandedBucket) return true;
                const s = String(g.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                return s === _expandedBucket;
            })
            .map(g => _renderBucket(g.label, g.events, rsvps, attendees))
            .join('');

        _wireCardClicks(groupsEl, eventsById);
        _renderMiniCalendar(); // F10 — right-rail mini calendar
        _renderMyRsvps();      // F11 — right-rail "Your Upcoming RSVPs"
        _renderStatsCard();    // F12 — right-rail "Events Overview"
    }

    // =========================================================
    // Empty state — per-viewer (events_003 §8.10 / B4)
    //
    // Five variants (network-error handled separately, Phase C):
    //   • Search has results=0  → "No events match …" + Clear filters
    //   • Upcoming + canCreate  → "No events yet" + Create CTA
    //   • Upcoming + !canCreate → "No events on the books" + Browse past
    //   • Past                  → "No past events yet"
    //   • Going                 → "Not going to any events"
    //
    // The 📌 marker appears inline with _dateStamp (card.js §8.8).
    // Lottie illustration lazy-upgrades when cat-playing.json available.
    // =========================================================
    function _renderEmptyCopy() {
        const tab     = window.evtActiveTab || 'upcoming';
        const titleEl = document.getElementById('emptyTitle');
        const subEl   = document.getElementById('emptySubtext');
        const ctaBtn  = document.getElementById('emptyCreateBtn');
        const secBtn  = document.getElementById('emptySecondaryBtn');

        const canCreate = (typeof hasPermission === 'function' && hasPermission('events.create')) ||
                          window.evtCurrentUserRole === 'admin';

        let title, sub, showCta = false, secText = '', secAction = null;

        if (_searchQuery) {
            title   = 'No events match "' + _searchQuery + '"';
            sub     = 'Try a shorter term, or clear your filters to see everything.';
            secText = 'Clear filters';
            secAction = () => {
                const input = document.getElementById('evtSearchInput');
                const clear = document.getElementById('evtSearchClear');
                if (input) input.value = '';
                clear?.classList.add('hidden');
                _searchQuery = '';
                _activeType = 'all';
                _activeCategory = '';
                const menuBtn = document.getElementById('evtTypeMenuBtn');
                if (menuBtn) {
                    menuBtn.dataset.type = 'all';
                    const labelEl = menuBtn.querySelector('[data-type-label]');
                    if (labelEl) labelEl.textContent = 'All';
                }
                document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
                    o.classList.toggle('evt-type-opt--active', o.dataset.type === 'all')
                );
                _syncTypeChips('all');
                _persistState();
                renderEvents();
            };
        } else if (tab === 'past') {
            title = 'No past events yet';
            sub   = 'Past events will appear here after they wrap up.';
        } else if (tab === 'going') {
            title = 'Not going to any events';
            sub   = 'RSVP to an event to see it here.';
        } else if (canCreate) {
            // Upcoming + can create — editorial CTA
            title   = 'No events yet';
            sub     = "Create your family's first one.";
            showCta = true;
        } else {
            // Upcoming + cannot create — calm + secondary browse-past
            title   = 'No events on the books';
            sub     = "Check back soon — we'll post new gatherings here.";
            secText = 'Browse past events';
            secAction = () => _switchLifecycleTab('past');
        }

        if (titleEl) titleEl.textContent = title;
        if (subEl)   subEl.textContent   = sub;

        if (ctaBtn) ctaBtn.classList.toggle('hidden', !showCta);
        if (secBtn) {
            secBtn.classList.toggle('hidden', !secText);
            if (secText) {
                secBtn.textContent = secText;
                secBtn.onclick = secAction; // replace any prior handler
            } else {
                secBtn.onclick = null;
            }
        }

        _upgradeEmptyIllo();
    }

    // Switch the lifecycle segmented control programmatically
    function _switchLifecycleTab(tab) {
        window.evtActiveTab = tab;
        _persistState();
        document.querySelectorAll('#evtLifecycleSeg .evt-seg__btn').forEach(b => {
            const on = b.dataset.filter === tab;
            b.classList.toggle('evt-seg__btn--active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        renderEvents();
    }

    // Lazy Lottie upgrade for the empty-state illustration.
    // Uses existing cat-playing.json (assets/lottie/) as the fallback per spec §7.9.
    // Loads lottie-web from jsDelivr once, on first empty render only.
    let _lottieLoading = false;
    let _lottieUpgraded = false;
    function _upgradeEmptyIllo() {
        if (_lottieUpgraded) return;
        const slot = document.getElementById('emptyIllo');
        if (!slot) return;

        const go = () => {
            if (_lottieUpgraded) return;
            if (!window.lottie || typeof window.lottie.loadAnimation !== 'function') return;
            // Replace SVG with animation only if slot still has placeholder
            try {
                slot.innerHTML = '';
                slot.classList.add('evt-empty-illo--lottie');
                window.lottie.loadAnimation({
                    container: slot,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: '/assets/lottie/cat-playing.json',
                });
                _lottieUpgraded = true;
            } catch (_) { /* keep fallback SVG */ }
        };

        if (window.lottie) { go(); return; }
        if (_lottieLoading) return;
        _lottieLoading = true;
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js';
        s.async = true;
        s.onload = go;
        s.onerror = () => { /* keep fallback SVG silently */ };
        document.head.appendChild(s);
    }

    // =========================================================
    // Filter strip — segmented control + type menu
    // =========================================================
    function initFilterChips() {
        // Lifecycle segmented control
        const segBtns = Array.from(document.querySelectorAll('#evtLifecycleSeg .evt-seg__btn'));
        segBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                segBtns.forEach(b => {
                    b.classList.remove('evt-seg__btn--active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('evt-seg__btn--active');
                btn.setAttribute('aria-selected', 'true');
                window.evtActiveTab = btn.dataset.filter;
                _expandedBucket = null; // E11 — reset bucket expansion on tab change
                _persistState();
                renderEvents();
            });
        });

        // Type menu — popover open/close + selection
        const menuBtn = document.getElementById('evtTypeMenuBtn');
        const menu    = document.getElementById('evtTypeMenu');
        if (menuBtn && menu) {
            const closeMenu = () => {
                menu.classList.add('hidden');
                menuBtn.setAttribute('aria-expanded', 'false');
            };
            menuBtn.addEventListener('click', e => {
                e.stopPropagation();
                const willOpen = menu.classList.contains('hidden');
                menu.classList.toggle('hidden', !willOpen);
                menuBtn.setAttribute('aria-expanded', String(willOpen));
            });
            document.addEventListener('click', e => {
                if (!menu.contains(e.target) && e.target !== menuBtn) closeMenu();
            });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') closeMenu();
            });
            menu.querySelectorAll('.evt-type-opt').forEach(opt => {
                opt.addEventListener('click', () => {
                    _activeType = opt.dataset.type || 'all';
                    menuBtn.dataset.type = _activeType;
                    const label = opt.textContent.replace(/\s+events?$/i, '').trim();
                    const labelEl = menuBtn.querySelector('[data-type-label]');
                    if (labelEl) labelEl.textContent = label;
                    menu.querySelectorAll('.evt-type-opt').forEach(o =>
                        o.classList.toggle('evt-type-opt--active', o === opt)
                    );
                    // Mirror to hidden compat <select>
                    const sel = document.getElementById('typeFilter');
                    if (sel) sel.value = _activeType;
                    _syncTypeChips(_activeType);
                    closeMenu();
                    _persistState();
                    renderEvents();
                });
            });
        }

        // E3 — Inline category chip rail (vlift). Mirrors selection to legacy
        // type-menu state so opt-out (?vlift=0) keeps the dropdown in sync.
        const chipRail = document.getElementById('evtTypeChips');
        if (chipRail) {
            chipRail.querySelectorAll('.evt-type-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const t = chip.dataset.type || 'all';
                    if (t === _activeType) return;
                    _activeType = t;
                    _syncTypeChips(t);
                    // Mirror to legacy type menu button + hidden select
                    const menuBtn = document.getElementById('evtTypeMenuBtn');
                    if (menuBtn) {
                        menuBtn.dataset.type = t;
                        const opt = document.querySelector('#evtTypeMenu .evt-type-opt[data-type="' + t + '"]');
                        if (opt) {
                            const label = opt.textContent.replace(/\s+events?$/i, '').trim();
                            const labelEl = menuBtn.querySelector('[data-type-label]');
                            if (labelEl) labelEl.textContent = label;
                            document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
                                o.classList.toggle('evt-type-opt--active', o === opt)
                            );
                        }
                    }
                    const sel = document.getElementById('typeFilter');
                    if (sel) sel.value = t;
                    _persistState();
                    renderEvents();
                });
            });
        }

        // Empty-state Create button → trigger same modal as header button
        const emptyCreate = document.getElementById('emptyCreateBtn');
        emptyCreate?.addEventListener('click', () => {
            document.getElementById('createEventBtn')?.click();
        });

        // F4 — Date filter dropdown (vlift only)
        _initDateMenu();
    }

    // F4 — Date filter state + menu wiring
    let _activeDate = 'any'; // 'any' | 'today' | 'week' | 'weekend' | 'month'
    function _initDateMenu() {
        const btn = document.getElementById('evtDateMenuBtn');
        const menu = document.getElementById('evtDateMenu');
        if (!btn || !menu) return;
        const close = () => {
            menu.classList.add('hidden');
            btn.setAttribute('aria-expanded', 'false');
        };
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const willOpen = menu.classList.contains('hidden');
            menu.classList.toggle('hidden', !willOpen);
            btn.setAttribute('aria-expanded', String(willOpen));
        });
        document.addEventListener('click', e => {
            if (!menu.contains(e.target) && e.target !== btn) close();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
        menu.querySelectorAll('.evt-date-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                _activeDate = opt.dataset.date || 'any';
                btn.dataset.date = _activeDate;
                const labelEl = btn.querySelector('[data-date-label]');
                if (labelEl) labelEl.textContent = _activeDate === 'any' ? 'Date' : opt.textContent.trim();
                menu.querySelectorAll('.evt-date-opt').forEach(o =>
                    o.classList.toggle('evt-date-opt--active', o === opt));
                close();
                renderEvents();
            });
        });
    }

    function _matchesDate(ev) {
        // F10 — explicit day filter from mini calendar (highest priority)
        if (_activeDay) {
            const d = new Date(ev.start_date);
            const iso = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');
            if (iso !== _activeDay) return false;
        }
        if (_activeDate === 'any') return true;
        const d = new Date(ev.start_date);
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth(), dy = now.getDate();
        if (_activeDate === 'today') {
            return d.getFullYear() === y && d.getMonth() === m && d.getDate() === dy;
        }
        if (_activeDate === 'week') {
            const day = now.getDay(); // 0=Sun
            const start = new Date(y, m, dy - day);
            const end = new Date(y, m, dy + (6 - day), 23, 59, 59);
            return d >= start && d <= end;
        }
        if (_activeDate === 'weekend') {
            const day = now.getDay();
            const satOffset = (6 - day + 7) % 7;
            const sat = new Date(y, m, dy + satOffset);
            const sun = new Date(y, m, dy + satOffset + 1, 23, 59, 59);
            return d >= sat && d <= sun;
        }
        if (_activeDate === 'month') {
            return d.getFullYear() === y && d.getMonth() === m;
        }
        return true;
    }

    // =========================================================
    // Search (collapsed by default — toggle expands)
    // =========================================================
    function setupSearch() {
        const toggle = document.getElementById('evtSearchToggle');
        const expand = document.getElementById('evtSearchExpand');
        const input  = document.getElementById('evtSearchInput');
        const clear  = document.getElementById('evtSearchClear');

        if (toggle && expand && input) {
            toggle.addEventListener('click', () => {
                const willOpen = expand.classList.contains('hidden');
                expand.classList.toggle('hidden', !willOpen);
                toggle.setAttribute('aria-expanded', String(willOpen));
                if (willOpen) {
                    setTimeout(() => input.focus(), 50);
                    _renderSearchSuggest();
                } else if (input.value) {
                    input.value = '';
                    _searchQuery = '';
                    clear?.classList.add('hidden');
                    _persistState();
                    renderEvents();
                    _hideSearchSuggest();
                } else {
                    _hideSearchSuggest();
                }
            });
        }

        if (!input) return;
        _wireSuggestClicks();

        input.addEventListener('input', () => {
            const q = input.value.trim();
            clear?.classList.toggle('hidden', !q);
            if (q === '') _renderSearchSuggest(); else _hideSearchSuggest();
            clearTimeout(_searchDebounce);
            _searchDebounce = setTimeout(() => {
                _searchQuery = q;
                if (q.length >= 2) _pushHistory(q);
                _persistState();
                renderEvents();
            }, 120);
        });

        clear?.addEventListener('click', () => {
            input.value = '';
            clear.classList.add('hidden');
            _searchQuery = '';
            _persistState();
            renderEvents();
            input.focus();
            _renderSearchSuggest();
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const q = input.value.trim();
                if (q.length >= 2) {
                    clearTimeout(_searchDebounce);
                    _searchQuery = q;
                    _pushHistory(q);
                    _persistState();
                    _hideSearchSuggest();
                    renderEvents();
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                if (input.value) {
                    clear?.click();
                } else if (expand) {
                    expand.classList.add('hidden');
                    toggle?.setAttribute('aria-expanded', 'false');
                    toggle?.focus();
                    _hideSearchSuggest();
                }
            }
        });
    }

    // =========================================================
    // Sticky condensing header (events_003 §6.2)
    // =========================================================
    function _initStickyHeader() {
        const header   = document.getElementById('evtPageHeader');
        const sentinel = document.getElementById('evtHeaderSentinel');
        const strip    = document.getElementById('evtFilterStrip');
        if (!header || !sentinel) return;

        // Publish header height as a CSS var so the sticky filter strip
        // can dock right below it (avoids overlap on iOS Safari).
        const updateHeaderVar = () => {
            const h = header.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--evt-header-h', h + 'px');
        };
        updateHeaderVar();
        window.addEventListener('resize', updateHeaderVar);

        if (!('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                header.classList.toggle('evt-header--condensed', !e.isIntersecting);
                // Recompute after class toggle (height changes)
                requestAnimationFrame(updateHeaderVar);
            });
        }, { threshold: 0 });
        io.observe(sentinel);
    }

    // =========================================================
    // Mobile FAB (events_003 §8.9 / B3 scroll-hide)
    // =========================================================
    function _initMobileFab() {
        const fab = document.getElementById('evtCreateFab');
        if (!fab) return;
        const canCreate = (typeof hasPermission === 'function' && hasPermission('events.create')) ||
                          window.evtCurrentUserRole === 'admin';
        if (!canCreate) return;
        fab.classList.remove('hidden');
        fab.classList.add('flex');
        fab.addEventListener('click', () => {
            document.getElementById('createEventBtn')?.click();
        });

        // B3 — scroll-hide (hide on scroll-down, show on scroll-up)
        let lastY = window.scrollY || 0;
        let ticking = false;
        const TH = 8; // movement threshold in px
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = window.scrollY || 0;
                const dy = y - lastY;
                if (y < 20) {
                    fab.classList.remove('evt-fab--hidden');
                } else if (dy > TH) {
                    fab.classList.add('evt-fab--hidden');
                } else if (dy < -TH) {
                    fab.classList.remove('evt-fab--hidden');
                }
                if (Math.abs(dy) > TH) lastY = y;
                ticking = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        // Hide when a modal (create/detail) is open — listens for body
        // class toggle that other modules already use.
        const mo = new MutationObserver(() => {
            const modalOpen = document.body.classList.contains('modal-open') ||
                              document.body.classList.contains('overflow-hidden');
            fab.classList.toggle('evt-fab--modal-hidden', modalOpen);
        });
        mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    // =========================================================
    // C1 — Pull-to-refresh (events_003 §6.5)
    //   Mobile-only. Pulls down from top of page when scrollY=0
    //   trigger a reload via evtLoadEvents. Excluded when the
    //   touch originates inside the horizontal going rail (that
    //   rail has its own x-scroll and shouldn't cross-trigger).
    //   Respects prefers-reduced-motion (keyframe still runs but
    //   the rubber-band translate is skipped).
    // =========================================================
    function _initPullToRefresh() {
        // Only meaningful on touch/mobile; desktop bails early.
        if (!('ontouchstart' in window)) return;
        // Mobile viewport gate — matches the FAB / mobile-only treatment
        const isMobile = () => window.innerWidth < 640;
        if (!isMobile()) return;

        const TRIGGER = 60;     // px — pull distance to commit
        const MAX     = 120;    // px — max rubber-band translate
        const DAMPING = 0.45;

        // Build indicator once
        let ind = document.getElementById('evtPtrIndicator');
        if (!ind) {
            ind = document.createElement('div');
            ind.id = 'evtPtrIndicator';
            ind.className = 'evt-ptr';
            ind.innerHTML =
                '<svg class="evt-ptr-spin" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
                    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5" ' +
                    'stroke-linecap="round" stroke-dasharray="40 60"/>' +
                '</svg>';
            document.body.appendChild(ind);
        }

        let startY = 0, dy = 0, pulling = false, committed = false, refreshing = false;

        const inRail = (target) => !!(target && target.closest && target.closest('#evtGoingRailScroll'));
        const anyModal = () => document.body.classList.contains('modal-open') ||
                               document.body.classList.contains('overflow-hidden');

        const setOffset = (v) => {
            ind.style.transform = 'translate(-50%,' + v + 'px)';
            ind.style.opacity = String(Math.min(1, Math.abs(v) / TRIGGER));
        };

        const reset = () => {
            pulling = false;
            committed = false;
            dy = 0;
            ind.classList.remove('evt-ptr--active', 'evt-ptr--refreshing');
            ind.style.transform = '';
            ind.style.opacity = '';
        };

        document.addEventListener('touchstart', e => {
            if (refreshing) return;
            if (anyModal()) return;
            if (window.scrollY > 0) return;
            if (inRail(e.target)) return;
            startY = e.touches[0].clientY;
            pulling = true;
            dy = 0;
        }, { passive: true });

        document.addEventListener('touchmove', e => {
            if (!pulling || refreshing) return;
            const y = e.touches[0].clientY;
            dy = (y - startY) * DAMPING;
            if (dy <= 0) { reset(); return; }
            if (dy > MAX) dy = MAX;
            ind.classList.add('evt-ptr--active');
            setOffset(dy);
            committed = dy >= TRIGGER;
            ind.classList.toggle('evt-ptr--ready', committed);
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (!pulling || refreshing) return;
            if (!committed) { reset(); return; }
            refreshing = true;
            ind.classList.add('evt-ptr--refreshing');
            ind.classList.remove('evt-ptr--ready');
            ind.style.transform = 'translate(-50%,' + TRIGGER + 'px)';
            ind.style.opacity = '1';
            const done = () => { refreshing = false; reset(); };
            try {
                const p = (typeof window.evtLoadEvents === 'function')
                    ? window.evtLoadEvents()
                    : Promise.resolve();
                Promise.resolve(p).finally(() => setTimeout(done, 300));
            } catch (_) { done(); }
        });
    }

    window.evtLoadEvents      = loadEvents;
    window.evtRenderEvents    = renderEvents;
    window.evtRenderFeatured  = function () { /* folded into hero+bucket pinned-first sort */ };
    window.evtUpdateHeroStats = function () { _renderHeaderCount(); };
    window.evtSetupSearch     = setupSearch;
    window.evtInitFilterChips = initFilterChips;
    window.evtRenderCard = function (event) {
        const rsvps = window.evtAllRsvps || {};
        const attendees = window.evtAttendees || {};
        return Card ? Card.render(event, {
            rsvp: rsvps[event.id] || null,
            attendees: attendees[event.id] || [],
            variant: 'portal',
        }) : '';
    };

    // =========================================================
    // PortalEvents.list public surface
    // =========================================================
    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.list = {
        load:           loadEvents,
        render:         renderEvents,
        renderHero:     _renderHero,
        pickHero:       _pickHero,
        setupSearch:    setupSearch,
        initFilterChips: initFilterChips,
        renderSkeletons: renderSkeletons,
        initStickyHeader: _initStickyHeader,
        initMobileFab:    _initMobileFab,
    };

    // Show skeletons ASAP, init sticky header + FAB once DOM is ready
    function _onReady() {
        const groupsEl = document.getElementById('evtGroups');
        // Only paint skeletons if nothing has been rendered yet (avoid
        // clobbering a prior render when seed data arrives before
        // DOMContentLoaded, e.g. during tests or quick cache hits).
        if (groupsEl && !groupsEl.innerHTML.trim()) renderSkeletons();
        _initStickyHeader();
        _initMobileFab();
        _initPullToRefresh();
        _initViewToggle();
        _initVlift();
        _initSwipeGestures();
        _initGreeting();
        _applyRestoredUi();
        // E10 — Notification bell in gradient header (vlift only).
        // Try immediately, then again after a tick so the global nav (which
        // mounts #notifBtn / #notifBadge async via pageShell) has time to render.
        _initHeaderBell();
        setTimeout(_initHeaderBell, 300);
        setTimeout(_initHeaderBell, 1200);
        // Fallback: observe body for #notifBtn appearing (handles slow pageShell mounts).
        if (document.body.classList.contains('evt-vlift') && !document.getElementById('evtHeaderBell')) {
            const _bellMountObs = new MutationObserver(() => {
                if (document.getElementById('notifBtn') && !document.getElementById('evtHeaderBell')) {
                    _initHeaderBell();
                    if (document.getElementById('evtHeaderBell')) {
                        try { _bellMountObs.disconnect(); } catch (_) {}
                    }
                }
            });
            _bellMountObs.observe(document.body, { childList: true, subtree: true });
            // Safety: stop watching after 15s even if nothing mounted
            setTimeout(() => { try { _bellMountObs.disconnect(); } catch (_) {} }, 15000);
        }
    }
    if (document.readyState !== 'loading') _onReady();
    else document.addEventListener('DOMContentLoaded', _onReady, { once: true });
})();
