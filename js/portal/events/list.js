// ═══════════════════════════════════════════════════════════
// Portal Events — List (load, render, cards, search, pinned)
// ═══════════════════════════════════════════════════════════

// ── Category → modern tag classes ────────────────────────
const EVT_CATEGORY_TAG = {
    birthday:   { cls: 'evt-tag--pink',   label: 'Birthday' },
    party:      { cls: 'evt-tag--orange', label: 'Party' },
    hangout:    { cls: 'evt-tag--green',  label: 'Hangout' },
    game_night: { cls: 'evt-tag--purple', label: 'Game Night' },
    cookout:    { cls: 'evt-tag--orange', label: 'Cookout' },
    trip:       { cls: 'evt-tag--teal',   label: 'Trip' },
    retreat:    { cls: 'evt-tag--teal',   label: 'Retreat' },
    dinner:     { cls: 'evt-tag--blue',   label: 'Dinner' },
    holiday:    { cls: 'evt-tag--blue',   label: 'Holiday' },
    investment: { cls: 'evt-tag--blue',   label: 'Investment' },
    annual:     { cls: 'evt-tag--purple', label: 'Annual' },
};
const EVT_DEFAULT_TAG = { cls: 'evt-tag--purple', label: 'Event' };

// ── Category → card gradient (for missing banners) ───────
const EVT_CATEGORY_GRADIENT = {
    birthday:   'linear-gradient(135deg,#7c3aed,#a855f7)',
    party:      'linear-gradient(135deg,#ea580c,#f97316)',
    hangout:    'linear-gradient(135deg,#059669,#10b981)',
    game_night: 'linear-gradient(135deg,#312e81,#4f46e5)',
    cookout:    'linear-gradient(135deg,#92400e,#b45309)',
    trip:       'linear-gradient(135deg,#0f766e,#14b8a6)',
    retreat:    'linear-gradient(135deg,#0369a1,#0ea5e9)',
    dinner:     'linear-gradient(135deg,#1d4ed8,#3b82f6)',
    holiday:    'linear-gradient(135deg,#166534,#22c55e)',
    investment: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
    annual:     'linear-gradient(135deg,#312e81,#4f46e5)',
};
const EVT_DEFAULT_GRADIENT = 'linear-gradient(135deg,#374151,#6b7280)';

// ── SVG snippets ─────────────────────────────────────────
const EVT_SVG_CALENDAR = '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
const EVT_SVG_PIN = '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';

// ─── Load Events ────────────────────────────────────────

async function evtLoadEvents() {
    try {
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
            .in('status', ['open', 'confirmed', 'active', 'completed'])
            .order('start_date', { ascending: true });

        if (error) throw error;
        evtAllEvents = events || [];

        // Also fetch drafts if admin
        if (evtCurrentUserRole === 'admin') {
            const { data: drafts } = await supabaseClient
                .from('events')
                .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
                .eq('status', 'draft')
                .eq('created_by', evtCurrentUser.id)
                .order('created_at', { ascending: false });
            if (drafts) evtAllEvents = [...drafts, ...evtAllEvents];
        }

        // Load user's RSVPs
        if (evtCurrentUser) {
            const eventIds = evtAllEvents.map(e => e.id);
            if (eventIds.length) {
                const { data: rsvps } = await supabaseClient
                    .from('event_rsvps')
                    .select('*')
                    .eq('user_id', evtCurrentUser.id)
                    .in('event_id', eventIds);
                evtAllRsvps = {};
                (rsvps || []).forEach(r => evtAllRsvps[r.event_id] = r);
            }
        }

        evtRenderFeatured();
        evtRenderEvents();
    } catch (err) {
        console.error('Failed to load events:', err);
        document.getElementById('eventsGrid').innerHTML =
            '<p class="text-sm text-red-500 col-span-full text-center py-8">Failed to load events. Please refresh.</p>';
    }
}

// ─── Render Featured / Pinned Carousel ──────────────────

function evtRenderFeatured() {
    const section = document.getElementById('evtFeaturedSection');
    const carousel = document.getElementById('evtFeaturedCarousel');
    const countEl = document.getElementById('evtFeaturedCount');
    if (!section || !carousel) return;

    const now = new Date();
    const pinned = evtAllEvents.filter(e => e.event_type === 'llc' && new Date(e.start_date) >= now && e.status !== 'draft');

    if (pinned.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    if (countEl) countEl.textContent = pinned.length + ' event' + (pinned.length !== 1 ? 's' : '');

    carousel.innerHTML = pinned.map(ev => {
        const tag = EVT_CATEGORY_TAG[ev.category] || EVT_DEFAULT_TAG;
        const gradient = EVT_CATEGORY_GRADIENT[ev.category] || EVT_DEFAULT_GRADIENT;
        const imgStyle = ev.banner_url
            ? 'background:url(' + evtEscapeHtml(ev.banner_url) + ') center/cover no-repeat;'
            : 'background:' + gradient + ';';
        const start = ev.start_date ? new Date(ev.start_date) : null;
        const dateStr = start ? start.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        const locStr = ev.location_nickname || ev.location_text || '';
        const isoDate = ev.start_date ? ev.start_date.slice(0, 10) : '';

        return `
            <div class="evt-featured-card" data-featured-id="${ev.id}">
                <div class="evt-featured-card__img" style="${imgStyle}">
                    ${isoDate ? '<span class="evt-countdown-chip" data-countdown="' + isoDate + '">…</span>' : ''}
                </div>
                <div class="evt-featured-card__body">
                    <div class="flex items-center justify-between">
                        <span class="evt-tag ${tag.cls}">${evtEscapeHtml(tag.label)}</span>
                    </div>
                    <h3 class="evt-featured-card__title">${evtEscapeHtml(ev.title)}</h3>
                    ${dateStr ? '<p class="evt-featured-card__meta">' + EVT_SVG_CALENDAR + ' ' + evtEscapeHtml(dateStr) + '</p>' : ''}
                    ${locStr ? '<p class="evt-featured-card__meta">' + EVT_SVG_PIN + ' ' + evtEscapeHtml(locStr) + '</p>' : ''}
                </div>
            </div>`;
    }).join('');

    // Wire clicks → detail navigation
    carousel.querySelectorAll('.evt-featured-card[data-featured-id]').forEach(card => {
        const event = evtAllEvents.find(e => e.id === card.dataset.featuredId);
        if (event && event.slug) {
            card.addEventListener('click', () => evtNavigateToEvent(event.slug));
        } else {
            card.addEventListener('click', () => evtOpenDetail(card.dataset.featuredId));
        }
    });

    // Countdown chips
    evtInitCountdowns();
}

// ─── Countdown Chips ────────────────────────────────────

function evtInitCountdowns() {
    const chips = document.querySelectorAll('.evt-countdown-chip[data-countdown]');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    chips.forEach(chip => {
        const d = new Date(chip.dataset.countdown);
        d.setHours(0, 0, 0, 0);
        const diff = Math.round((d - today) / 86400000);
        if (diff < 0)       chip.textContent = 'Past';
        else if (diff === 0) chip.textContent = 'Today';
        else if (diff === 1) chip.textContent = 'Tomorrow';
        else                chip.textContent = 'In ' + diff + ' days';
    });
}

// ─── Render Grid ────────────────────────────────────────

function evtRenderEvents() {
    const grid = document.getElementById('eventsGrid');
    const empty = document.getElementById('emptyState');
    const filter = document.getElementById('typeFilter').value;
    const now = new Date();

    // Update hero stats
    evtUpdateHeroStats();

    let events = evtAllEvents.filter(e => {
        if (filter !== 'all' && e.event_type !== filter) return false;
        if (evtActiveTab === 'upcoming') return new Date(e.start_date) >= now || e.status === 'active' || e.status === 'open' || e.status === 'confirmed' || e.status === 'draft';
        if (evtActiveTab === 'past') return e.status === 'completed' || new Date(e.start_date) < now;
        if (evtActiveTab === 'going') { const r = evtAllRsvps[e.id]; return r && r.status === 'going'; }
        return true;
    });

    if (evtActiveTab === 'upcoming' || evtActiveTab === 'going') {
        events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    } else {
        events.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    }

    if (!events.length) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        const titles = { upcoming: 'No upcoming events', past: 'No past events yet', going: 'Not going to any events' };
        const subs = { upcoming: 'Check back soon — events will show up here!', past: 'Past events will appear here after they wrap up.', going: 'RSVP to an event to see it here.' };
        document.getElementById('emptyTitle').textContent = titles[evtActiveTab] || titles.upcoming;
        document.getElementById('emptySubtext').textContent = subs[evtActiveTab] || subs.upcoming;
        return;
    }

    empty.classList.add('hidden');
    grid.innerHTML = events.map(e => evtRenderCard(e)).join('');

    // Card click → detail page
    grid.querySelectorAll('[data-event-id]').forEach(card => {
        const event = evtAllEvents.find(e => e.id === card.dataset.eventId);
        if (event && event.slug) {
            card.addEventListener('click', () => evtNavigateToEvent(event.slug));
        } else {
            card.addEventListener('click', () => evtOpenDetail(card.dataset.eventId));
        }
    });
}

// ─── Single Card ────────────────────────────────────────

function evtRenderCard(event) {
    const tc = TYPE_COLORS[event.event_type] || TYPE_COLORS.member;
    const tag = EVT_CATEGORY_TAG[event.category] || EVT_DEFAULT_TAG;
    const rsvp = evtAllRsvps[event.id];
    const start = new Date(event.start_date);
    const monthStr = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayStr = start.getDate();
    const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const emoji = CATEGORY_EMOJI[event.category] || '📌';

    const gradient = EVT_CATEGORY_GRADIENT[event.category] || EVT_DEFAULT_GRADIENT;
    const bannerImg = event.banner_url
        ? `<img src="${event.banner_url}" class="w-full h-full object-cover" alt="" loading="lazy">`
        : `<div class="w-full h-full flex items-center justify-center" style="background:${gradient}"><span class="text-4xl opacity-60">${emoji}</span></div>`;

    let rsvpBadge = '';
    if (rsvp) {
        const badgeColor = rsvp.status === 'going' ? 'bg-emerald-100 text-emerald-700' : rsvp.status === 'maybe' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500';
        const badgeText = rsvp.status === 'going' ? '✓ Going' : rsvp.status === 'maybe' ? '? Maybe' : 'Not Going';
        rsvpBadge = `<span class="rsvp-badge ${badgeColor}">${badgeText}</span>`;
    }

    let statusTag = '';
    if (event.status === 'draft') {
        statusTag = `<span class="type-tag bg-gray-200 text-gray-600">DRAFT</span>`;
    }

    // Creator info
    const cr = event.creator;
    let creatorHtml = '';
    if (cr && event.event_type === 'member') {
        const crName = [cr.first_name, cr.last_name].filter(Boolean).join(' ') || 'Member';
        const crInitials = ((cr.first_name || '?')[0] + (cr.last_name || '')[0]).toUpperCase();
        const crBadge = evtBadgeChip(cr.displayed_badge);
        creatorHtml = `
            <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100/60">
                <div class="relative flex-shrink-0">
                    <div class="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden ring-1 ring-gray-200/80">
                        ${cr.profile_picture_url ? `<img src="${cr.profile_picture_url}" class="w-full h-full object-cover" alt="">` : `<span class="text-brand-600 text-[9px] font-bold">${crInitials}</span>`}
                    </div>
                    ${crBadge ? `<div class="absolute -bottom-0.5 -right-0.5" style="transform:scale(.7);transform-origin:bottom right">${crBadge}</div>` : ''}
                </div>
                <span class="text-[11px] text-gray-500 truncate">by <span class="font-semibold text-gray-700">${evtEscapeHtml(crName)}</span></span>
            </div>`;
    }

    // Countdown for date chip
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const evDate = new Date(event.start_date); evDate.setHours(0, 0, 0, 0);
    const diff = Math.round((evDate - today) / 86400000);
    let countdownLabel = '';
    if (diff === 0) countdownLabel = 'Today';
    else if (diff === 1) countdownLabel = 'Tomorrow';
    else if (diff > 1 && diff <= 14) countdownLabel = diff + 'd';

    return `
        <div class="event-card" data-event-id="${event.id}">
            <div class="event-card-img">
                ${bannerImg}
                <div class="absolute top-3 left-3 flex gap-1.5 z-[2]">
                    <span class="evt-tag ${tag.cls}">${evtEscapeHtml(tag.label)}</span>
                    ${statusTag}
                </div>
                ${rsvpBadge ? `<div class="absolute top-3 right-3 z-[2]">${rsvpBadge}</div>` : ''}
                <div class="event-card-date-chip">
                    <div class="event-card-date-month">${monthStr}</div>
                    <div class="event-card-date-day">${dayStr}</div>
                    ${countdownLabel ? `<div class="text-[9px] font-bold text-brand-500 leading-none mt-0.5">${countdownLabel}</div>` : ''}
                </div>
            </div>
            <div class="p-4 pb-5">
                <h3 class="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2">${evtEscapeHtml(event.title)}</h3>
                <p class="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">${evtEscapeHtml(event.description || '')}</p>
                <div class="flex items-center justify-between mt-3">
                    <div class="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeStr}
                    </div>
                    ${event.location_nickname || event.location_text ? `
                    <div class="flex items-center gap-1 text-xs text-gray-400 truncate max-w-[140px]">
                        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span class="truncate">${evtEscapeHtml(event.location_nickname || event.location_text)}</span>
                    </div>` : ''}
                </div>
                ${creatorHtml}
            </div>
        </div>
    `;
}

// ─── Hero Stats ─────────────────────────────────────────

function evtUpdateHeroStats() {
    const now = new Date();
    const upcoming = evtAllEvents.filter(e => new Date(e.start_date) >= now && e.status !== 'draft');
    const rsvpCount = Object.values(evtAllRsvps).filter(r => r.status === 'going' || r.status === 'maybe').length;
    const next = upcoming.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

    const elUp = document.getElementById('heroUpcomingCount');
    const elRsvp = document.getElementById('heroRsvpCount');
    const elNext = document.getElementById('heroNextEvent');

    if (elUp) elUp.textContent = upcoming.length;
    if (elRsvp) elRsvp.textContent = rsvpCount;
    if (elNext) elNext.textContent = next ? next.title : 'None';
}

// ─── Search ─────────────────────────────────────────────

let evtSearchExpanded = false;

function evtOpenSearch() {
    const wrap = document.getElementById('evtSearchWrap');
    const input = document.getElementById('evtSearchInput');
    if (!wrap || evtSearchExpanded) return;
    evtSearchExpanded = true;
    wrap.classList.add('expanded');
    input.focus();
}

function evtCloseSearch() {
    const wrap = document.getElementById('evtSearchWrap');
    const input = document.getElementById('evtSearchInput');
    const dropdown = document.getElementById('evtSearchDropdown');
    if (!wrap) return;
    evtSearchExpanded = false;
    wrap.classList.remove('expanded');
    input.value = '';
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
}

function evtOnSearchInput() {
    const input = document.getElementById('evtSearchInput');
    const dropdown = document.getElementById('evtSearchDropdown');
    const q = input.value.trim();
    if (!q) { dropdown.style.display = 'none'; dropdown.innerHTML = ''; return; }

    const results = evtAllEvents.filter(e =>
        e.title.toLowerCase().includes(q.toLowerCase()) ||
        (e.location_text && e.location_text.toLowerCase().includes(q.toLowerCase()))
    );

    if (results.length === 0) {
        dropdown.innerHTML = '<p class="evt-search-empty">No events found for "<strong>' + evtEscapeHtml(q) + '</strong>"</p>';
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = results.map(ev => {
        const tag = EVT_CATEGORY_TAG[ev.category] || EVT_DEFAULT_TAG;
        const start = ev.start_date ? new Date(ev.start_date) : null;
        const dateStr = start ? start.toLocaleString('en-US', { month: 'short', day: 'numeric' }) : '';
        const locStr = ev.location_nickname || ev.location_text || 'Location TBD';
        const nameHtml = evtHighlightMatch(evtEscapeHtml(ev.title), q);
        return `
            <button class="evt-search-result" data-search-id="${ev.id}" data-search-slug="${ev.slug || ''}" type="button">
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">
                    <span class="evt-search-result__name">${nameHtml}</span>
                    <span class="evt-search-result__meta">${evtEscapeHtml(dateStr)} &middot; ${evtEscapeHtml(locStr)}</span>
                </div>
                <span class="evt-tag ${tag.cls} shrink-0">${evtEscapeHtml(tag.label)}</span>
            </button>`;
    }).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.evt-search-result').forEach(btn => {
        btn.addEventListener('click', () => {
            evtCloseSearch();
            if (btn.dataset.searchSlug) evtNavigateToEvent(btn.dataset.searchSlug);
            else evtOpenDetail(btn.dataset.searchId);
        });
    });
}

function evtHighlightMatch(text, q) {
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return text.replace(re, '<mark style="background:#c7d2fe;color:#3730a3;border-radius:2px;padding:0 1px">$1</mark>');
}

// ─── Filter Chips ───────────────────────────────────────

function evtInitFilterChips() {
    const chips = document.querySelectorAll('#evtFilterChips .evt-filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('evt-filter-chip--active'));
            chip.classList.add('evt-filter-chip--active');
            evtActiveTab = chip.dataset.filter;
            evtRenderEvents();
        });
    });
}

// ─── Search Listeners (called from init.js) ─────────────

function evtSetupSearch() {
    const wrap = document.getElementById('evtSearchWrap');
    const input = document.getElementById('evtSearchInput');
    const closeBtn = document.getElementById('evtSearchClose');
    if (!wrap) return;

    wrap.addEventListener('click', () => { if (!evtSearchExpanded) evtOpenSearch(); });
    input.addEventListener('click', e => e.stopPropagation());
    closeBtn.addEventListener('click', e => { e.stopPropagation(); evtCloseSearch(); });
    input.addEventListener('input', evtOnSearchInput);

    document.addEventListener('click', e => {
        if (evtSearchExpanded && !wrap.contains(e.target)) evtCloseSearch();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && evtSearchExpanded) evtCloseSearch();
    });
}
