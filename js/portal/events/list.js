// ═══════════════════════════════════════════════════════════
// Portal Events — List (load, render, cards)
// ═══════════════════════════════════════════════════════════

async function evtLoadEvents() {
    try {
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('*')
            .in('status', ['open', 'confirmed', 'active', 'completed'])
            .order('start_date', { ascending: true });

        if (error) throw error;
        evtAllEvents = events || [];

        // Also fetch drafts if admin
        if (evtCurrentUserRole === 'admin') {
            const { data: drafts } = await supabaseClient
                .from('events')
                .select('*')
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

        evtRenderEvents();
    } catch (err) {
        console.error('Failed to load events:', err);
        document.getElementById('eventsGrid').innerHTML =
            '<p class="text-sm text-red-500 col-span-full text-center py-8">Failed to load events. Please refresh.</p>';
    }
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
        return e.status === 'completed' || new Date(e.start_date) < now;
    });

    if (evtActiveTab === 'upcoming') {
        events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    } else {
        events.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    }

    if (!events.length) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        document.getElementById('emptyTitle').textContent = evtActiveTab === 'upcoming' ? 'No upcoming events' : 'No past events yet';
        document.getElementById('emptySubtext').textContent = evtActiveTab === 'upcoming'
            ? 'Check back soon — events will show up here!'
            : 'Past events will appear here after they wrap up.';
        return;
    }

    empty.classList.add('hidden');
    grid.innerHTML = events.map(e => evtRenderCard(e)).join('');

    // Card click → detail modal
    grid.querySelectorAll('[data-event-id]').forEach(card => {
        card.addEventListener('click', () => evtOpenDetail(card.dataset.eventId));
    });
}

// ─── Single Card ────────────────────────────────────────

function evtRenderCard(event) {
    const tc = TYPE_COLORS[event.event_type] || TYPE_COLORS.member;
    const rsvp = evtAllRsvps[event.id];
    const start = new Date(event.start_date);
    const dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const bannerBg = event.banner_url
        ? `background-image:url('${event.banner_url}');background-size:cover;background-position:center;`
        : `background:linear-gradient(135deg,#6366f1,#8b5cf6);`;

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

    return `
        <div class="event-card bg-white rounded-2xl border border-gray-200/80 overflow-hidden cursor-pointer hover:shadow-md transition" data-event-id="${event.id}">
            <div class="h-36 relative" style="${bannerBg}">
                <div class="absolute top-3 left-3 flex gap-1.5">
                    <span class="type-tag ${tc.bg} ${tc.text}">${tc.label}</span>
                    ${statusTag}
                </div>
                ${rsvpBadge ? `<div class="absolute top-3 right-3">${rsvpBadge}</div>` : ''}
                <div class="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800">${dateStr}</div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-gray-900 text-sm leading-snug line-clamp-2">${evtEscapeHtml(event.title)}</h3>
                <p class="text-xs text-gray-500 mt-1.5 line-clamp-2">${evtEscapeHtml(event.description || '')}</p>
                <div class="flex items-center justify-between mt-3">
                    <div class="flex items-center gap-1.5 text-xs text-gray-400">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeStr}
                    </div>
                    ${event.location_text ? `
                    <div class="flex items-center gap-1 text-xs text-gray-400 truncate max-w-[140px]">
                        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span class="truncate">${evtEscapeHtml(event.location_text)}</span>
                    </div>` : ''}
                </div>
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
