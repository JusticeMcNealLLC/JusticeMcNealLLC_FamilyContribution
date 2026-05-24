// ═══════════════════════════════════════════════════════════
// Portal Events — Detail Page View  (M2 refactor)
// Renders the full event detail into #eventsDetailView
// Dark-themed immersive hero → light content cards below
//
// M2 changes:
//   • Wrapped in IIFE; registers PortalEvents.detail namespace + sub-registry.
//   • Dead hero-collapse scroll code removed — page scrolls naturally.
//   • Sticky title row via CSS (no JS scroll listener).
//   • Host "⋯ More" → "Manage event" trigger (M3 will swap the dropdown for a sheet).
//   • All legacy evt* globals preserved on window for unmodified consumers.
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── PortalEvents.detail namespace + lightweight registry ──
    window.PortalEvents = window.PortalEvents || {};
    const detail = window.PortalEvents.detail = window.PortalEvents.detail || {};
    detail._registry = detail._registry || {};
    detail.register = function (name, fn) { detail._registry[name] = fn; };
    detail.get = function (name) { return detail._registry[name]; };

// Presentation helpers — Phase 5D.1: js/portal/events/detail/presentation.js
// Fragment helpers — Phase 5F-prep: js/portal/events/detail/fragments.js
// Detail data context — Phase 5H.1: js/portal/events/detail/data.js
// Detail section HTML — Phase 5H.2–5H.5: js/portal/events/detail/sections.js
// Detail post-render — Phase 5H.6.1–5H.6.2: js/portal/events/detail/post-render.js

const _edMetaRow = window.evtEdMetaRow;
const _edPill = window.evtEdPill;
const _edCard = window.evtEdCard;
const _edNotice = window.evtEdNotice;
const _edSectionHead = window.evtEdSectionHead;

// Raffle render helpers — Phase 5D.2: js/portal/events/detail/raffle-render.js

// ═══════════════════════════════════════════════════════════
// Main render — evtOpenDetail
// ═══════════════════════════════════════════════════════════

async function evtOpenDetail(eventId) {
    const ctx = await window.evtLoadDetailContext(eventId);
    if (!ctx) return;

    const {
        event,
        rsvp,
        start,
        dateStr,
        timeStr,
        endTimeStr,
        tc,
        isLlc,
        isComp,
        goingList,
        maybeList,
        guestGoingList,
        checkins,
        checkinCount,
        costItems,
        waitlist,
        myWaitlistEntry,
        raffleEntryCount,
        myRaffleEntry,
        raffleWinners,
        isCreator,
        canManageEvent,
        canAccessTeamHub,
        isHost,
        canCreateTeamChat,
        creatorProfile,
        cpName,
        cpInitials,
        cpBadge,
        cpTitle,
        memberGoing,
        hasRsvp,
        documentsHtml,
        mapHtml,
        competitionHtml,
        scrapbookHtml,
        showTime,
        showLocation,
        showNotes,
        isClosed,
        isPast,
        deadlinePassed,
        entriesClosed,
        rsvpEnabled,
        canRsvp,
        eventIsFull,
    } = ctx;

    // ═══════════════════════════════════════════════════════
    // Build visual sections
    // ═══════════════════════════════════════════════════════

    const heroStatusBadgeHtml = window.evtBuildDetailHeroStatusBadgeHtml(ctx);

    // ── Banner bg ────────────────────────────────────────
    const bannerBg = event.banner_url
        ? `background-image:url('${event.banner_url}');background-size:cover;background-position:center;`
        : `background:linear-gradient(135deg, #312e81 0%, #6d28d9 50%, #a855f7 100%);`;

    const transportContextHtml = window.evtBuildDetailTransportNoticeHtml(ctx);
    const locationReqHtml = window.evtBuildDetailLocationNoticeHtml(ctx);

    // ── QR Code for attendee ticket ──────────────────────
    let qrHtml = '';
    let myCheckin = null;
    const checkinEnabled = event.checkin_enabled !== false;
    if (checkinEnabled && memberGoing && event.checkin_mode === 'attendee_ticket') {
        const { data: ci } = await supabaseClient
            .from('event_checkins')
            .select('checked_in_at')
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id)
            .maybeSingle();
        myCheckin = ci;
        const checkedInTime = myCheckin ? new Date(myCheckin.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
        const checkedInDate = myCheckin ? new Date(myCheckin.checked_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

        qrHtml = `
            <div class="ed-qr-wrap">
                <div class="ed-qr-header">${myCheckin ? '✅ Checked In' : '🎫 Your Event Ticket'}</div>
                <div style="position:relative;display:inline-block">
                    <canvas id="myTicketQR" style="display:block;margin:0 auto;border-radius:12px;${myCheckin ? 'opacity:.25' : ''}"></canvas>
                    ${myCheckin ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                        <div style="width:56px;height:56px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(16,185,129,.4)">
                            <svg style="width:28px;height:28px;color:#fff" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    </div>` : ''}
                </div>
                <p class="ed-qr-hint">${myCheckin ? `Scanned at ${checkedInTime} · ${checkedInDate}` : 'Show this QR code at check-in'}</p>
            </div>`;
    }

    // ── Venue QR (host) ──────────────────────────────────
    let venueQrHtml = '';
    if (checkinEnabled && isHost && event.checkin_mode === 'venue_scan' && event.venue_qr_token) {
        venueQrHtml = `
            <div class="ed-qr-wrap">
                <div class="ed-qr-header">📍 Venue QR Code</div>
                <canvas id="venueQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
                <p class="ed-qr-hint">Display this at the entrance for attendees to scan</p>
            </div>`;
    }

    // ── Scanner button ───────────────────────────────────
    let scannerBtn = '';
    if (checkinEnabled && isHost && event.checkin_mode === 'attendee_ticket' && ['open', 'confirmed', 'active'].includes(event.status)) {
        scannerBtn = `<button onclick="evtOpenScanner('${eventId}')" class="ed-action-btn"><svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>Scan Attendee QR</button>`;
    }

    const costBreakdownHtml = window.evtBuildDetailCostBreakdownHtml(ctx);

    const thresholdHtml = '';
    const thresholdContextHtml = window.evtBuildDetailThresholdHtml(ctx);
    const eventContextHtml = [thresholdContextHtml, transportContextHtml].filter(Boolean).join('');

    const waitlistHtml = window.evtBuildDetailWaitlistHtml(ctx);
    const graceHtml = window.evtBuildDetailGraceNoticeHtml(ctx);

    const rsvpButtons = window.evtBuildDetailRsvpSectionHtml(ctx);
    const raffleHtml = window.evtBuildDetailRaffleSectionHtml(ctx);
    const attendeeBreakdownHtml = window.evtBuildDetailAttendeeBreakdownHtml(ctx);

    const hostControlsHtml = window.evtBuildDetailHostControlsHtml(ctx);
    const attendeePreviewHtml = window.evtBuildDetailAttendeePreviewHtml(ctx);
    const shareCardHtml = window.evtBuildDetailShareCardHtml(ctx);
    const organizerHtml = window.evtBuildDetailOrganizerHtml(ctx);
    const teamHubCardHtml = window.evtBuildDetailTeamHubHtml(ctx);
    const relatedHtml = window.evtBuildDetailRelatedEventsHtml(ctx);
    const mobileAttendeesHtml = window.evtBuildDetailMobileAttendeesHtml(ctx);
    const mobileHostedHtml = window.evtBuildDetailMobileHostedHtml(ctx);
    const pageHeaderActionsHtml = window.evtBuildDetailPageHeaderActionsHtml(ctx);

    // ── Description ──────────────────────────────────────
    const rawDesc = event.description || '';
    const descHtml = rawDesc ? window.evtMiniMarkdown(rawDesc) : '<span class="ed-no-desc">No details yet — check back closer to the event.</span>';
    const descIsLong = rawDesc.length > 500;

    // ── Collapsible cost wrapper ─────────────────────────
    if (costBreakdownHtml && event.rsvp_cost_cents) {
        costBreakdownHtml = `
            <div class="evt-cost-toggle" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open')" role="button" aria-expanded="false" aria-label="Toggle cost breakdown">
                <div><span class="evt-cost-toggle-label">Cost Breakdown</span></div>
                <div style="display:flex;align-items:center;gap:8px"><span class="evt-cost-toggle-price">${formatCurrency(event.rsvp_cost_cents)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg></div>
            </div>
            <div class="evt-cost-details">${costBreakdownHtml}</div>`;
    }

    // ═══════════════════════════════════════════════════════
    // Final HTML assembly — new card-based layout
    // ═══════════════════════════════════════════════════════

    const detailView = document.getElementById('eventsDetailView');
    detailView.classList.add('event-detail-surface', 'portal-event-detail-v2');
    detailView.innerHTML = `
        <!-- ─── Detail Page Header ─── -->
        <div class="ed-page-header">
            <div class="ed-page-header-inner">
                <button onclick="evtNavigateToList()" class="ed-page-header-back" aria-label="Back to events">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    <span class="ed-page-header-back-label">Back to Events</span>
                </button>
                <div class="ed-page-header-title">
                    <h2>Event Details</h2>
                    <p class="ed-page-header-sub">Discover and join events in your community.</p>
                </div>
                <div class="ed-page-header-actions">
                    ${pageHeaderActionsHtml}
                </div>
            </div>
        </div>

        <!-- ─── Two-column layout: hero+content LEFT, summary sidebar RIGHT ─── -->
        <div class="ed-content event-detail-shell portal-event-shell">
            <div class="ed-detail-body event-detail-grid portal-event-grid">
                <div class="ed-main event-detail-main portal-event-story">

                <!-- ─── Immersive Hero ─── -->
                <div class="ed-hero" style="${bannerBg}" ${event.banner_url ? `onclick="evtOpenLightbox('${event.banner_url}')"` : ''} role="img" aria-label="Event banner">
                    <div class="ed-hero-scrim"></div>
                    <div class="ed-hero-nav">
                        ${heroStatusBadgeHtml}
                        <div class="ed-hero-pill-row">
                            <button onclick="event.stopPropagation();evtNavigateToList()" class="ed-hero-pill evt-hero-back-btn" title="Back" aria-label="Back to events">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="ed-hero-bottom-content">
                        <h1 class="ed-hero-title">${evtEscapeHtml(event.title)}</h1>
                        <p class="ed-hero-subtitle">${cpName ? `Hosted by ${evtEscapeHtml(cpName)}` : evtEscapeHtml(tc.label)}${event.category ? ` &bull; ${evtEscapeHtml((event.category || '').replace(/_/g,' '))}` : ''}</p>
                        <div class="ed-hero-info-bar">
                            <div class="ed-hero-info-item">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                <div>
                                    <span class="ed-hero-info-main">${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    <span class="ed-hero-info-sub">${start.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                </div>
                            </div>
                            ${showTime ? `<div class="ed-hero-info-item">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <div>
                                    <span class="ed-hero-info-main">${timeStr}</span>
                                    <span class="ed-hero-info-sub">Start time</span>
                                </div>
                            </div>` : ''}
                            ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-hero-info-item">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                <div>
                                    <span class="ed-hero-info-main">${evtEscapeHtml(event.location_nickname || event.location_text || '')}</span>
                                    <span class="ed-hero-info-sub">${evtEscapeHtml(event.location_text && event.location_nickname ? event.location_text : '')}</span>
                                </div>
                            </div>` : ''}
                        </div>
                    </div>
                </div><!-- /ed-hero -->

                <div class="ed-content-cards portal-event-sections">
                    <!-- Quick-Info Bar (mobile only: date / time / location) -->
                    <div class="ed-qi-bar">
                        <div class="ed-qi-col">
                            <svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            <span class="ed-qi-main">${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                            <span class="ed-qi-sub">${start.toLocaleDateString('en-US',{weekday:'short'})}</span>
                        </div>
                        ${showTime ? `<div class="ed-qi-col">
                            <svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span class="ed-qi-main">${timeStr}</span>
                            <span class="ed-qi-sub">Start time</span>
                        </div>` : ''}
                        ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-qi-col${event.location_lat && event.location_lng ? ' ed-qi-col-loc' : ''}"${event.location_lat && event.location_lng ? ` onclick="evtOpenFullscreenMap(${event.location_lat},${event.location_lng})"` : ''}>
                            <svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <span class="ed-qi-main">${evtEscapeHtml(event.location_nickname || event.location_text || '')}</span>
                            <span class="ed-qi-sub">${event.location_nickname && event.location_text ? evtEscapeHtml(event.location_text) : 'Location'}</span>
                        </div>` : ''}
                    </div>
                    <!-- Mobile Map Card (S5 — hidden on desktop) -->
                    ${showLocation && event.location_lat && event.location_lng ? `
                    <div class="ed-mobile-map-card">
                        <div id="detailEventMapMobile" class="ed-mobile-map"></div>
                        <div class="ed-map-overlay ed-mobile-map-overlay">
                            <span class="ed-map-overlay-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                            <div class="ed-map-overlay-body">
                                <p class="ed-map-overlay-name">${evtEscapeHtml(event.location_nickname || event.location_text || 'Venue')}</p>
                                ${event.location_nickname && event.location_text ? `<p class="ed-map-overlay-addr">${evtEscapeHtml(event.location_text)}</p>` : ''}
                                <a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' : 'https://www.google.com/maps/dir/?api=1&destination='}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-map-overlay-link">View on Maps ↗</a>
                            </div>
                        </div>
                    </div>` : ''}
                    <!-- Mobile Attendees Card (S7) -->
                    ${mobileAttendeesHtml}
                    <!-- Mobile Hosted By Card (S8) -->
                    ${mobileHostedHtml}
                    <!-- About Card -->
                    <div class="ed-about-grid event-detail-card">
                        <div class="ed-about-left">
                            <div class="ed-about-desc-col">
                                ${deadlinePassed && !isClosed && !isPast ? '<div class="ed-deadline-banner" style="margin-bottom:14px">🔒 RSVP deadline passed</div>' : ''}
                                <p class="ed-about-heading">About This Event</p>
                                <div class="ed-desc${descIsLong ? ' ed-desc-collapsed' : ''}" id="evtDescWrap">${descHtml}</div>
                                ${descIsLong ? '<button class="ed-read-more" onclick="var w=document.getElementById(\'evtDescWrap\'),c=w.classList.toggle(\'ed-desc-collapsed\');this.textContent=c?\'Read more\':\'Show less\'">Read more</button>' : ''}
                                ${eventContextHtml ? `<div class="ed-context-list">${eventContextHtml}</div>` : ''}
                            </div>
                            ${attendeePreviewHtml ? `
                            <div class="ed-about-desc-col">
                                <p class="ed-card-heading" style="margin-bottom:12px">Attendees</p>
                                ${attendeePreviewHtml}
                            </div>` : ''}
                        </div>
                        ${(organizerHtml || (showLocation && event.location_lat && event.location_lng)) ? `
                        <div class="ed-about-right">
                            ${organizerHtml ? `<div class="ed-about-org-col">${organizerHtml}</div>` : ''}
                            ${showLocation && event.location_lat && event.location_lng ? `
                            <div class="ed-about-map-col">
                                <div class="ed-map-wrap">
                                    <div id="detailEventMap" class="ed-map"></div>
                                    <div class="ed-map-overlay">
                                        <span class="ed-map-overlay-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                                        <div class="ed-map-overlay-body">
                                            <p class="ed-map-overlay-name">${evtEscapeHtml(event.location_nickname || event.location_text || 'Venue')}</p>
                                            ${event.location_nickname && event.location_text ? `<p class="ed-map-overlay-addr">${evtEscapeHtml(event.location_text)}</p>` : ''}
                                            <a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' : 'https://www.google.com/maps/dir/?api=1&destination='}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-map-overlay-link">View on Maps ↗</a>
                                        </div>
                                    </div>
                                </div>
                            </div>` : ''}
                        </div>` : ''}
                    </div>

            <!-- Gated Notes Card -->
            ${showNotes && event.gated_notes ? `<div class="ed-card event-detail-card">${_edSectionHead('Attendee Details')}<p class="ed-body-text whitespace-pre-line">${evtEscapeHtml(event.gated_notes)}</p></div>` : ''}

            <!-- Attendees Card moved into about grid right column -->

            <!-- Dynamic sections (notices, QR, cost, raffle…) -->
            <!-- scannerBtn + venueQrHtml moved into Manage Event sheet -->
            ${[waitlistHtml, thresholdHtml, costBreakdownHtml, locationReqHtml, graceHtml, raffleHtml, mapHtml, competitionHtml, scrapbookHtml].filter(Boolean).map(s => _edCard(s, 'event-detail-card')).join('')}

            <!-- Stats & Breakdown moved into Manage Event sheet (EventsManage) -->

            <!-- Comments -->
            <div class="ed-card event-detail-card" id="portalCommentsSection" role="region" aria-label="Discussion">
                ${_edSectionHead('Discussion')}
                <div id="portalCommentsList" class="ed-comments-list"></div>
                <div class="ed-comment-input-row">
                    <div class="ed-comment-self-avatar" id="portalCommentSelfAvatar"></div>
                    <div class="ed-comment-input-wrap">
                        <input type="text" id="portalCommentInput" placeholder="Add a comment…" class="ed-comment-input" aria-label="Write a comment">
                        <button onclick="evtPostComment('${eventId}')" class="ed-comment-post" aria-label="Post comment">Post</button>
                    </div>
                </div>
            </div>

            <!-- Related Events -->
            ${relatedHtml ? _edCard(relatedHtml, 'event-detail-card') : ''}

            <!-- Host Controls inline card removed — opens via Manage Event sheet -->

            ${event.cancellation_note ? _edCard(`<div class="ed-cancel-banner"><p class="ed-cancel-title">Cancellation Note</p><p class="ed-cancel-text">${evtEscapeHtml(event.cancellation_note)}</p></div>`, 'event-detail-card') : ''}

                    <div style="height:80px" class="lg:hidden"></div>
                    <div style="height:32px" class="hidden lg:block"></div>
                </div><!-- /ed-content-cards -->
                </div><!-- /ed-main -->

                <!-- ─── Event Summary Sidebar ─── -->
                <div class="ed-sidebar event-detail-rail portal-event-rail">
                    <div class="ed-card ed-summary-card event-detail-card-tight portal-summary-card">
                        <p class="ed-summary-heading">Event Summary</p>
                        <div class="ed-summary-header-row">
                            ${event.banner_url ? `<img src="${event.banner_url}" class="ed-summary-thumb" alt="">` : `<div class="ed-summary-thumb ed-summary-thumb-placeholder"></div>`}
                            <div class="ed-summary-header-text">
                                <p class="ed-summary-title">${evtEscapeHtml(event.title)}</p>
                                <p class="ed-summary-sub">${cpName ? `Hosted by ${evtEscapeHtml(cpName)}` : evtEscapeHtml(tc.label)}</p>
                                ${event.category ? `<p class="ed-summary-cat">${evtEscapeHtml((event.category||'').replace(/_/g,' '))}</p>` : ''}
                            </div>
                        </div>
                        <hr class="ed-divider" style="margin:14px 0">
                        <div class="ed-summary-rows">
                            <div class="ed-summary-row">
                                <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg></div>
                                <div>
                                    <span class="ed-summary-main">${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                    <span class="ed-summary-sub2">${start.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                                </div>
                            </div>
                            ${showTime ? `<div class="ed-summary-row">
                                <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                                <div>
                                    <span class="ed-summary-main">${timeStr}</span>
                                    <span class="ed-summary-sub2">Start time</span>
                                </div>
                            </div>` : ''}
                            ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-summary-row">
                                <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg></div>
                                <div>
                                    <span class="ed-summary-main">${evtEscapeHtml(event.location_nickname || event.location_text || '')}</span>
                                    ${event.location_text && event.location_nickname ? `<span class="ed-summary-sub2">${evtEscapeHtml(event.location_text)}</span>` : ''}
                                    ${event.location_text ? `<a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' : 'https://www.google.com/maps/dir/?api=1&destination='}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-maps-link">View on Maps ↗</a>` : ''}
                                </div>
                            </div>` : ''}
                        </div>
                    </div>
                    ${rsvpButtons && rsvpEnabled ? `
                    <div class="ed-card ed-card-rsvp event-detail-card-tight portal-action-card">
                        <p class="ed-summary-heading">Your RSVP</p>
                        ${rsvpButtons}
                    </div>` : ''}
                    ${teamHubCardHtml}
                    ${qrHtml ? `
                    <div class="ed-card event-detail-card-tight portal-action-card portal-ticket-card">
                        ${qrHtml}
                    </div>` : ''}
                    ${documentsHtml ? `
                    <div class="ed-card event-detail-card-tight portal-action-card portal-docs-card">
                        ${documentsHtml}
                    </div>` : ''}
                    ${!isPast && !isClosed ? `
                    <div class="ed-card ed-countdown-card event-detail-card-tight portal-utility-card" id="edCountdownCard">
                        <p class="ed-summary-heading">Starts In</p>
                        <div class="ed-countdown-grid">
                            <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdDays">--</span><span class="ed-countdown-lbl">Days</span></div>
                            <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdHours">--</span><span class="ed-countdown-lbl">Hours</span></div>
                            <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdMins">--</span><span class="ed-countdown-lbl">Mins</span></div>
                            <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdSecs">--</span><span class="ed-countdown-lbl">Secs</span></div>
                        </div>
                    </div>` : ''}
                    <div class="ed-card ed-share-card event-detail-card-tight portal-utility-card">
                        ${shareCardHtml}
                    </div>
            </div><!-- /ed-detail-body -->
        </div>
    `;

    // ── Post-render setup ────────────────────────────────
    document.title = `${event.title} | Events | Justice McNeal LLC`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    window.evtInitSectionAnimations();
    // ── Sidebar countdown tick ───────────────────────────
    if (!isPast && !isClosed) {
        const _cdTarget = new Date(event.start_date).getTime();
        const _cdEls = ['edCdDays','edCdHours','edCdMins','edCdSecs'].map(id => document.getElementById(id));
        const _cdCard = document.getElementById('edCountdownCard');
        function _tickCd() {
            const diff = _cdTarget - Date.now();
            if (!_cdEls[0] || diff < 0) { if (_cdCard) _cdCard.style.display = 'none'; return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            _cdEls[0].textContent = String(d).padStart(2,'0');
            _cdEls[1].textContent = String(h).padStart(2,'0');
            _cdEls[2].textContent = String(m).padStart(2,'0');
            _cdEls[3].textContent = String(s).padStart(2,'0');
        }
        _tickCd();
        const _cdTimer = setInterval(_tickCd, 1000);
        // Clean up on next navigation
        const _cdCleanup = () => clearInterval(_cdTimer);
        window.addEventListener('popstate', _cdCleanup, { once: true });
        document.addEventListener('evtDetailUnmount', _cdCleanup, { once: true });
    }

    window.__evtTeamToolsCtx = {
        eventId,
        myRaffleEntry,
        entriesClosed,
        eventIsFull,
        canManageEvent: isHost,
        canAccessTeamHub,
        canCreateTeamChat,
    };
    if (typeof window.evtInitBottomNav === 'function') {
        window.evtInitBottomNav(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, isHost, canAccessTeamHub);
    }
    evtInitHeroCollapse();
    window.evtRunDetailPostRenderBasics({ eventId });

    // QR canvas + inline map after DOM render
    setTimeout(() => {
        window.evtRenderDetailQrCanvases({ event, eventId, rsvp, memberGoing });
        // venueQR canvas moved into Manage Event sheet
        if (showLocation && event.location_lat && event.location_lng && typeof L !== 'undefined') {
            const _initMap = (id) => {
                const mapEl = document.getElementById(id);
                if (!mapEl) return;
                const dMap = L.map(id, { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false, tap: true }).setView([event.location_lat, event.location_lng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(dMap);
                L.marker([event.location_lat, event.location_lng]).addTo(dMap);
                setTimeout(() => dMap.invalidateSize(), 100);
                // Leaflet's own click event fires only on a clean tap (not after a drag)
                dMap.on('click', () => window.evtOpenFullscreenMap(event.location_lat, event.location_lng, evtEscapeHtml(event.location_text || '')));
            };
            _initMap('detailEventMap');
            _initMap('detailEventMapMobile');
        }
    }, 100);
}

// Fullscreen map overlay — Phase 5D.3: js/portal/events/detail/map-overlay.js

// ═══════════════════════════════════════════════════════════
// Hero collapse — DEPRECATED (M2)
// Hero scrolls naturally; sticky title row handled in CSS via position:sticky.
// Functions kept as no-ops so external callers (rsvp/utils) don't crash.
// ═══════════════════════════════════════════════════════════
function evtInitHeroCollapse() { /* no-op since M2 — hero scrolls naturally */ }
function evtCleanupHeroCollapse() { /* no-op since M2 */ }

// Team Tools / CTA bar — Phase 5C: js/portal/events/team/tools.js
// Locked raffle desktop HTML — Phase 5D.2: js/portal/events/detail/raffle-render.js

// ═══════════════════════════════════════════════════════════
// Public surface — preserve legacy evt* globals + register PortalEvents.detail namespace
// ═══════════════════════════════════════════════════════════
window.evtOpenDetail            = evtOpenDetail;
window.evtInitHeroCollapse      = evtInitHeroCollapse;
window.evtCleanupHeroCollapse   = evtCleanupHeroCollapse;
detail.open                = evtOpenDetail;
detail.openLightbox        = window.evtOpenLightbox;
detail.openFullscreenMap   = window.evtOpenFullscreenMap;
detail.closeFullscreenMap  = window.evtCloseFullscreenMap;
detail.initBottomNav       = window.evtInitBottomNav;
detail.cleanupBottomNav    = window.evtCleanupBottomNav;
detail.openCtaPanel        = window.evtOpenCtaPanel;
detail.closeCtaPanel       = window.evtCloseCtaPanel;
detail.openTeamToolsPanel  = window.evtOpenTeamToolsPanel;
detail.openTeamChat        = window.evtOpenTeamChat;
detail.startLiveCountdown    = window.evtStartLiveCountdown;
detail.initSectionAnimations = window.evtInitSectionAnimations;
// Phase 3B additions — mirror remaining window.evt* globals + raffle helpers
detail.recenterFullscreenMap = window.evtRecenterFullscreenMap;
detail.initHeroCollapse      = evtInitHeroCollapse;
detail.cleanupHeroCollapse   = evtCleanupHeroCollapse;
detail.miniMarkdown          = window.evtMiniMarkdown;
detail.raffleConfig          = window.evtDetailRaffleConfig;
detail.raffleCategories      = window.evtDetailRaffleCategories;
detail.raffleItems           = window.evtDetailRaffleItems;
detail.raffleWinnerCount     = window.evtDetailRaffleWinnerCount;
detail.drawModeLabel         = window.evtDetailDrawModeLabel;
detail.rafflePrizesHtml      = window.evtDetailRafflePrizesHtml;
detail.raffleWinnersHtml     = window.evtDetailRaffleWinnersHtml;
detail.raffleLockedDesktopHtml = window.evtRaffleLockedDesktopHtml;

// Phase 5E.1 — nested namespace aliases (discoverability; flat bridges unchanged)
if (window.PortalEvents.detail.presentation) {
    detail.presentation = window.PortalEvents.detail.presentation;
}
if (window.PortalEvents.detail.raffleRender) {
    detail.raffleRender = window.PortalEvents.detail.raffleRender;
}
if (window.PortalEvents.detail.mapOverlay) {
    detail.mapOverlay = window.PortalEvents.detail.mapOverlay;
}
if (window.PortalEvents.team) {
    detail.team = window.PortalEvents.team;
}
if (window.PortalEvents.detail.fragments) {
    detail.fragments = window.PortalEvents.detail.fragments;
}
if (window.PortalEvents.detail.data) {
    detail.data = window.PortalEvents.detail.data;
}
if (window.PortalEvents.detail.sections) {
    detail.sections = window.PortalEvents.detail.sections;
}
if (window.PortalEvents.detail.postRender) {
    detail.postRender = window.PortalEvents.detail.postRender;
}
detail.loadContext = window.evtLoadDetailContext;
detail.runPostRenderBasics = window.evtRunDetailPostRenderBasics;
detail.renderQrCanvases = window.evtRenderDetailQrCanvases;

// Pre-register known sub-modules (M3 management sheet will register itself here)
detail.register('rsvp',        { handle: () => window.evtHandleRsvp });
detail.register('raffle',      { handle: () => window.evtHandleRaffleEntry });
detail.register('competition', { build:  () => window.evtBuildCompetitionHtml });
detail.register('comments',    { load:   () => window.evtLoadComments,  post: () => window.evtPostComment });
detail.register('documents',   { build:  () => window.evtBuildDocumentsHtml });
detail.register('scrapbook',   { build:  () => window.evtBuildScrapbookHtml });
detail.register('map',         { build:  () => window.evtBuildMapHtml });
detail.register('scanner',     { open:   () => window.evtOpenScanner });

})(); // ── end IIFE ──
