// ═══════════════════════════════════════════════════════════
// Admin — Events Dashboard
// Overview of all events, RSVPs, revenue, competitions,
// payouts, 1099 flags, and banner award tool.
// ═══════════════════════════════════════════════════════════

let adminEvents = [];
let adminRsvps = [];
let adminCheckins = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    // Verify admin
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (profile?.role !== 'admin') {
        document.querySelector('main').innerHTML = `
            <div class="text-center py-20">
                <p class="text-red-500 font-semibold">Access denied. Admin only.</p>
            </div>`;
        return;
    }

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

// ─── Render Events Table ────────────────────────────────

function renderEventsTable() {
    const filter = document.getElementById('tableStatusFilter')?.value || 'all';
    const filtered = filter === 'all'
        ? adminEvents
        : adminEvents.filter(e => e.status === filter);

    const TYPE_LABELS = { llc: 'LLC', member: 'Member', competition: 'Competition' };
    const STATUS_STYLES = {
        draft: 'bg-gray-100 text-gray-600',
        open: 'bg-emerald-100 text-emerald-700',
        confirmed: 'bg-blue-100 text-blue-700',
        active: 'bg-brand-100 text-brand-700',
        completed: 'bg-gray-200 text-gray-700',
        cancelled: 'bg-red-100 text-red-600',
    };

    if (!filtered.length) {
        document.getElementById('eventsTableBody').innerHTML = `
            <tr><td colspan="7" class="py-8 text-center text-gray-400">No events found</td></tr>`;
        return;
    }

    document.getElementById('eventsTableBody').innerHTML = filtered.map(e => {
        const rsvpCount = adminRsvps.filter(r => r.event_id === e.id && r.status === 'going').length;
        const checkinCount = adminCheckins.filter(c => c.event_id === e.id).length;
        const revenue = adminRsvps.filter(r => r.event_id === e.id && r.paid).length * (e.rsvp_cost_cents || 0);
        const dateStr = new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const statusStyle = STATUS_STYLES[e.status] || 'bg-gray-100 text-gray-600';

        return `
            <tr class="hover:bg-surface-50 transition">
                <td class="py-3 px-4">
                    <div class="font-semibold text-gray-800 truncate max-w-[200px]">${escapeHtml(e.title)}</div>
                </td>
                <td class="py-3 px-4 text-gray-500">${TYPE_LABELS[e.event_type] || e.event_type}</td>
                <td class="py-3 px-4 text-gray-500 whitespace-nowrap">${dateStr}</td>
                <td class="py-3 px-4 text-center"><span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusStyle}">${e.status.toUpperCase()}</span></td>
                <td class="py-3 px-4 text-center font-semibold">${rsvpCount}${e.max_participants ? `<span class="text-gray-400 font-normal">/${e.max_participants}</span>` : ''}</td>
                <td class="py-3 px-4 text-center font-semibold text-emerald-600">${checkinCount}</td>
                <td class="py-3 px-4 text-right font-semibold">${revenue > 0 ? formatCurrency(revenue) : '<span class="text-gray-300">—</span>'}</td>
            </tr>`;
    }).join('');
}

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
