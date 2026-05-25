/* ════════════════════════════════════════════════════════════
   Portal Events — Detail page template shell (Phase 5I.1)
   Classic IIFE; loads after detail/post-render.js, before detail.js.
   ════════════════════════════════════════════════════════════ */

'use strict';

import { evtDataAction } from '../core/actions.js';


function evtBuildDetailTemplate(templateCtx) {
    const _edCard = window.evtEdCard;
    const _edSectionHead = window.evtEdSectionHead;
    const evtEscapeHtml = window.evtEscapeHtml;
    const {
        event,
        eventId,
        start,
        timeStr,
        tc,
        cpName,
        showTime,
        showLocation,
        showNotes,
        isPast,
        isClosed,
        deadlinePassed,
        rsvpEnabled,
        bannerBg,
        heroStatusBadgeHtml,
        pageHeaderActionsHtml,
        mobileAttendeesHtml,
        mobileHostedHtml,
        descHtml,
        descIsLong,
        eventContextHtml,
        attendeePreviewHtml,
        organizerHtml,
        waitlistHtml,
        thresholdHtml,
        costBreakdownHtml,
        locationReqHtml,
        graceHtml,
        raffleHtml,
        mapHtml,
        competitionHtml,
        scrapbookHtml,
        relatedHtml,
        rsvpButtons,
        teamHubCardHtml,
        qrHtml,
        documentsHtml,
        shareCardHtml,
    } = templateCtx;

    return `
    <!-- ─── Detail Page Header ─── -->
    <div class="ed-page-header">
        <div class="ed-page-header-inner">
            <button onclick="globalThis.evtNavigateToList()" class="ed-page-header-back" aria-label="Back to events">
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
            <div class="ed-hero" style="${bannerBg}" ${event.banner_url ? `${evtDataAction('evtOpenLightbox', event.banner_url)}` : ''} role="img" aria-label="Event banner">
                <div class="ed-hero-scrim"></div>
                <div class="ed-hero-nav">
                    ${heroStatusBadgeHtml}
                    <div class="ed-hero-pill-row">
                        <button onclick="event.stopPropagation();globalThis.evtNavigateToList()" class="ed-hero-pill evt-hero-back-btn" title="Back" aria-label="Back to events">
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
                    ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-qi-col${event.location_lat && event.location_lng ? ' ed-qi-col-loc' : ''}"${event.location_lat && event.location_lng ? ` ${evtDataAction('evtOpenFullscreenMap', event.location_lat, event.location_lng)}` : ''}>
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
                    <button ${evtDataAction('evtPostComment', eventId)} class="ed-comment-post" aria-label="Post comment">Post</button>
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
                        ${event.banner_url ? `<img src="${event.banner_url}" class="ed-summary-thumb" alt="" loading="eager" decoding="async">` : `<div class="ed-summary-thumb ed-summary-thumb-placeholder"></div>`}
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
}

export const detailTemplateApi = {
    build: evtBuildDetailTemplate,
};

globalThis.evtBuildDetailTemplate = evtBuildDetailTemplate;

const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.detail = PortalEvents.detail || {};
PortalEvents.detail.template = detailTemplateApi;
