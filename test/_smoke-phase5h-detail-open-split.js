// ═══════════════════════════════════════════════════════════
// Phase 5H static smoke test — evtOpenDetail split (5H.1 + 5H.2)
//
// Verifies:
//   • detail/data.js + detail/sections.js exist and expose expected APIs
//   • portal/events.html load order: fragments → data → sections → detail
//   • detail.js still defines evtOpenDetail and delegates data/section builders
//   • Inline handler names preserved (detail.js or detail/sections.js)
//   • No type="module"; init.js remains last
//
// Run: node test/_smoke-phase5h-detail-open-split.js
// ═══════════════════════════════════════════════════════════
'use strict';

const fs   = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

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

const detailData = read('js/portal/events/detail/data.js');
const detailSections = read('js/portal/events/detail/sections.js');
const detail = read('js/portal/events/detail.js');
const html = read('portal/events.html');
const handlerSources = detail + '\n' + detailSections;

console.log('\n── Phase 5H.1 — detail/data.js ───────────────────────────────────────────');

fs.existsSync(path.join(root, 'js/portal/events/detail/data.js'))
    ? pass('js/portal/events/detail/data.js exists')
    : fail('js/portal/events/detail/data.js missing');

detailData.includes('async function evtLoadDetailContext')
    ? pass('evtLoadDetailContext defined in detail/data.js')
    : fail('evtLoadDetailContext missing from detail/data.js');

detailData.includes('PortalEvents.detail.data')
    ? pass('PortalEvents.detail.data namespace present')
    : fail('PortalEvents.detail.data namespace missing');

console.log('\n── Phase 5H.2–5H.3 — detail/sections.js ────────────────────────────────────');

fs.existsSync(path.join(root, 'js/portal/events/detail/sections.js'))
    ? pass('js/portal/events/detail/sections.js exists')
    : fail('js/portal/events/detail/sections.js missing');

detailSections.includes('(function ()')
    ? pass('detail/sections.js is classic IIFE')
    : fail('detail/sections.js must be a classic IIFE');

/\bexport\s+(default|const|let|var|function|class|\{)/.test(detailSections)
    ? fail('detail/sections.js must not use native export')
    : pass('detail/sections.js has no native export');

detailSections.includes('function evtBuildDetailRsvpSectionHtml')
    ? pass('evtBuildDetailRsvpSectionHtml defined in detail/sections.js')
    : fail('evtBuildDetailRsvpSectionHtml missing');

detailSections.includes('function evtBuildDetailRaffleSectionHtml')
    ? pass('evtBuildDetailRaffleSectionHtml defined in detail/sections.js')
    : fail('evtBuildDetailRaffleSectionHtml missing');

detailSections.includes('function evtBuildDetailHostControlsHtml')
    ? pass('evtBuildDetailHostControlsHtml defined in detail/sections.js')
    : fail('evtBuildDetailHostControlsHtml missing');

[
    'evtBuildDetailWaitlistHtml',
    'evtBuildDetailGraceNoticeHtml',
    'evtBuildDetailCostBreakdownHtml',
    'evtBuildDetailAttendeeBreakdownHtml',
].forEach((name) => {
    detailSections.includes(`function ${name}`)
        ? pass(`${name} defined in detail/sections.js (Phase 5H.3)`)
        : fail(`${name} missing from detail/sections.js`);
});

detailSections.includes('buildWaitlistHtml: evtBuildDetailWaitlistHtml')
    ? pass('PortalEvents.detail.sections.buildWaitlistHtml present')
    : fail('PortalEvents.detail.sections.buildWaitlistHtml missing');

detailSections.includes('PortalEvents.detail.sections')
    ? pass('PortalEvents.detail.sections namespace present')
    : fail('PortalEvents.detail.sections namespace missing');

console.log('\n── Phase 5H — portal/events.html load order ──────────────────────────────');

const fragmentsTag = 'src="../js/portal/events/detail/fragments.js"';
const dataTag = 'src="../js/portal/events/detail/data.js"';
const sectionsTag = 'src="../js/portal/events/detail/sections.js"';
const detailTag = 'src="../js/portal/events/detail.js"';

html.includes(sectionsTag)
    ? pass('detail/sections.js script tag in events.html')
    : fail('detail/sections.js script tag missing from events.html');

const fragmentsIdx = html.indexOf(fragmentsTag);
const dataIdx = html.indexOf(dataTag);
const sectionsIdx = html.indexOf(sectionsTag);
const detailIdx = html.indexOf(detailTag);

fragmentsIdx >= 0 && dataIdx >= 0 && sectionsIdx >= 0 && detailIdx >= 0
    && fragmentsIdx < dataIdx && dataIdx < sectionsIdx && sectionsIdx < detailIdx
    ? pass('load order: fragments.js → data.js → sections.js → detail.js')
    : fail('fragments → data → sections → detail load order incorrect');

dataIdx >= 0 && sectionsIdx >= 0 && detailIdx >= 0
    && dataIdx < sectionsIdx && sectionsIdx < detailIdx
    ? pass('load order: data.js → sections.js → detail.js')
    : fail('data → sections → detail load order incorrect');

console.log('\n── Phase 5H — detail.js orchestrator ─────────────────────────────────────');

detail.includes('async function evtOpenDetail')
    ? pass('evtOpenDetail still defined in detail.js')
    : fail('evtOpenDetail missing from detail.js');

detail.includes('await window.evtLoadDetailContext(eventId)')
    ? pass('evtOpenDetail delegates to evtLoadDetailContext')
    : fail('evtOpenDetail must call window.evtLoadDetailContext');

detail.includes('window.evtBuildDetailRsvpSectionHtml(ctx)')
    ? pass('evtOpenDetail delegates RSVP section HTML to sections.js')
    : fail('detail.js must call window.evtBuildDetailRsvpSectionHtml');

detail.includes('window.evtBuildDetailRaffleSectionHtml(ctx)')
    ? pass('evtOpenDetail delegates raffle section HTML to sections.js')
    : fail('detail.js must call window.evtBuildDetailRaffleSectionHtml');

detail.includes('window.evtBuildDetailHostControlsHtml(ctx)')
    ? pass('evtOpenDetail delegates host controls HTML to sections.js')
    : fail('detail.js must call window.evtBuildDetailHostControlsHtml');

detail.includes('window.evtBuildDetailWaitlistHtml(ctx)')
    ? pass('evtOpenDetail delegates waitlist HTML to sections.js')
    : fail('detail.js must call window.evtBuildDetailWaitlistHtml');

detail.includes('window.evtBuildDetailGraceNoticeHtml(ctx)')
    ? pass('evtOpenDetail delegates grace notice HTML to sections.js')
    : fail('detail.js must call window.evtBuildDetailGraceNoticeHtml');

detail.includes('window.evtBuildDetailCostBreakdownHtml(ctx)')
    ? pass('evtOpenDetail delegates cost breakdown HTML to sections.js')
    : fail('detail.js must call window.evtBuildDetailCostBreakdownHtml');

detail.includes('window.evtBuildDetailAttendeeBreakdownHtml(ctx)')
    ? pass('evtOpenDetail delegates attendee breakdown HTML to sections.js')
    : fail('detail.js must call window.evtBuildDetailAttendeeBreakdownHtml');

detail.includes('window.evtOpenDetail            = evtOpenDetail')
    ? pass('window.evtOpenDetail still assigned from detail.js')
    : fail('window.evtOpenDetail assignment missing');

detail.includes('detail.sections = window.PortalEvents.detail.sections')
    ? pass('detail.sections bridge present')
    : fail('detail.sections bridge missing');

console.log('\n── Phase 5H — inline handler names preserved ─────────────────────────────');

const CRITICAL_HANDLERS = [
    'evtHandleRsvp',
    'evtHandleRaffleEntry',
    'evtHandleFreeRaffleEntry',
    'evtOpenTeamToolsPanel',
    'EventsManage.open',
];

CRITICAL_HANDLERS.forEach(name => {
    handlerSources.includes(name)
        ? pass(`handler reference preserved: ${name}`)
        : fail(`handler missing from detail.js + detail/sections.js: ${name}`);
});

const INLINE_HANDLERS = [
    'evtOpenScanner',
    'evtClaimWaitlistSpot',
    'evtLeaveWaitlist',
    'evtJoinWaitlist',
    'evtRequestGraceRefund',
    'evtMessageHost',
    'evtUpdateStatus',
    'evtCancelEvent',
    'evtRescheduleEvent',
    'evtDuplicateEvent',
    'evtDeleteEvent',
    'evtNavigateToList',
    'evtCopyShareUrl',
    'evtDownloadIcs',
    'evtOpenLightbox',
    'evtOpenFullscreenMap',
    'evtPostComment',
    'evtOpenDetail',
    'evtNavigateToEvent',
];

INLINE_HANDLERS.forEach(name => {
    handlerSources.includes(name)
        ? pass(`inline handler reference preserved: ${name}`)
        : fail(`inline handler missing: ${name}`);
});

console.log('\n── Phase 5H — no module mode / init.js last ──────────────────────────────');

const portalBlock = html.slice(html.indexOf('<!-- Events modules'));
const moduleSection = portalBlock.slice(0, portalBlock.indexOf('sw-register'));
const portalScripts = [...moduleSection.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)]
    .map((m) => m[1])
    .filter((s) => s.includes('portal/events'));

!/type\s*=\s*["']module["']/i.test(moduleSection)
    ? pass('no type="module" on portal Events scripts')
    : fail('type="module" must not be added to portal Events scripts');

portalScripts.length && portalScripts[portalScripts.length - 1] === '../js/portal/events/init.js'
    ? pass('init.js remains last among portal Events scripts')
    : fail('init.js must be the last portal/events script before sw-register');

console.log('\n═══════════════════════════════════════════════════════════');
if (failed === 0) {
    console.log(`Phase 5H smoke: ALL ${passed} CHECKS PASSED`);
    process.exit(0);
} else {
    console.log(`Phase 5H smoke: ${failed} FAILED, ${passed} passed`);
    failures.forEach(f => console.log(`  • ${f}`));
    process.exit(1);
}
