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
    // Header count
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

    function _heroBg(event) {
        const url = event.banner_url;
        if (url) {
            const safe = String(url).replace(/'/g, "%27");
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
        const href = event.slug
            ? ('?event=' + encodeURIComponent(event.slug))
            : 'javascript:void(0)';

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
        const cards = events.map(ev => Card.render(ev, {
            rsvp: rsvps[ev.id] || null,
            href: ev.slug ? ('?event=' + encodeURIComponent(ev.slug)) : 'javascript:void(0)',
            variant: 'portal',
            attendees: attendees[ev.id] || [],
        })).join('');
        const slug = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const safeLabel = (H.escapeHtml || (s => s))(label);
        return '<section data-bucket="' + slug + '">' +
            '<h2 class="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 mb-3">' + safeLabel + '</h2>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + cards + '</div>' +
        '</section>';
    }

    // Wire card click navigation (anchor hrefs are real but we hijack
    // for SPA detail-view open when running in the unified portal).
    function _wireCardClicks(scope, eventsById) {
        scope.querySelectorAll('a[data-evt-card]').forEach(link => {
            const id = link.getAttribute('data-evt-card');
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

    // =========================================================
    // Filter helpers
    // =========================================================
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

    // =========================================================
    // MAIN render
    // =========================================================
    function renderEvents() {
        const groupsEl = document.getElementById('evtGroups');
        const heroEl   = document.getElementById('evtHero');
        const empty    = document.getElementById('emptyState');
        if (!groupsEl || !Card) return;

        _renderHeaderCount();

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

            const q = _searchQuery.toLowerCase();
            const titleHits = [];
            const descHits  = [];
            all.forEach(e => {
                if (e.status === 'cancelled') return;
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
        const filtered = all.filter(e => _matchesType(e) && _matchesLifecycle(e));
        const tab = window.evtActiveTab || 'upcoming';

        // Pick hero only on Upcoming tab
        const hero = (tab === 'upcoming') ? _pickHero(filtered, rsvps) : null;
        _renderHero(hero, hero ? rsvps[hero.id] : null);

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

        groupsEl.innerHTML = groups
            .filter(g => g.events.length)
            .map(g => _renderBucket(g.label, g.events, rsvps, attendees))
            .join('');

        _wireCardClicks(groupsEl, eventsById);
    }

    function _renderEmptyCopy() {
        const tab = window.evtActiveTab || 'upcoming';
        const titleEl = document.getElementById('emptyTitle');
        const subEl   = document.getElementById('emptySubtext');
        const ctaBtn  = document.getElementById('emptyCreateBtn');

        const titles = {
            upcoming: _searchQuery ? 'No matches for "' + _searchQuery + '"' : 'No upcoming events',
            past:     'No past events yet',
            going:    "Not going to any events",
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

        const canCreate = (typeof hasPermission === 'function' && hasPermission('events.create')) ||
                          window.evtCurrentUserRole === 'admin';
        if (ctaBtn) {
            const showCta = !_searchQuery && tab === 'upcoming' && canCreate;
            ctaBtn.classList.toggle('hidden', !showCta);
        }
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
                    closeMenu();
                    renderEvents();
                });
            });
        }

        // Empty-state Create button → trigger same modal as header button
        const emptyCreate = document.getElementById('emptyCreateBtn');
        emptyCreate?.addEventListener('click', () => {
            document.getElementById('createEventBtn')?.click();
        });
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
                } else if (input.value) {
                    input.value = '';
                    _searchQuery = '';
                    clear?.classList.add('hidden');
                    renderEvents();
                }
            });
        }

        if (!input) return;

        input.addEventListener('input', () => {
            const q = input.value.trim();
            clear?.classList.toggle('hidden', !q);
            clearTimeout(_searchDebounce);
            _searchDebounce = setTimeout(() => {
                _searchQuery = q;
                renderEvents();
            }, 120);
        });

        clear?.addEventListener('click', () => {
            input.value = '';
            clear.classList.add('hidden');
            _searchQuery = '';
            renderEvents();
            input.focus();
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (input.value) {
                    clear?.click();
                } else if (expand) {
                    expand.classList.add('hidden');
                    toggle?.setAttribute('aria-expanded', 'false');
                    toggle?.focus();
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
    // Mobile FAB (events_003 §8.9)
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
    }

    // =========================================================
    // Legacy global aliases
    // =========================================================
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
        renderSkeletons();
        _initStickyHeader();
        _initMobileFab();
    }
    if (document.readyState !== 'loading') _onReady();
    else document.addEventListener('DOMContentLoaded', _onReady, { once: true });
})();
