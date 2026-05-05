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


function pubPublicMapsHref(destination) {
    const addr = encodeURIComponent(destination || '');
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        ? `https://maps.apple.com/?daddr=${addr}`
        : `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
}


function pubBuildPublicDetailShell(event, goingCount) {
    const content = document.getElementById('eventContent');
    if (!content) return;

    document.body.classList.add('public-event-detail');
    content.classList.add('public-ed-detail');

    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : null;
    const dateMain = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dateLong = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const weekday = start.toLocaleDateString('en-US', { weekday: 'long' });
    const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endTimeStr = end ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
    const showTime = !event.gate_time || pubCurrentRsvp || pubGuestRsvp;
    const showLocation = !event.gate_location || pubCurrentRsvp || pubGuestRsvp;
    const typeInfo = PUB_TYPE_COLORS[event.event_type] || PUB_TYPE_COLORS.llc;
    const isLlc = event.event_type === 'llc';
    const creator = event.creator || null;
    const creatorName = creator
        ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || 'Member'
        : '';
    const hostName = isLlc ? 'Justice McNeal LLC' : (creatorName || typeInfo.label);
    const categoryLabel = event.category ? (event.category || '').replace(/_/g, ' ') : '';
    const bannerStyle = event.banner_url
        ? `background-image:url('${event.banner_url}');background-size:cover;background-position:center;`
        : 'background:linear-gradient(135deg,#312e81 0%,#6d28d9 52%,#a855f7 100%);';
    const mapsHref = event.location_text ? pubPublicMapsHref(event.location_text) : '#';

    content.innerHTML = `
        <input type="hidden" id="shareUrl" value="">

        <div class="ed-content">
            <div class="ed-detail-body">
                <div class="ed-main">
                    <div id="eventBanner" class="ed-hero" style="${bannerStyle}" role="img" aria-label="Event banner">
                        <div class="ed-hero-scrim"></div>
                        <div class="ed-hero-nav">
                            <div id="heroStatusBadge" aria-live="polite" aria-atomic="true"></div>
                            <div id="eventTags" class="ed-hero-pills"></div>
                        </div>
                        <div class="ed-hero-bottom-content">
                            <h1 id="eventContentTitle" class="ed-hero-title">${pubEscapeHtml(event.title || 'Event')}</h1>
                            <div id="heroLocationPill" class="public-ed-hidden-mount"></div>
                            <p class="ed-hero-subtitle">Hosted by ${pubEscapeHtml(hostName)}${categoryLabel ? ` &bull; ${pubEscapeHtml(categoryLabel)}` : ''}</p>
                            <div class="ed-hero-info-bar">
                                <div class="ed-hero-info-item">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                    <div><span class="ed-hero-info-main">${dateMain}</span><span class="ed-hero-info-sub">${weekday}</span></div>
                                </div>
                                ${showTime ? `<div class="ed-hero-info-item"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><div><span class="ed-hero-info-main">${timeStr}</span><span class="ed-hero-info-sub">${endTimeStr ? `Ends ${endTimeStr}` : 'Start time'}</span></div></div>` : ''}
                                ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-hero-info-item"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg><div><span class="ed-hero-info-main">${pubEscapeHtml(event.location_nickname || event.location_text || '')}</span><span class="ed-hero-info-sub">${pubEscapeHtml(event.location_nickname && event.location_text ? event.location_text : 'Location')}</span></div></div>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="ed-content-cards">
                        <div class="ed-qi-bar">
                            <div class="ed-qi-col"><svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span class="ed-qi-main">${dateMain}</span><span class="ed-qi-sub">${weekday}</span></div>
                            ${showTime ? `<div class="ed-qi-col"><svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span class="ed-qi-main">${timeStr}</span><span class="ed-qi-sub">Start time</span></div>` : ''}
                            ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-qi-col ed-qi-col-loc"><svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span class="ed-qi-main">${pubEscapeHtml(event.location_nickname || event.location_text || '')}</span><span class="ed-qi-sub">Location</span></div>` : ''}
                        </div>
                        ${showLocation && event.location_lat && event.location_lng ? `
                        <div class="ed-mobile-map-card">
                            <div id="eventMapMobile" class="ed-mobile-map" onclick="pubOpenFullscreenMap()"></div>
                            <div class="ed-map-overlay ed-mobile-map-overlay">
                                <span class="ed-map-overlay-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                                <div class="ed-map-overlay-body">
                                    <p class="ed-map-overlay-name">${pubEscapeHtml(event.location_nickname || event.location_text || 'Venue')}</p>
                                    ${event.location_nickname && event.location_text ? `<p class="ed-map-overlay-addr">${pubEscapeHtml(event.location_text)}</p>` : ''}
                                    <a href="${mapsHref}" target="_blank" rel="noopener" class="ed-map-overlay-link">View on Maps ↗</a>
                                </div>
                            </div>
                        </div>` : ''}

                        <div id="inviteBanner" class="hidden public-ed-invite"></div>
                        <div id="eventStatusBanner" class="hidden ed-card"></div>
                        <div id="attendeeCount" class="hidden ed-card"></div>
                        <div id="calendarSection" class="hidden"></div>

                        <div class="ed-about-grid public-ed-about-grid">
                            <div class="ed-about-left">
                                <div class="ed-about-desc-col">
                                    <p class="ed-about-heading">About This Event</p>
                                    <p id="eventDesc" class="ed-desc"></p>
                                </div>
                            </div>
                            <div class="ed-about-right">
                                <div class="ed-about-org-col"><div id="hostSection" class="hidden"></div></div>
                                <div id="eventMapWrap" class="hidden ed-about-map-col public-ed-map-col">
                                    <div class="ed-map-wrap">
                                        <div id="eventMap" class="ed-map" onclick="pubOpenFullscreenMap()"></div>
                                        <div class="ed-map-overlay">
                                            <span class="ed-map-overlay-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                                            <div class="ed-map-overlay-body"><p class="ed-map-overlay-name">${pubEscapeHtml(event.location_nickname || event.location_text || 'Venue')}</p>${event.location_nickname && event.location_text ? `<p class="ed-map-overlay-addr">${pubEscapeHtml(event.location_text)}</p>` : ''}<a id="eventDirectionsBtn" href="${mapsHref}" target="_blank" rel="noopener" class="ed-map-overlay-link">View on Maps</a></div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div id="gatedSection" class="hidden ed-card evt-section"><div class="evt-info-card"><span class="evt-info-card-icon">🔓</span><div><p class="evt-info-card-title">Attendee Details</p><p id="gatedNotes" class="evt-info-card-sub" style="white-space:pre-line"></p></div></div></div>
                        <div id="commentsSection" class="hidden ed-card" role="region" aria-label="Discussion">
                            <div class="ed-section-head"><h3>Discussion</h3></div>
                            <div id="commentsList" class="ed-comments-list"></div>
                            <div id="commentForm" class="hidden ed-comment-input-row">
                                <div class="ed-comment-self-avatar">G</div>
                                <div class="ed-comment-input-wrap"><input type="text" id="commentInput" placeholder="Add a comment..." class="ed-comment-input" aria-label="Write a comment"><button onclick="pubPostComment()" class="ed-comment-post">Post</button></div>
                            </div>
                            <div id="commentLoginPrompt" class="hidden ed-comment-empty"><span class="ed-comment-empty-icon">💬</span><p class="ed-comment-empty-text">RSVP to join the discussion</p></div>
                        </div>
                        <div class="evt-footer">&copy; Justice McNeal LLC · <a href="/">Home</a></div>
                    </div>
                </div>

                <div class="ed-sidebar public-ed-sidebar">
                    <div class="ed-card ed-summary-card">
                        <p class="ed-summary-heading">Event Summary</p>
                        <div class="ed-summary-header-row">
                            ${event.banner_url ? `<img src="${event.banner_url}" class="ed-summary-thumb" alt="">` : '<div class="ed-summary-thumb ed-summary-thumb-placeholder"></div>'}
                            <div class="ed-summary-header-text"><p class="ed-summary-title">${pubEscapeHtml(event.title || 'Event')}</p><p class="ed-summary-sub">Hosted by ${pubEscapeHtml(hostName)}</p>${categoryLabel ? `<p class="ed-summary-cat">${pubEscapeHtml(categoryLabel)}</p>` : ''}</div>
                        </div>
                        <hr class="ed-divider" style="margin:14px 0">
                        <div class="ed-summary-rows">
                            <div class="ed-summary-row"><div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25"/></svg></div><div><span class="ed-summary-main">${dateLong}</span><span class="ed-summary-sub2">${weekday}</span></div></div>
                            ${showTime ? `<div class="ed-summary-row"><div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div><span class="ed-summary-main">${timeStr}</span><span class="ed-summary-sub2">${endTimeStr ? `Ends ${endTimeStr}` : 'Start time'}</span></div></div>` : ''}
                            ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-summary-row"><div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg></div><div><span class="ed-summary-main">${pubEscapeHtml(event.location_nickname || event.location_text || '')}</span>${event.location_text && event.location_nickname ? `<span class="ed-summary-sub2">${pubEscapeHtml(event.location_text)}</span>` : ''}${event.location_text ? `<a href="${mapsHref}" target="_blank" rel="noopener" class="ed-maps-link">View on Maps</a>` : ''}</div></div>` : ''}
                            ${goingCount >= 3 ? `<div class="ed-summary-row"><div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857"/></svg></div><div><span class="ed-summary-main">${goingCount} going</span>${event.max_participants ? `<span class="ed-summary-sub2">${event.max_participants - goingCount > 0 ? `${event.max_participants - goingCount} spots left` : 'Sold out'}</span>` : ''}</div></div>` : ''}
                        </div>
                    </div>
                    <div id="memberRsvpCard" class="hidden ed-card ed-card-rsvp"><p class="ed-summary-heading">Your RSVP</p><div id="rsvpSection" class="evt-section" role="region" aria-label="RSVP"></div></div>
                    <div id="guestRsvpSection" class="hidden ed-card"><p class="ed-summary-heading">RSVP for This Event</p><p class="public-ed-muted" style="margin-bottom:14px">No account needed. Enter your name and email.</p><div class="public-ed-field-stack"><input type="text" id="guestNameInput" placeholder="Your full name" class="evt-input" aria-label="Full name"><input type="email" id="guestEmailInput" placeholder="Email address" class="evt-input" aria-label="Email address"><label class="evt-checkbox-label hidden"><input type="checkbox" id="guestNoRefundCheck"><span>I understand this payment is non-refundable unless cancelled by staff.</span></label><button onclick="pubHandleGuestRsvp()" id="guestRsvpBtn" class="evt-rsvp-pay">RSVP as Guest</button></div><div class="pub-rsvp-links"><a id="signinRsvpLink" href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="pub-rsvp-text-link">Have an account? Sign in</a><button type="button" onclick="var p=document.getElementById('lookupPanel');if(p)p.classList.toggle('hidden')" class="pub-rsvp-text-link">Already RSVP'd? Find my ticket</button></div><div id="lookupPanel" class="hidden" style="margin-top:14px"><div class="public-ed-field-stack"><input type="email" id="lookupEmailInput" placeholder="Email used for RSVP" class="evt-input" aria-label="Email used for RSVP"><button onclick="pubLookupGuestTicket()" id="lookupBtn" class="evt-action-btn">Find My Ticket</button></div><div id="lookupResult" style="margin-top:10px"></div></div></div>
                    <div id="memberOnlyNotice" class="hidden ed-card evt-section"><div class="evt-notice-card"><span class="evt-notice-icon">🔒</span><div><p class="evt-notice-title">Members-only event</p><p class="evt-notice-sub">Sign in with your member account to RSVP.</p></div></div></div>
                    <div id="ticketSection" class="hidden ed-card evt-section"><div class="evt-qr-card"><h3 class="evt-qr-title">🎫 Your Event Ticket</h3><canvas id="ticketQR" style="display:block;margin:0 auto"></canvas><p class="evt-qr-sub">Show this QR code at check-in</p></div></div>
                    <div id="guestTicketSection" class="hidden ed-card evt-section"><div class="evt-qr-card"><div style="font-size:36px;margin-bottom:8px">🎉</div><h3 class="evt-qr-title">You're In!</h3><p id="guestTicketName" style="font-size:13px;color:#717171;margin-bottom:16px"></p><canvas id="guestTicketQR" style="display:block;margin:0 auto"></canvas><p class="evt-qr-sub">Show this QR code at check-in</p><p style="font-size:13px;color:#f59e0b;font-weight:600;margin-top:10px">Bookmark this page. This is your ticket.</p></div></div>
                    <div id="venueCheckin" class="hidden ed-card evt-section"><div id="checkinResult"></div></div>
                    <div id="raffleSection" class="ed-card"></div>

                </div>
            </div>
        </div>`;
}

/* ── Render ──────────────────────────────── */

function pubRenderEvent(event, goingCount, isCheckin, ticketToken) {
    document.getElementById('loading').classList.add('hidden');
    const content = document.getElementById('eventContent');
    content.classList.remove('hidden');
    content.classList.add('evt-fade-in');
    pubBuildPublicDetailShell(event, goingCount);

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

    heroBadge.innerHTML = `<span class="evt-status-badge ${badgeCls}"><span class="evt-status-dot${dotPulse ? ' pulse' : ''}"></span>${badgeLabel}</span>`;

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

// Expose for onclick handlers. Some handlers are defined in later-loaded files,
// so wrappers resolve from window at click time instead of at index.js parse time.
function pubCallDeferred(name, args) {
    const fn = window[name];
    if (typeof fn === 'function' && fn !== window[`_${name}Wrapper`]) return fn.apply(window, args);
}
[
    'pubHandleRsvp', 'pubHandlePaidRsvp', 'pubHandlePaidRaffle', 'pubHandleFreeRaffle',
    'pubHandleGuestPaidRaffle', 'pubHandleGuestFreeRaffle', 'pubHandleGuestRsvp',
    'pubDoVenueCheckin', 'pubDoGuestVenueCheckin', 'pubToggleLookup', 'pubLookupGuestTicket',
    'pubOpenFullscreenMap', 'pubCloseFullscreenMap', 'pubDownloadIcs', 'pubPostComment',
    'pubOpenLightbox', 'pubOpenRsvpSheet', 'pubCloseRsvpSheet'
].forEach(name => {
    window[`_${name}Wrapper`] = function () { return pubCallDeferred(name, arguments); };
    window[name] = window[`_${name}Wrapper`];
});
window.pubCopyUrl = pubCopyUrl;

// ═══════════════════════════════════════════════════════════
// Scroll-driven hero collapse (shrink + sticky body header)
// ═══════════════════════════════════════════════════════════
