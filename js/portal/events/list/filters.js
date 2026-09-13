// Portal Events — List filters, persistence, lifecycle/type/date UI (Phase 5M.2B)

'use strict';

const C = window.EventsConstants || {};

const STATE_KEY = 'evt_list_state_v1';
let _activeType = 'all';
let _activeCategory = '';
let _activeDate = 'any'; // 'any' | 'today' | 'week' | 'weekend' | 'month'

function api() {
    return window.PortalEventsListFiltersApi || {};
}

function persistState() {
    try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({
            q:   api().getSearchQuery?.() ?? '',
            t:   _activeType,
            c:   _activeCategory,
            v:   api().getActiveView?.() ?? 'list',
            tab: window.evtActiveTab || 'upcoming',
        }));
    } catch (_) { /* quota / private mode — silent */ }
}

function restoreState() {
    try {
        const raw = sessionStorage.getItem(STATE_KEY);
        if (!raw) return;
        const s = JSON.parse(raw) || {};
        if (typeof s.t === 'string') _activeType = s.t;
        if (typeof s.c === 'string') _activeCategory = s.c;
        if (typeof s.tab === 'string' && ['upcoming', 'past', 'going', 'saved'].includes(s.tab)) {
            window.evtActiveTab = s.tab;
        }
    } catch (_) { /* corrupt payload — ignore */ }
}

function syncTypeChips(_type) {
    // Type chip rail retired — menu + #typeFilter are source of truth.
}

function syncFilterBtnActiveState() {
    const menuBtn = document.getElementById('evtTypeMenuBtn');
    if (!menuBtn) return;
    const active = _activeType !== 'all';
    menuBtn.classList.toggle('evt-filter-btn--active', active);
    menuBtn.dataset.type = _activeType || 'all';
    const labelEl = menuBtn.querySelector('[data-type-label]');
    if (labelEl) labelEl.textContent = 'Filters';
    const dot = menuBtn.querySelector('.evt-filter-dot');
    if (dot) dot.classList.toggle('hidden', !active);
    const sel = document.getElementById('typeFilter');
    if (sel) sel.value = _activeType || 'all';
}

function applyRestoredUi() {
    const tab = window.evtActiveTab || 'upcoming';
    document.querySelectorAll('#evtLifecycleSeg .evt-seg__btn').forEach(b => {
        const on = b.dataset.filter === tab;
        b.classList.toggle('evt-seg__btn--active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const menuBtn = document.getElementById('evtTypeMenuBtn');
    if (menuBtn) {
        const opt = document.querySelector('#evtTypeMenu .evt-type-opt[data-type="' + _activeType + '"]');
        if (opt) {
            document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
                o.classList.toggle('evt-type-opt--active', o === opt)
            );
        }
    }
    syncFilterBtnActiveState();
    const q = api().getSearchQuery?.() ?? '';
    if (q) {
        const input  = document.getElementById('evtSearchInput');
        const clear  = document.getElementById('evtSearchClear');
        const expand = document.getElementById('evtSearchExpand');
        if (input) input.value = q;
        if (clear) clear.classList.remove('hidden');
        if (expand) expand.classList.remove('hidden');
    }
    api().applyViewChrome?.();
}

function matchesType(ev) {
    if (_activeType === 'all') return true;
    return ev.event_type === _activeType;
}

function matchesCategory(ev) {
    if (!_activeCategory) return true;
    return ev.category === _activeCategory;
}

function matchesLifecycle(ev) {
    const tab = window.evtActiveTab || 'upcoming';
    const now = new Date();
    const start = new Date(ev.start_date);
    const endRaw = ev.end_date || ev.end_at || ev.ends_at;
    const end = endRaw ? new Date(endRaw) : null;
    const hasEnded = !!(end && !isNaN(end) && end < now);
    const isLive = !isNaN(start) && start <= now && (!end || isNaN(end) || end >= now);
    const rsvps = window.evtAllRsvps || {};
    if (tab === 'upcoming') {
        if (ev.status === 'completed' || ev.status === 'cancelled') return false;
        // Fully ended events belong on Past — not Upcoming/Tonight.
        if (hasEnded) return false;
        return start >= now ||
            isLive ||
            ev.status === 'active' ||
            ev.status === 'open' ||
            ev.status === 'confirmed' ||
            ev.status === 'draft';
    }
    if (tab === 'past') {
        return ev.status === 'completed' || hasEnded || start < now;
    }
    if (tab === 'going') {
        const r = rsvps[ev.id];
        if (typeof globalThis.evtIsCommittedGoing === 'function') {
            return window.evtIsCommittedGoing(ev, r);
        }
        if (window.EventsHelpers?.rsvpIsCommittedGoing) {
            return window.EventsHelpers.rsvpIsCommittedGoing(ev, r);
        }
        return !!(r && (ev.pricing_mode !== 'paid' ? r.status === 'going' : r.paid === true));
    }
    if (tab === 'saved') {
        const r = rsvps[ev.id];
        return r && r.status === 'maybe';
    }
    return true;
}

function matchesDate(ev) {
    const activeDay = api().getActiveDay?.() ?? '';
    if (activeDay) {
        const d = new Date(ev.start_date);
        const iso = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
        if (iso !== activeDay) return false;
    }
    if (_activeDate === 'any') return true;
    const d = new Date(ev.start_date);
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth(), dy = now.getDate();
    if (_activeDate === 'today') {
        return d.getFullYear() === y && d.getMonth() === m && d.getDate() === dy;
    }
    if (_activeDate === 'week') {
        const day = now.getDay();
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

function renderActiveFilterPill() {
    let host = document.getElementById('evtActiveFilters');
    if (!host) {
        const strip = document.getElementById('evtFilterStrip');
        if (!strip || !strip.parentNode) return;
        host = document.createElement('div');
        host.id = 'evtActiveFilters';
        host.className = 'evt-active-filters mt-2 flex flex-wrap gap-2';
        strip.parentNode.insertBefore(host, strip.nextSibling);
    }
    if (!_activeCategory) { host.innerHTML = ''; return; }
    const esc = (window.EventsHelpers && window.EventsHelpers.escapeHtml) || (s => String(s == null ? '' : s));
    const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[_activeCategory]) || '📅';
    const label = (C.CATEGORY_TAG && C.CATEGORY_TAG[_activeCategory]?.label) || _activeCategory;
    host.innerHTML =
        '<button type="button" data-clear-cat ' +
        'class="evt-active-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold hover:bg-primary-100">' +
            '<span aria-hidden="true">' + emoji + '</span>' +
            '<span>' + esc(label) + '</span>' +
            '<span aria-hidden="true" class="text-primary-500">×</span>' +
            '<span class="sr-only">Clear ' + esc(label) + ' filter</span>' +
        '</button>';
    host.querySelector('[data-clear-cat]')?.addEventListener('click', () => {
        _activeCategory = '';
        persistState();
        api().renderEvents?.();
    });
}

function switchLifecycleTab(tab) {
    window.evtActiveTab = tab;
    persistState();
    document.querySelectorAll('#evtLifecycleSeg .evt-seg__btn').forEach(b => {
        const on = b.dataset.filter === tab;
        b.classList.toggle('evt-seg__btn--active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    api().renderEvents?.();
}

function clearFiltersForEmptySearch() {
    api().setSearchQuery?.('');
    _activeType = 'all';
    _activeCategory = '';
    document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
        o.classList.toggle('evt-type-opt--active', o.dataset.type === 'all')
    );
    syncFilterBtnActiveState();
    persistState();
    api().renderEvents?.();
}

function setActiveType(type) {
    _activeType = type || 'all';
}

function setActiveCategory(cat) {
    _activeCategory = cat || '';
}

function toggleActiveCategory(cat) {
    _activeCategory = (_activeCategory === cat) ? '' : cat;
}

function initDateMenu() {
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
            api().renderEvents?.();
        });
    });
}

function initFilterChips() {
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
            api().setExpandedBucket?.(null);
            persistState();
            api().renderEvents?.();
        });
    });

    const menuBtn = document.getElementById('evtTypeMenuBtn');
    const menu    = document.getElementById('evtTypeMenu');
    const menuWrap = document.getElementById('evtTypeMenuBtnWrap');
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
            if (menuWrap?.contains(e.target)) return;
            closeMenu();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeMenu();
        });
        menu.querySelectorAll('.evt-type-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                _activeType = opt.dataset.type || 'all';
                menu.querySelectorAll('.evt-type-opt').forEach(o =>
                    o.classList.toggle('evt-type-opt--active', o === opt)
                );
                syncFilterBtnActiveState();
                closeMenu();
                persistState();
                api().renderEvents?.();
            });
        });
        syncFilterBtnActiveState();
    }

    // Type chip rail retired — no chip listeners.

    document.getElementById('emptyCreateBtn')?.addEventListener('click', () => {
        document.getElementById('createEventBtn')?.click();
    });

    initDateMenu();
}

restoreState();

export const PortalEventsListFilters = {
    persistState,
    restoreState,
    applyRestoredUi,
    syncTypeChips,
    matchesType,
    matchesCategory,
    matchesLifecycle,
    matchesDate,
    renderActiveFilterPill,
    switchLifecycleTab,
    clearFiltersForEmptySearch,
    initFilterChips,
    initDateMenu,
    getActiveType: () => _activeType,
    setActiveType,
    getActiveCategory: () => _activeCategory,
    setActiveCategory,
    toggleActiveCategory,
};
globalThis.PortalEventsListFilters = PortalEventsListFilters;
