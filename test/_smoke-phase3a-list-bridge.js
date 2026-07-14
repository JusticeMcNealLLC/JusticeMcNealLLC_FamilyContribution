// ═══════════════════════════════════════════════════════════
// Phase 3A static smoke test — list.js compatibility bridge
//
// Verifies:
//   • list.js file structure (IIFE, no native export, exists)
//   • All public globals expected by init.js are assigned in source
//   • window.PortalEvents.list namespace and its keys
//   • portal/events.html not switched to module mode
//   • list.js in production load model (HTML tag or classic-chain-loader)
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
const {
    parseClassicChain,
    isProductionLoaded,
    portalEventsHtmlScripts,
    chainOrderOk,
    productionEventsBootLast,
} = require('./_portal-events-classic-chain.js');
const { hasGlobalBridge, indexConstantsOk, listShellEsmOk } = require('./_esm-bridge-helpers.js');

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

/** Phase 7.4: list modules export const + globalThis bridge (not always window.*). */
function listModuleNamespace(js, name) {
    return js.includes(`export const ${name}`)
        || js.includes(`globalThis.${name}`)
        || js.includes(`window.${name}`);
}

// ─── list.js file structure ──────────────────────────────
console.log('\n── js/portal/events/list/shell.js — file structure ─────────────────────────────');

const list = read('js/portal/events/list/shell.js');
const listSearchJs = read('js/portal/events/list/search.js');
const listRightRailJs = read('js/portal/events/list/right-rail.js');
const listHeaderJs = read('js/portal/events/list/header.js');
const listFiltersJs = read('js/portal/events/list/filters.js');
const listCalendarJs = read('js/portal/events/list/calendar.js');
const listHeroRailsJs = read('js/portal/events/list/hero-rails.js');
const listBucketsJs = read('js/portal/events/list/buckets.js');
const classicChain3a = parseClassicChain(root);

listShellEsmOk(list)
    ? pass('list/shell.js ESM orchestrator (Phase 7.9)')
    : fail('list/shell.js missing portalEventsListApi or evtLoadEvents bridge');

list.includes("'use strict';")
    ? pass("'use strict' present")
    : fail("'use strict' missing");

// File must be substantial (>2000 lines worth of content)
list.length > 40000
    ? pass(`File size reasonable (${list.length.toLocaleString()} chars — no accidental truncation)`)
    : fail('list/shell.js appears truncated (< 40k chars)', `actual: ${list.length}`);

// ─── Public globals assigned in source ───────────────────
console.log('\n── list/shell.js — public globals (window.evt*) ─────────────────────────────────');

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
    const name = globalAssign.replace('window.', '');
    const hasAssign = hasGlobalBridge(list, name);
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
console.log('\n── list/shell.js — bare identifier compatibility (init.js callers) ───────────────');

// init.js calls evtLoadEvents, evtInitFilterChips, evtSetupSearch as bare identifiers.
// In classic scripts, window.evtLoadEvents === evtLoadEvents, so these checks verify
// the assignment is present (same as above — belt-and-suspenders note).
['evtLoadEvents', 'evtInitFilterChips', 'evtSetupSearch', 'evtRenderEvents'].forEach(name => {
    hasGlobalBridge(list, name)
        ? pass(`${name} bridged for init.js`)
        : fail(`${name} not bridged — init.js would get undefined`);
});

// ─── Internal functions referenced by init.js indirectly ─
console.log('\n── list/shell.js — internal functions ─────────────────────────────────────────────');

const INTERNAL_FNS = [
    'function loadEvents',
    'function renderEvents',
    'function setupSearch',
    'function initFilterChips',
    'function renderSkeletons',
    'function _renderMiniCalendar',
    'function _renderMyRsvps',
    'function _renderStatsCard',
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

const movedFromList = [
    ['function _readHistory(', 'search history'],
    ['function renderSearchSuggest(', 'search suggest'],
    ['function wireSuggestClicks(', 'suggest clicks'],
    ['function renderHeaderGreeting(', 'header greeting'],
    ['function wireHeaderBellBadge(', 'header bell badge'],
    ['function _toIsoDate(', 'mini cal iso helper in list'],
    ['#evtLifecycleSeg .evt-seg__btn', 'lifecycle filter chip wiring'],
    ['function matchesType(ev) {', 'matchesType body'],
    ['function renderCalendar() {', 'renderCalendar body'],
    ['function groupEventsByDay(', 'groupEventsByDay body'],
    ['function initDateMenu(', 'initDateMenu body'],
    ['evt-hero-cluster-stack', 'hero attendee cluster HTML'],
    ['evt-bucket-seeall text-xs font-semibold', 'bucket see-all link markup'],
    ['function renderBucket(label, events', 'renderBucket body'],
    ['function renderGoingRail(', 'going rail body'],
    ['function renderLiveBanner(', 'live banner body'],
];
movedFromList.forEach(([pattern, label]) => {
    !list.includes(pattern)
        ? pass(`${label} removed from list/shell.js (moved to list module)`)
        : fail(`${label} still in list/shell.js body`);
});

// ─── List modules (Phase 5M.2A / 5M.2B / 5M.2C) ──────────
console.log('\n── js/portal/events/list/*.js — list modules (5M.2A–5M.2C) ─────────────');

['list/search.js', 'list/right-rail.js', 'list/header.js', 'list/filters.js', 'list/calendar.js', 'list/hero-rails.js', 'list/buckets.js'].forEach(rel => {
    classicChain3a && classicChain3a.includes(rel)
        ? pass(`${rel} present in classic-chain-loader.js chain`)
        : fail(`${rel} missing from classic-chain-loader.js chain`);
});

chainOrderOk(classicChain3a, 'core/raffle-model.js', 'list/search.js', 'list/right-rail.js')
    && chainOrderOk(classicChain3a, 'list/right-rail.js', 'list/header.js')
    && chainOrderOk(classicChain3a, 'list/header.js', 'list/filters.js')
    && chainOrderOk(classicChain3a, 'list/filters.js', 'list/calendar.js')
    && chainOrderOk(classicChain3a, 'list/calendar.js', 'list/hero-rails.js')
    && chainOrderOk(classicChain3a, 'list/hero-rails.js', 'list/buckets.js')
    && chainOrderOk(classicChain3a, 'list/buckets.js', 'list/shell.js')
    ? pass('loader order: raffle-model → list/* → list/shell.js')
    : fail('loader list module order');

listModuleNamespace(listSearchJs, 'PortalEventsListSearch')
    ? pass('search.js assigns PortalEventsListSearch')
    : fail('PortalEventsListSearch namespace missing');

listSearchJs.includes('function setupSearch')
    && listSearchJs.includes('function renderSearchSuggest')
    ? pass('search.js owns setupSearch and renderSearchSuggest')
    : fail('search.js missing search functions');

listModuleNamespace(listRightRailJs, 'PortalEventsListRightRail')
    ? pass('right-rail.js assigns PortalEventsListRightRail')
    : fail('PortalEventsListRightRail namespace missing');

listRightRailJs.includes('function renderMiniCalendar')
    && listRightRailJs.includes('function renderMyRsvps')
    && listRightRailJs.includes('function renderStatsCard')
    ? pass('right-rail.js owns mini calendar, RSVPs, stats card')
    : fail('right-rail.js missing right-rail renderers');

listModuleNamespace(listHeaderJs, 'PortalEventsListHeader')
    && listHeaderJs.includes('function renderHeaderCount')
    && listHeaderJs.includes('function initHeaderBell')
    ? pass('header.js owns header count and bell helpers')
    : fail('header.js missing header helpers');

list.includes('PortalEventsListSearch.setupSearch')
    ? pass('list/shell.js delegates setupSearch to PortalEventsListSearch')
    : fail('list/shell.js missing setupSearch delegate');

listModuleNamespace(listFiltersJs, 'PortalEventsListFilters')
    && listFiltersJs.includes('function initFilterChips')
    && listFiltersJs.includes('function matchesType')
    ? pass('filters.js owns filter chips and match predicates')
    : fail('filters.js missing filter functions');

listModuleNamespace(listCalendarJs, 'PortalEventsListCalendar')
    && listCalendarJs.includes('function renderCalendar')
    && listCalendarJs.includes('function openDayModal')
    ? pass('calendar.js owns full calendar and day modal')
    : fail('calendar.js missing calendar functions');

list.includes('PortalEventsListFilters.initFilterChips')
    && list.includes('PortalEventsListCalendar.renderCalendar')
    ? pass('list/shell.js delegates filters and calendar to list modules')
    : fail('list/shell.js missing filter/calendar delegates');

listModuleNamespace(listHeroRailsJs, 'PortalEventsListHeroRails')
    && listHeroRailsJs.includes('function renderHero')
    && listHeroRailsJs.includes('function attendeeCluster')
    ? pass('hero-rails.js owns hero, rails, and attendee cluster')
    : fail('hero-rails.js missing hero/rail functions');

listModuleNamespace(listBucketsJs, 'PortalEventsListBuckets')
    && listBucketsJs.includes('function renderBucket')
    ? pass('buckets.js owns bucket renderer')
    : fail('buckets.js missing renderBucket');

list.includes('PortalEventsListHeroRails.renderHero')
    && list.includes('PortalEventsListBuckets.renderBucket')
    ? pass('list/shell.js delegates hero-rails and buckets to list modules')
    : fail('list/shell.js missing hero-rails/buckets delegates');

list.includes('function loadEvents')
    && list.includes('function renderEvents')
    ? pass('list/shell.js still owns loadEvents and renderEvents orchestrator')
    : fail('list/shell.js missing core orchestrator functions');

// ─── window.PortalEvents.list namespace ──────────────────
console.log('\n── list/shell.js — window.PortalEvents.list namespace ─────────────────────────────');

(list.includes('portalEventsListApi') || list.includes('window.PortalEvents.list'))
    ? pass('PortalEvents.list namespace assigned')
    : fail('PortalEvents.list namespace missing');

(list.includes('globalThis.PortalEvents') || list.includes('window.PortalEvents = window.PortalEvents'))
    ? pass('PortalEvents wired in list/shell.js')
    : fail('PortalEvents safe-init missing in list/shell.js');

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

const html = read('pages/portal/events.html');

classicChain3a && classicChain3a.includes('list/shell.js')
    ? pass('list/shell.js present in classic-chain-loader.js chain')
    : fail('list/shell.js missing from classic-chain-loader.js chain');

isProductionLoaded(html, classicChain3a, '../js/portal/events/list/shell.js', root)
    ? pass('list/shell.js still loaded in production (bundle or chain manifest)')
    : fail('list/shell.js not in production load model');

html.includes('events.bundle.js')
    ? pass('portal/events.html uses events.bundle.js (5L.4 single entry)')
    : fail('events.bundle.js not referenced in portal/events.html');

/src="\.\.\/js\/portal\/events\/list\.js"[^>]*type="module"/.test(html)
    ? fail('list.js loaded with type="module" — premature, Phase 5 only')
    : pass('list/shell.js does NOT have type="module" in HTML (Phase 5 deferred — correct)');

// No portal/events/* scripts with type="module"
/<script[^>]+type="module"[^>]+src="\.\.\/js\/portal\/events\//.test(html)
    ? fail('A portal/events/* script has type="module" — premature')
    : pass('No portal/events/* scripts use type="module" yet (correct)');

const portalScripts3a = portalEventsHtmlScripts(html);
productionEventsBootLast(portalScripts3a)
    ? pass('events boot script is last before sw-register (bundle or init.js)')
    : fail('events.bundle.js or init.js must be the last portal/events script before sw-register');

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
            const chainKey = 'list/' + f;
            const src = '../js/portal/events/' + chainKey;
            isProductionLoaded(html, classicChain3a, src)
                ? pass(`list/${f} in production load (not orphaned)`)
                : fail(`list/${f} exists but NOT in production load`, `File: ${chainKey}`);
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

const indexJs = read('js/portal/events/index.js');
indexConstantsOk(indexJs)
    ? pass('PortalEvents.constants still present (index.js bridge intact)')
    : fail('PortalEvents.constants missing — Phase 2 regression');

const raffleJs = read('js/portal/events/core/raffle-model.js');
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
