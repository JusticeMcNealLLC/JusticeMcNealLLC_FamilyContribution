/* ════════════════════════════════════════════════════════════
   Portal Events — List view  (M1 rebuild)

   • Light editorial layout (matches admin/members vibe)
   • Mobile-first card grid via EventsCard.render()
   • Sticky single-row lifecycle filter chips + type pill row
   • Real search input + clear button (replaces expanding pill)
   • Featured/pinned LLC carousel
   • Hero stat tiles (Up Next / Upcoming / Your RSVPs)
   • Skeleton loading + Empty state with create CTA

   Preserves legacy global function names so unmodified
   modules (init.js, rsvp.js, create.js, competition.js)
   continue to work without changes.

   Surface namespace : window.PortalEvents.list
   Globals preserved : evtLoadEvents, evtRenderEvents,
                       evtRenderFeatured, evtUpdateHeroStats,
                       evtSetupSearch, evtInitFilterChips,
                       evtRenderCard
   Depends on        : EventsCard, EventsConstants, EventsHelpers,
                       EventsPills, supabaseClient, evtCurrentUser,
                       evtAllEvents, evtAllRsvps, evtActiveTab,
                       evtNavigateToEvent, evtOpenDetail,
                       hasPermission
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const H = window.EventsHelpers   || {};
    const P = window.EventsPills     || {};
    const Card = window.EventsCard;

    // ─── Local UI state ───────────────────────────────────
    let _searchQuery = '';
    let _activeType  = 'all';
    let _searchDebounce = null;

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

            // User's RSVPs
            if (window.evtCurrentUser) {
                const ids = window.evtAllEvents.map(e => e.id);
                window.evtAllRsvps = {};
                if (ids.length) {
                    const { data: rsvps } = await supabaseClient
                        .from('event_rsvps')
                        .select('*')
                        .eq('user_id', window.evtCurrentUser.id)
                        .in('event_id', ids);
                    (rsvps || []).forEach(r => { window.evtAllRsvps[r.event_id] = r; });
                }
            }

            renderFeatured();
            renderEvents();
        } catch (err) {
            console.error('Failed to load events:', err);
            const grid = document.getElementById('eventsGrid');
            if (grid) {
                grid.innerHTML = '<p class="text-sm text-red-500 col-span-full text-center py-8">Failed to load events. Please refresh.</p>';
            }
        }
    }

    // =========================================================
    // Rendering
    // =========================================================
    function renderSkeletons() {
        const grid = document.getElementById('eventsGrid');
        if (!grid || !Card) return;
        const n = 6;
        let html = '';
        for (let i = 0; i < n; i++) html += Card.skeleton();
        grid.innerHTML = html;
    }

    function renderHeroStats() {
        const all = window.evtAllEvents || [];
        const rsvps = window.evtAllRsvps || {};
        const now = new Date();

        const upcoming = all.filter(e => {
            if (e.status === 'cancelled' || e.status === 'draft') return false;
            return new Date(e.start_date) >= now;
        });
        const next = upcoming
            .slice()
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
        const rsvpCount = Object.values(rsvps)
            .filter(r => r.status === 'going' || r.status === 'maybe').length;

        const elUp = document.getElementById('heroUpcomingCount');
        const elRsvp = document.getElementById('heroRsvpCount');
        const elNext = document.getElementById('heroNextEvent');
        const elNextDate = document.getElementById('heroNextDate');

        if (elUp)   elUp.textContent   = upcoming.length;
        if (elRsvp) elRsvp.textContent = rsvpCount;
        if (next) {
            if (elNext) elNext.textContent = next.title || 'Untitled';
            if (elNextDate) {
                elNextDate.textContent = H.formatDate
                    ? H.formatDate(next.start_date, 'datetime')
                    : new Date(next.start_date).toLocaleString();
            }
        } else {
            if (elNext) elNext.textContent = 'No upcoming events';
            if (elNextDate) elNextDate.textContent = 'Check back soon';
        }
    }

    function renderFeatured() {
        const section = document.getElementById('evtFeaturedSection');
        const carousel = document.getElementById('evtFeaturedCarousel');
        const countEl = document.getElementById('evtFeaturedCount');
        if (!section || !carousel || !Card) return;

        const now = new Date();
        const pinned = (window.evtAllEvents || []).filter(e =>
            e.event_type === 'llc' &&
            e.status !== 'draft' &&
            e.status !== 'cancelled' &&
            new Date(e.start_date) >= now
        );

        if (!pinned.length) {
            section.classList.add('hidden');
            carousel.innerHTML = '';
            return;
        }

        section.classList.remove('hidden');
        if (countEl) countEl.textContent = pinned.length + ' event' + (pinned.length !== 1 ? 's' : '');

        const rsvps = window.evtAllRsvps || {};
        carousel.innerHTML = pinned.map(ev =>
            Card.render(ev, {
                rsvp: rsvps[ev.id] || null,
                href: 'javascript:void(0)',
                variant: 'portal',
            })
        ).join('');

        // Wire clicks → detail navigation (anchor href is void, we control nav)
        carousel.querySelectorAll('a').forEach((card, i) => {
            const ev = pinned[i];
            if (!ev) return;
            card.addEventListener('click', e => {
                e.preventDefault();
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });
    }

    function _matchesSearch(ev, q) {
        if (!q) return true;
        const needle = q.toLowerCase();
        return (
            (ev.title || '').toLowerCase().includes(needle) ||
            (ev.description || '').toLowerCase().includes(needle) ||
            (ev.location_text || '').toLowerCase().includes(needle) ||
            (ev.location_nickname || '').toLowerCase().includes(needle)
        );
    }

    function _matchesType(ev) {
        if (_activeType === 'all') return true;
        return ev.event_type === _activeType;
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
        return true;
    }

    function renderEvents() {
        const grid  = document.getElementById('eventsGrid');
        const empty = document.getElementById('emptyState');
        if (!grid || !empty || !Card) return;

        renderHeroStats();

        const all = window.evtAllEvents || [];
        const rsvps = window.evtAllRsvps || {};

        // Filter
        let events;
        if (_searchQuery) {
            events = all.filter(e => _matchesSearch(e, _searchQuery));
        } else {
            events = all.filter(e => _matchesType(e) && _matchesLifecycle(e));
        }

        // Sort
        const tab = window.evtActiveTab || 'upcoming';
        if (_searchQuery || tab === 'upcoming' || tab === 'going') {
            events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        } else {
            events.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        }

        // Empty state
        if (!events.length) {
            grid.innerHTML = '';
            grid.classList.add('hidden');
            empty.classList.remove('hidden');
            _renderEmptyCopy();
            return;
        }

        empty.classList.add('hidden');
        grid.classList.remove('hidden');
        grid.innerHTML = events.map(ev => Card.render(ev, {
            rsvp: rsvps[ev.id] || null,
            href: 'javascript:void(0)',
            variant: 'portal',
        })).join('');

        // Wire clicks (anchor hrefs are void; we route via evtNavigateToEvent)
        grid.querySelectorAll('a').forEach((card, i) => {
            const ev = events[i];
            if (!ev) return;
            card.addEventListener('click', e => {
                e.preventDefault();
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });
    }

    function _renderEmptyCopy() {
        const tab = window.evtActiveTab || 'upcoming';
        const titleEl = document.getElementById('emptyTitle');
        const subEl   = document.getElementById('emptySubtext');
        const ctaBtn  = document.getElementById('emptyCreateBtn');

        const titles = {
            upcoming: _searchQuery ? `No matches for "${_searchQuery}"` : 'No upcoming events',
            past:     'No past events yet',
            going:    'Not going to any events',
        };
        const subs = {
            upcoming: _searchQuery
                ? 'Try a different search term.'
                : 'Check back soon — events will show up here!',
            past:     'Past events will appear here after they wrap up.',
            going:    'RSVP to an event to see it here.',
        };
        if (titleEl) titleEl.textContent = titles[tab] || titles.upcoming;
        if (subEl)   subEl.textContent   = subs[tab]   || subs.upcoming;

        // Show create CTA only on the upcoming/empty case for permitted users
        const canCreate = (typeof hasPermission === 'function' && hasPermission('events.create')) ||
                          window.evtCurrentUserRole === 'admin';
        if (ctaBtn) {
            const showCta = !_searchQuery && tab === 'upcoming' && canCreate;
            ctaBtn.classList.toggle('hidden', !showCta);
        }
    }

    // =========================================================
    // Filter chips (lifecycle + type)
    // =========================================================
    function _activateChip(chip, group) {
        group.forEach(c => c.classList.remove('evt-chip--active'));
        chip.classList.add('evt-chip--active');
        try {
            chip.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        } catch (_) { /* Safari ≤ 14 */ }
    }

    function initFilterChips() {
        // Lifecycle chips (Upcoming / Past / Going)
        const lifecycleChips = Array.from(document.querySelectorAll('#evtFilterChips .evt-chip'));
        lifecycleChips.forEach(chip => {
            chip.addEventListener('click', () => {
                _activateChip(chip, lifecycleChips);
                window.evtActiveTab = chip.dataset.filter;
                renderEvents();
            });
        });

        // Type chips (All / LLC / Member / Competition)
        const typeChips = Array.from(document.querySelectorAll('#evtTypeChips .evt-chip'));
        typeChips.forEach(chip => {
            chip.addEventListener('click', () => {
                _activateChip(chip, typeChips);
                _activeType = chip.dataset.type || 'all';
                // Mirror to hidden #typeFilter <select> for legacy init.js compat
                const sel = document.getElementById('typeFilter');
                if (sel) sel.value = _activeType;
                renderEvents();
            });
        });

        // Empty-state Create button → trigger same modal as header button
        const emptyCreate = document.getElementById('emptyCreateBtn');
        emptyCreate?.addEventListener('click', () => {
            document.getElementById('createEventBtn')?.click();
        });
    }

    // =========================================================
    // Search
    // =========================================================
    function setupSearch() {
        const input = document.getElementById('evtSearchInput');
        const clear = document.getElementById('evtSearchClear');
        if (!input) return;

        input.addEventListener('input', () => {
            const q = input.value.trim();
            clear?.classList.toggle('hidden', !q);
            clearTimeout(_searchDebounce);
            _searchDebounce = setTimeout(() => {
                _searchQuery = q;
                // When searching, hide featured + chip rows aren't relevant —
                // we still leave them visible so the page doesn't jump; the
                // grid alone reflects the search.
                const featured = document.getElementById('evtFeaturedSection');
                if (featured) {
                    if (q) featured.classList.add('hidden');
                    else renderFeatured();
                }
                renderEvents();
            }, 120);
        });

        clear?.addEventListener('click', () => {
            input.value = '';
            clear.classList.add('hidden');
            _searchQuery = '';
            renderFeatured();
            renderEvents();
            input.focus();
        });

        // Escape clears + blurs
        input.addEventListener('keydown', e => {
            if (e.key === 'Escape' && input.value) {
                e.preventDefault();
                clear?.click();
            }
        });
    }

    // =========================================================
    // Legacy global aliases (keep init.js, rsvp.js, etc. working)
    // =========================================================
    window.evtLoadEvents      = loadEvents;
    window.evtRenderEvents    = renderEvents;
    window.evtRenderFeatured  = renderFeatured;
    window.evtUpdateHeroStats = renderHeroStats;
    window.evtSetupSearch     = setupSearch;
    window.evtInitFilterChips = initFilterChips;
    // Card renderer is now shared — keep stub for any stragglers
    window.evtRenderCard = function (event) {
        const rsvps = window.evtAllRsvps || {};
        return Card ? Card.render(event, { rsvp: rsvps[event.id] || null, variant: 'portal' }) : '';
    };

    // =========================================================
    // PortalEvents.list public surface
    // =========================================================
    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.list = {
        load:           loadEvents,
        render:         renderEvents,
        renderFeatured: renderFeatured,
        renderStats:    renderHeroStats,
        setupSearch:    setupSearch,
        initFilterChips: initFilterChips,
        renderSkeletons: renderSkeletons,
    };

    // Show skeleton placeholders ASAP (before init.js DOMContentLoaded fires
    // its loadEvents call). Safe to no-op if grid not yet in DOM.
    if (document.readyState !== 'loading') {
        renderSkeletons();
    } else {
        document.addEventListener('DOMContentLoaded', renderSkeletons, { once: true });
    }
})();
