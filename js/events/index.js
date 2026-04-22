/* ──────────────────────────────────────────
   Public Event Page — Bootstrap (M5b split)
   Loads first; defines shared state + orchestrator.
   ────────────────────────────────────────── */

// Constants & state — `var` so they live on window for sibling modules.
var PUB_CATEGORY_EMOJI = {
    party: '🎉', birthday: '🎂', hangout: '🤝', game_night: '🎮',
    cookout: '🍖', trip: '🏔️', retreat: '🏖️', dinner: '🍽️',
    holiday: '🎄', other: '📌'
};

var PUB_TYPE_COLORS = {
    llc:         { bg: '#f7f7f7', color: '#222', label: 'LLC Event' },
    member:      { bg: '#f7f7f7', color: '#222', label: 'Member Event' },
    competition: { bg: '#f7f7f7', color: '#222', label: 'Competition' }
};

var pubCurrentEvent = null;
var pubCurrentUser  = null;
var pubCurrentRsvp  = null;
var pubGuestToken   = null;
var pubGuestRsvp    = null;

function pubMiniMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}


function pubInitSectionAnimations() {
    const sections = document.querySelectorAll('.evt-section.evt-anim');
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('evt-visible'), i * 60);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    sections.forEach(s => observer.observe(s));
}

/* ── Utility: Smart Live Countdown ────────── */

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
        bannerEl.style.cursor = 'pointer';
        bannerEl.addEventListener('click', () => pubOpenLightbox(event.banner_url));
    } else {
        bannerEl.style.background = 'linear-gradient(135deg, #222, #444)';
    }
    // Prevent hero action buttons from triggering lightbox
    bannerEl.querySelectorAll('.evt-hero-btn').forEach(b => b.addEventListener('click', e => e.stopPropagation()));

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
        <div class="evt-date-card" onclick="pubDownloadIcs()" title="Add to calendar">
            <span class="evt-date-card-month">${heroMonthStr}</span>
            <span class="evt-date-card-day">${heroDayStr}</span>
            <span class="evt-date-card-time">${heroTimeShort}</span>
            <span class="evt-date-card-cal-icon"><svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"/></svg></span>
        </div>
    </div>`;

    // Live countdown updater (smart: 1s tick when < 1 hour)
    if (!isClosed && !isPast && event.status !== 'active') {
        pubStartLiveCountdown(event.start_date, heroBadge);
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

    // ── Add to Calendar — handled by date card tap ───
    // (calendarSection no longer used — .ics triggered from date card)

    // Map (show if location + lat/lng available and not gated)
    if (event.location_lat && event.location_lng && !isGatedLoc) {
        pubShowMap(event.location_lat, event.location_lng, event.location_text);
    }

    // Description (markdown, collapsible, empty state)
    const descEl = document.getElementById('eventDesc');
    const rawDesc = event.description || '';
    if (rawDesc.trim()) {
        const rendered = pubMiniMarkdown(pubEscapeHtml(rawDesc)).replace(/\n/g, '<br>');
        descEl.classList.add('evt-desc');
        descEl.innerHTML = rendered;
        if (rawDesc.length > 500) {
            descEl.classList.add('evt-desc-collapsed');
            const btn = document.createElement('button');
            btn.className = 'evt-read-more';
            btn.textContent = 'Read more';
            btn.addEventListener('click', () => {
                descEl.classList.remove('evt-desc-collapsed');
                btn.remove();
            });
            descEl.parentNode.insertBefore(btn, descEl.nextSibling);
        }
    } else {
        descEl.innerHTML = '<em style="color:#b0b0b0">No details yet — check back closer to the event.</em>';
    }

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

    // Add section fade-in animations
    content.querySelectorAll('.evt-section').forEach(s => s.classList.add('evt-anim'));
    pubInitSectionAnimations();

    // ── Scroll-driven hero collapse + sticky header ─────
    pubInitHeroCollapse();
}

/* ── RSVP Section ────────────────────────── */

function pubFormatCurrency(cents) {
    return '$' + (cents / 100).toFixed(2);
}

/* ── RSVP Handler ────────────────────────── */

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
    const url = input.value;

    // Use native share if available
    if (navigator.share) {
        navigator.share({ title: pubCurrentEvent?.title || 'Event', url }).catch(() => {});
        return;
    }

    navigator.clipboard.writeText(url).then(() => {
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
window.pubOpenLightbox = pubOpenLightbox;

// ═══════════════════════════════════════════════════════════
// Scroll-driven hero collapse (shrink + sticky body header)
// ═══════════════════════════════════════════════════════════
