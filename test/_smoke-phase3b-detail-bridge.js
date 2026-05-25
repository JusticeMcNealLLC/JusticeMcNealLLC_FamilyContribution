// ═══════════════════════════════════════════════════════════
// Phase 3B static smoke test — detail.js compatibility bridge
//
// Verifies:
//   • detail.js file structure (IIFE, no native export, exists)
//   • All public globals expected by other scripts are assigned in source
//   • window.PortalEvents.detail namespace and its keys
//   • portal/events.html not switched to module mode
//   • No new detail/ subfiles created without being loaded in events.html
//   • Phase 1 bridge still intact (init.js)
//   • Phase 2 bridges still intact (constants.js, raffle-model.js)
//   • Phase 3A list bridge still intact (list.js)
//
// Run: node test/_smoke-phase3b-detail-bridge.js
// ═══════════════════════════════════════════════════════════
'use strict';

const fs   = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const {
    parseClassicChain,
    isProductionLoaded,
    chainOrderOk,
    portalEventsHtmlScripts,
} = require('./_portal-events-classic-chain.js');

let passed = 0;
let failed = 0;
const failures = [];

function pass(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg, detail) {
    console.log(`  ✗ ${msg}`);
    if (detail) console.log(`    detail: ${detail}`);
    failed++;
    failures.push(msg);
}
function read(relPath) {
    return fs.readFileSync(path.join(root, relPath), 'utf8');
}

// ─── detail.js file structure ─────────────────────────────
console.log('\n── js/portal/events/detail.js — file structure ───────────────────────────');

const detail = read('js/portal/events/detail.js');
const teamChat = read('js/portal/events/team/chat.js');
const teamTools = read('js/portal/events/team/tools.js');
const detailPresentation = read('js/portal/events/detail/presentation.js');
const detailRaffleRender = read('js/portal/events/detail/raffle-render.js');
const detailMapOverlay = read('js/portal/events/detail/map-overlay.js');
const detailFragments = read('js/portal/events/detail/fragments.js');
const detailData = read('js/portal/events/detail/data.js');
const detailSections = read('js/portal/events/detail/sections.js');
const detailPostRender = read('js/portal/events/detail/post-render.js');
const detailTemplate = read('js/portal/events/detail/template.js');

detail.includes('(function ()')
    ? pass('IIFE wrapper present ((function () {)')
    : fail('IIFE wrapper missing — detail.js must remain a classic-script IIFE');

detail.includes("'use strict';")
    ? pass("'use strict' present inside IIFE")
    : fail("'use strict' missing");

/\bexport\s+(default|const|let|var|function|class|\{)/.test(detail)
    ? fail('Native export statement found — breaks classic script loading')
    : pass('No native export statement (stays classic-script safe)');

detail.includes('async function evtOpenDetail')
    ? pass('detail.js still defines async function evtOpenDetail')
    : fail('evtOpenDetail missing from detail.js');

detail.includes('window.evtRunDetailPostRenderBasics({ eventId })')
    ? pass('detail.js delegates post-render basics to post-render.js')
    : fail('detail.js must call window.evtRunDetailPostRenderBasics');

detail.includes('window.evtOpenDetail            = evtOpenDetail')
    ? pass('detail.js still exports evtOpenDetail on window')
    : fail('window.evtOpenDetail assignment missing from detail.js');

detail.includes('detail.register(')
    ? pass('detail.js still contains detail.register block')
    : fail('detail.register block missing from detail.js');

!detail.includes('QRCode.toCanvas')
    ? pass('QRCode.toCanvas moved out of detail.js (Phase 5H.6.2)')
    : fail('QRCode.toCanvas should not remain in detail.js');

!detail.includes("_initMap('detailEventMap')") && !detail.includes('L.map(id,')
    ? pass('inline Leaflet init moved out of detail.js (Phase 5H.6.3)')
    : fail('inline Leaflet should not remain in detail.js');

detailPostRender.includes('function evtInitDetailInlineMaps')
    ? pass('evtInitDetailInlineMaps defined in detail/post-render.js (Phase 5H.6.3)')
    : fail('evtInitDetailInlineMaps missing from detail/post-render.js');

detailPostRender.includes("initMap('detailEventMap')")
    ? pass('detail/post-render.js initializes detailEventMap (Phase 5H.6.3)')
    : fail('detail/post-render.js must init detailEventMap');

detail.includes('window.evtInitDetailInlineMaps({ event, showLocation })')
    ? pass('detail.js delegates inline map init to post-render.js (Phase 5H.6.3)')
    : fail('detail.js must call window.evtInitDetailInlineMaps');

detail.includes('detail.initInlineMaps = window.evtInitDetailInlineMaps')
    ? pass('detail.initInlineMaps bridge present (Phase 5H.6.3)')
    : fail('detail.initInlineMaps bridge missing');

detailPostRender.includes('function evtRunDetailPostRenderUi')
    ? pass('evtRunDetailPostRenderUi defined in detail/post-render.js (Phase 5H.6.4)')
    : fail('evtRunDetailPostRenderUi missing from detail/post-render.js');

detailPostRender.includes('__evtTeamToolsCtx') && detailPostRender.includes('window.evtInitBottomNav')
    ? pass('post-render.js owns Team Tools context + bottom nav init (Phase 5H.6.4)')
    : fail('post-render.js must assign __evtTeamToolsCtx and call evtInitBottomNav');

detailPostRender.includes('function _tickCd')
    ? pass('post-render.js owns sidebar countdown (_tickCd) (Phase 5H.6.4)')
    : fail('post-render.js must contain sidebar countdown (_tickCd)');

detail.includes('window.evtRunDetailPostRenderUi({')
    ? pass('detail.js delegates post-render UI to post-render.js (Phase 5H.6.4)')
    : fail('detail.js must call window.evtRunDetailPostRenderUi');

detail.includes('detail.runPostRenderUi = window.evtRunDetailPostRenderUi')
    ? pass('detail.runPostRenderUi bridge present (Phase 5H.6.4)')
    : fail('detail.runPostRenderUi bridge missing');

!detail.includes('__evtTeamToolsCtx')
    ? pass('Team Tools context moved out of detail.js (Phase 5H.6.4)')
    : fail('__evtTeamToolsCtx should not remain in detail.js');

!detail.match(/evtInitBottomNav\s*\(/)
    ? pass('evtInitBottomNav call moved out of detail.js (Phase 5H.6.4)')
    : fail('evtInitBottomNav should not be called inline in detail.js');

!detail.includes('function _tickCd')
    ? pass('sidebar countdown moved out of detail.js (Phase 5H.6.4)')
    : fail('_tickCd should not remain in detail.js');

detailTemplate.includes('function evtBuildDetailTemplate')
    ? pass('evtBuildDetailTemplate defined in detail/template.js (Phase 5I.1)')
    : fail('evtBuildDetailTemplate missing from detail/template.js');

detail.includes('window.evtBuildDetailTemplate(templateCtx)')
    ? pass('detail.js delegates template build to detail/template.js (Phase 5I.1)')
    : fail('detail.js must call window.evtBuildDetailTemplate(templateCtx)');

!detail.includes('detailView.innerHTML = `')
    ? pass('detailView.innerHTML template moved out of detail.js (Phase 5I.1)')
    : fail('detail.js must not contain inline detailView.innerHTML template');

detail.includes('detail.buildTemplate = window.evtBuildDetailTemplate')
    ? pass('detail.buildTemplate bridge present (Phase 5I.1)')
    : fail('detail.buildTemplate bridge missing');

!detail.includes('function _buildAvatarHtml')
    ? pass('avatar paint not reimplemented in detail.js (lives in post-render.js)')
    : fail('_buildAvatarHtml should not remain in detail.js');

!detail.includes('evtLoadComments(eventId)')
    ? pass('evtLoadComments call not inline in detail.js (delegated to post-render)')
    : fail('evtLoadComments(eventId) should be delegated via evtRunDetailPostRenderBasics');

// ─── Namespace infrastructure ──────────────────────────────
console.log('\n── detail.js — window.PortalEvents.detail infrastructure ─────────────────');

detail.includes('window.PortalEvents = window.PortalEvents ||')
    ? pass('window.PortalEvents safe-init guard present in detail.js')
    : fail('window.PortalEvents safe-init guard missing in detail.js');

detail.includes('window.PortalEvents.detail = window.PortalEvents.detail ||')
    ? pass('window.PortalEvents.detail safe-init present')
    : fail('window.PortalEvents.detail safe-init missing');

detail.includes('detail._registry = detail._registry ||')
    ? pass('detail._registry setup present')
    : fail('detail._registry setup missing');

detail.includes('detail.register = function')
    ? pass('detail.register function present')
    : fail('detail.register function missing');

detail.includes('detail.get = function')
    ? pass('detail.get function present')
    : fail('detail.get function missing');

// ─── Public globals (window.evt*) ─────────────────────────
console.log('\n── detail.js — public globals (window.evt*) ──────────────────────────────');

const REQUIRED_DETAIL_WINDOW_GLOBALS = [
    ['window.evtOpenDetail',            'evtOpenDetail must be on window for init.js + other scripts'],
    ['window.evtInitHeroCollapse',      'kept as no-op — external callers must not crash'],
    ['window.evtCleanupHeroCollapse',   'kept as no-op — external callers must not crash'],
];

REQUIRED_DETAIL_WINDOW_GLOBALS.forEach(([assign, note]) => {
    detail.includes(assign)
        ? pass(`${assign} assigned (${note})`)
        : fail(`${assign} assignment missing — ${note}`);
});

console.log('\n── detail/presentation.js — public globals (Phase 5D.1) ─────────────────');

const REQUIRED_PRESENTATION_WINDOW_GLOBALS = [
    ['window.evtMiniMarkdown',          'used for description rendering'],
    ['window.evtOpenLightbox',          'used in banner onclick handlers'],
    ['window.evtInitSectionAnimations', 'called after detail render'],
    ['window.evtStartLiveCountdown',    'live countdown ticker'],
];

REQUIRED_PRESENTATION_WINDOW_GLOBALS.forEach(([assign, note]) => {
    detailPresentation.includes(assign)
        ? pass(`${assign} assigned in detail/presentation.js (${note})`)
        : fail(`${assign} missing from detail/presentation.js — ${note}`);
});

detailPresentation.includes('PortalEvents.detail.presentation')
    ? pass('PortalEvents.detail.presentation namespace present')
    : fail('PortalEvents.detail.presentation namespace missing');

console.log('\n── detail/raffle-render.js — public globals (Phase 5D.2) ───────────────');

const REQUIRED_RAFFLE_RENDER_WINDOW_GLOBALS = [
    ['window.evtDetailRaffleConfig', 'raffle config normalize'],
    ['window.evtDetailRaffleCategories', 'raffle categories'],
    ['window.evtDetailRaffleItems', 'raffle items per category'],
    ['window.evtDetailRaffleWinnerCount', 'raffle winner count'],
    ['window.evtDetailDrawModeLabel', 'draw mode label (detail)'],
    ['window.evtDrawModeLabel', 'draw mode label alias'],
    ['window.evtDetailRafflePrizesHtml', 'prize rail HTML'],
    ['window.evtDetailRaffleWinnersHtml', 'winners rail HTML'],
    ['window.evtRaffleLockedDesktopHtml', 'locked desktop raffle block'],
];

REQUIRED_RAFFLE_RENDER_WINDOW_GLOBALS.forEach(([assign, note]) => {
    detailRaffleRender.includes(assign)
        ? pass(`${assign} assigned in detail/raffle-render.js (${note})`)
        : fail(`${assign} missing from detail/raffle-render.js — ${note}`);
});

detailRaffleRender.includes('PortalEvents.detail.raffleRender')
    ? pass('PortalEvents.detail.raffleRender namespace present')
    : fail('PortalEvents.detail.raffleRender namespace missing');

console.log('\n── detail/map-overlay.js — public globals (Phase 5D.3) ───────────────────');

const REQUIRED_MAP_OVERLAY_WINDOW_GLOBALS = [
    ['window.evtOpenFullscreenMap',     'used in map overlay click handlers'],
    ['window.evtRecenterFullscreenMap', 'used by fullscreen map recenter button'],
    ['window.evtCloseFullscreenMap',    'used by fullscreen map close button'],
];

REQUIRED_MAP_OVERLAY_WINDOW_GLOBALS.forEach(([assign, note]) => {
    detailMapOverlay.includes(assign)
        ? pass(`${assign} assigned in detail/map-overlay.js (${note})`)
        : fail(`${assign} missing from detail/map-overlay.js — ${note}`);
});

detailMapOverlay.includes('PortalEvents.detail.mapOverlay')
    ? pass('PortalEvents.detail.mapOverlay namespace present')
    : fail('PortalEvents.detail.mapOverlay namespace missing');

console.log('\n── detail/fragments.js — public globals (Phase 5F-prep) ─────────────────');

const REQUIRED_FRAGMENTS_WINDOW_GLOBALS = [
    ['window.evtEdMetaRow', 'detail meta row HTML fragment'],
    ['window.evtEdPill', 'detail pill HTML fragment'],
    ['window.evtEdCard', 'detail card wrapper HTML fragment'],
    ['window.evtEdNotice', 'detail notice HTML fragment'],
    ['window.evtEdSectionHead', 'detail section head HTML fragment'],
];

REQUIRED_FRAGMENTS_WINDOW_GLOBALS.forEach(([assign, note]) => {
    detailFragments.includes(assign)
        ? pass(`${assign} assigned in detail/fragments.js (${note})`)
        : fail(`${assign} missing from detail/fragments.js — ${note}`);
});

detailFragments.includes('PortalEvents.detail.fragments')
    ? pass('PortalEvents.detail.fragments namespace present')
    : fail('PortalEvents.detail.fragments namespace missing');

console.log('\n── detail/data.js — public globals (Phase 5H.1) ──────────────────────────');

detailData.includes('(function ()')
    ? pass('detail/data.js IIFE wrapper present')
    : fail('detail/data.js IIFE wrapper missing');

detailData.includes('async function evtLoadDetailContext')
    ? pass('evtLoadDetailContext defined in detail/data.js')
    : fail('evtLoadDetailContext missing from detail/data.js');

detailData.includes('window.evtLoadDetailContext = evtLoadDetailContext')
    ? pass('window.evtLoadDetailContext assigned in detail/data.js')
    : fail('window.evtLoadDetailContext missing from detail/data.js');

detailData.includes('PortalEvents.detail.data')
    ? pass('PortalEvents.detail.data namespace present')
    : fail('PortalEvents.detail.data namespace missing');

detail.includes('await window.evtLoadDetailContext(eventId)')
    ? pass('detail.js calls window.evtLoadDetailContext in evtOpenDetail')
    : fail('detail.js must call window.evtLoadDetailContext in evtOpenDetail');

detail.includes('detail.loadContext = window.evtLoadDetailContext')
    ? pass('detail.loadContext bridges to window.evtLoadDetailContext')
    : fail('detail.loadContext bridge missing');

detail.includes('detail.data = window.PortalEvents.detail.data')
    ? pass('detail.data bridges to PortalEvents.detail.data')
    : fail('detail.data bridge missing');

!detail.includes(".from('event_rsvps')")
    ? pass('Supabase RSVP fetch moved out of detail.js (Phase 5H.1)')
    : fail('event_rsvps fetch still in detail.js — should be in detail/data.js');

console.log('\n── detail/sections.js — public globals (Phase 5H.2) ───────────────────────');

detailSections.includes('(function ()')
    ? pass('detail/sections.js IIFE wrapper present')
    : fail('detail/sections.js IIFE wrapper missing');

detailSections.includes('function evtBuildDetailRsvpSectionHtml')
    ? pass('evtBuildDetailRsvpSectionHtml defined in detail/sections.js')
    : fail('evtBuildDetailRsvpSectionHtml missing from detail/sections.js');

detailSections.includes('function evtBuildDetailRaffleSectionHtml')
    ? pass('evtBuildDetailRaffleSectionHtml defined in detail/sections.js')
    : fail('evtBuildDetailRaffleSectionHtml missing from detail/sections.js');

detailSections.includes('function evtBuildDetailHostControlsHtml')
    ? pass('evtBuildDetailHostControlsHtml defined in detail/sections.js')
    : fail('evtBuildDetailHostControlsHtml missing from detail/sections.js');

[
    ['function evtBuildDetailWaitlistHtml', 'evtBuildDetailWaitlistHtml'],
    ['function evtBuildDetailGraceNoticeHtml', 'evtBuildDetailGraceNoticeHtml'],
    ['function evtBuildDetailCostBreakdownHtml', 'evtBuildDetailCostBreakdownHtml'],
    ['function evtBuildDetailAttendeeBreakdownHtml', 'evtBuildDetailAttendeeBreakdownHtml'],
].forEach(([substr, label]) => {
    detailSections.includes(substr)
        ? pass(`${label} defined in detail/sections.js (Phase 5H.3)`)
        : fail(`${label} missing from detail/sections.js`);
});

[
    ['function evtBuildDetailHeroStatusBadgeHtml', 'evtBuildDetailHeroStatusBadgeHtml'],
    ['function evtBuildDetailTransportNoticeHtml', 'evtBuildDetailTransportNoticeHtml'],
    ['function evtBuildDetailLocationNoticeHtml', 'evtBuildDetailLocationNoticeHtml'],
    ['function evtBuildDetailThresholdHtml', 'evtBuildDetailThresholdHtml'],
    ['function evtBuildDetailAttendeePreviewHtml', 'evtBuildDetailAttendeePreviewHtml'],
    ['function evtBuildDetailShareCardHtml', 'evtBuildDetailShareCardHtml'],
].forEach(([substr, label]) => {
    detailSections.includes(substr)
        ? pass(`${label} defined in detail/sections.js (Phase 5H.4)`)
        : fail(`${label} missing from detail/sections.js`);
});

[
    ['function evtBuildDetailOrganizerHtml', 'evtBuildDetailOrganizerHtml'],
    ['function evtBuildDetailTeamHubHtml', 'evtBuildDetailTeamHubHtml'],
    ['function evtBuildDetailRelatedEventsHtml', 'evtBuildDetailRelatedEventsHtml'],
    ['function evtBuildDetailMobileAttendeesHtml', 'evtBuildDetailMobileAttendeesHtml'],
    ['function evtBuildDetailMobileHostedHtml', 'evtBuildDetailMobileHostedHtml'],
    ['function evtBuildDetailPageHeaderActionsHtml', 'evtBuildDetailPageHeaderActionsHtml'],
].forEach(([substr, label]) => {
    detailSections.includes(substr)
        ? pass(`${label} defined in detail/sections.js (Phase 5H.5)`)
        : fail(`${label} missing from detail/sections.js`);
});

detailSections.includes('PortalEvents.detail.sections')
    ? pass('PortalEvents.detail.sections namespace present')
    : fail('PortalEvents.detail.sections namespace missing');

detail.includes('window.evtBuildDetailRsvpSectionHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailRsvpSectionHtml')
    : fail('detail.js must call window.evtBuildDetailRsvpSectionHtml');

detail.includes('window.evtBuildDetailRaffleSectionHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailRaffleSectionHtml')
    : fail('detail.js must call window.evtBuildDetailRaffleSectionHtml');

!detail.includes('window.evtBuildDetailHostControlsHtml(ctx)')
    ? pass('detail.js does not call unused hostControlsHtml builder (Phase 5I.2)')
    : fail('detail.js must not call evtBuildDetailHostControlsHtml — not in template');

detail.includes('window.evtBuildDetailWaitlistHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailWaitlistHtml (Phase 5H.3)')
    : fail('detail.js must call window.evtBuildDetailWaitlistHtml');

detail.includes('window.evtBuildDetailGraceNoticeHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailGraceNoticeHtml (Phase 5H.3)')
    : fail('detail.js must call window.evtBuildDetailGraceNoticeHtml');

detail.includes('window.evtBuildDetailCostBreakdownHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailCostBreakdownHtml (Phase 5H.3)')
    : fail('detail.js must call window.evtBuildDetailCostBreakdownHtml');

!detail.includes('window.evtBuildDetailAttendeeBreakdownHtml(ctx)')
    ? pass('detail.js does not call unused attendeeBreakdownHtml builder (Phase 5I.2)')
    : fail('detail.js must not call evtBuildDetailAttendeeBreakdownHtml — not in template');

!detail.includes('venueQrHtml')
    ? pass('dead venueQrHtml pre-template block removed from detail.js (Phase 5I.2)')
    : fail('venueQrHtml should not remain in detail.js');

!detail.includes('scannerBtn')
    ? pass('dead scannerBtn pre-template block removed from detail.js (Phase 5I.2)')
    : fail('scannerBtn should not remain in detail.js');

detail.includes('window.evtBuildDetailHeroStatusBadgeHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailHeroStatusBadgeHtml (Phase 5H.4)')
    : fail('detail.js must call window.evtBuildDetailHeroStatusBadgeHtml');

detail.includes('window.evtBuildDetailTransportNoticeHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailTransportNoticeHtml (Phase 5H.4)')
    : fail('detail.js must call window.evtBuildDetailTransportNoticeHtml');

detail.includes('window.evtBuildDetailLocationNoticeHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailLocationNoticeHtml (Phase 5H.4)')
    : fail('detail.js must call window.evtBuildDetailLocationNoticeHtml');

detail.includes('window.evtBuildDetailThresholdHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailThresholdHtml (Phase 5H.4)')
    : fail('detail.js must call window.evtBuildDetailThresholdHtml');

detail.includes('window.evtBuildDetailAttendeePreviewHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailAttendeePreviewHtml (Phase 5H.4)')
    : fail('detail.js must call window.evtBuildDetailAttendeePreviewHtml');

detail.includes('window.evtBuildDetailShareCardHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailShareCardHtml (Phase 5H.4)')
    : fail('detail.js must call window.evtBuildDetailShareCardHtml');

detail.includes('window.evtBuildDetailOrganizerHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailOrganizerHtml (Phase 5H.5)')
    : fail('detail.js must call window.evtBuildDetailOrganizerHtml');

detail.includes('window.evtBuildDetailTeamHubHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailTeamHubHtml (Phase 5H.5)')
    : fail('detail.js must call window.evtBuildDetailTeamHubHtml');

detail.includes('window.evtBuildDetailRelatedEventsHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailRelatedEventsHtml (Phase 5H.5)')
    : fail('detail.js must call window.evtBuildDetailRelatedEventsHtml');

detail.includes('window.evtBuildDetailMobileAttendeesHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailMobileAttendeesHtml (Phase 5H.5)')
    : fail('detail.js must call window.evtBuildDetailMobileAttendeesHtml');

detail.includes('window.evtBuildDetailMobileHostedHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailMobileHostedHtml (Phase 5H.5)')
    : fail('detail.js must call window.evtBuildDetailMobileHostedHtml');

detail.includes('window.evtBuildDetailPageHeaderActionsHtml(ctx)')
    ? pass('detail.js calls window.evtBuildDetailPageHeaderActionsHtml (Phase 5H.5)')
    : fail('detail.js must call window.evtBuildDetailPageHeaderActionsHtml');

!detail.includes('evtClaimWaitlistSpot(')
    ? pass('waitlist inline handlers moved out of detail.js (Phase 5H.3)')
    : fail('evtClaimWaitlistSpot still inline in detail.js — should be in detail/sections.js');

detail.includes('detail.sections = window.PortalEvents.detail.sections')
    ? pass('detail.sections bridges to PortalEvents.detail.sections')
    : fail('detail.sections bridge missing');

console.log('\n── detail/post-render.js — public globals (Phase 5H.6.1) ─────────────────');

detailPostRender.includes('(function ()')
    ? pass('detail/post-render.js IIFE wrapper present')
    : fail('detail/post-render.js IIFE wrapper missing');

detailPostRender.includes('function evtRunDetailPostRenderBasics')
    ? pass('evtRunDetailPostRenderBasics defined in detail/post-render.js')
    : fail('evtRunDetailPostRenderBasics missing from detail/post-render.js');

detailPostRender.includes('window.evtRunDetailPostRenderBasics = evtRunDetailPostRenderBasics')
    ? pass('window.evtRunDetailPostRenderBasics assigned in detail/post-render.js')
    : fail('window.evtRunDetailPostRenderBasics not assigned');

detailPostRender.includes('PortalEvents.detail.postRender')
    ? pass('PortalEvents.detail.postRender namespace present')
    : fail('PortalEvents.detail.postRender namespace missing');

detail.includes('window.evtRunDetailPostRenderBasics({ eventId })')
    ? pass('detail.js calls window.evtRunDetailPostRenderBasics (Phase 5H.6.1)')
    : fail('detail.js must call window.evtRunDetailPostRenderBasics');

detail.includes('detail.postRender = window.PortalEvents.detail.postRender')
    ? pass('detail.postRender bridges to PortalEvents.detail.postRender')
    : fail('detail.postRender bridge missing');

detail.includes('detail.runPostRenderBasics = window.evtRunDetailPostRenderBasics')
    ? pass('detail.runPostRenderBasics bridge present')
    : fail('detail.runPostRenderBasics bridge missing');

detailPostRender.includes('function evtRenderDetailQrCanvases')
    ? pass('evtRenderDetailQrCanvases defined in detail/post-render.js (Phase 5H.6.2)')
    : fail('evtRenderDetailQrCanvases missing from detail/post-render.js');

detailPostRender.includes('QRCode.toCanvas')
    ? pass('detail/post-render.js owns QRCode.toCanvas (Phase 5H.6.2)')
    : fail('detail/post-render.js must contain QRCode.toCanvas');

detail.includes('window.evtRenderDetailQrCanvases({ event, eventId, rsvp, memberGoing })')
    ? pass('detail.js delegates QR canvas paint to post-render.js (Phase 5H.6.2)')
    : fail('detail.js must call window.evtRenderDetailQrCanvases');

detail.includes('detail.renderQrCanvases = window.evtRenderDetailQrCanvases')
    ? pass('detail.renderQrCanvases bridge present (Phase 5H.6.2)')
    : fail('detail.renderQrCanvases bridge missing');

detailPostRender.includes('window.evtRunDetailPostRenderUi = evtRunDetailPostRenderUi')
    ? pass('window.evtRunDetailPostRenderUi assigned in detail/post-render.js (Phase 5H.6.4)')
    : fail('window.evtRunDetailPostRenderUi not assigned');

detailPostRender.includes('runUi: evtRunDetailPostRenderUi')
    ? pass('PortalEvents.detail.postRender.runUi present (Phase 5H.6.4)')
    : fail('PortalEvents.detail.postRender.runUi missing');

console.log('\n── detail/template.js — public globals (Phase 5I.1) ───────────────────────');

detailTemplate.includes('(function ()')
    ? pass('detail/template.js IIFE wrapper present')
    : fail('detail/template.js IIFE wrapper missing');

detailTemplate.includes('window.evtBuildDetailTemplate = evtBuildDetailTemplate')
    ? pass('window.evtBuildDetailTemplate assigned in detail/template.js')
    : fail('window.evtBuildDetailTemplate not assigned');

detailTemplate.includes('build: evtBuildDetailTemplate')
    ? pass('PortalEvents.detail.template.build present')
    : fail('PortalEvents.detail.template.build missing');

detailTemplate.includes('id="detailEventMap"')
    ? pass('detail/template.js owns detailEventMap markup')
    : fail('detail/template.js must contain #detailEventMap');

!detail.includes('evtHandleRaffleEntry(')
    ? pass('RSVP/raffle inline handlers moved out of detail.js (Phase 5H.2)')
    : fail('evtHandleRaffleEntry still inline in detail.js — should be in detail/sections.js');

const REQUIRED_TOOLS_WINDOW_GLOBALS = [
    ['window.evtInitBottomNav', 'sticky CTA bar init (team/tools.js)'],
    ['window.evtCleanupBottomNav', 'sticky CTA bar cleanup (team/tools.js)'],
    ['window.evtOpenCtaPanel', 'CTA panel open (team/tools.js)'],
    ['window.evtCloseCtaPanel', 'CTA panel close (team/tools.js)'],
    ['window.evtOpenTeamToolsPanel', 'team tools panel open (team/tools.js)'],
];

console.log('\n── team/tools.js — public globals (Phase 5C) ─────────────────────────────');

REQUIRED_TOOLS_WINDOW_GLOBALS.forEach(([assign, note]) => {
    teamTools.includes(assign)
        ? pass(`${assign} assigned in team/tools.js (${note})`)
        : fail(`${assign} missing from team/tools.js — ${note}`);
});

// ─── Phase 5B Team Chat (team/chat.js + detail bridge) ─────
console.log('\n── team/chat.js — public globals (Phase 5B) ─────────────────────────────');

[
    ['window.evtOpenTeamChat', 'team chat open (team/chat.js)'],
    ['window.evtSendTeamChatMessage', 'team chat send (team/chat.js)'],
    ['window.evtCleanupTeamChat', 'team chat cleanup (team/chat.js)'],
].forEach(([assign, note]) => {
    teamChat.includes(assign)
        ? pass(`${assign} assigned in team/chat.js (${note})`)
        : fail(`${assign} missing from team/chat.js — ${note}`);
});

detail.includes('detail.openTeamChat        = window.evtOpenTeamChat')
    ? pass('detail.openTeamChat bridges to window.evtOpenTeamChat')
    : fail('detail.openTeamChat bridge missing');

// ─── window.PortalEvents.detail direct assignments ────────
console.log('\n── detail.js — window.PortalEvents.detail direct entries ─────────────────');

const DETAIL_DIRECT_KEYS = [
    // Pre-3B entries
    ['detail.open ',                 'open (evtOpenDetail)'],
    ['detail.openLightbox        = window.evtOpenLightbox', 'openLightbox (Phase 5D.1 bridge)'],
    ['detail.openFullscreenMap   = window.evtOpenFullscreenMap', 'openFullscreenMap (Phase 5D.3 bridge)'],
    ['detail.closeFullscreenMap  = window.evtCloseFullscreenMap', 'closeFullscreenMap (Phase 5D.3 bridge)'],
    ['detail.initBottomNav ',        'initBottomNav'],
    ['detail.cleanupBottomNav ',     'cleanupBottomNav'],
    ['detail.openCtaPanel ',         'openCtaPanel'],
    ['detail.closeCtaPanel ',        'closeCtaPanel'],
    ['detail.startLiveCountdown    = window.evtStartLiveCountdown', 'startLiveCountdown (Phase 5D.1 bridge)'],
    ['detail.initSectionAnimations = window.evtInitSectionAnimations', 'initSectionAnimations (Phase 5D.1 bridge)'],
    // Phase 3B additions
    ['detail.recenterFullscreenMap = window.evtRecenterFullscreenMap', 'recenterFullscreenMap (Phase 5D.3 bridge)'],
    ['detail.initHeroCollapse ',     'initHeroCollapse (Phase 3B)'],
    ['detail.cleanupHeroCollapse ',  'cleanupHeroCollapse (Phase 3B)'],
    ['detail.miniMarkdown          = window.evtMiniMarkdown', 'miniMarkdown (Phase 5D.1 bridge)'],
    ['detail.raffleConfig          = window.evtDetailRaffleConfig', 'raffleConfig (Phase 5D.2 bridge)'],
    ['detail.raffleCategories      = window.evtDetailRaffleCategories', 'raffleCategories (Phase 5D.2 bridge)'],
    ['detail.raffleItems           = window.evtDetailRaffleItems', 'raffleItems (Phase 5D.2 bridge)'],
    ['detail.raffleWinnerCount     = window.evtDetailRaffleWinnerCount', 'raffleWinnerCount (Phase 5D.2 bridge)'],
    ['detail.drawModeLabel         = window.evtDetailDrawModeLabel', 'drawModeLabel (Phase 5D.2 bridge)'],
    ['detail.rafflePrizesHtml      = window.evtDetailRafflePrizesHtml', 'rafflePrizesHtml (Phase 5D.2 bridge)'],
    ['detail.raffleWinnersHtml     = window.evtDetailRaffleWinnersHtml', 'raffleWinnersHtml (Phase 5D.2 bridge)'],
    ['detail.raffleLockedDesktopHtml = window.evtRaffleLockedDesktopHtml', 'raffleLockedDesktopHtml (Phase 5D.2 bridge)'],
    ['detail.openTeamChat ',         'openTeamChat (Phase 5B bridge)'],
    ['detail.openTeamToolsPanel  = window.evtOpenTeamToolsPanel', 'openTeamToolsPanel (Phase 5C bridge)'],
    ['detail.initBottomNav       = window.evtInitBottomNav', 'initBottomNav (Phase 5C bridge)'],
    ['detail.cleanupBottomNav    = window.evtCleanupBottomNav', 'cleanupBottomNav (Phase 5C bridge)'],
    ['detail.openCtaPanel        = window.evtOpenCtaPanel', 'openCtaPanel (Phase 5C bridge)'],
    ['detail.closeCtaPanel       = window.evtCloseCtaPanel', 'closeCtaPanel (Phase 5C bridge)'],
];

DETAIL_DIRECT_KEYS.forEach(([substr, label]) => {
    detail.includes(substr)
        ? pass(`detail.${label} assigned in source`)
        : fail(`detail.${label} assignment missing`);
});

// ─── Phase 5E.1 nested namespace aliases ───────────────────
console.log('\n── detail.js — Phase 5E.1 nested namespace aliases ───────────────────────');

const NESTED_NAMESPACE_ALIASES = [
    ['detail.presentation = window.PortalEvents.detail.presentation', 'presentation → detail.presentation'],
    ['detail.raffleRender = window.PortalEvents.detail.raffleRender', 'raffleRender → detail.raffleRender'],
    ['detail.mapOverlay = window.PortalEvents.detail.mapOverlay', 'mapOverlay → detail.mapOverlay'],
    ['detail.fragments = window.PortalEvents.detail.fragments', 'fragments → detail.fragments'],
    ['detail.data = window.PortalEvents.detail.data', 'data → detail.data'],
    ['detail.sections = window.PortalEvents.detail.sections', 'sections → detail.sections'],
    ['detail.loadContext = window.evtLoadDetailContext', 'loadContext → window.evtLoadDetailContext'],
    ['detail.team = window.PortalEvents.team', 'team → detail.team'],
];

NESTED_NAMESPACE_ALIASES.forEach(([substr, label]) => {
    detail.includes(substr)
        ? pass(`Phase 5E.1: ${label}`)
        : fail(`Phase 5E.1 nested alias missing: ${label}`);
});

// ─── window.PortalEvents.detail registry sub-modules ──────
console.log('\n── detail.js — detail.register() sub-module entries ──────────────────────');

const REGISTRY_ENTRIES = [
    "detail.register('rsvp'",
    "detail.register('raffle'",
    "detail.register('competition'",
    "detail.register('comments'",
    "detail.register('documents'",
    "detail.register('scrapbook'",
    "detail.register('map'",
    "detail.register('scanner'",
];

REGISTRY_ENTRIES.forEach(entry => {
    const name = entry.match(/'(\w+)'/)[1];
    detail.includes(entry)
        ? pass(`detail.register('${name}') sub-module entry present`)
        : fail(`detail.register('${name}') sub-module entry missing`);
});

// ─── Internal functions ───────────────────────────────────
console.log('\n── detail.js — internal functions ────────────────────────────────────────');

const PRESENTATION_INTERNAL_FNS = [
    'function evtMiniMarkdown',
    'function evtOpenLightbox',
    'function evtInitSectionAnimations',
    'function evtStartLiveCountdown',
];

console.log('\n── detail/presentation.js — internal functions (Phase 5D.1) ───────────────');

PRESENTATION_INTERNAL_FNS.forEach(fn => {
    detailPresentation.includes(fn)
        ? pass(`${fn} present in detail/presentation.js`)
        : fail(`${fn} missing from detail/presentation.js`);
});

[
    'function evtMiniMarkdown',
    'function evtOpenLightbox',
    'function evtInitSectionAnimations',
    'function evtStartLiveCountdown',
].forEach(fn => {
    !detail.includes(fn)
        ? pass(`${fn} not reimplemented in detail.js`)
        : fail(`${fn} still defined in detail.js — should be in presentation.js only`);
});

const RAFFLE_RENDER_INTERNAL_FNS = [
    'function evtDetailRaffleConfig',
    'function evtDetailRaffleCategories',
    'function evtDetailRaffleItems',
    'function evtDetailRaffleWinnerCount',
    'function evtDetailDrawModeLabel',
    'function evtDetailPrizeMedia',
    'function evtDetailRafflePrizesHtml',
    'function evtDetailRaffleWinnersHtml',
    'function evtRaffleLockedDesktopHtml',
];

console.log('\n── detail/raffle-render.js — internal functions (Phase 5D.2) ────────────');

RAFFLE_RENDER_INTERNAL_FNS.forEach(fn => {
    detailRaffleRender.includes(fn)
        ? pass(`${fn} present in detail/raffle-render.js`)
        : fail(`${fn} missing from detail/raffle-render.js`);
});

[
    'function evtDetailRaffleConfig',
    'function evtDetailRaffleCategories',
    'function evtDetailRaffleItems',
    'function evtDetailRaffleWinnerCount',
    'function evtDetailDrawModeLabel',
    'function evtDetailPrizeMedia',
    'function evtDetailRafflePrizesHtml',
    'function evtDetailRaffleWinnersHtml',
    'function evtRaffleLockedDesktopHtml',
].forEach(fn => {
    !detail.includes(fn)
        ? pass(`${fn} not reimplemented in detail.js`)
        : fail(`${fn} still defined in detail.js — should be in raffle-render.js only`);
});

const MAP_OVERLAY_INTERNAL_FNS = [
    'function evtOpenFullscreenMap',
    'function evtRecenterFullscreenMap',
    'function evtCloseFullscreenMap',
];

console.log('\n── detail/map-overlay.js — internal functions (Phase 5D.3) ──────────────');

MAP_OVERLAY_INTERNAL_FNS.forEach(fn => {
    detailMapOverlay.includes(fn)
        ? pass(`${fn} present in detail/map-overlay.js`)
        : fail(`${fn} missing from detail/map-overlay.js`);
});

[
    'function evtOpenFullscreenMap',
    'function evtRecenterFullscreenMap',
    'function evtCloseFullscreenMap',
].forEach(fn => {
    !detail.includes(fn)
        ? pass(`${fn} not reimplemented in detail.js`)
        : fail(`${fn} still defined in detail.js — should be in map-overlay.js only`);
});

const FRAGMENTS_INTERNAL_FNS = [
    'function metaRow',
    'function pill',
    'function card',
    'function notice',
    'function sectionHead',
];

console.log('\n── detail/fragments.js — internal functions (Phase 5F-prep) ─────────────');

FRAGMENTS_INTERNAL_FNS.forEach(fn => {
    detailFragments.includes(fn)
        ? pass(`${fn} present in detail/fragments.js`)
        : fail(`${fn} missing from detail/fragments.js`);
});

[
    'function _edMetaRow',
    'function _edPill',
    'function _edCard',
    'function _edNotice',
    'function _edSectionHead',
].forEach(fn => {
    !detail.includes(fn)
        ? pass(`${fn} not reimplemented in detail.js`)
        : fail(`${fn} still defined in detail.js — should be in fragments.js only`);
});

!detail.includes('const _edMetaRow = window.evtEdMetaRow')
    && detailTemplate.includes('window.evtEdCard')
    ? pass('fragment aliases moved to template.js (Phase 5I.1)')
    : fail('detail.js must not alias _edMetaRow; template.js must use window.evtEdCard');

const INTERNAL_FNS = [
    'async function evtOpenDetail',
    'function evtInitHeroCollapse',
    'function evtCleanupHeroCollapse',
];

INTERNAL_FNS.forEach(fn => {
    detail.includes(fn)
        ? pass(`${fn} present in detail.js`)
        : fail(`${fn} missing from detail.js — required for runtime`);
});

const TOOLS_INTERNAL_FNS = [
    'function initBottomNav',
    'function cleanupBottomNav',
    'function closeCtaPanel',
    'function openCtaPanel',
    'function openTeamToolsPanel',
];

console.log('\n── team/tools.js — internal functions (Phase 5C) ───────────────────────');

TOOLS_INTERNAL_FNS.forEach(fn => {
    teamTools.includes(fn)
        ? pass(`${fn} present in team/tools.js`)
        : fail(`${fn} missing from team/tools.js`);
});

// ─── portal/events.html invariants ───────────────────────
console.log('\n── portal/events.html invariants ─────────────────────────────────────────');

const html = read('portal/events.html');

const classicChain3b = parseClassicChain(root);
isProductionLoaded(html, classicChain3b, '../js/portal/events/detail.js')
    ? pass('detail.js still loaded in production (HTML or classic-chain-loader)')
    : fail('detail.js not in production load model');

/src="\.\.\/js\/portal\/events\/detail\.js"[^>]*type="module"/.test(html)
    ? fail('detail.js loaded with type="module" — premature, Phase 5 only')
    : pass('detail.js does NOT have type="module" (Phase 5 deferred — correct)');

/<script[^>]+type="module"[^>]+src="\.\.\/js\/portal\/events\//.test(html)
    ? fail('A portal/events/* script has type="module" — premature')
    : pass('No portal/events/* scripts use type="module" yet (correct)');

// ─── Phase 5B split files must be loaded in events.html ───
console.log('\n── File split safety — team/ and detail/ scripts in events.html ─────────');

const productionScripts = [
    ['team/chat.js', '../js/portal/events/team/chat.js', 'team/chat.js'],
    ['team/tools.js', '../js/portal/events/team/tools.js', 'team/tools.js'],
    ['detail/presentation.js', '../js/portal/events/detail/presentation.js', 'detail/presentation.js'],
    ['detail/raffle-render.js', '../js/portal/events/detail/raffle-render.js', 'detail/raffle-render.js'],
    ['detail/map-overlay.js', '../js/portal/events/detail/map-overlay.js', 'detail/map-overlay.js'],
    ['detail/fragments.js', '../js/portal/events/detail/fragments.js', 'detail/fragments.js'],
    ['detail/data.js', '../js/portal/events/detail/data.js', 'detail/data.js'],
    ['detail/sections.js', '../js/portal/events/detail/sections.js', 'detail/sections.js'],
    ['detail/post-render.js', '../js/portal/events/detail/post-render.js', 'detail/post-render.js'],
    ['detail/template.js', '../js/portal/events/detail/template.js', 'detail/template.js'],
    ['detail.js', '../js/portal/events/detail.js', 'detail.js'],
];
productionScripts.forEach(([label, src, chainKey]) => {
    isProductionLoaded(html, classicChain3b, src)
        ? pass(`${label} in production load (HTML or classic-chain-loader)`)
        : fail(`${label} not in production load — would never load`);
});
!html.includes('js/portal/events/detail/exports.js')
    ? pass('detail/exports.js not in events.html (Phase 5E.1 — no loader change)')
    : fail('detail/exports.js must not be added in 5E.1 — use nested aliases in detail.js only');
!html.includes('js/portal/events/compat/window-exports.js')
    ? pass('compat/window-exports.js not in events.html (5E.1 — no compat wiring)')
    : fail('compat/window-exports.js must not be wired in 5E.1');
chainOrderOk(
    classicChain3b,
    'team/chat.js',
    'team/tools.js',
    'detail/presentation.js',
    'detail/raffle-render.js',
    'detail/map-overlay.js',
    'detail/fragments.js',
    'detail/data.js',
    'detail/sections.js',
    'detail/post-render.js',
    'detail/template.js',
    'detail.js'
)
    ? pass('load order: chat → tools → … → sections → post-render → template → detail')
    : fail('script order must be … → sections → post-render → template → detail');

const portalScripts = portalEventsHtmlScripts(html);
portalScripts.length && portalScripts[portalScripts.length - 1] === '../js/portal/events/init.js'
    ? pass('init.js remains last among portal Events scripts')
    : fail('init.js must be the last portal/events script before sw-register');

const detailDir = path.join(root, 'js', 'portal', 'events', 'detail');
if (fs.existsSync(detailDir)) {
    const files = fs.readdirSync(detailDir).filter(f => f.endsWith('.js'));
    files.forEach(f => {
        const chainKey = 'detail/' + f;
        const src = '../js/portal/events/' + chainKey;
        isProductionLoaded(html, classicChain3b, src)
            ? pass(`detail/${f} in production load (not orphaned)`)
            : fail(`detail/${f} exists but NOT in production load`, `File: ${chainKey}`);
    });
    if (files.length === 0) {
        pass('js/portal/events/detail/ exists but has no .js files yet');
    }
} else {
    fail('js/portal/events/detail/ directory missing — presentation.js required for Phase 5D.1');
}

// ─── Phase 1 bridge still intact ─────────────────────────
console.log('\n── Phase 1 bridge (init.js) — regression check ────────────────────────────');

const initJs = read('js/portal/events/init.js');
initJs.includes('window.PortalEvents.initEventsPage')
    ? pass('window.PortalEvents.initEventsPage still present (Phase 1 bridge intact)')
    : fail('window.PortalEvents.initEventsPage missing — Phase 1 regression');
initJs.includes('let _eventsPageInitialized = false')
    ? pass('Phase 1 duplicate-init guard still present in init.js')
    : fail('Phase 1 duplicate-init guard missing in init.js');

// ─── Phase 2 bridges still intact ────────────────────────
console.log('\n── Phase 2 bridges — regression check ─────────────────────────────────────');

const indexJs = read('js/portal/events/index.js');
indexJs.includes('window.PortalEvents.constants')
    ? pass('window.PortalEvents.constants still present (index.js bridge intact)')
    : fail('window.PortalEvents.constants missing — Phase 2 regression');

const raffleJs = read('js/portal/events/core/raffle-model.js');
raffleJs.includes('root.PortalEvents.raffleModel = api')
    ? pass('root.PortalEvents.raffleModel still present (Phase 2 raffle bridge intact)')
    : fail('root.PortalEvents.raffleModel missing — Phase 2 regression');
raffleJs.includes('root.EventsRaffleModel = api')
    ? pass('root.EventsRaffleModel still present (primary classic global preserved)')
    : fail('root.EventsRaffleModel missing — Phase 2 regression');

// ─── Phase 3A list bridge still intact ───────────────────
console.log('\n── Phase 3A bridge (list.js) — regression check ───────────────────────────');

const listJs = read('js/portal/events/list/shell.js');
listJs.includes('window.PortalEvents.list = {')
    ? pass('window.PortalEvents.list namespace still present (Phase 3A intact)')
    : fail('window.PortalEvents.list namespace missing — Phase 3A regression');
listJs.includes('(function ()')
    ? pass('list/shell.js still IIFE (Phase 3A structure intact)')
    : fail('list/shell.js lost IIFE wrapper — Phase 3A regression');

// ─── Summary ─────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 3B static smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    console.log('\nPhase 3B static smoke: NEEDS REVIEW');
    process.exit(1);
} else {
    console.log('\nPhase 3B static smoke: ALL PASS');
    process.exit(0);
}
