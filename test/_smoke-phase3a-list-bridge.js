// ═══════════════════════════════════════════════════════════
// Phase 3A static smoke test — list.js compatibility bridge
//
// Verifies:
//   • list.js file structure (IIFE, no native export, exists)
//   • All public globals expected by init.js are assigned in source
//   • window.PortalEvents.list namespace and its keys
//   • portal/events.html not switched to module mode
//   • No new runtime file created under list/ without being loaded
//   • Phase 1 bridge still intact (init.js)
//   • Phase 2 bridges still intact (constants.js, raffle-model.js)
//
// Run: node test/_smoke-phase3a-list-bridge.js
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

// ─── list.js file structure ──────────────────────────────
console.log('\n── js/portal/events/list.js — file structure ─────────────────────────────');

const list = read('js/portal/events/list.js');

// Must be an IIFE (classic-script pattern)
list.includes('(function ()')
    ? pass('IIFE wrapper present ((function () {)')
    : fail('IIFE wrapper missing — list.js must remain a classic-script IIFE');

list.includes("'use strict';")
    ? pass("'use strict' present inside IIFE")
    : fail("'use strict' missing");

// Must not have native ES module export
/\bexport\s+(default|const|let|var|function|class|\{)/.test(list)
    ? fail('Native export statement found — breaks classic script loading')
    : pass('No native export statement (stays classic-script safe)');

// File must be substantial (>2000 lines worth of content)
list.length > 80000
    ? pass(`File size reasonable (${list.length.toLocaleString()} chars — no accidental truncation)`)
    : fail('list.js appears truncated (< 80k chars)', `actual: ${list.length}`);

// ─── Public globals assigned in source ───────────────────
console.log('\n── list.js — public globals (window.evt*) ─────────────────────────────────');

const REQUIRED_GLOBALS = [
    ['window.evtLoadEvents',       'loadEvents',       'init.js calls evtLoadEvents()'],
    ['window.evtRenderEvents',     'renderEvents',     'init.js wires typeFilter change'],
    ['window.evtSetupSearch',      'setupSearch',      'init.js calls evtSetupSearch()'],
    ['window.evtInitFilterChips',  'initFilterChips',  'init.js calls evtInitFilterChips()'],
    ['window.evtRenderFeatured',   null,               'compatibility stub — must remain'],
    ['window.evtUpdateHeroStats',  null,               'compatibility stub — must remain'],
    ['window.evtRenderCard',       null,               'used by external callers'],
];

REQUIRED_GLOBALS.forEach(([globalAssign, fnName, note]) => {
    const hasAssign = list.includes(globalAssign);
    const hasFn = fnName ? list.includes('function ' + fnName + '(') || list.includes('function ' + fnName + ' (') : true;
    if (hasAssign) {
        pass(`${globalAssign} assigned in source${note ? ' (' + note + ')' : ''}`);
    } else {
        fail(`${globalAssign} assignment missing — ${note || 'required'}`);
    }
    if (fnName && !hasFn) {
        fail(`Function '${fnName}' not found in source (assignment would be undefined)`);
    }
});

// Bare identifier assignments (init.js accesses these without window. prefix)
console.log('\n── list.js — bare identifier compatibility (init.js callers) ───────────────');

// init.js calls evtLoadEvents, evtInitFilterChips, evtSetupSearch as bare identifiers.
// In classic scripts, window.evtLoadEvents === evtLoadEvents, so these checks verify
// the assignment is present (same as above — belt-and-suspenders note).
['evtLoadEvents', 'evtInitFilterChips', 'evtSetupSearch', 'evtRenderEvents'].forEach(name => {
    list.includes('window.' + name + ' ')
        ? pass(`window.${name} assignment ensures bare-identifier access for init.js`)
        : fail(`window.${name} not assigned — init.js would get undefined`);
});

// ─── Internal functions referenced by init.js indirectly ─
console.log('\n── list.js — internal functions ─────────────────────────────────────────────');

const INTERNAL_FNS = [
    'function loadEvents',
    'function renderEvents',
    'function setupSearch',
    'function initFilterChips',
    'function renderSkeletons',
    'function _renderHero',
    'function _pickHero',
    'function _renderCalendar',
    'function _renderGoingRail',
    'function _renderTopPicks',
    'function _renderMiniCalendar',
    'function _renderMyRsvps',
    'function _renderStatsCard',
    'function _renderBucket',
    'function _matchesType',
    'function _matchesCategory',
    'function _matchesLifecycle',
    'function _matchesDate',
    'function _persistState',
    'function _restoreState',
    'function _initStickyHeader',
    'function _initMobileFab',
    'function _initPullToRefresh',
    'function _initVlift',
    'function _initGreeting',
    'function _initSwipeGestures',
];

INTERNAL_FNS.forEach(fn => {
    list.includes(fn)
        ? pass(`${fn} present in source`)
        : fail(`${fn} missing from source — required for runtime`);
});

// ─── window.PortalEvents.list namespace ──────────────────
console.log('\n── list.js — window.PortalEvents.list namespace ─────────────────────────────');

list.includes('window.PortalEvents.list = {')
    ? pass('window.PortalEvents.list namespace assigned')
    : fail('window.PortalEvents.list namespace missing');

list.includes('window.PortalEvents = window.PortalEvents ||')
    ? pass('window.PortalEvents safe-init guard present in list.js')
    : fail('window.PortalEvents safe-init guard missing in list.js');

// Phase 3A: verify new namespace keys are present
const NAMESPACE_KEYS = [
    // Core
    'load:',
    'render:',
    'setupSearch:',
    'initFilterChips:',
    // Sub-renderers
    'renderHero:',
    'pickHero:',
    'renderSkeletons:',
    'renderCalendar:',
    'renderGoingRail:',
    'renderTopPicks:',
    'renderMiniCalendar:',
    'renderMyRsvps:',
    'renderStatsCard:',
    'renderBucket:',
    // Filter predicates (Phase 3A additions)
    'matchesType:',
    'matchesCategory:',
    'matchesLifecycle:',
    'matchesDate:',
    // UI init
    'initStickyHeader:',
    'initMobileFab:',
];

NAMESPACE_KEYS.forEach(key => {
    list.includes(key)
        ? pass(`PortalEvents.list includes key: ${key.replace(':', '')}`)
        : fail(`PortalEvents.list missing key: ${key.replace(':', '')}`);
});

// ─── portal/events.html invariants ───────────────────────
console.log('\n── portal/events.html invariants ─────────────────────────────────────────');

const html = read('portal/events.html');

html.includes('src="../js/portal/events/list.js"')
    ? pass('list.js still loaded as classic script in events.html')
    : fail('list.js not loaded in events.html or script tag changed');

/src="\.\.\/js\/portal\/events\/list\.js"[^>]*type="module"/.test(html)
    ? fail('list.js loaded with type="module" — premature, Phase 5 only')
    : pass('list.js does NOT have type="module" (Phase 5 deferred — correct)');

// No portal/events/* scripts with type="module"
/<script[^>]+type="module"[^>]+src="\.\.\/js\/portal\/events\//.test(html)
    ? fail('A portal/events/* script has type="module" — premature')
    : pass('No portal/events/* scripts use type="module" yet (correct)');

// ─── No split file created without being loaded ──────────
console.log('\n── File split safety — no orphaned new files ──────────────────────────────');

// Check that no js/portal/events/list/ directory was created
const listDir = path.join(root, 'js', 'portal', 'events', 'list');
if (fs.existsSync(listDir)) {
    // If the directory exists, any .js file in it must also appear in events.html
    const files = fs.readdirSync(listDir).filter(f => f.endsWith('.js'));
    if (files.length === 0) {
        pass('js/portal/events/list/ directory exists but is empty (no orphaned files)');
    } else {
        files.forEach(f => {
            const scriptRef = 'js/portal/events/list/' + f;
            html.includes(scriptRef)
                ? pass(`list/${f} is referenced in events.html (not orphaned)`)
                : fail(`list/${f} exists but NOT in events.html — would never load`, `File: ${scriptRef}`);
        });
    }
} else {
    pass('js/portal/events/list/ directory does not exist (no premature split — correct)');
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

// ─── Summary ─────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 3A static smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    console.log('\nPhase 3A static smoke: NEEDS REVIEW');
    process.exit(1);
} else {
    console.log('\nPhase 3A static smoke: ALL PASS');
    process.exit(0);
}
