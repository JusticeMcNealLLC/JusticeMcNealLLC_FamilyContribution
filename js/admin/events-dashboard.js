// ═══════════════════════════════════════════════════════════
// Admin — Events Dashboard
// Overview of all events, RSVPs, revenue, competitions,
// payouts, 1099 flags, and banner award tool.
// ═══════════════════════════════════════════════════════════

let adminEvents = [];
let adminRsvps = [];
let adminCheckins = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth({ permission: 'events.manage_all' });
    if (!user) return;

    setupAdminTabs();
    await loadEventsDashboard();
});

// ─── Tab Switching ──────────────────────────────────────

function setupAdminTabs() {
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            const tabMap = {
                'all-events': 'tabAllEvents',
                'competitions': 'tabCompetitions',
                'banners': 'tabBanners',
            };
            document.getElementById(tabMap[tab])?.classList.remove('hidden');
        });
    });

    // Status filter
    document.getElementById('tableStatusFilter')?.addEventListener('change', renderEventsTable);
}

// ─── Load Dashboard Data ────────────────────────────────

async function loadEventsDashboard() {
    // Load all events
    const { data: events } = await supabaseClient
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });
    adminEvents = events || [];

    // Load all RSVPs
    const { data: rsvps } = await supabaseClient
        .from('event_rsvps')
        .select('event_id, status, paid, user_id');
    adminRsvps = rsvps || [];

    // Load all check-ins
    const { data: checkins } = await supabaseClient
        .from('event_checkins')
        .select('event_id, user_id');
    adminCheckins = checkins || [];

    renderStats();
    renderEventsTable();
    loadCompetitionPayouts();
    loadBannerTools();
}

// ─── Render Stats Cards ─────────────────────────────────

function renderStats() {
    const total = adminEvents.length;
    const active = adminEvents.filter(e => ['open', 'confirmed', 'active'].includes(e.status)).length;
    const completed = adminEvents.filter(e => e.status === 'completed').length;
    const cancelled = adminEvents.filter(e => e.status === 'cancelled').length;

    document.getElementById('statTotalEvents').textContent = total;
    document.getElementById('statEventsBreakdown').textContent = `${active} active · ${completed} completed · ${cancelled} cancelled`;

    // RSVPs
    const going = adminRsvps.filter(r => r.status === 'going').length;
    const maybe = adminRsvps.filter(r => r.status === 'maybe').length;
    document.getElementById('statTotalRsvps').textContent = going + maybe;
    document.getElementById('statRsvpBreakdown').textContent = `${going} going · ${maybe} maybe`;

    // Revenue (from paid RSVPs — estimate based on event cost)
    let totalRevenue = 0;
    const paidRsvps = adminRsvps.filter(r => r.paid);
    paidRsvps.forEach(r => {
        const evt = adminEvents.find(e => e.id === r.event_id);
        if (evt?.rsvp_cost_cents) totalRevenue += evt.rsvp_cost_cents;
    });
    document.getElementById('statRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('statRevenueBreakdown').textContent = `${paidRsvps.length} paid RSVPs`;

    // Competitions
    const comps = adminEvents.filter(e => e.event_type === 'competition');
    const activeComps = comps.filter(e => ['open', 'confirmed', 'active'].includes(e.status)).length;
    document.getElementById('statCompetitions').textContent = comps.length;
    document.getElementById('statCompBreakdown').textContent = `${activeComps} active`;
}

// ─── Helper: Format Currency ────────────────────────────

function formatCurrency(cents) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format((cents || 0) / 100);
}

// ─── Render Events Card Grid (M3a — was a table) ────────

function renderEventsTable() {
    const filter = document.getElementById('tableStatusFilter')?.value || 'all';
    const filtered = filter === 'all'
        ? adminEvents
        : adminEvents.filter(e => e.status === filter);

    const TYPE_LABELS = { llc: 'LLC', member: 'Member', competition: 'Competition' };
    const TYPE_BG = { llc: 'bg-brand-50 text-brand-700', member: 'bg-emerald-50 text-emerald-700', competition: 'bg-amber-50 text-amber-700' };
    const STATUS_STYLES = {
        draft:     'bg-gray-100 text-gray-600',
        open:      'bg-emerald-100 text-emerald-700',
        confirmed: 'bg-blue-100 text-blue-700',
        active:    'bg-brand-100 text-brand-700',
        completed: 'bg-gray-200 text-gray-700',
        cancelled: 'bg-red-100 text-red-600',
    };

    const grid  = document.getElementById('eventsCardGrid');
    const empty = document.getElementById('eventsCardEmpty');
    if (!grid) return;

    if (!filtered.length) {
        grid.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');

    grid.innerHTML = filtered.map(e => {
        const rsvpCount  = adminRsvps.filter(r => r.event_id === e.id && r.status === 'going').length;
        const maybeCount = adminRsvps.filter(r => r.event_id === e.id && r.status === 'maybe').length;
        const checkinCount = adminCheckins.filter(c => c.event_id === e.id).length;
        const revenue = adminRsvps.filter(r => r.event_id === e.id && r.paid).length * (e.rsvp_cost_cents || 0);
        const dateStr = new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const statusStyle = STATUS_STYLES[e.status] || 'bg-gray-100 text-gray-600';
        const typeStyle   = TYPE_BG[e.event_type] || 'bg-gray-100 text-gray-700';

        return `
            <article class="bg-white rounded-2xl border border-gray-200/80 p-4 flex flex-col gap-3 hover:border-brand-200 hover:shadow-sm transition" data-event-id="${e.id}">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${typeStyle}">${TYPE_LABELS[e.event_type] || e.event_type}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${statusStyle}">${(e.status || '').toUpperCase()}</span>
                        </div>
                        <h4 class="font-bold text-gray-900 text-base truncate">${escapeHtml(e.title)}</h4>
                        <p class="text-xs text-gray-500 mt-0.5">${dateStr}${e.location_nickname ? ' · ' + escapeHtml(e.location_nickname) : ''}</p>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2 text-center pt-2 border-t border-gray-100">
                    <div>
                        <div class="text-lg font-extrabold text-gray-900">${rsvpCount}${e.max_participants ? `<span class="text-gray-400 font-normal text-sm">/${e.max_participants}</span>` : ''}</div>
                        <div class="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Going</div>
                    </div>
                    <div>
                        <div class="text-lg font-extrabold text-violet-600">${checkinCount}</div>
                        <div class="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Checked in</div>
                    </div>
                    <div>
                        <div class="text-lg font-extrabold ${revenue > 0 ? 'text-emerald-600' : 'text-gray-300'}">${revenue > 0 ? formatCurrency(revenue) : '—'}</div>
                        <div class="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Revenue</div>
                    </div>
                </div>

                ${maybeCount ? `<p class="text-[11px] text-gray-400">+${maybeCount} interested</p>` : ''}

                <div class="flex items-center gap-2 pt-1">
                    <button onclick="adminOpenManageSheet('${e.id}')" class="flex-1 inline-flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        Manage
                    </button>
                    <a href="../portal/events.html?event=${encodeURIComponent(e.slug || '')}" class="px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition" title="Open in portal">↗</a>
                </div>
            </article>`;
    }).join('');
}

function adminOpenManageSheet(eventId) {
    if (window.EventsManage && typeof window.EventsManage.open === 'function') {
        window.EventsManage.open(eventId, { source: 'admin' });
    } else {
        console.warn('[admin/events] EventsManage not loaded');
    }
}
window.adminOpenManageSheet = adminOpenManageSheet;

// Refresh dashboard when sheet performs a destructive op
document.addEventListener('events:manage:deleted', () => loadEventsDashboard());
document.addEventListener('events:manage:updated', () => loadEventsDashboard());

function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str || '';
    return el.innerHTML;
}

// ─── Competition Payouts ────────────────────────────────

async function loadCompetitionPayouts() {
    const { data: winners } = await supabaseClient
        .from('competition_winners')
        .select('*, events!competition_winners_event_id_fkey(title), profiles:user_id(first_name, last_name)')
        .order('created_at', { ascending: false });

    const tbody = document.getElementById('payoutsTableBody');
    if (!winners?.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400">No competition winners yet</td></tr>`;
        return;
    }

    tbody.innerHTML = winners.map(w => {
        const name = w.profiles ? `${w.profiles.first_name || ''} ${w.profiles.last_name || ''}`.trim() : 'Unknown';
        const eventTitle = w.events?.title || 'Unknown Event';
        const amount = w.prize_amount_cents || 0;
        const paidOut = w.paid_out || false;
        // 1099 flag: if total payouts to this member >= $600 in a calendar year
        const flag1099 = amount >= 60000; // $600 in cents — simplified single-payout check

        return `
            <tr class="hover:bg-surface-50 transition">
                <td class="py-3 px-4 text-gray-700 truncate max-w-[200px]">${escapeHtml(eventTitle)}</td>
                <td class="py-3 px-4 font-semibold text-gray-800">${escapeHtml(name)}</td>
                <td class="py-3 px-4 text-center">
                    <span class="w-6 h-6 inline-flex items-center justify-center rounded-full ${w.place === 1 ? 'bg-amber-100 text-amber-700' : w.place === 2 ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-700'} text-xs font-bold">${w.place}</span>
                </td>
                <td class="py-3 px-4 text-right font-bold ${amount > 0 ? 'text-emerald-600' : 'text-gray-400'}">${amount > 0 ? formatCurrency(amount) : '—'}</td>
                <td class="py-3 px-4 text-center">
                    ${paidOut
                        ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">PAID</span>'
                        : amount > 0
                            ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">PENDING</span>'
                            : '<span class="text-gray-300">—</span>'}
                </td>
                <td class="py-3 px-4 text-center">
                    ${flag1099
                        ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">⚠️ 1099</span>'
                        : '<span class="text-gray-300">—</span>'}
                </td>
            </tr>`;
    }).join('');
}

// ─── Banner Award Tool ──────────────────────────────────

async function loadBannerTools() {
    // Populate completed events dropdown
    const completedEvents = adminEvents.filter(e => e.status === 'completed');
    const eventSelect = document.getElementById('bannerEventSelect');
    completedEvents.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${e.title} (${new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
        eventSelect.appendChild(opt);
    });

    // Load banner cosmetics
    const { data: banners } = await supabaseClient
        .from('cosmetics')
        .select('*')
        .eq('type', 'banner')
        .order('sort_order');

    const bannerSelect = document.getElementById('bannerCosmeticSelect');
    (banners || []).forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.key;
        opt.textContent = `${b.emoji || '🎖️'} ${b.name} (${b.rarity})`;
        bannerSelect.appendChild(opt);
    });

    // Load recent badge awards
    loadRecentBadgeAwards();
}

async function loadRecentBadgeAwards() {
    const { data: awards } = await supabaseClient
        .from('member_cosmetics')
        .select('*, profiles:user_id(first_name, last_name), cosmetics:cosmetic_key(name, emoji, type)')
        .eq('awarded_by', 'system')
        .order('created_at', { ascending: false })
        .limit(20);

    const container = document.getElementById('recentBadgeAwards');
    if (!awards?.length) {
        container.innerHTML = `<p class="text-xs text-gray-400">No system-awarded badges yet.</p>`;
        return;
    }

    container.innerHTML = awards.map(a => {
        const name = a.profiles ? `${a.profiles.first_name || ''} ${a.profiles.last_name || ''}`.trim() : 'Member';
        const badge = a.cosmetics || {};
        const date = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50">
                <span class="text-lg">${badge.emoji || '🏅'}</span>
                <div class="flex-1 min-w-0">
                    <span class="text-sm font-semibold text-gray-800">${escapeHtml(name)}</span>
                    <span class="text-sm text-gray-400 mx-1">earned</span>
                    <span class="text-sm font-medium text-brand-600">${escapeHtml(badge.name || a.cosmetic_key)}</span>
                </div>
                <span class="text-xs text-gray-400 whitespace-nowrap">${date}</span>
            </div>`;
    }).join('');
}

// ─── Award Banner to Attendees ──────────────────────────

async function adminAwardBanner() {
    const eventId = document.getElementById('bannerEventSelect')?.value;
    const bannerKey = document.getElementById('bannerCosmeticSelect')?.value;
    const result = document.getElementById('bannerAwardResult');

    if (!eventId || !bannerKey) {
        result.classList.remove('hidden');
        result.innerHTML = `<p class="text-sm text-red-500">Please select both an event and a banner.</p>`;
        return;
    }

    if (!confirm('Award this banner to all checked-in attendees for the selected event?')) return;

    result.classList.remove('hidden');
    result.innerHTML = `<p class="text-sm text-brand-600">Awarding banner...</p>`;

    try {
        const { data, error } = await supabaseClient.rpc('award_event_banner_to_attendees', {
            p_event_id: eventId,
            p_banner_key: bannerKey,
        });

        if (error) throw error;

        result.innerHTML = `<p class="text-sm text-emerald-600 font-semibold">✅ Banner awarded to ${data || 0} attendee(s)!</p>`;
        loadRecentBadgeAwards();
    } catch (err) {
        console.error('Banner award error:', err);
        result.innerHTML = `<p class="text-sm text-red-500">Error: ${err.message || 'Failed to award banner.'}</p>`;
    }
}

window.adminAwardBanner = adminAwardBanner;

async function adminDeleteEvent(eventId, eventTitle) {
    const typed = prompt(`This will permanently delete "${eventTitle}" and all associated data (RSVPs, check-ins, raffle entries, documents, photos).\n\nType the event title to confirm:`);
    if (!typed || typed.trim() !== eventTitle.trim()) {
        if (typed !== null) alert('Event title did not match. Deletion cancelled.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('events')
            .delete()
            .eq('id', eventId);
        if (error) throw error;

        alert('Event deleted successfully.');
        await loadEventsDashboard();
    } catch (err) {
        console.error('Delete event error:', err);
        alert('Failed to delete event: ' + (err.message || 'Unknown error'));
    }
}

window.adminDeleteEvent = adminDeleteEvent;
