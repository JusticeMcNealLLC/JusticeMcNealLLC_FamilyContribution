// Portal Events — List hero, going rail, top picks, live banner (Phase 5M.2C)
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const H = window.EventsHelpers   || {};
    const P = window.EventsPills     || {};

    function api() {
        return window.PortalEventsListHeroRailsApi || {};
    }

    function pickHero(events) {
        return events.find(e =>
            e.is_featured === true &&
            e.status !== 'cancelled' &&
            e.status !== 'draft'
        ) || null;
    }

    function heroBg(event, stripGradient) {
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

    function renderHero(event, rsvp) {
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

            // CTA — always "View Details"; navigates to the event detail page.

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
                ' class="block relative rounded-3xl overflow-hidden text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"' +
                ' style="' + heroBg(event, true) + '">' +
                    goingRibbon +
                    '<div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">' + countP + stateP + '</div>' +
                    // F14 — FEATURED EVENT kicker (vlift only; only shown when admin-featured)
                    (event.is_featured ? '<span class="evt-hero-kicker" data-f14-kicker>FEATURED EVENT</span>' : '') +
                    // Bottom-edge dark fade for legibility
                    '<div class="evt-hero-fade absolute inset-x-0 bottom-0 pointer-events-none" aria-hidden="true"></div>' +
                    '<div class="evt-hero-meta absolute inset-x-0 bottom-0 p-5 sm:p-6">' +
                        // F20 — Date chip now INSIDE meta as a flex child so it
                        // stretches to the same height as the text column beside it
                        '<div class="evt-hero-datechip" data-f14-datechip aria-hidden="true">' +
                            (fMon ? '<span class="evt-hero-datechip__mon">' + esc(fMon) + '</span>' : '') +
                            (fDay !== '' ? '<span class="evt-hero-datechip__day">' + esc(fDay) + '</span>' : '') +
                            (fDow ? '<span class="evt-hero-datechip__dow">' + esc(fDow) + '</span>' : '') +
                        '</div>' +
                        // Text column
                        '<div class="evt-hero-meta-body">' +
                            // E7 — Avatar cluster
                            attendeeCluster(event.id) +
                            '<h2 class="text-xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md line-clamp-2">' + esc(event.title || 'Untitled event') + '</h2>' +
                            // F14 — Host line
                            (hostLine
                                ? '<p class="evt-hero-host" data-f14-host>' + esc(hostLine) + '</p>'
                                : '') +
                            // F20 — Time + location on the same line
                            ((timeShort || loc)
                                ? '<div class="evt-hero-timeloc" data-f14-timeloc>' +
                                    (timeShort ? '<span class="inline-flex items-center gap-1">' + clkIcon + esc(timeShort) + '</span>' : '') +
                                    (loc ? '<span class="inline-flex items-center gap-1">' + pinIcon + esc(loc) + '</span>' : '') +
                                  '</div>'
                                : '') +
                        '</div>' +
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
                // View Details button — absolutely positioned at bottom center of
                // the banner card (outside <a> to avoid nested interactive elements).
                '<button type="button" data-evt-hero-cta="' + esc(event.id) + '" class="evt-hero-cta" aria-label="View details for ' + esc(event.title || 'this event') + '">' +
                    'View Details' +
                '</button>' +
                '</div>';

            // Wire View Details CTA → navigate to event detail page
            const ctaBtn = heroEl.querySelector('button[data-evt-hero-cta]');
            if (ctaBtn) {
                ctaBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (href && href !== 'javascript:void(0)') {
                        window.location.href = href;
                    } else if (typeof window.evtNavigateToEvent === 'function') {
                        window.evtNavigateToEvent(event);
                    } else if (typeof window.evtOpenDetail === 'function') {
                        window.evtOpenDetail(event);
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
                ' style="' + heroBg(event) + '">' +
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
    function attendeeCluster(eventId) {
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
        const trueCount = (window.evtAttendeeCounts && window.evtAttendeeCounts[eventId]) || list.length;
        const labelN = String(trueCount);
        return '<button type="button" data-evt-hero-going="' + esc(eventId) + '"' +
            ' class="evt-hero-cluster" aria-label="See who is going">' +
                '<span class="evt-hero-cluster-stack">' + bubs + '</span>' +
                '<span class="evt-hero-cluster-label">' + labelN + ' going</span>' +
            '</button>';
    }

    function renderLiveBanner(events) {
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
    function renderGoingRail(events, rsvps, attendees, heroId, eventsById) {
        const rail   = document.getElementById('evtGoingRail');
        const scroll = document.getElementById('evtGoingRailScroll');
        if (!rail || !scroll) return;

        const now = new Date();
        const going = (events || []).filter(e => {
            if (e.id === heroId) return false;
            if (e.status === 'cancelled' || e.status === 'draft') return false;
            if (api().notHidden && !api().notHidden(e)) return false;
            const r = rsvps[e.id];
            if (!r || r.status !== 'going') return false;
            return new Date(e.start_date) >= now;
        }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        if (!going.length) { rail.classList.add('hidden'); scroll.innerHTML = ''; return; }

        rail.classList.remove('hidden');
        const counts = window.evtAttendeeCounts || {};
        scroll.innerHTML = going.map(ev => miniCard(ev, attendees[ev.id] || [], counts[ev.id])).join('');

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

    function miniCard(event, attendees, goingCount) {
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

        const attCount = (goingCount != null) ? goingCount : (attendees || []).length;
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
    function renderTopPicks(events, attendees, heroId, eventsById) {
        const rail   = document.getElementById('evtTopPicks');
        const scroll = document.getElementById('evtTopPicksScroll');
        if (!rail || !scroll) return;

        const useVlift = document.body.classList.contains('evt-vlift');
        const tab = window.evtActiveTab || 'upcoming';
        const inSearch = !!((api().getSearchQuery?.() || '')).trim();
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
            (api().notHidden ? api().notHidden(e) : true) &&
            new Date(e.start_date) >= now
        ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        if (picks.length < 2) {
            rail.classList.add('hidden');
            scroll.innerHTML = '';
            return;
        }

        rail.classList.remove('hidden');
        const counts = window.evtAttendeeCounts || {};
        scroll.innerHTML = picks.map(ev => miniCard(ev, attendees[ev.id] || [], counts[ev.id])).join('');

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
                window.PortalEventsListFilters.setActiveType('llc');
                window.PortalEventsListFilters.syncTypeChips('llc');
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
                api().persistState?.();
                api().renderEvents?.();
            });
        }
    }


    window.PortalEventsListHeroRails = {
        pickHero,
        heroBg,
        attendeeCluster,
        renderHero,
        renderLiveBanner,
        renderGoingRail,
        miniCard,
        renderTopPicks,
    };
})();
