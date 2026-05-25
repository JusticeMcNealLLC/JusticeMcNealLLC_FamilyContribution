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

'use strict';

// ── PortalEvents.detail namespace + lightweight registry ──
const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
const detail = PortalEvents.detail = PortalEvents.detail || {};
detail._registry = detail._registry || {};
detail.register = function (name, fn) { detail._registry[name] = fn; };
detail.get = function (name) { return detail._registry[name]; };

// Presentation helpers — Phase 5D.1: js/portal/events/detail/presentation.js
// Fragment helpers — Phase 5F-prep: js/portal/events/detail/fragments.js
// Detail data context — Phase 5H.1: js/portal/events/detail/data.js
// Detail section HTML — Phase 5H.2–5H.5: js/portal/events/detail/sections.js
// Detail post-render — Phase 5H.6.1–5H.6.4: js/portal/events/detail/post-render.js
// Detail template shell — Phase 5I.1: js/portal/events/detail/template.js

// Raffle render helpers — Phase 5D.2: js/portal/events/detail/raffle-render.js

// ═══════════════════════════════════════════════════════════
// Main render — globalThis.evtOpenDetail
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
        .eq('user_id', globalThis.evtCurrentUser.id)
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

let costBreakdownHtml = window.evtBuildDetailCostBreakdownHtml(ctx);

const thresholdContextHtml = window.evtBuildDetailThresholdHtml(ctx);
const eventContextHtml = [thresholdContextHtml, transportContextHtml].filter(Boolean).join('');

const waitlistHtml = window.evtBuildDetailWaitlistHtml(ctx);
const graceHtml = window.evtBuildDetailGraceNoticeHtml(ctx);

const rsvpButtons = window.evtBuildDetailRsvpSectionHtml(ctx);
const raffleHtml = window.evtBuildDetailRaffleSectionHtml(ctx);
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
const templateCtx = {
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
    thresholdHtml: '',
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
};
detailView.innerHTML = window.evtBuildDetailTemplate(templateCtx);

// ── Post-render setup ────────────────────────────────
document.title = `${event.title} | Events | Justice McNeal LLC`;
window.scrollTo({ top: 0, behavior: 'instant' });
window.evtInitSectionAnimations();
window.evtRunDetailPostRenderUi({
    event,
    eventId,
    isPast,
    isClosed,
    rsvp,
    myRaffleEntry,
    entriesClosed,
    eventIsFull,
    isHost,
    canAccessTeamHub,
    canCreateTeamChat,
});
evtInitHeroCollapse();
window.evtRunDetailPostRenderBasics({ eventId });

// QR canvas + inline maps after DOM render
setTimeout(() => {
    window.evtRenderDetailQrCanvases({ event, eventId, rsvp, memberGoing });
    window.evtInitDetailInlineMaps({ event, showLocation });
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
globalThis.evtOpenDetail = evtOpenDetail;
window.evtOpenDetail = evtOpenDetail;
globalThis.evtInitHeroCollapse = evtInitHeroCollapse;
globalThis.evtCleanupHeroCollapse = evtCleanupHeroCollapse;
window.evtInitHeroCollapse = evtInitHeroCollapse;
window.evtCleanupHeroCollapse = evtCleanupHeroCollapse;
detail.open                       = evtOpenDetail;
detail.openLightbox = globalThis.evtOpenLightbox;
detail.openFullscreenMap = globalThis.evtOpenFullscreenMap;
detail.closeFullscreenMap = globalThis.evtCloseFullscreenMap;
detail.initBottomNav = globalThis.evtInitBottomNav;
detail.cleanupBottomNav = globalThis.evtCleanupBottomNav;
detail.openCtaPanel = globalThis.evtOpenCtaPanel;
detail.closeCtaPanel = globalThis.evtCloseCtaPanel;
detail.openTeamToolsPanel = globalThis.evtOpenTeamToolsPanel;
detail.openTeamChat = globalThis.evtOpenTeamChat;
detail.startLiveCountdown = globalThis.evtStartLiveCountdown;
detail.initSectionAnimations = globalThis.evtInitSectionAnimations;
// Phase 3B additions — mirror remaining window.evt* globals + raffle helpers
detail.recenterFullscreenMap = globalThis.evtRecenterFullscreenMap;
detail.initHeroCollapse      = evtInitHeroCollapse;
detail.cleanupHeroCollapse   = evtCleanupHeroCollapse;
detail.miniMarkdown = globalThis.evtMiniMarkdown;
detail.raffleConfig = globalThis.evtDetailRaffleConfig;
detail.raffleCategories = globalThis.evtDetailRaffleCategories;
detail.raffleItems = globalThis.evtDetailRaffleItems;
detail.raffleWinnerCount = globalThis.evtDetailRaffleWinnerCount;
detail.drawModeLabel = globalThis.evtDetailDrawModeLabel;
detail.rafflePrizesHtml = globalThis.evtDetailRafflePrizesHtml;
detail.raffleWinnersHtml = globalThis.evtDetailRaffleWinnersHtml;
detail.raffleLockedDesktopHtml = globalThis.evtRaffleLockedDesktopHtml;

// Phase 5E.1 — nested namespace aliases (discoverability; flat bridges unchanged)
if (PortalEvents.detail.presentation) {
detail.presentation = PortalEvents.detail.presentation;
}
if (PortalEvents.detail.raffleRender) {
detail.raffleRender = PortalEvents.detail.raffleRender;
}
if (PortalEvents.detail.mapOverlay) {
detail.mapOverlay = PortalEvents.detail.mapOverlay;
}
if (PortalEvents.team) {
detail.team = PortalEvents.team;
}
if (PortalEvents.detail.fragments) {
detail.fragments = PortalEvents.detail.fragments;
}
if (PortalEvents.detail.data) {
detail.data = PortalEvents.detail.data;
}
if (PortalEvents.detail.sections) {
detail.sections = PortalEvents.detail.sections;
}
if (PortalEvents.detail.postRender) {
detail.postRender = PortalEvents.detail.postRender;
}
if (PortalEvents.detail.template) {
detail.template = PortalEvents.detail.template;
}
detail.loadContext = globalThis.evtLoadDetailContext;
detail.buildTemplate = globalThis.evtBuildDetailTemplate;
detail.runPostRenderBasics = globalThis.evtRunDetailPostRenderBasics;
detail.renderQrCanvases = globalThis.evtRenderDetailQrCanvases;
detail.initInlineMaps = globalThis.evtInitDetailInlineMaps;
detail.runPostRenderUi = globalThis.evtRunDetailPostRenderUi;

// Pre-register known sub-modules (M3 management sheet will register itself here)
detail.register('rsvp',        { handle: () => window.evtHandleRsvp });
detail.register('raffle',      { handle: () => window.evtHandleRaffleEntry });
detail.register('competition', { build:  () => window.evtBuildCompetitionHtml });
detail.register('comments',    { load:   () => window.evtLoadComments,  post: () => window.evtPostComment });
detail.register('documents',   { build:  () => window.evtBuildDocumentsHtml });
detail.register('scrapbook',   { build:  () => window.evtBuildScrapbookHtml });
detail.register('map',         { build:  () => window.evtBuildMapHtml });
detail.register('scanner',     { open:   () => window.evtOpenScanner });

export const detailOrchestratorApi = {
    register: detail.register,
    get: detail.get,
    open: globalThis.evtOpenDetail,
    namespace: detail,
};
