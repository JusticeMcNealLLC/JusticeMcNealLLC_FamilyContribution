// Portal Events — List search + suggestions (Phase 5M.2A)

'use strict';

const C = window.EventsConstants || {};
const SEARCH_HIST_KEY = 'evt_search_hist_v1';
const SEARCH_HIST_MAX = 8;
const SEARCH_HIST_SHOW = 5;
const QUICK_CATS = ['cookout', 'birthday', 'trip', 'party'];

function api() {
    return window.PortalEventsListSearchApi || {};
}

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

function renderSearchSuggest() {
    const expand = document.getElementById('evtSearchExpand');
    const input  = document.getElementById('evtSearchInput');
    if (!expand || !input) return;
    if (expand.classList.contains('hidden')) { hideSearchSuggest(); return; }
    if ((input.value || '').trim() !== '') { hideSearchSuggest(); return; }

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

function hideSearchSuggest() {
    const host = document.getElementById('evtSearchSuggest');
    if (host) host.innerHTML = '';
}

function wireSuggestClicks() {
    const expand = document.getElementById('evtSearchExpand');
    if (!expand || expand.dataset.suggestWired === '1') return;
    expand.dataset.suggestWired = '1';
    expand.addEventListener('click', (e) => {
        const rm = e.target.closest('[data-suggest-rm]');
        if (rm) {
            e.preventDefault(); e.stopPropagation();
            _removeHistory(rm.getAttribute('data-suggest-rm'));
            renderSearchSuggest();
            return;
        }
        const clr = e.target.closest('[data-suggest-clear]');
        if (clr) {
            e.preventDefault(); e.stopPropagation();
            _clearHistory();
            renderSearchSuggest();
            return;
        }
        const row = e.target.closest('[data-suggest-q]');
        if (row) {
            e.preventDefault(); e.stopPropagation();
            const q = row.getAttribute('data-suggest-q') || '';
            const input = document.getElementById('evtSearchInput');
            const clear = document.getElementById('evtSearchClear');
            if (input) { input.value = q; clear?.classList.toggle('hidden', !q); }
            api().setSearchQuery?.(q);
            _pushHistory(q);
            api().persistState?.();
            hideSearchSuggest();
            api().renderEvents?.();
            return;
        }
        const chip = e.target.closest('[data-suggest-cat]');
        if (chip) {
            e.preventDefault(); e.stopPropagation();
            const cat = chip.getAttribute('data-suggest-cat') || '';
            const prev = api().getActiveCategory?.() || '';
            api().setActiveCategory?.((prev === cat) ? '' : cat);
            api().persistState?.();
            hideSearchSuggest();
            api().renderEvents?.();
        }
    });
    document.addEventListener('click', (e) => {
        const host = document.getElementById('evtSearchSuggest');
        if (!host || !host.innerHTML) return;
        if (expand.contains(e.target) || document.getElementById('evtSearchToggle')?.contains(e.target)) return;
        hideSearchSuggest();
    });
}

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
                renderSearchSuggest();
            } else if (input.value) {
                input.value = '';
                api().setSearchQuery?.('');
                clear?.classList.add('hidden');
                api().persistState?.();
                api().renderEvents?.();
                hideSearchSuggest();
            } else {
                hideSearchSuggest();
            }
        });
    }

    if (!input) return;
    wireSuggestClicks();

    input.addEventListener('input', () => {
        const q = input.value.trim();
        clear?.classList.toggle('hidden', !q);
        if (q === '') renderSearchSuggest(); else hideSearchSuggest();
        const prev = api().getSearchDebounce?.();
        if (prev) clearTimeout(prev);
        const id = setTimeout(() => {
            api().setSearchQuery?.(q);
            if (q.length >= 2) _pushHistory(q);
            api().persistState?.();
            api().renderEvents?.();
        }, 120);
        api().setSearchDebounce?.(id);
    });

    clear?.addEventListener('click', () => {
        input.value = '';
        clear.classList.add('hidden');
        api().setSearchQuery?.('');
        api().persistState?.();
        api().renderEvents?.();
        input.focus();
        renderSearchSuggest();
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const q = input.value.trim();
            if (q.length >= 2) {
                const prev = api().getSearchDebounce?.();
                if (prev) clearTimeout(prev);
                api().setSearchQuery?.(q);
                _pushHistory(q);
                api().persistState?.();
                hideSearchSuggest();
                api().renderEvents?.();
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
                hideSearchSuggest();
            }
        }
    });
}

export const PortalEventsListSearch = {
    setupSearch,
    renderSearchSuggest,
    hideSearchSuggest,
    wireSuggestClicks,
    pushHistory: _pushHistory,
    readHistory: _readHistory,
};
globalThis.PortalEventsListSearch = PortalEventsListSearch;
