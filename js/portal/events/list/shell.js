/* ════════════════════════════════════════════════════════════
   Portal Events — List shell (orchestrator; events_003 A2 + A3)

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
   Globals preserved : globalThis.evtLoadEvents, evtRenderEvents,
                       evtRenderFeatured (no-op stub),
                       evtUpdateHeroStats (no-op stub),
                       evtSetupSearch, evtInitFilterChips,
                       evtRenderCard
   ════════════════════════════════════════════════════════════ */

'use strict';

const C = window.EventsConstants || {};
const H = window.EventsHelpers   || {};
const P = window.EventsPills     || {};
const Card = window.EventsCard;

// ─── Local UI state ───────────────────────────────────
let _searchQuery    = '';
let _activeView     = 'list'; // D1 — 'list' | 'calendar'
let _calMonth       = null;   // D1 — Date at first of viewed month
let _searchDebounce = null;
let _expandedBucket = null;   // E11 — slug of bucket the user "See all"-ed; null = normal
let _createTileInjected = false; // F8 — ensures only one Create tile per render
let _miniCalMonth = null;     // F10 — Date pointing to first day of displayed month
let _activeDay = '';          // F10 — ISO yyyy-mm-dd filter from mini calendar click

const STATE_KEY = 'evt_list_state_v1';
function _restoreListSessionState() {
    try {
        const raw = sessionStorage.getItem(STATE_KEY);
        if (!raw) return;
        const s = JSON.parse(raw) || {};
        if (typeof s.q === 'string') _searchQuery = s.q;
        if (typeof s.v === 'string' && (s.v === 'list' || s.v === 'calendar')) _activeView = s.v;
    } catch (_) { /* corrupt payload — ignore */ }
}
_restoreListSessionState();

function _persistState() {
    return window.PortalEventsListFilters.persistState();
}

// =========================================================
// D3 — Search (list/search.js — PortalEventsListSearch)
// =========================================================
function setupSearch() {
    return window.PortalEventsListSearch.setupSearch();
}

// D1 — Full calendar (list/calendar.js) + view toggle chrome
// =========================================================
function _renderCalendar() {
    return window.PortalEventsListCalendar.renderCalendar();
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
    try { globalThis.evtSetVlift = function (v) {
        try { localStorage.setItem(VLIFT_KEY, v ? '1' : '0'); } catch (_) {}
        document.body.classList.toggle('evt-vlift', !!v);
    }; } catch (_) {}
    try { globalThis.evtIsVlift = function () { return document.body.classList.contains('evt-vlift'); }; } catch (_) {}
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
        if (typeof globalThis.evtHandleRsvp === 'function') {
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

function _applyRestoredUi() {
    return window.PortalEventsListFilters.applyRestoredUi();
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
        globalThis.evtAllEvents = events || [];

        // Drafts (admin-created, only visible to creator)
        if (typeof canManageEvents === 'function' && canManageEvents() && globalThis.evtCurrentUser) {
            const { data: drafts } = await supabaseClient
                .from('events')
                .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
                .eq('status', 'draft')
                .eq('created_by', globalThis.evtCurrentUser.id)
                .order('created_at', { ascending: false });
            if (drafts && drafts.length) {
                globalThis.evtAllEvents = [...drafts, ...window.evtAllEvents];
            }
        }

        const ids = window.evtAllEvents.map(e => e.id);

        // User's own RSVPs
        globalThis.evtAllRsvps = {};
        if (globalThis.evtCurrentUser && ids.length) {
            const { data: rsvps } = await supabaseClient
                .from('event_rsvps')
                .select('*')
                .eq('user_id', globalThis.evtCurrentUser.id)
                .in('event_id', ids);
            (rsvps || []).forEach(r => { window.evtAllRsvps[r.event_id] = r; });
        }

        // Scoped attendee query (events_003 §12.1 LOCKED)
        // ONE query — filtered by event_id IN currentIds + status='going'
        // Cap 5 avatars / event client-side. Never N+1.
        // evtAttendees      = up-to-5 profile objects (for avatar stack)
        // evtAttendeeCounts = true total including guests (for "N going" label)
        globalThis.evtAttendees = {};
        globalThis.evtAttendeeCounts = {};
        if (ids.length) {
            const [{ data: going, error: aErr }, { data: guestGoing, error: gErr }] = await Promise.all([
                supabaseClient
                    .from('event_rsvps')
                    .select('event_id, profiles:user_id(profile_picture_url, first_name)')
                    .eq('status', 'going')
                    .in('event_id', ids),
                supabaseClient
                    .from('event_guest_rsvps')
                    .select('event_id, status, paid')
                    .in('event_id', ids),
            ]);
            if (!aErr && going) {
                going.forEach(row => {
                    if (!row.profiles) return;
                    const list = (window.evtAttendees[row.event_id] ||= []);
                    if (list.length < 5) list.push(row.profiles);
                    window.evtAttendeeCounts[row.event_id] = (window.evtAttendeeCounts[row.event_id] || 0) + 1;
                });
            }
            if (!gErr && guestGoing) {
                guestGoing.forEach(row => {
                    if (row.status === 'going' || row.paid === true) {
                        window.evtAttendeeCounts[row.event_id] = (window.evtAttendeeCounts[row.event_id] || 0) + 1;
                    }
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
// =========================================================
// Header (list/header.js — PortalEventsListHeader)
// =========================================================
function _renderHeaderCount() {
    return window.PortalEventsListHeader.renderHeaderCount();
}
function _initHeaderBell() {
    return window.PortalEventsListHeader.initHeaderBell();
}

// Hero + rails (list/hero-rails.js — PortalEventsListHeroRails)
// =========================================================
function _pickHero(events) {
    return window.PortalEventsListHeroRails.pickHero(events);
}
function _renderHero(event, rsvp) {
    return window.PortalEventsListHeroRails.renderHero(event, rsvp);
}
function _renderLiveBanner(events) {
    return window.PortalEventsListHeroRails.renderLiveBanner(events);
}
function _renderGoingRail(events, rsvps, attendees, heroId, eventsById) {
    return window.PortalEventsListHeroRails.renderGoingRail(events, rsvps, attendees, heroId, eventsById);
}
function _miniCard(event, attendees, goingCount) {
    return window.PortalEventsListHeroRails.miniCard(event, attendees, goingCount);
}
function _renderTopPicks(events, attendees, heroId, eventsById) {
    return window.PortalEventsListHeroRails.renderTopPicks(events, attendees, heroId, eventsById);
}

// Buckets (list/buckets.js — PortalEventsListBuckets)
// =========================================================
function _renderBucket(label, events, rsvps, attendees) {
    return window.PortalEventsListBuckets.renderBucket(label, events, rsvps, attendees);
}

// F10–F12 — Right rail (list/right-rail.js — PortalEventsListRightRail)
// =========================================================
function _renderMiniCalendar() {
    return window.PortalEventsListRightRail.renderMiniCalendar();
}
function _renderMyRsvps() {
    return window.PortalEventsListRightRail.renderMyRsvps();
}
function _renderStatsCard() {
    return window.PortalEventsListRightRail.renderStatsCard();
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
                window.PortalEventsListFilters.toggleActiveCategory(cat);
                _persistState();
                renderEvents();
                return;
            }
            // F7 — footer details button opens detail; RSVP actions live elsewhere.
            const rsvpBtn = e.target.closest('button[data-evt-card-rsvp]');
            if (rsvpBtn && link.contains(rsvpBtn)) {
                e.preventDefault();
                e.stopPropagation();
                if (ev.slug && typeof globalThis.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof globalThis.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
                return;
            }
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();
            if (ev.slug && typeof globalThis.evtNavigateToEvent === 'function') {
                window.evtNavigateToEvent(ev.slug);
            } else if (typeof globalThis.evtOpenDetail === 'function') {
                window.evtOpenDetail(ev.id);
            }
        });
    });
}

function _renderActiveFilterPill() {
    return window.PortalEventsListFilters.renderActiveFilterPill();
}

// =========================================================
// Phase B2 — Live banner (events_003 §5.3)
//   Single-line banner above the filter strip whenever
//   ≥ 1 event is currently in [start, end] window.
// =========================================================
function _matchesType(ev) {
    return window.PortalEventsListFilters.matchesType(ev);
}
function _matchesCategory(ev) {
    return window.PortalEventsListFilters.matchesCategory(ev);
}
function _matchesLifecycle(ev) {
    return window.PortalEventsListFilters.matchesLifecycle(ev);
}
function _matchesDate(ev) {
    return window.PortalEventsListFilters.matchesDate(ev);
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
    const hero = (tab === 'upcoming') ? _pickHero(filtered) : null;
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

    // F8 — If no buckets rendered (e.g. all events are the hero) but user can create,
    // inject the standalone create tile so it's still reachable.
    if (!_createTileInjected && document.body.classList.contains('evt-vlift') && tab === 'upcoming') {
        const canCreate = typeof canCreateEvents === 'function' && canCreateEvents();
        if (canCreate) {
            const tileWrap =
                '<div class="evt-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' +
                    '<button type="button" data-evt-create-tile class="evt-create-tile" aria-label="Create new event">' +
                        '<span class="evt-create-tile__plus" aria-hidden="true">+</span>' +
                        '<span class="evt-create-tile__label">Create Event</span>' +
                        '<span class="evt-create-tile__hint">Add a new event to the calendar</span>' +
                    '</button>' +
                '</div>';
            groupsEl.innerHTML += tileWrap;
            _createTileInjected = true;
        }
    }

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

    const canCreate = typeof canCreateEvents === 'function' && canCreateEvents();

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
            window.PortalEventsListFilters.clearFiltersForEmptySearch();
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

function _switchLifecycleTab(tab) {
    return window.PortalEventsListFilters.switchLifecycleTab(tab);
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

function initFilterChips() {
    return window.PortalEventsListFilters.initFilterChips();
}

// =========================================================
// Search setup — delegated to list/search.js
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
    const canCreate = typeof canCreateEvents === 'function' && canCreateEvents();
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
//   trigger a reload via globalThis.evtLoadEvents. Excluded when the
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
            const p = (typeof globalThis.evtLoadEvents === 'function')
                ? window.evtLoadEvents()
                : Promise.resolve();
            Promise.resolve(p).finally(() => setTimeout(done, 300));
        } catch (_) { done(); }
    });
}


function _bindListModuleApis() {
    globalThis.PortalEventsListSearchApi = {
        getSearchQuery: () => _searchQuery,
        setSearchQuery: (q) => { _searchQuery = q; },
        getActiveCategory: () => window.PortalEventsListFilters.getActiveCategory(),
        setActiveCategory: (c) => window.PortalEventsListFilters.setActiveCategory(c),
        persistState: _persistState,
        renderEvents: renderEvents,
        getSearchDebounce: () => _searchDebounce,
        setSearchDebounce: (id) => { _searchDebounce = id; },
    };
    globalThis.PortalEventsListFiltersApi = {
        getSearchQuery: () => _searchQuery,
        setSearchQuery: (q) => { _searchQuery = q; },
        getActiveView: () => _activeView,
        setActiveView: (v) => { _activeView = v; },
        getActiveDay: () => _activeDay,
        setActiveDay: (d) => { _activeDay = d; },
        getExpandedBucket: () => _expandedBucket,
        setExpandedBucket: (b) => { _expandedBucket = b; },
        applyViewChrome: _applyViewChrome,
        renderEvents: renderEvents,
    };
    globalThis.PortalEventsListCalendarApi = {
        getCalMonth: () => _calMonth,
        setCalMonth: (d) => { _calMonth = d; },
        notHidden: _notHidden,
        miniCard: (ev, att, cnt) => window.PortalEventsListHeroRails.miniCard(ev, att, cnt),
    };
    globalThis.PortalEventsListHeroRailsApi = {
        getSearchQuery: () => _searchQuery,
        notHidden: _notHidden,
        persistState: _persistState,
        renderEvents: renderEvents,
    };
    globalThis.PortalEventsListBucketsApi = {
        getExpandedBucket: () => _expandedBucket,
        setExpandedBucket: (b) => { _expandedBucket = b; },
        getCreateTileInjected: () => _createTileInjected,
        setCreateTileInjected: (v) => { _createTileInjected = v; },
    };
    globalThis.PortalEventsListRightRailApi = {
        getMiniCalMonth: () => _miniCalMonth,
        setMiniCalMonth: (d) => { _miniCalMonth = d; },
        getActiveDay: () => _activeDay,
        setActiveDay: (d) => { _activeDay = d; },
        renderEvents: renderEvents,
    };
}
_bindListModuleApis();

globalThis.evtLoadEvents = loadEvents;
globalThis.evtRenderEvents = renderEvents;
globalThis.evtRenderFeatured = function () { /* folded into hero+bucket pinned-first sort */ };
globalThis.evtUpdateHeroStats = function () { _renderHeaderCount(); };
globalThis.evtSetupSearch = setupSearch;
globalThis.evtInitFilterChips = initFilterChips;
window.evtLoadEvents = globalThis.evtLoadEvents;
window.evtRenderEvents = globalThis.evtRenderEvents;
window.evtRenderFeatured = globalThis.evtRenderFeatured;
window.evtUpdateHeroStats = globalThis.evtUpdateHeroStats;
window.evtSetupSearch = globalThis.evtSetupSearch;
window.evtInitFilterChips = globalThis.evtInitFilterChips;
globalThis.evtRenderCard = function (event) {
    const rsvps = window.evtAllRsvps || {};
    const attendees = window.evtAttendees || {};
    const counts = window.evtAttendeeCounts || {};
    return Card ? Card.render(event, {
        rsvp: rsvps[event.id] || null,
        attendees: attendees[event.id] || [],
        goingCount: counts[event.id] || (attendees[event.id] || []).length,
        variant: 'portal',
    }) : '';
};
window.evtRenderCard = globalThis.evtRenderCard;

// =========================================================
// PortalEvents.list public surface
//
// Phase 3A: expanded namespace. All entries remain closure-
// scoped — this is a discovery surface for Phase 5 splitting.
// No behavior change; all classic-script globals preserved.
// =========================================================
export const portalEventsListApi = {
    // ── Core public API (init.js consumers) ─────────────
    load:              loadEvents,
    render:            renderEvents,
    setupSearch:       setupSearch,
    initFilterChips:   initFilterChips,
    // ── Sub-renderers ────────────────────────────────────
    renderHero:        _renderHero,
    pickHero:          _pickHero,
    renderSkeletons:   renderSkeletons,
    renderCalendar:    _renderCalendar,
    renderGoingRail:   _renderGoingRail,
    renderTopPicks:    _renderTopPicks,
    renderMiniCalendar: _renderMiniCalendar,
    renderMyRsvps:     _renderMyRsvps,
    renderStatsCard:   _renderStatsCard,
    renderBucket:      _renderBucket,
    // ── Filter predicates ────────────────────────────────
    matchesType:       _matchesType,
    matchesCategory:   _matchesCategory,
    matchesLifecycle:  _matchesLifecycle,
    matchesDate:       _matchesDate,
    // ── UI initializers ──────────────────────────────────
    initStickyHeader:  _initStickyHeader,
    initMobileFab:     _initMobileFab,
};

// Mobile-only: relocate the search input row + filter button next to it,
// above the chip rail. On desktop, restore them to their original DOM
// homes so the existing search-toggle expand UX keeps working unchanged.
function _initMobileFilterStrip() {
    const searchExpand = document.getElementById('evtSearchExpand');
    const mSearchHost  = document.getElementById('evtMobileSearchHost');
    const filterRow2   = document.getElementById('evtFilterRow2');
    if (!searchExpand || !mSearchHost) return;

    // Remember original parent so we can restore on resize-up
    if (!searchExpand.dataset.dHome) {
        searchExpand.dataset.dHome = '1';
        searchExpand._dHomeParent = searchExpand.parentElement;
        searchExpand._dHomeNext   = searchExpand.nextSibling;
    }

    const mq = window.matchMedia('(max-width: 639px)');
    const apply = () => {
        if (mq.matches) {
            // Mobile: move search into mobile row, hide the desktop filter row
            if (searchExpand.parentElement !== mSearchHost) {
                mSearchHost.appendChild(searchExpand);
            }
            searchExpand.classList.remove('hidden', 'mt-2');
            if (filterRow2) filterRow2.classList.add('hidden');
        } else {
            // Desktop: restore search to filterRow2
            if (searchExpand.parentElement !== searchExpand._dHomeParent) {
                searchExpand._dHomeParent.insertBefore(
                    searchExpand,
                    searchExpand._dHomeNext && searchExpand._dHomeNext.parentElement === searchExpand._dHomeParent
                        ? searchExpand._dHomeNext : null
                );
                // Re-hide unless user has an active search
                if (!_searchQuery) searchExpand.classList.add('hidden');
                searchExpand.classList.add('mt-2');
            }
            if (filterRow2) filterRow2.classList.remove('hidden');
        }
    };
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
}

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
    _initMobileFilterStrip();
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

globalThis.PortalEvents = globalThis.PortalEvents || {};
globalThis.PortalEvents.list = portalEventsListApi;
if (typeof window !== 'undefined') window.PortalEvents = globalThis.PortalEvents;

export { loadEvents, renderEvents, setupSearch, initFilterChips };
