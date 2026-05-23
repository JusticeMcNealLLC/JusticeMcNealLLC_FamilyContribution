// ═══════════════════════════════════════════════════════════
// Phase 5H.1 static smoke test — evtOpenDetail data extraction
//
// Verifies:
//   • detail/data.js exists and exposes evtLoadDetailContext
//   • portal/events.html load order: fragments → data → detail
//   • detail.js still defines evtOpenDetail and delegates data load
//   • Inline handler names unchanged (no accidental template moves)
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

console.log('\n── Phase 5H.1 — detail/data.js file ──────────────────────────────────────');

const dataPath = path.join(root, 'js', 'portal', 'events', 'detail', 'data.js');
fs.existsSync(dataPath)
    ? pass('js/portal/events/detail/data.js exists')
    : fail('js/portal/events/detail/data.js missing');

const detailData = read('js/portal/events/detail/data.js');
const detail = read('js/portal/events/detail.js');
const html = read('portal/events.html');

detailData.includes('(function ()')
    ? pass('detail/data.js is classic IIFE')
    : fail('detail/data.js must be a classic IIFE');

/\bexport\s+(default|const|let|var|function|class|\{)/.test(detailData)
    ? fail('detail/data.js must not use native export')
    : pass('detail/data.js has no native export');

/\bimport\s/.test(detailData)
    ? fail('detail/data.js must not use import')
    : pass('detail/data.js has no import statement');

detailData.includes('async function evtLoadDetailContext')
    ? pass('evtLoadDetailContext defined in detail/data.js')
    : fail('evtLoadDetailContext missing from detail/data.js');

detailData.includes('window.evtLoadDetailContext = evtLoadDetailContext')
    ? pass('window.evtLoadDetailContext exposed')
    : fail('window.evtLoadDetailContext not exposed');

detailData.includes('loadContext: evtLoadDetailContext')
    ? pass('PortalEvents.detail.data.loadContext present')
    : fail('PortalEvents.detail.data.loadContext missing');

console.log('\n── Phase 5H.1 — portal/events.html load order ────────────────────────────');

const fragmentsTag = 'src="../js/portal/events/detail/fragments.js"';
const dataTag = 'src="../js/portal/events/detail/data.js"';
const detailTag = 'src="../js/portal/events/detail.js"';

html.includes(dataTag)
    ? pass('detail/data.js script tag in events.html')
    : fail('detail/data.js script tag missing from events.html');

const fragmentsIdx = html.indexOf(fragmentsTag);
const dataIdx = html.indexOf(dataTag);
const detailIdx = html.indexOf(detailTag);

fragmentsIdx >= 0 && dataIdx >= 0 && detailIdx >= 0
    && fragmentsIdx < dataIdx && dataIdx < detailIdx
    ? pass('load order: fragments.js → data.js → detail.js')
    : fail('fragments → data → detail load order incorrect');

console.log('\n── Phase 5H.1 — detail.js orchestrator ──────────────────────────────────');

detail.includes('async function evtOpenDetail')
    ? pass('evtOpenDetail still defined in detail.js')
    : fail('evtOpenDetail missing from detail.js');

detail.includes('await window.evtLoadDetailContext(eventId)')
    ? pass('evtOpenDetail delegates to evtLoadDetailContext')
    : fail('evtOpenDetail must call window.evtLoadDetailContext');

detail.includes('window.evtOpenDetail            = evtOpenDetail')
    ? pass('window.evtOpenDetail still assigned from detail.js')
    : fail('window.evtOpenDetail assignment missing');

detail.includes('detail.loadContext = window.evtLoadDetailContext')
    ? pass('detail.loadContext bridge present')
    : fail('detail.loadContext bridge missing');

detail.includes('detail.data = window.PortalEvents.detail.data')
    ? pass('detail.data bridge present')
    : fail('detail.data bridge missing');

console.log('\n── Phase 5H.1 — inline handler names unchanged ──────────────────────────');

const INLINE_HANDLERS = [
    'evtOpenScanner',
    'evtClaimWaitlistSpot',
    'evtLeaveWaitlist',
    'evtJoinWaitlist',
    'evtRequestGraceRefund',
    'evtOpenTeamToolsPanel',
    'EventsManage.open',
    'evtHandleRsvp',
    'evtMessageHost',
    'evtHandleRaffleEntry',
    'evtHandleFreeRaffleEntry',
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
    detail.includes(name)
        ? pass(`inline handler reference still in detail.js: ${name}`)
        : fail(`inline handler missing from detail.js: ${name}`);
});

console.log('\n── Phase 5H.1 — no module mode / init.js last ────────────────────────────');

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
    console.log(`Phase 5H.1 smoke: ALL ${passed} CHECKS PASSED`);
    process.exit(0);
} else {
    console.log(`Phase 5H.1 smoke: ${failed} FAILED, ${passed} passed`);
    failures.forEach(f => console.log(`  • ${f}`));
    process.exit(1);
}
