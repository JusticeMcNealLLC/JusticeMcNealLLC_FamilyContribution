/* ──────────────────────────────────────────
   Public Event Page  –  /events/?e={slug}
   No auth required — shows public info tier.
   Signed-in members can RSVP & get QR ticket.
   ────────────────────────────────────────── */

const PUB_CATEGORY_EMOJI = {
    party: '🎉', birthday: '🎂', hangout: '🤝', game_night: '🎮',
    cookout: '🍖', trip: '🏔️', retreat: '🏖️', dinner: '🍽️',
    holiday: '🎄', other: '📌'
};

const PUB_TYPE_COLORS = {
    llc:         { bg: '#f7f7f7', color: '#222', label: 'LLC Event' },
    member:      { bg: '#f7f7f7', color: '#222', label: 'Member Event' },
    competition: { bg: '#f7f7f7', color: '#222', label: 'Competition' }
};

let pubCurrentEvent = null;
let pubCurrentUser  = null;
let pubCurrentRsvp  = null;
let pubGuestToken   = null;  // from URL after guest RSVP payment
let pubGuestRsvp    = null;  // loaded from DB for guest lookup

/* ── Bootstrap ───────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const slug   = params.get('e');
    const isCheckin   = params.get('checkin') === '1';
    const ticketToken  = params.get('ticket') || null;
    pubGuestToken     = params.get('guest_token') || null;

    if (!slug) return pubShowNotFound();

    // Check if user is logged in (optional — don't redirect)
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) pubCurrentUser = session.user;
    } catch (_) { /* not logged in */ }

    await pubLoadEvent(slug, isCheckin, ticketToken);
});

/* ── Load Event ──────────────────────────── */
async function pubLoadEvent(slug, isCheckin, ticketToken) {
    const { data: event, error } = await supabaseClient
        .from('events')
        .select('*, creator:profiles!events_created_by_fkey(first_name, last_name, profile_picture_url)')
        .eq('slug', slug)
        .not('status', 'eq', 'draft')
        .single();

    if (error || !event) return pubShowNotFound();

    pubCurrentEvent = event;

    // Load RSVP counts (members + guests)
    const { count: memberGoingCount } = await supabaseClient
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'going');

    const { count: guestGoingCount } = await supabaseClient
        .from('event_guest_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('paid', true);

    const goingCount = (memberGoingCount || 0) + (guestGoingCount || 0);

    // If user is signed in, load their RSVP
    if (pubCurrentUser) {
        const { data: rsvp } = await supabaseClient
            .from('event_rsvps')
            .select('*')
            .eq('event_id', event.id)
            .eq('user_id', pubCurrentUser.id)
            .maybeSingle();
        pubCurrentRsvp = rsvp;
    }

    // If guest token in URL, load guest RSVP
    if (pubGuestToken) {
        const { data: gRsvp } = await supabaseClient
            .from('event_guest_rsvps')
            .select('*')
            .eq('event_id', event.id)
            .eq('guest_token', pubGuestToken)
            .maybeSingle();
        pubGuestRsvp = gRsvp;
    }

    pubRenderEvent(event, goingCount, isCheckin, ticketToken);
}

/* ── Render ──────────────────────────────── */
function pubRenderEvent(event, goingCount, isCheckin, ticketToken) {
    document.getElementById('loading').classList.add('hidden');
    const content = document.getElementById('eventContent');
    content.classList.remove('hidden');
    content.classList.add('evt-fade-in');

    // ── OG meta tags handled by event-og edge function (crawlers hit that URL) ──
    // Set page title for the browser tab
    document.title = `${event.title} | Justice McNeal LLC`;

    // Title moved to content area — set it there
    document.getElementById('eventContentTitle').textContent = event.title;

    // Location nickname pill on banner
    const locPillEl = document.getElementById('heroLocationPill');
    if (event.location_nickname) {
        locPillEl.innerHTML = `<span class="evt-location-pill"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg> ${pubEscapeHtml(event.location_nickname)}</span>`;
    }

    // Banner
    const bannerEl = document.getElementById('eventBanner');
    if (event.banner_url) {
        bannerEl.style.backgroundImage = `url(${event.banner_url})`;
    } else {
        bannerEl.style.background = 'linear-gradient(135deg, #222, #444)';
    }

    // Tags (frosted glass pills on hero)
    const tagsEl = document.getElementById('eventTags');
    const tc = PUB_TYPE_COLORS[event.event_type] || PUB_TYPE_COLORS.llc;
    let tagsHtml = `<span class="evt-tag" style="background:rgba(255,255,255,.18);backdrop-filter:blur(6px);color:#fff">${tc.label}</span>`;
    if (event.category) {
        tagsHtml += `<span class="evt-tag" style="background:rgba(255,255,255,.18);backdrop-filter:blur(6px);color:#fff">${PUB_CATEGORY_EMOJI[event.category] || '📌'} ${event.category}</span>`;
    }
    tagsEl.innerHTML = tagsHtml;

    // Meta — section removed (info on banner); keep start/end refs for calendar
    const start = new Date(event.start_date);
    const end   = event.end_date ? new Date(event.end_date) : null;
    const isGatedDate = event.gate_time && !pubCurrentRsvp;
    const isGatedLoc  = event.gate_location && !pubCurrentRsvp;

    // ── Hero Date Card + Status Badge ──────
    const heroMonthStr = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const heroDayStr = start.getDate();
    const heroTimeShort = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const heroBadge = document.getElementById('heroStatusBadge');
    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();

    // Determine status
    let badgeLabel = '', badgeCls = '', dotPulse = false;
    if (event.status === 'cancelled') {
        badgeLabel = 'Cancelled'; badgeCls = 'evt-status-cancelled'; dotPulse = false;
    } else if (event.status === 'completed') {
        badgeLabel = 'Ended'; badgeCls = 'evt-status-ended'; dotPulse = false;
    } else if (isPast) {
        badgeLabel = 'Ended'; badgeCls = 'evt-status-ended'; dotPulse = false;
    } else if (event.status === 'active') {
        badgeLabel = 'Live'; badgeCls = 'evt-status-live'; dotPulse = true;
    } else {
        // Upcoming — show countdown
        const msUntil = new Date(event.start_date) - new Date();
        const d = Math.floor(msUntil / 86400000);
        const h = Math.floor((msUntil % 86400000) / 3600000);
        const m = Math.floor((msUntil % 3600000) / 60000);
        if (d > 0) {
            badgeLabel = `${d}d ${h}h`; badgeCls = 'evt-status-soon'; dotPulse = d === 0;
        } else if (h > 0) {
            badgeLabel = `${h}h ${m}m`; badgeCls = 'evt-status-soon'; dotPulse = true;
        } else {
            badgeLabel = `${m}m`; badgeCls = 'evt-status-soon'; dotPulse = true;
        }
    }

    heroBadge.innerHTML = `<div class="evt-date-card-wrap">
        <span class="evt-status-badge ${badgeCls}"><span class="evt-status-dot${dotPulse ? ' pulse' : ''}"></span>${badgeLabel}</span>
        <div class="evt-date-card">
            <span class="evt-date-card-month">${heroMonthStr}</span>
            <span class="evt-date-card-day">${heroDayStr}</span>
            <span class="evt-date-card-time">${heroTimeShort}</span>
        </div>
    </div>`;

    // Live countdown updater (update badge every 60s for upcoming events)
    if (!isClosed && !isPast && event.status !== 'active') {
        setInterval(() => {
            const ms = new Date(event.start_date) - new Date();
            if (ms <= 0) { heroBadge.innerHTML = `<span class="evt-status-badge evt-status-live"><span class="evt-status-dot pulse"></span>Live</span>`; return; }
            const dd = Math.floor(ms / 86400000);
            const hh = Math.floor((ms % 86400000) / 3600000);
            const mm = Math.floor((ms % 3600000) / 60000);
            const lbl = dd > 0 ? `${dd}d ${hh}h` : hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
            heroBadge.querySelector('.evt-status-badge').innerHTML = `<span class="evt-status-dot${dd === 0 ? ' pulse' : ''}"></span>${lbl}`;
        }, 60000);
    }

    // Also show body-level status banner for deadline-passed (not reflected in hero)
    const statusBanner = document.getElementById('eventStatusBanner');
    if (deadlinePassed && !isClosed && !isPast) {
        statusBanner.innerHTML = `<span class="evt-status-banner evt-status-past-body">🔒 RSVP deadline passed</span>`;
        statusBanner.classList.remove('hidden');
    }

    // ── Attendee Count (show only when ≥ 3) ─────────
    if (goingCount >= 3) {
        const countEl = document.getElementById('attendeeCount');
        countEl.innerHTML = `
            <div class="evt-info-row">
                <div class="evt-info-icon"><svg viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
                <div>
                    <p class="evt-info-primary">${goingCount} going</p>
                    ${event.max_participants ? `<p class="evt-info-secondary">${event.max_participants - goingCount > 0 ? (event.max_participants - goingCount) + ' spots left' : 'Sold out'}</p>` : ''}
                </div>
            </div>`;
        countEl.classList.remove('hidden');
    }

    // ── Host / Organizer ────────────────────────────
    const hostEl = document.getElementById('hostSection');
    if (event.event_type === 'llc') {
        hostEl.innerHTML = `
            <div class="evt-info-row">
                <div class="evt-info-icon" style="background:#222"><svg viewBox="0 0 24 24" stroke-width="2" style="stroke:#fff"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg></div>
                <div>
                    <p class="evt-info-primary">Justice McNeal LLC</p>
                    <p class="evt-info-secondary">Organizer</p>
                </div>
            </div>`;
    } else if (event.creator) {
        const c = event.creator;
        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Member';
        const initials = ((c.first_name?.[0] || '') + (c.last_name?.[0] || '')).toUpperCase();
        const avatarHtml = c.profile_picture_url
            ? `<img src="${c.profile_picture_url}" style="width:48px;height:48px;border-radius:12px;object-fit:cover" alt="${pubEscapeHtml(fullName)}">`
            : `<div class="evt-info-icon" style="background:#222;color:#fff;font-size:16px;font-weight:700">${initials}</div>`;
        hostEl.innerHTML = `
            <div class="evt-info-row">
                ${avatarHtml}
                <div>
                    <p class="evt-info-primary">${pubEscapeHtml(fullName)}</p>
                    <p class="evt-info-secondary">Organizer</p>
                </div>
            </div>`;
    }
    hostEl.classList.remove('hidden');

    // ── Add to Calendar ─────────────────────────────
    if (!isGatedDate) {
        const calEl = document.getElementById('calendarSection');
        const calStart = start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const calEnd = end ? end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') : new Date(start.getTime() + 7200000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const gcalUrl = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(event.title)}&dates=${calStart}/${calEnd}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location_text || '')}`;
        calEl.innerHTML = `
            <div style="display:flex;gap:10px">
                <button onclick="pubDownloadIcs()" class="evt-action-btn" style="flex:1;background:#f7f7f7;color:#222">
                    <svg style="width:18px;height:18px;stroke:#222" fill="none" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Add to Calendar
                </button>
                <a href="${gcalUrl}" target="_blank" rel="noopener" class="evt-action-btn" style="flex:1;background:#f7f7f7;color:#222;text-decoration:none">
                    <svg style="width:18px;height:18px" viewBox="0 0 24 24" fill="none"><path d="M18.316 5.684L24 0H18.316V5.684z" fill="#EA4335"/><path d="M18.316 0H5.684v5.684h7.263L18.316 0z" fill="#4285F4" opacity=".6"/><path d="M5.684 5.684H0V18.316h5.684V5.684z" fill="#34A853"/><path d="M18.316 5.684v12.632H24V5.684h-5.684z" fill="#FBBC05"/><path d="M18.316 18.316H5.684V24h12.632v-5.684z" fill="#EA4335" opacity=".6"/><path d="M5.684 0H0v5.684h5.684V0z" fill="#188038"/><path d="M5.684 18.316H0V24h5.684v-5.684z" fill="#1967D2"/><path d="M8 16.5v-9h2v9H8zm3-9h2v9h-2v-9zm3 0h2v9h-2v-9z" fill="#4285F4"/></svg>
                    Google Calendar
                </a>
            </div>`;
        calEl.classList.remove('hidden');
    }

    // Map (show if location + lat/lng available and not gated)
    if (event.location_lat && event.location_lng && !isGatedLoc) {
        pubShowMap(event.location_lat, event.location_lng, event.location_text);
    }

    // Description
    document.getElementById('eventDesc').textContent = event.description || '';

    // Gated Notes
    if (event.gated_notes && (pubCurrentRsvp || pubGuestRsvp)) {
        document.getElementById('gatedSection').classList.remove('hidden');
        document.getElementById('gatedNotes').textContent = event.gated_notes;
    }

    // Member-only notice
    if (event.member_only && !pubCurrentUser) {
        document.getElementById('memberOnlyNotice').classList.remove('hidden');
    }

    // RSVP section (member + guest)
    pubRenderRsvpSection(event);

    // Guest RSVP section (for non-members on non-member-only events)
    pubRenderGuestRsvpSection(event);

    // Raffle section
    pubRenderRaffleSection(event);

    // Swipeable bottom nav (mobile)
    pubInitBottomNav(event);

    // QR Ticket — member
    if (pubCurrentRsvp && pubCurrentRsvp.status === 'going' && event.checkin_mode === 'attendee_ticket') {
        pubShowTicketQR(pubCurrentRsvp.qr_token);
    }

    // QR Ticket — guest (from URL token or lookup)
    if (pubGuestRsvp) {
        pubShowGuestTicket(pubGuestRsvp);
    }

    // Guest lookup section (show for public events when not signed in and no guest ticket showing)
    if (!pubCurrentUser && !pubGuestRsvp && !event.member_only && event.rsvp_enabled !== false) {
        document.getElementById('guestLookupSection').classList.remove('hidden');
    }

    // Venue Check-In mode
    if (isCheckin && event.checkin_mode === 'venue_scan') {
        pubRenderVenueCheckin(event);
    }

    // Attendee Ticket scanned with phone camera (ticket=TOKEN in URL)
    if (ticketToken && event.checkin_mode === 'attendee_ticket') {
        pubHandleTicketScan(event, ticketToken);
    }

    // Share URL — clean domain link (static OG tags on events/index.html)
    const baseShareUrl = `https://justicemcneal.com/events/?e=${event.slug}`;
    if (pubCurrentUser) {
        document.getElementById('shareUrl').value = baseShareUrl + '&ref=' + pubCurrentUser.id.slice(0, 8);
    } else if (pubGuestRsvp && pubGuestRsvp.guest_token) {
        document.getElementById('shareUrl').value = baseShareUrl + '&ref=g_' + pubGuestRsvp.guest_token.slice(0, 8);
    } else {
        document.getElementById('shareUrl').value = baseShareUrl;
    }

    // Invite banner (detect ref param)
    pubRenderInviteBanner(event);

    // Comments section
    pubRenderComments(event);

    // Update sign-in link to redirect back after login
    const loginLinks = document.querySelectorAll('a[href="/auth/login.html"]');
    const returnUrl = encodeURIComponent(window.location.href);
    loginLinks.forEach(link => {
        link.href = `/auth/login.html?redirect=${returnUrl}`;
    });
}

/* ── RSVP Section ────────────────────────── */
function pubRenderRsvpSection(event) {
    const section = document.getElementById('rsvpSection');
    const rsvpEnabled = event.rsvp_enabled !== false;
    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();

    // RSVP disabled for this event — show informational card
    if (!rsvpEnabled) {
        section.innerHTML = `
            <div class="evt-info-card">
                <span class="evt-info-card-icon">ℹ️</span>
                <div>
                    <p class="evt-info-card-title">Informational Event</p>
                    <p class="evt-info-card-sub">RSVP is not required for this event</p>
                </div>
            </div>`;
        return;
    }

    if (isClosed || isPast || deadlinePassed) {
        // Status is already shown in the banner near the date — hide RSVP section entirely
        section.classList.add('hidden');
        // Also hide the divider above it
        const prevDivider = section.previousElementSibling;
        if (prevDivider && prevDivider.tagName === 'HR') prevDivider.classList.add('hidden');
        return;
    }

    if (!pubCurrentUser) {
        // If guest already has an RSVP (paid or free), show confirmed state
        if (pubGuestRsvp) {
            const isPaidGuest = pubGuestRsvp.paid;
            section.innerHTML = `
                <div class="evt-info-card">
                    <span class="evt-info-card-icon">✅</span>
                    <div>
                        <p class="evt-info-card-title">Guest RSVP Confirmed</p>
                        <p class="evt-info-card-sub">${pubEscapeHtml(pubGuestRsvp.guest_name)}${isPaidGuest ? ' · Non-refundable' : ''}</p>
                    </div>
                </div>`;
            return;
        }

        // For member-only events, show sign-in prompt
        if (event.member_only) {
            section.innerHTML = `<div style="text-align:center">
                <p style="font-size:15px;color:#717171;margin-bottom:16px">Sign in to RSVP for this members-only event</p>
                <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="evt-action-btn" style="display:inline-flex;width:auto;padding:14px 32px;text-decoration:none">
                    Sign In to RSVP
                </a>
            </div>`;
            return;
        }

        // For public (non-member-only) events
        const costHint = event.pricing_mode === 'paid' && event.rsvp_cost_cents
            ? ` (${pubFormatCurrency(event.rsvp_cost_cents)})`
            : '';
        section.innerHTML = `<div style="text-align:center">
            <p style="font-size:15px;color:#717171;margin-bottom:16px">Have an account?</p>
            <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="evt-action-btn" style="display:inline-flex;width:auto;padding:14px 32px;text-decoration:none">
                Sign In to RSVP${costHint}
            </a>
        </div>`;
        return;
    }

    // ── Paid RSVP ───────────────────────────────────────
    if (event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0) {
        if (pubCurrentRsvp?.paid) {
            section.innerHTML = `
                <div class="evt-info-card">
                    <span class="evt-info-card-icon">✅</span>
                    <div>
                        <p class="evt-info-card-title">RSVP Confirmed &amp; Paid</p>
                        <p class="evt-info-card-sub">Non-refundable • Contact admin for changes</p>
                    </div>
                </div>`;
        } else {
            section.innerHTML = `
                <div style="text-align:center">
                    <button onclick="pubHandlePaidRsvp()" class="evt-rsvp-pay">
                        💳 RSVP — ${pubFormatCurrency(event.rsvp_cost_cents)}
                    </button>
                    <p style="font-size:13px;color:#b0b0b0;margin-top:10px">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' • Includes raffle entry' : ''}</p>
                </div>`;
        }
        return;
    }

    // ── Free RSVP (any non-paid event) ──────────────────
    const goingCls = pubCurrentRsvp?.status === 'going' ? ' active-going' : '';
    const maybeCls = pubCurrentRsvp?.status === 'maybe' ? ' active-maybe' : '';
    const cantCls  = pubCurrentRsvp?.status === 'not_going' ? ' active-not' : '';

    section.innerHTML = `
        <p style="font-size:12px;font-weight:700;color:#717171;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Your RSVP</p>
        <div class="evt-rsvp-grid" role="group" aria-label="RSVP options">
            <button onclick="pubHandleRsvp('going')" class="evt-rsvp-btn${goingCls}" aria-pressed="${pubCurrentRsvp?.status === 'going'}">
                <span style="font-size:20px;display:block;margin-bottom:4px">✅</span> Going
            </button>
            <button onclick="pubHandleRsvp('maybe')" class="evt-rsvp-btn${maybeCls}" aria-pressed="${pubCurrentRsvp?.status === 'maybe'}">
                <span style="font-size:20px;display:block;margin-bottom:4px">🤔</span> Maybe
            </button>
            <button onclick="pubHandleRsvp('not_going')" class="evt-rsvp-btn${cantCls}" aria-pressed="${pubCurrentRsvp?.status === 'not_going'}">
                <span style="font-size:20px;display:block;margin-bottom:4px">❌</span> Can't Go
            </button>
        </div>
        ${pubCurrentRsvp ? '<p style="font-size:13px;color:#b0b0b0;text-align:center;margin-top:10px">Click your current response to cancel</p>' : ''}
    `;
}

/* ── Raffle Section (Public Page) ────────── */
async function pubRenderRaffleSection(event) {
    if (!event.raffle_enabled) return;

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    const entriesClosed = isClosed || isPast || deadlinePassed;

    // Get or create raffle container
    let el = document.getElementById('raffleSection');
    if (!el) {
        el = document.createElement('div');
        el.id = 'raffleSection';
        // Insert after rsvpSection
        const rsvpEl = document.getElementById('rsvpSection');
        if (rsvpEl) rsvpEl.insertAdjacentElement('afterend', el);
        else return;
    }

    const prizes = event.raffle_prizes || [];
    const ordinal = n => n===1?'1st':n===2?'2nd':n===3?'3rd':`${n}th`;
    const prizesHtml = prizes.map((p, i) => {
        const place = p.place || i + 1;
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f9f9f4;border-radius:12px;margin-bottom:6px">
            <div class="evt-raffle-rank">${place}</div>
            <div>
                <p style="font-size:13px;color:#717171;font-weight:600;margin:0">${ordinal(place)} Place</p>
                <p style="font-size:15px;color:#222;font-weight:600;margin:2px 0 0">${pubEscapeHtml(p.label || p.description || p)}</p>
            </div>
        </div>`;
    }).join('');

    // Check if current user has raffle entry
    let myEntryHtml = '';
    let lockedBtnHtml = '';

    if (entriesClosed) {
        // Show greyed-out locked button
        const reason = isClosed
            ? (event.status === 'cancelled' ? 'Event cancelled' : 'Event ended')
            : isPast ? 'Event in progress' : 'RSVP deadline passed';
        lockedBtnHtml = `
            <button class="evt-raffle-locked" disabled style="margin-top:16px">
                <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                ${reason}
            </button>`;
    } else if (event.pricing_mode === 'paid') {
        // Paid event — raffle is bundled with RSVP
        myEntryHtml = `<p style="font-size:13px;color:#717171;font-style:italic;margin-top:12px">Raffle entry included with paid RSVP</p>`;
    } else if (pubCurrentUser) {
        // ── Signed-in member on a non-paid event ──
        const { data: myEntry } = await supabaseClient
            .from('event_raffle_entries')
            .select('id, paid')
            .eq('event_id', event.id)
            .eq('user_id', pubCurrentUser.id)
            .maybeSingle();

        if (myEntry) {
            myEntryHtml = `<div class="evt-info-card" style="margin-top:16px"><span class="evt-info-card-icon">🎟️</span><div><p class="evt-info-card-title">You're entered!</p><p class="evt-info-card-sub">Good luck in the draw</p></div></div>`;
        } else if (event.raffle_entry_cost_cents > 0) {
            myEntryHtml = `
                <button onclick="pubHandlePaidRaffle()" class="evt-raffle-buy" style="margin-top:16px">
                    🎟️ Buy Raffle Entry — ${pubFormatCurrency(event.raffle_entry_cost_cents)}
                </button>
                <p style="font-size:13px;color:#b0b0b0;text-align:center;margin-top:8px">Non-refundable raffle ticket</p>`;
        } else {
            // Free raffle — one-click enter
            myEntryHtml = `
                <button onclick="pubHandleFreeRaffle()" class="evt-raffle-buy" style="margin-top:16px">
                    🎟️ Enter Raffle — Free
                </button>`;
        }
    } else {
        // ── Not signed in ──
        if (event.member_only) {
            myEntryHtml = `
                <div style="text-align:center;margin-top:16px">
                    <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="evt-raffle-buy" style="display:inline-flex;text-decoration:none;justify-content:center">
                        🎟️ Sign In to Enter Raffle
                    </a>
                </div>`;
        } else if (event.raffle_entry_cost_cents > 0) {
            // Non-member-only event with paid raffle — show guest raffle entry form
            myEntryHtml = `
                <div style="margin-top:16px" id="guestRaffleForm">
                    <p style="font-size:13px;color:#717171;margin-bottom:10px">Enter your info to join the raffle</p>
                    <div style="display:flex;flex-direction:column;gap:8px">
                        <input type="text" id="guestRaffleName" placeholder="Your name" class="evt-guest-input" style="padding:10px 14px;border:1px solid #ddd;border-radius:10px;font-size:14px">
                        <input type="email" id="guestRaffleEmail" placeholder="Email address" class="evt-guest-input" style="padding:10px 14px;border:1px solid #ddd;border-radius:10px;font-size:14px">
                        <button onclick="pubHandleGuestPaidRaffle()" class="evt-raffle-buy">
                            🎟️ Buy Raffle Entry — ${pubFormatCurrency(event.raffle_entry_cost_cents)}
                        </button>
                        <p style="font-size:12px;color:#b0b0b0;text-align:center">Non-refundable raffle ticket</p>
                    </div>
                    <p style="font-size:13px;color:#717171;margin-top:12px;text-align:center">
                        <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" style="color:#222;font-weight:600">Sign in</a> if you have an account
                    </p>
                </div>`;
        } else {
            // Free raffle — guest can enter with name+email
            myEntryHtml = `
                <div style="margin-top:16px" id="guestRaffleForm">
                    <p style="font-size:13px;color:#717171;margin-bottom:10px">Enter your info to join the raffle</p>
                    <div style="display:flex;flex-direction:column;gap:8px">
                        <input type="text" id="guestRaffleName" placeholder="Your name" class="evt-guest-input" style="padding:10px 14px;border:1px solid #ddd;border-radius:10px;font-size:14px">
                        <input type="email" id="guestRaffleEmail" placeholder="Email address" class="evt-guest-input" style="padding:10px 14px;border:1px solid #ddd;border-radius:10px;font-size:14px">
                        <button onclick="pubHandleGuestFreeRaffle()" class="evt-raffle-buy">
                            🎟️ Enter Raffle — Free
                        </button>
                    </div>
                    <p style="font-size:13px;color:#717171;margin-top:12px;text-align:center">
                        <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" style="color:#222;font-weight:600">Sign in</a> if you have an account
                    </p>
                </div>`;
        }
    }

    // Load winners
    const { data: winners } = await supabaseClient
        .from('event_raffle_winners')
        .select('place, prize_description, profiles:user_id(first_name, last_name)')
        .eq('event_id', event.id)
        .order('place', { ascending: true });

    let winnersHtml = '';
    if (winners && winners.length > 0) {
        winnersHtml = `
        <div style="margin-top:16px">
            <h5 style="font-size:14px;font-weight:700;color:#222;margin-bottom:10px">🏆 Winners</h5>
            ${winners.map(w => {
                const name = w.profiles ? `${w.profiles.first_name || ''} ${w.profiles.last_name || ''}`.trim() : 'Guest';
                return `<div style="display:flex;align-items:center;gap:12px;padding:6px 0">
                    <div class="evt-raffle-rank">${w.place}</div>
                    <span style="font-size:14px;font-weight:600;color:#222">${pubEscapeHtml(name)}</span>
                    ${w.prize_description ? `<span style="font-size:13px;color:#717171">— ${pubEscapeHtml(w.prize_description)}</span>` : ''}
                </div>`;
            }).join('')}
        </div>`;
    }

    el.innerHTML = `
        <div class="evt-section">
            <h4 class="evt-section-title" style="font-size:18px">🎲 Raffle</h4>

            <!-- Details -->
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
                ${event.raffle_type ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">${event.raffle_type === 'digital' ? '💻' : '🎁'} ${event.raffle_type === 'digital' ? 'Digital Prize' : 'Physical Prize'}</span>` : ''}
                ${event.raffle_draw_trigger ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">${event.raffle_draw_trigger === 'auto' ? '⚡ Auto Draw' : '🎰 Manual Draw'}</span>` : ''}
                ${event.pricing_mode !== 'paid' && event.raffle_entry_cost_cents > 0 ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">🎟️ Entry: ${pubFormatCurrency(event.raffle_entry_cost_cents)}</span>` : ''}
                ${event.pricing_mode === 'paid' ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;background:#f7f7f7;font-size:13px;font-weight:600;color:#222">✅ Included with RSVP</span>` : ''}
            </div>

            <!-- Prizes -->
            ${prizes.length > 0 ? `
                <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#717171;margin-bottom:10px">🏆 Prizes</p>
                <div style="margin-bottom:12px">${prizesHtml}</div>
            ` : `
                <p style="font-size:13px;color:#999;font-style:italic;margin-bottom:12px">🏆 Prizes to be announced</p>
            `}

            <!-- Entry status / Locked button -->
            ${myEntryHtml}
            ${lockedBtnHtml}

            <!-- Winners -->
            ${winnersHtml}
        </div>
        <hr class="evt-divider">`;
}

/* ── Paid RSVP Handler (Public Page) ─────── */
async function pubHandlePaidRsvp() {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    const confirmPay = confirm(
        `RSVP costs ${pubFormatCurrency(pubCurrentEvent.rsvp_cost_cents)}.\n\n` +
        'By completing your RSVP, you agree that your payment is non-refundable ' +
        'unless this event is cancelled or rescheduled by LLC staff.\n\n' +
        'Proceed to checkout?'
    );
    if (!confirmPay) return;

    try {
        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: pubCurrentEvent.id,
            type: 'rsvp',
        });
        if (url) window.location.href = url;
    } catch (err) {
        console.error('Paid RSVP error:', err);
        alert('Failed to start checkout. Please try again.');
    }
}

/* ── Paid Raffle Handler (Public Page) ───── */
async function pubHandlePaidRaffle() {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    const confirmPay = confirm(
        `Raffle entry costs ${pubFormatCurrency(pubCurrentEvent.raffle_entry_cost_cents)}.\n\n` +
        'Raffle entry is non-refundable. Proceed to checkout?'
    );
    if (!confirmPay) return;

    try {
        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: pubCurrentEvent.id,
            type: 'raffle_entry',
        });
        if (url) window.location.href = url;
    } catch (err) {
        console.error('Raffle entry error:', err);
        alert('Failed to start raffle entry checkout. Please try again.');
    }
}

/* ── Free Raffle Handler (Signed-in Member) ── */
async function pubHandleFreeRaffle() {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    try {
        const { error } = await supabaseClient
            .from('event_raffle_entries')
            .insert({ event_id: pubCurrentEvent.id, user_id: pubCurrentUser.id, paid: true });

        if (error) throw error;

        // Refresh raffle section
        pubRenderRaffleSection(pubCurrentEvent);
    } catch (err) {
        console.error('Free raffle entry error:', err);
        alert(err.message || 'Failed to enter raffle. Please try again.');
    }
}

/* ── Guest Paid Raffle Handler ─────────────── */
async function pubHandleGuestPaidRaffle() {
    if (!pubCurrentEvent) return;

    const name  = document.getElementById('guestRaffleName')?.value.trim();
    const email = document.getElementById('guestRaffleEmail')?.value.trim();

    if (!name || !email) { alert('Please enter your name and email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email.'); return; }

    const confirmPay = confirm(
        `Raffle entry costs ${pubFormatCurrency(pubCurrentEvent.raffle_entry_cost_cents)}.\n\n` +
        'Raffle entry is non-refundable. Proceed to checkout?'
    );
    if (!confirmPay) return;

    try {
        const { url } = await callEdgeFunctionPublic('create-event-checkout', {
            event_id: pubCurrentEvent.id,
            type: 'raffle_entry',
            guest_name: name,
            guest_email: email,
        });
        if (url) window.location.href = url;
    } catch (err) {
        console.error('Guest raffle entry error:', err);
        alert(err.message || 'Failed to start raffle checkout. Please try again.');
    }
}

/* ── Guest Free Raffle Handler ─────────────── */
async function pubHandleGuestFreeRaffle() {
    if (!pubCurrentEvent) return;

    const name  = document.getElementById('guestRaffleName')?.value.trim();
    const email = document.getElementById('guestRaffleEmail')?.value.trim();

    if (!name || !email) { alert('Please enter your name and email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email.'); return; }

    try {
        const result = await callEdgeFunctionPublic('raffle-guest-free', {
            event_id: pubCurrentEvent.id,
            guest_name: name,
            guest_email: email,
        });

        // Show confirmed state
        const form = document.getElementById('guestRaffleForm');
        if (form) {
            form.innerHTML = `
                <div class="evt-info-card">
                    <span class="evt-info-card-icon">🎟️</span>
                    <div>
                        <p class="evt-info-card-title">You're entered!</p>
                        <p class="evt-info-card-sub">${pubEscapeHtml(name)} — Good luck in the draw</p>
                    </div>
                </div>`;
        }
    } catch (err) {
        console.error('Guest free raffle error:', err);
        alert(err.message || 'Failed to enter raffle. Please try again.');
    }
}

/* ── Currency Formatter ──────────────────── */
function pubFormatCurrency(cents) {
    return '$' + (cents / 100).toFixed(2);
}

/* ── RSVP Handler ────────────────────────── */
async function pubHandleRsvp(status) {
    if (!pubCurrentUser || !pubCurrentEvent) return;

    try {
        if (pubCurrentRsvp && pubCurrentRsvp.status === status) {
            // Block toggle-off for paid RSVPs
            if (pubCurrentRsvp.paid) {
                alert('Paid RSVPs cannot be cancelled. Contact an admin for assistance.');
                return;
            }
            await supabaseClient.from('event_rsvps').delete().eq('id', pubCurrentRsvp.id);
            pubCurrentRsvp = null;
        } else if (pubCurrentRsvp) {
            if (pubCurrentRsvp.paid) {
                alert('Paid RSVPs cannot be changed. Contact an admin for assistance.');
                return;
            }
            const { data } = await supabaseClient
                .from('event_rsvps')
                .update({ status })
                .eq('id', pubCurrentRsvp.id)
                .select()
                .single();
            pubCurrentRsvp = data;
        } else {
            const { data } = await supabaseClient
                .from('event_rsvps')
                .insert({ event_id: pubCurrentEvent.id, user_id: pubCurrentUser.id, status })
                .select()
                .single();
            pubCurrentRsvp = data;
        }

        await pubLoadEvent(pubCurrentEvent.slug, false);
    } catch (err) {
        console.error('RSVP error:', err);
        alert('Failed to update RSVP. Please try again.');
    }
}

/* ── QR Ticket ───────────────────────────── */
async function pubShowTicketQR(qrToken) {
    const ticketSection = document.getElementById('ticketSection');
    ticketSection.classList.remove('hidden');
    const canvas = document.getElementById('ticketQR');
    const ticketUrl = `${window.location.origin}/events/?e=${pubCurrentEvent.slug}&ticket=${qrToken}`;
    QRCode.toCanvas(canvas, ticketUrl, { width: 200, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } });

    // Check if already checked in
    if (pubCurrentUser) {
        const { data: ci } = await supabaseClient
            .from('event_checkins')
            .select('checked_in_at')
            .eq('event_id', pubCurrentEvent.id)
            .eq('user_id', pubCurrentUser.id)
            .maybeSingle();
        if (ci) pubShowCheckedInOverlay('ticketSection', 'ticketQR', ci.checked_in_at);
    }
}

/* ── Checked-In Overlay (shared helper) ──── */
function pubShowCheckedInOverlay(sectionId, canvasId, checkedInAt) {
    const section = document.getElementById(sectionId);
    const canvas = document.getElementById(canvasId);
    if (!section || !canvas) return;

    // Dim the QR code
    canvas.style.opacity = '0.3';

    // Add check overlay on top of QR
    const wrapper = canvas.parentElement;
    if (wrapper) {
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center';
        overlay.innerHTML = `
            <div style="width:64px;height:64px;border-radius:50%;background:#059669;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(5,150,105,.3)">
                <svg style="width:36px;height:36px;color:#fff" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>`;
        wrapper.appendChild(overlay);
    }

    // Update section header + text
    const header = section.querySelector('h3');
    if (header) {
        header.textContent = '✅ Checked In';
        header.style.color = '#059669';
    }

    // Format the timestamp
    const dt = new Date(checkedInAt);
    const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Replace or add timestamp under the QR
    const existingHint = section.querySelector('.evt-qr-sub');
    if (existingHint) {
        existingHint.style.cssText = 'font-size:13px;color:#059669;font-weight:600;margin-top:10px';
        existingHint.textContent = `Scanned at ${timeStr} · ${dateStr}`;
    } else {
        const ts = document.createElement('p');
        ts.style.cssText = 'font-size:13px;color:#059669;font-weight:600;margin-top:10px';
        ts.textContent = `Scanned at ${timeStr} · ${dateStr}`;
        section.appendChild(ts);
    }

    // Vibrate the phone once (subtle confirmation)
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

/* ── Venue Check-In ──────────────────────── */
function pubRenderVenueCheckin(event) {
    const el = document.getElementById('venueCheckin');
    el.classList.remove('hidden');

    // Guest check-in via token
    if (pubGuestRsvp) {
        el.innerHTML = `
            <div class="evt-qr-card">
                <h3 class="evt-qr-title">📍 Venue Check-In</h3>
                <p class="evt-qr-sub" style="margin-bottom:16px">Tap below to check into this event</p>
                <button onclick="pubDoGuestVenueCheckin('${event.id}','${pubGuestRsvp.guest_token}')" id="guestCheckinBtn" class="evt-action-btn" style="background:#059669">
                    ✅ Check In Now
                </button>
                <div id="guestCheckinResult" style="margin-top:12px"></div>
            </div>`;
        return;
    }

    if (!pubCurrentUser) {
        el.innerHTML = `<div class="evt-notice-card">
            <span class="evt-notice-icon">📍</span>
            <div>
                <p class="evt-notice-title">Sign in to check in</p>
                <a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="evt-action-btn" style="display:inline-flex;width:auto;padding:10px 24px;margin-top:10px;text-decoration:none">Sign In</a>
            </div>
        </div>`;
        return;
    }

    el.innerHTML = `
        <div class="evt-qr-card">
            <h3 class="evt-qr-title">📍 Venue Check-In</h3>
            <p class="evt-qr-sub" style="margin-bottom:16px">Tap below to check into this event</p>
            <button onclick="pubDoVenueCheckin('${event.id}')" id="checkinBtn" class="evt-action-btn" style="background:#059669">
                ✅ Check In Now
            </button>
            <div id="checkinResult" style="margin-top:12px"></div>
        </div>`;
}

async function pubDoVenueCheckin(eventId) {
    const btn = document.getElementById('checkinBtn');
    const result = document.getElementById('checkinResult');
    btn.disabled = true;
    btn.textContent = 'Checking in...';

    try {
        // Check if event requires location sharing
        const { data: evtData } = await supabaseClient
            .from('events')
            .select('location_required')
            .eq('id', eventId)
            .single();

        if (evtData?.location_required) {
            // Prompt for location before allowing check-in
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
                    });
                });
                // Save location to event_locations
                await supabaseClient.from('event_locations').upsert({
                    event_id: eventId,
                    user_id: pubCurrentUser.id,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    sharing_active: true,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'event_id,user_id' });
            } catch (locErr) {
                result.innerHTML = '<p style="font-size:14px;color:#dc2626;font-weight:600">📍 Location sharing is required for this event. Please allow location access and try again.</p>';
                btn.disabled = false;
                btn.textContent = '✅ Check In Now';
                return;
            }
        }

        const { data: rsvp } = await supabaseClient
            .from('event_rsvps')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', pubCurrentUser.id)
            .eq('status', 'going')
            .maybeSingle();

        if (!rsvp) {
            result.innerHTML = '<p style="font-size:14px;color:#dc2626;font-weight:600">❌ You must RSVP "Going" before checking in.</p>';
            btn.disabled = false;
            btn.textContent = '✅ Check In Now';
            return;
        }

        const { data: existing } = await supabaseClient
            .from('event_checkins')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', pubCurrentUser.id)
            .maybeSingle();

        if (existing) {
            result.innerHTML = '<p style="font-size:14px;color:#f59e0b;font-weight:600">⚠️ You are already checked in!</p>';
            btn.remove();
            return;
        }

        await supabaseClient.from('event_checkins').insert({
            event_id: eventId,
            user_id: pubCurrentUser.id,
            rsvp_id: rsvp.id,
            checkin_mode: 'venue_scan'
        });

        result.innerHTML = '<p style="font-size:14px;color:#059669;font-weight:700">🎉 Successfully checked in!</p>';
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        btn.remove();
    } catch (err) {
        console.error('Check-in error:', err);
        result.innerHTML = '<p style="font-size:14px;color:#dc2626">Check-in failed. Please try again.</p>';
        btn.disabled = false;
        btn.textContent = '✅ Check In Now';
    }
}

/* ── Guest Venue Check-In ────────────────── */
async function pubDoGuestVenueCheckin(eventId, guestToken) {
    const btn = document.getElementById('guestCheckinBtn');
    const result = document.getElementById('guestCheckinResult');
    btn.disabled = true;
    btn.textContent = 'Checking in...';

    try {
        const { data: existing } = await supabaseClient
            .from('event_checkins')
            .select('id')
            .eq('event_id', eventId)
            .eq('guest_token', guestToken)
            .maybeSingle();

        if (existing) {
            result.innerHTML = '<p style="font-size:14px;color:#f59e0b;font-weight:600">⚠️ You are already checked in!</p>';
            btn.remove();
            return;
        }

        await supabaseClient.from('event_checkins').insert({
            event_id: eventId,
            guest_token: guestToken,
            checkin_mode: 'venue_scan'
        });

        result.innerHTML = '<p style="font-size:14px;color:#059669;font-weight:700">🎉 Successfully checked in!</p>';
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        btn.remove();
    } catch (err) {
        console.error('Guest check-in error:', err);
        result.innerHTML = '<p style="font-size:14px;color:#dc2626">Check-in failed. Please try again.</p>';
        btn.disabled = false;
        btn.textContent = '✅ Check In Now';
    }
}

/* ── Attendee Ticket Scan (phone camera) ─── */
async function pubHandleTicketScan(event, ticketToken) {
    // Someone scanned an attendee ticket QR with their phone camera.
    // Determine who is scanning and act accordingly.

    const container = document.getElementById('venueCheckin');
    container.classList.remove('hidden');

    // Check if the current user is the event creator or a host/admin
    let isHost = false;
    if (pubCurrentUser) {
        if (event.created_by === pubCurrentUser.id) {
            isHost = true;
        } else {
            const { data: hostRec } = await supabaseClient
                .from('event_hosts')
                .select('id')
                .eq('event_id', event.id)
                .eq('user_id', pubCurrentUser.id)
                .maybeSingle();
            if (hostRec) isHost = true;

            // Also check for admin role
            if (!isHost) {
                const { data: prof } = await supabaseClient
                    .from('profiles')
                    .select('role')
                    .eq('id', pubCurrentUser.id)
                    .single();
                if (prof?.role === 'admin') isHost = true;
            }
        }
    }

    if (isHost) {
        // Host/creator scanned an attendee's ticket → process check-in
        container.innerHTML = `
            <div class="evt-qr-card">
                <h3 class="evt-qr-title">🎟️ Scanning Attendee Ticket…</h3>
                <div id="ticketScanResult" style="margin-top:12px">
                    <span style="font-size:14px;color:#717171">Processing check-in…</span>
                </div>
            </div>`;

        const resultEl = document.getElementById('ticketScanResult');

        try {
            // Try member RSVP first
            const { data: rsvp } = await supabaseClient
                .from('event_rsvps')
                .select('id, user_id, status, profiles!event_rsvps_user_id_fkey(first_name, last_name)')
                .eq('event_id', event.id)
                .eq('qr_token', ticketToken)
                .maybeSingle();

            if (rsvp) {
                const name = `${rsvp.profiles?.first_name || ''} ${rsvp.profiles?.last_name || ''}`.trim() || 'Member';

                // Check if already checked in
                const { data: existing } = await supabaseClient
                    .from('event_checkins')
                    .select('id')
                    .eq('event_id', event.id)
                    .eq('user_id', rsvp.user_id)
                    .maybeSingle();

                if (existing) {
                    resultEl.innerHTML = `<p style="font-size:14px;color:#f59e0b;font-weight:600">✅ Already checked in — ${pubEscapeHtml(name)}</p>`;
                    return;
                }

                await supabaseClient.from('event_checkins').insert({
                    event_id: event.id,
                    user_id: rsvp.user_id,
                    checked_in_by: pubCurrentUser.id,
                    checkin_mode: 'attendee_ticket'
                });

                resultEl.innerHTML = `<p style="font-size:16px;color:#059669;font-weight:700">✅ Checked in — ${pubEscapeHtml(name)}</p>`;
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                return;
            }

            // Try guest RSVP
            const { data: guestRsvp } = await supabaseClient
                .from('event_guest_rsvps')
                .select('id, guest_name, guest_token, paid')
                .eq('event_id', event.id)
                .eq('guest_token', ticketToken)
                .maybeSingle();

            if (guestRsvp && guestRsvp.paid) {
                const { data: gExisting } = await supabaseClient
                    .from('event_checkins')
                    .select('id')
                    .eq('event_id', event.id)
                    .eq('guest_token', guestRsvp.guest_token)
                    .maybeSingle();

                if (gExisting) {
                    resultEl.innerHTML = `<p style="font-size:14px;color:#f59e0b;font-weight:600">✅ Already checked in — ${pubEscapeHtml(guestRsvp.guest_name)} (Guest)</p>`;
                    return;
                }

                await supabaseClient.from('event_checkins').insert({
                    event_id: event.id,
                    guest_token: guestRsvp.guest_token,
                    checked_in_by: pubCurrentUser.id,
                    checkin_mode: 'attendee_ticket'
                });

                resultEl.innerHTML = `<p style="font-size:16px;color:#059669;font-weight:700">✅ Checked in — ${pubEscapeHtml(guestRsvp.guest_name)} (Guest)</p>`;
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                return;
            }

            resultEl.innerHTML = '<p style="font-size:14px;color:#dc2626;font-weight:600">❌ Invalid ticket — no matching RSVP found.</p>';
        } catch (err) {
            console.error('Ticket scan check-in error:', err);
            resultEl.innerHTML = `<p style="font-size:14px;color:#dc2626">Check-in failed: ${err.message}</p>`;
        }
    } else {
        // Attendee scanning their own ticket
        container.innerHTML = `
            <div class="evt-qr-card">
                <div style="width:64px;height:64px;background:#f7f7f7;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
                    <span style="font-size:32px">🎟️</span>
                </div>
                <h3 class="evt-qr-title">Event Ticket</h3>
                <p style="font-size:14px;color:#717171;margin-bottom:16px">Show this QR code to the event coordinator to check in.</p>
                <p style="font-size:13px;color:#b0b0b0">The event host uses the in-app scanner to verify your ticket.</p>
                ${!pubCurrentUser ? '<p style="font-size:13px;color:#717171;margin-top:14px"><a href="/auth/login.html?redirect=' + encodeURIComponent(window.location.href) + '" style="color:#222;font-weight:600">Sign in</a> if you\'re the event host.</p>' : ''}
            </div>`;
    }
}

/* ── Guest RSVP Section Renderer ─────────── */
function pubRenderGuestRsvpSection(event) {
    const section = document.getElementById('guestRsvpSection');
    if (!section) return;

    // Hide guest RSVP when RSVP is disabled for this event
    if (event.rsvp_enabled === false) {
        section.classList.add('hidden');
        return;
    }

    // Only show for non-signed-in visitors on non-member-only events
    if (pubCurrentUser || event.member_only || pubGuestRsvp) {
        section.classList.add('hidden');
        return;
    }

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast   = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    if (isClosed || isPast || deadlinePassed) return;

    section.classList.remove('hidden');

    // Update button label with price (if paid)
    const btn = document.getElementById('guestRsvpBtn');
    if (btn) {
        const cost = event.rsvp_cost_cents || 0;
        if (event.pricing_mode === 'paid' && cost > 0) {
            btn.textContent = `RSVP as Guest — ${pubFormatCurrency(cost)}`;
        } else {
            btn.textContent = 'RSVP as Guest';
        }
    }

    // Show/hide no-refund checkbox (only for paid events)
    const noRefundCheck = document.getElementById('guestNoRefundCheck');
    if (noRefundCheck) {
        const isPaid = event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0;
        noRefundCheck.closest('label').classList.toggle('hidden', !isPaid);
    }
}

/* ── Guest RSVP Handler ──────────────────── */
async function pubHandleGuestRsvp() {
    if (!pubCurrentEvent) return;

    const name  = document.getElementById('guestNameInput').value.trim();
    const email = document.getElementById('guestEmailInput').value.trim();
    const noRefund = document.getElementById('guestNoRefundCheck');
    const btn   = document.getElementById('guestRsvpBtn');

    if (!name || !email) {
        alert('Please enter your name and email.');
        return;
    }

    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Check no-refund policy checkbox (paid events only)
    const isPaid = pubCurrentEvent.pricing_mode === 'paid' && pubCurrentEvent.rsvp_cost_cents > 0;
    if (isPaid && noRefund && !noRefund.closest('label').classList.contains('hidden') && !noRefund.checked) {
        alert('Please accept the no-refund policy to continue.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        if (isPaid) {
            // Paid event → Stripe checkout
            const { url } = await callEdgeFunctionPublic('create-event-checkout', {
                event_id: pubCurrentEvent.id,
                type: 'rsvp',
                guest_name: name,
                guest_email: email,
            });
            if (url) window.location.href = url;
        } else {
            // Free event → direct RSVP via edge function
            const result = await callEdgeFunctionPublic('rsvp-guest-free', {
                event_id: pubCurrentEvent.id,
                guest_name: name,
                guest_email: email,
            });

            if (result.guest_token) {
                pubGuestToken = result.guest_token;
                pubGuestRsvp = {
                    guest_name: name,
                    guest_email: email,
                    guest_token: result.guest_token,
                    status: result.status,
                    paid: false,
                };

                // Show success + QR ticket
                const section = document.getElementById('guestRsvpSection');
                section.innerHTML = `
                    <div class="evt-info-card">
                        <span style="font-size:1.5rem">✅</span>
                        <div>
                            <p style="font-size:14px;font-weight:700;color:#059669">You're RSVP'd!</p>
                            <p style="font-size:13px;color:#059669">${pubEscapeHtml(name)} · ${pubEscapeHtml(email)}</p>
                        </div>
                    </div>`;

                // Show gated notes if applicable
                if (pubCurrentEvent.gated_notes) {
                    document.getElementById('gatedSection').classList.remove('hidden');
                    document.getElementById('gatedNotes').textContent = pubCurrentEvent.gated_notes;
                }

                // Show QR ticket if attendee_ticket mode
                if (pubCurrentEvent.checkin_mode === 'attendee_ticket') {
                    pubShowGuestTicket(pubGuestRsvp);
                }

                // Hide guest lookup since they just RSVP'd
                const lookupSection = document.getElementById('guestLookupSection');
                if (lookupSection) lookupSection.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error('Guest RSVP error:', err);
        alert(err.message || 'Failed to complete RSVP. Please try again.');
        btn.disabled = false;
        btn.textContent = isPaid
            ? `RSVP as Guest — ${pubFormatCurrency(pubCurrentEvent.rsvp_cost_cents)}`
            : 'RSVP as Guest';
    }
}

/* ── Guest Ticket Display ────────────────── */
async function pubShowGuestTicket(guestRsvp) {
    const section = document.getElementById('guestTicketSection');
    if (!section) return;

    section.classList.remove('hidden');
    document.getElementById('guestTicketName').textContent = guestRsvp.guest_name || 'Guest';

    const canvas = document.getElementById('guestTicketQR');
    const guestTicketUrl = `${window.location.origin}/events/?e=${pubCurrentEvent.slug}&ticket=${guestRsvp.guest_token}`;
    QRCode.toCanvas(canvas, guestTicketUrl, {
        width: 200, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' }
    });

    // Hide the guest RSVP form since they already have a ticket
    const formSection = document.getElementById('guestRsvpSection');
    if (formSection) formSection.classList.add('hidden');

    // Check if guest is already checked in
    const { data: ci } = await supabaseClient
        .from('event_checkins')
        .select('checked_in_at')
        .eq('event_id', pubCurrentEvent.id)
        .eq('guest_token', guestRsvp.guest_token)
        .maybeSingle();
    if (ci) pubShowCheckedInOverlay('guestTicketSection', 'guestTicketQR', ci.checked_in_at);
}

/* ── Guest Lookup ────────────────────────── */
function pubToggleLookup() {
    const form = document.getElementById('guestLookupForm');
    if (form) form.classList.toggle('hidden');
}

async function pubLookupGuestTicket() {
    if (!pubCurrentEvent) return;

    const email = document.getElementById('lookupEmailInput').value.trim();
    const resultEl = document.getElementById('lookupResult');
    const btn = document.getElementById('lookupBtn');

    if (!email) {
        resultEl.innerHTML = '<p style="font-size:13px;color:#dc2626">Please enter your email.</p>';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Searching...';

    try {
        const { data: gRsvp } = await supabaseClient
            .from('event_guest_rsvps')
            .select('*')
            .eq('event_id', pubCurrentEvent.id)
            .eq('guest_email', email)
            .maybeSingle();

        if (!gRsvp) {
            resultEl.innerHTML = '<p style="font-size:13px;color:#dc2626">No RSVP found for this email.</p>';
        } else {
            pubGuestRsvp = gRsvp;
            pubGuestToken = gRsvp.guest_token;
            pubShowGuestTicket(gRsvp);

            // Show gated notes if applicable
            if (pubCurrentEvent.gated_notes) {
                document.getElementById('gatedSection').classList.remove('hidden');
                document.getElementById('gatedNotes').textContent = pubCurrentEvent.gated_notes;
            }

            resultEl.innerHTML = '<p style="font-size:13px;color:#059669;font-weight:600">✅ Ticket found! Scroll up to see your QR code.</p>';
        }
    } catch (err) {
        console.error('Lookup error:', err);
        resultEl.innerHTML = '<p style="font-size:13px;color:#dc2626">Lookup failed. Please try again.</p>';
    }

    btn.disabled = false;
    btn.textContent = 'Find';
}

/* ── Utilities ───────────────────────────── */
function pubShowNotFound() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notFound').classList.remove('hidden');
}

function pubEscapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function pubCopyUrl() {
    const input = document.getElementById('shareUrl');
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById('copyBtnBanner');
        // Swap icon to checkmark briefly
        btn.innerHTML = '<svg style="width:18px;height:18px;color:#059669" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
        setTimeout(() => {
            btn.innerHTML = '<svg style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>';
        }, 2000);
    });
}

/* ── Map ─────────────────────────────────── */
let _pubMapCoords = null;

function pubShowMap(lat, lng, label) {
    const wrap = document.getElementById('eventMapWrap');
    if (!wrap || typeof L === 'undefined') return;
    wrap.classList.remove('hidden');

    // Store for fullscreen reuse
    _pubMapCoords = { lat, lng, label };

    const map = L.map('eventMap', { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup(pubEscapeHtml(label || 'Event Location'));

    // Directions button → opens preferred maps app
    const dirBtn = document.getElementById('eventDirectionsBtn');
    if (dirBtn) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const addr = encodeURIComponent(label || `${lat},${lng}`);
        const mapsUrl = isIOS
            ? `https://maps.apple.com/?daddr=${addr}`
            : `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
        dirBtn.href = mapsUrl;
    }

    // Fix tile rendering after hidden element becomes visible
    setTimeout(() => map.invalidateSize(), 200);
}

/* ── Fullscreen Map ──────────────────────── */
let _pubFullscreenMap = null;

function pubOpenFullscreenMap() {
    if (!_pubMapCoords) return;
    const { lat, lng, label } = _pubMapCoords;
    const overlay = document.getElementById('fullscreenMapOverlay');
    if (!overlay || typeof L === 'undefined') return;

    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Directions link
    const dirBtn = document.getElementById('fullscreenMapDirections');
    if (dirBtn) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const addr = encodeURIComponent(label || `${lat},${lng}`);
        dirBtn.href = isIOS
            ? `https://maps.apple.com/?daddr=${addr}`
            : `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
    }

    setTimeout(() => {
        if (_pubFullscreenMap) { _pubFullscreenMap.remove(); _pubFullscreenMap = null; }
        _pubFullscreenMap = L.map('fullscreenMapContainer', {
            zoomControl: true, attributionControl: false, dragging: true, scrollWheelZoom: true
        }).setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_pubFullscreenMap);
        L.marker([lat, lng]).addTo(_pubFullscreenMap).bindPopup(pubEscapeHtml(label || 'Event Location')).openPopup();
        setTimeout(() => _pubFullscreenMap.invalidateSize(), 50);
    }, 50);
}

function pubCloseFullscreenMap() {
    const overlay = document.getElementById('fullscreenMapOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (_pubFullscreenMap) { _pubFullscreenMap.remove(); _pubFullscreenMap = null; }
    document.body.style.overflow = '';
}

/* ── ICS Calendar Download ────────────────── */
function pubDownloadIcs() {
    if (!pubCurrentEvent) return;
    const e = pubCurrentEvent;
    const start = new Date(e.start_date);
    const end   = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 7200000);
    const fmt = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const uid  = `${e.id}@justicemcnealllc.com`;

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JusticeMcNealLLC//Events//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${e.title.replace(/[,;\\]/g, '')}`,
        `DESCRIPTION:${(e.description || '').replace(/\n/g, '\\n').slice(0, 500)}`,
        `LOCATION:${(e.location_text || '').replace(/[,;\\]/g, '')}`,
        `URL:${window.location.href}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${e.slug || 'event'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ── Personalized Invite Banner ──────────── */
async function pubRenderInviteBanner(event) {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return;

    const banner = document.getElementById('inviteBanner');
    if (!banner) return;

    let inviterName = null;

    if (ref.startsWith('g_')) {
        // Guest referrer — look up guest name
        const gToken = ref.slice(2);
        const { data: gRsvp } = await supabaseClient
            .from('event_guest_rsvps')
            .select('guest_name')
            .eq('event_id', event.id)
            .ilike('guest_token', gToken + '%')
            .maybeSingle();
        if (gRsvp) inviterName = gRsvp.guest_name;
    } else {
        // Member referrer — look up profile
        const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name')
            .ilike('id', ref + '%')
            .limit(1);
        if (profiles && profiles[0]) {
            inviterName = `${profiles[0].first_name || ''} ${profiles[0].last_name || ''}`.trim();
        }
    }

    if (inviterName) {
        banner.innerHTML = `
            <div class="evt-invite-banner">
                <div>
                    <p>🎉 ${pubEscapeHtml(inviterName)} invited you!</p>
                    <span>Join them at this event</span>
                </div>
            </div>`;
        banner.classList.remove('hidden');
    }
}

/* ── Comments / Discussion ───────────────── */
async function pubRenderComments(event) {
    const section = document.getElementById('commentsSection');
    const list    = document.getElementById('commentsList');
    const form    = document.getElementById('commentForm');
    const prompt  = document.getElementById('commentLoginPrompt');

    // Load comments
    const { data: comments } = await supabaseClient
        .from('event_comments')
        .select('*, profile:profiles!event_comments_user_id_fkey(first_name, last_name, profile_picture_url)')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true })
        .limit(100);

    // Show section if there are comments or user can post
    const canPost = pubCurrentRsvp || pubGuestRsvp;

    if ((!comments || comments.length === 0) && !canPost) return;

    section.classList.remove('hidden');

    // Render comments
    if (comments && comments.length > 0) {
        list.innerHTML = comments.map(c => {
            const isGuest = !c.user_id;
            const name = isGuest ? pubEscapeHtml(c.guest_name || 'Guest') : pubEscapeHtml(`${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim() || 'Member');
            const avatarUrl = !isGuest && c.profile?.profile_picture_url;
            const initials = isGuest ? (c.guest_name || 'G')[0].toUpperCase() : ((c.profile?.first_name?.[0] || '') + (c.profile?.last_name?.[0] || '')).toUpperCase();
            const timeAgo = pubTimeAgo(c.created_at);

            return `<div class="evt-comment">
                <div class="evt-comment-avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="">` : initials}</div>
                <div class="evt-comment-body">
                    <span class="evt-comment-name">${name}</span><span class="evt-comment-time">${timeAgo}</span>
                    <p class="evt-comment-text">${pubEscapeHtml(c.body)}</p>
                </div>
            </div>`;
        }).join('');
    } else {
        list.innerHTML = '<p style="font-size:14px;color:#b0b0b0;text-align:center">No comments yet — be the first!</p>';
    }

    // Show form or prompt
    if (canPost) {
        form.classList.remove('hidden');
    } else {
        prompt.classList.remove('hidden');
    }
}

async function pubPostComment() {
    const input = document.getElementById('commentInput');
    const body  = (input.value || '').trim();
    if (!body || !pubCurrentEvent) return;

    const payload = {
        event_id: pubCurrentEvent.id,
        body: body
    };

    if (pubCurrentUser) {
        payload.user_id = pubCurrentUser.id;
    } else if (pubGuestRsvp) {
        payload.guest_name  = pubGuestRsvp.guest_name;
        payload.guest_token = pubGuestRsvp.guest_token;
    } else {
        return; // Can't post without identity
    }

    const { error } = await supabaseClient.from('event_comments').insert(payload);
    if (error) {
        console.error('Comment error:', error);
        return;
    }

    input.value = '';
    // Refresh comments
    await pubRenderComments(pubCurrentEvent);
}

/* ── Time Ago Helper ─────────────────────── */
function pubTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Expose for onclick handlers
window.pubHandleRsvp = pubHandleRsvp;
window.pubHandlePaidRsvp = pubHandlePaidRsvp;
window.pubHandlePaidRaffle = pubHandlePaidRaffle;
window.pubHandleFreeRaffle = pubHandleFreeRaffle;
window.pubHandleGuestPaidRaffle = pubHandleGuestPaidRaffle;
window.pubHandleGuestFreeRaffle = pubHandleGuestFreeRaffle;
window.pubHandleGuestRsvp = pubHandleGuestRsvp;
window.pubDoVenueCheckin = pubDoVenueCheckin;
window.pubDoGuestVenueCheckin = pubDoGuestVenueCheckin;
window.pubToggleLookup = pubToggleLookup;
window.pubLookupGuestTicket = pubLookupGuestTicket;
window.pubOpenFullscreenMap = pubOpenFullscreenMap;
window.pubCloseFullscreenMap = pubCloseFullscreenMap;
window.pubCopyUrl = pubCopyUrl;
window.pubDownloadIcs = pubDownloadIcs;
window.pubPostComment = pubPostComment;

// ═══════════════════════════════════════════════════════════
// Swipeable Bottom Nav (mobile — public event page)
// ═══════════════════════════════════════════════════════════
const PUB_FAB_ICONS = {
    plus: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>',
    signIn: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>',
};

function pubInitBottomNav(event) {
    const prev = document.getElementById('evtFabWrap');
    if (prev) prev.remove();

    const rsvpEnabled = event.rsvp_enabled !== false;
    const raffleEnabled = !!event.raffle_enabled;
    if (!rsvpEnabled && !raffleEnabled) return;

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    const entriesClosed = isClosed || isPast || deadlinePassed;

    const wrap = document.createElement('div');
    wrap.id = 'evtFabWrap';
    wrap.className = 'evt-fab-wrap';

    // Raffle FAB
    if (raffleEnabled) {
        let cls, icon, label, onclick, disabled;
        if (entriesClosed) {
            cls = 'evt-fab evt-fab-raffle'; icon = PUB_FAB_ICONS.lock; label = 'Closed'; disabled = true;
        } else if (event.pricing_mode === 'paid') {
            cls = null; // included with RSVP
        } else {
            cls = 'evt-fab evt-fab-raffle'; icon = PUB_FAB_ICONS.ticket; label = 'Raffle';
            onclick = "document.getElementById('raffleSection')?.scrollIntoView({behavior:'smooth'})";
        }
        if (cls) {
            wrap.innerHTML += `<button class="${cls}"${onclick ? ` onclick="${onclick}"` : ''}${disabled ? ' disabled' : ''}>${icon}<span class="evt-fab-label">${label}</span></button>`;
        }
    }

    // RSVP FAB
    if (rsvpEnabled) {
        let cls, icon, label, onclick, disabled, isLink;
        if (pubCurrentRsvp?.paid || pubGuestRsvp?.paid) {
            cls = 'evt-fab evt-fab-rsvp-done'; icon = PUB_FAB_ICONS.check; label = "RSVP'd"; disabled = true;
        } else if (pubCurrentRsvp?.status === 'going' || pubGuestRsvp) {
            cls = 'evt-fab evt-fab-rsvp-done'; icon = PUB_FAB_ICONS.check; label = 'Going'; disabled = true;
        } else if (entriesClosed) {
            cls = 'evt-fab evt-fab-rsvp'; icon = PUB_FAB_ICONS.lock; label = isClosed ? 'Closed' : 'RSVP Closed'; disabled = true;
        } else if (pubCurrentUser && event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0) {
            cls = 'evt-fab evt-fab-rsvp'; icon = PUB_FAB_ICONS.plus; label = `RSVP — ${pubFormatCurrency(event.rsvp_cost_cents)}`;
            onclick = "document.getElementById('rsvpSection').scrollIntoView({behavior:'smooth'})";
        } else if (pubCurrentUser) {
            cls = 'evt-fab evt-fab-rsvp'; icon = PUB_FAB_ICONS.plus; label = 'RSVP'; onclick = "pubHandleRsvp('going')";
        } else {
            cls = 'evt-fab evt-fab-rsvp'; icon = PUB_FAB_ICONS.signIn; label = 'Sign In to RSVP'; isLink = true;
        }
        if (isLink) {
            wrap.innerHTML += `<a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="${cls}" style="text-decoration:none">${icon}<span class="evt-fab-label">${label}</span></a>`;
        } else {
            wrap.innerHTML += `<button class="${cls}"${onclick ? ` onclick="${onclick}"` : ''}${disabled ? ' disabled' : ''}>${icon}<span class="evt-fab-label">${label}</span></button>`;
        }
    }

    if (!wrap.children.length) return;
    document.body.appendChild(wrap);
}

    // Dot tap
    dots.forEach(d => d.addEventListener('click', () => goToPage(Number(d.dataset.page))));
}
