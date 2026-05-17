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

detail.includes('(function ()')
    ? pass('IIFE wrapper present ((function () {)')
    : fail('IIFE wrapper missing — detail.js must remain a classic-script IIFE');

detail.includes("'use strict';")
    ? pass("'use strict' present inside IIFE")
    : fail("'use strict' missing");

/\bexport\s+(default|const|let|var|function|class|\{)/.test(detail)
    ? fail('Native export statement found — breaks classic script loading')
    : pass('No native export statement (stays classic-script safe)');

detail.length > 40000
    ? pass(`File size reasonable (${detail.length.toLocaleString()} chars — no accidental truncation)`)
    : fail('detail.js appears truncated (< 40k chars)', `actual: ${detail.length}`);

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

const REQUIRED_WINDOW_GLOBALS = [
    ['window.evtOpenDetail',            'evtOpenDetail must be on window for init.js + other scripts'],
    ['window.evtOpenLightbox',          'used in banner onclick handlers'],
    ['window.evtOpenFullscreenMap',     'used in map overlay click handlers'],
    ['window.evtRecenterFullscreenMap', 'used by fullscreen map recenter button'],
    ['window.evtCloseFullscreenMap',    'used by fullscreen map close button'],
    ['window.evtMiniMarkdown',          'used for description rendering'],
    ['window.evtInitSectionAnimations', 'called after detail render'],
    ['window.evtStartLiveCountdown',    'live countdown ticker'],
    ['window.evtInitHeroCollapse',      'kept as no-op — external callers must not crash'],
    ['window.evtCleanupHeroCollapse',   'kept as no-op — external callers must not crash'],
    ['window.evtInitBottomNav',         'sticky CTA bar init'],
    ['window.evtCleanupBottomNav',      'sticky CTA bar cleanup'],
    ['window.evtOpenCtaPanel',          'CTA panel open'],
    ['window.evtCloseCtaPanel',         'CTA panel close'],
];

REQUIRED_WINDOW_GLOBALS.forEach(([assign, note]) => {
    detail.includes(assign)
        ? pass(`${assign} assigned (${note})`)
        : fail(`${assign} assignment missing — ${note}`);
});

// ─── window.PortalEvents.detail direct assignments ────────
console.log('\n── detail.js — window.PortalEvents.detail direct entries ─────────────────');

const DETAIL_DIRECT_KEYS = [
    // Pre-3B entries
    ['detail.open ',                 'open (evtOpenDetail)'],
    ['detail.openLightbox ',         'openLightbox'],
    ['detail.openFullscreenMap ',    'openFullscreenMap'],
    ['detail.closeFullscreenMap ',   'closeFullscreenMap'],
    ['detail.initBottomNav ',        'initBottomNav'],
    ['detail.cleanupBottomNav ',     'cleanupBottomNav'],
    ['detail.openCtaPanel ',         'openCtaPanel'],
    ['detail.closeCtaPanel ',        'closeCtaPanel'],
    ['detail.startLiveCountdown ',   'startLiveCountdown'],
    ['detail.initSectionAnimations', 'initSectionAnimations'],
    // Phase 3B additions
    ['detail.recenterFullscreenMap', 'recenterFullscreenMap (Phase 3B)'],
    ['detail.initHeroCollapse ',     'initHeroCollapse (Phase 3B)'],
    ['detail.cleanupHeroCollapse ',  'cleanupHeroCollapse (Phase 3B)'],
    ['detail.miniMarkdown ',         'miniMarkdown (Phase 3B)'],
    ['detail.raffleConfig ',         'raffleConfig (Phase 3B)'],
    ['detail.raffleCategories ',     'raffleCategories (Phase 3B)'],
    ['detail.raffleItems ',          'raffleItems (Phase 3B)'],
    ['detail.raffleWinnerCount ',    'raffleWinnerCount (Phase 3B)'],
    ['detail.drawModeLabel ',        'drawModeLabel (Phase 3B)'],
    ['detail.rafflePrizesHtml ',     'rafflePrizesHtml (Phase 3B)'],
    ['detail.raffleWinnersHtml ',    'raffleWinnersHtml (Phase 3B)'],
];

DETAIL_DIRECT_KEYS.forEach(([substr, label]) => {
    detail.includes(substr)
        ? pass(`detail.${label} assigned in source`)
        : fail(`detail.${label} assignment missing`);
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

const INTERNAL_FNS = [
    'function evtMiniMarkdown',
    'function evtOpenLightbox',
    'function evtInitSectionAnimations',
    'function evtStartLiveCountdown',
    'function _edMetaRow',
    'function _edPill',
    'function _edCard',
    'function _edNotice',
    'function _edSectionHead',
    'function evtDetailRaffleConfig',
    'function evtDetailRaffleCategories',
    'function evtDetailRaffleItems',
    'function evtDetailRaffleWinnerCount',
    'function evtDetailDrawModeLabel',
    'function evtDetailPrizeMedia',
    'function evtDetailRafflePrizesHtml',
    'function evtDetailRaffleWinnersHtml',
    'async function evtOpenDetail',
    'function evtOpenFullscreenMap',
    'function evtRecenterFullscreenMap',
    'function evtCloseFullscreenMap',
    'function evtInitHeroCollapse',
    'function evtCleanupHeroCollapse',
    'function evtInitBottomNav',
    'function evtCleanupBottomNav',
    'function evtCloseCtaPanel',
    'function evtOpenCtaPanel',
];

INTERNAL_FNS.forEach(fn => {
    detail.includes(fn)
        ? pass(`${fn} present in source`)
        : fail(`${fn} missing from source — required for runtime`);
});

// ─── portal/events.html invariants ───────────────────────
console.log('\n── portal/events.html invariants ─────────────────────────────────────────');

const html = read('portal/events.html');

html.includes('src="../js/portal/events/detail.js"')
    ? pass('detail.js still loaded as classic script in events.html')
    : fail('detail.js not loaded in events.html or script tag changed');

/src="\.\.\/js\/portal\/events\/detail\.js"[^>]*type="module"/.test(html)
    ? fail('detail.js loaded with type="module" — premature, Phase 5 only')
    : pass('detail.js does NOT have type="module" (Phase 5 deferred — correct)');

/<script[^>]+type="module"[^>]+src="\.\.\/js\/portal\/events\//.test(html)
    ? fail('A portal/events/* script has type="module" — premature')
    : pass('No portal/events/* scripts use type="module" yet (correct)');

// ─── No split file created without being loaded ──────────
console.log('\n── File split safety — no orphaned new detail/ files ─────────────────────');

const detailDir = path.join(root, 'js', 'portal', 'events', 'detail');
if (fs.existsSync(detailDir)) {
    const files = fs.readdirSync(detailDir).filter(f => f.endsWith('.js'));
    if (files.length === 0) {
        pass('js/portal/events/detail/ directory exists but is empty (no orphaned files)');
    } else {
        files.forEach(f => {
            const scriptRef = 'js/portal/events/detail/' + f;
            html.includes(scriptRef)
                ? pass(`detail/${f} is referenced in events.html (not orphaned)`)
                : fail(`detail/${f} exists but NOT in events.html — would never load`, `File: ${scriptRef}`);
        });
    }
} else {
    pass('js/portal/events/detail/ directory does not exist (no premature split — correct)');
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

const constantsJs = read('js/portal/events/constants.js');
constantsJs.includes('window.PortalEvents.constants')
    ? pass('window.PortalEvents.constants still present (Phase 2 constants bridge intact)')
    : fail('window.PortalEvents.constants missing — Phase 2 regression');

const raffleJs = read('js/portal/events/raffle-model.js');
raffleJs.includes('root.PortalEvents.raffleModel = api')
    ? pass('root.PortalEvents.raffleModel still present (Phase 2 raffle bridge intact)')
    : fail('root.PortalEvents.raffleModel missing — Phase 2 regression');
raffleJs.includes('root.EventsRaffleModel = api')
    ? pass('root.EventsRaffleModel still present (primary classic global preserved)')
    : fail('root.EventsRaffleModel missing — Phase 2 regression');

// ─── Phase 3A list bridge still intact ───────────────────
console.log('\n── Phase 3A bridge (list.js) — regression check ───────────────────────────');

const listJs = read('js/portal/events/list.js');
listJs.includes('window.PortalEvents.list = {')
    ? pass('window.PortalEvents.list namespace still present (Phase 3A intact)')
    : fail('window.PortalEvents.list namespace missing — Phase 3A regression');
listJs.includes('(function ()')
    ? pass('list.js still IIFE (Phase 3A structure intact)')
    : fail('list.js lost IIFE wrapper — Phase 3A regression');

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
