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
const teamChat = read('js/portal/events/team/chat.js');
const teamTools = read('js/portal/events/team/tools.js');

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

const REQUIRED_DETAIL_WINDOW_GLOBALS = [
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
];

REQUIRED_DETAIL_WINDOW_GLOBALS.forEach(([assign, note]) => {
    detail.includes(assign)
        ? pass(`${assign} assigned (${note})`)
        : fail(`${assign} assignment missing — ${note}`);
});

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

html.includes('src="../js/portal/events/detail.js"')
    ? pass('detail.js still loaded as classic script in events.html')
    : fail('detail.js not loaded in events.html or script tag changed');

/src="\.\.\/js\/portal\/events\/detail\.js"[^>]*type="module"/.test(html)
    ? fail('detail.js loaded with type="module" — premature, Phase 5 only')
    : pass('detail.js does NOT have type="module" (Phase 5 deferred — correct)');

/<script[^>]+type="module"[^>]+src="\.\.\/js\/portal\/events\//.test(html)
    ? fail('A portal/events/* script has type="module" — premature')
    : pass('No portal/events/* scripts use type="module" yet (correct)');

// ─── Phase 5B split files must be loaded in events.html ───
console.log('\n── File split safety — team/ and detail/ scripts in events.html ─────────');

const chatTag = 'src="../js/portal/events/team/chat.js"';
const toolsTag = 'src="../js/portal/events/team/tools.js"';
const detailTag = 'src="../js/portal/events/detail.js"';
const chatIdx = html.indexOf(chatTag);
const toolsIdx = html.indexOf(toolsTag);
const detailIdx = html.indexOf(detailTag);
html.includes(chatTag)
    ? pass('team/chat.js is referenced in events.html')
    : fail('team/chat.js not in events.html — would never load');
html.includes(toolsTag)
    ? pass('team/tools.js is referenced in events.html')
    : fail('team/tools.js not in events.html — would never load');
chatIdx >= 0 && toolsIdx >= 0 && detailIdx >= 0 && chatIdx < toolsIdx && toolsIdx < detailIdx
    ? pass('team scripts load chat → tools → detail')
    : fail('team/chat.js must load before team/tools.js before detail.js');

const detailDir = path.join(root, 'js', 'portal', 'events', 'detail');
if (fs.existsSync(detailDir)) {
    const files = fs.readdirSync(detailDir).filter(f => f.endsWith('.js'));
    files.forEach(f => {
        const scriptRef = 'js/portal/events/detail/' + f;
        html.includes(scriptRef)
            ? pass(`detail/${f} is referenced in events.html (not orphaned)`)
            : fail(`detail/${f} exists but NOT in events.html — would never load`, `File: ${scriptRef}`);
    });
    if (files.length === 0) {
        pass('js/portal/events/detail/ exists but has no .js files yet');
    }
} else {
    pass('js/portal/events/detail/ directory does not exist yet (ok for Phase 5B)');
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
