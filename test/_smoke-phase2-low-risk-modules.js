// ══════════════════════════════════════════════════════════════════
// Phase 2 static smoke test — low-risk module bridges
// Checks EventsConstants + index.js bridge and raffle-model.js without a browser.
//
// Run: node test/_smoke-phase2-low-risk-modules.js
// ══════════════════════════════════════════════════════════════════
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

function read(relPath) {
    return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function exists(relPath) {
    return fs.existsSync(path.join(root, relPath));
}

// ─── shared + portal constants bridge ───────────────────
console.log('\n── js/components/events/constants.js + index.js bridge ─────────────────');

const sharedConstants = read('js/components/events/constants.js');
const indexJs = read('js/portal/events/index.js');

sharedConstants.includes('window.EventsConstants')
    ? pass('EventsConstants assigned on window (shared SSOT)')
    : fail('EventsConstants missing from components/events/constants.js');

sharedConstants.includes('TYPE_COLORS_PORTAL')
    ? pass('TYPE_COLORS_PORTAL present in shared constants')
    : fail('TYPE_COLORS_PORTAL missing from shared constants');

!exists('js/portal/events/constants.js')
    ? pass('portal events/constants.js removed (consolidated)')
    : fail('portal events/constants.js should be deleted');

indexJs.includes('window.PortalEvents.constants')
    ? pass('window.PortalEvents.constants bridged in index.js')
    : fail('window.PortalEvents.constants not assigned in index.js');

indexJs.includes('EventsConstants')
    ? pass('index.js reads from EventsConstants')
    : fail('index.js must alias EventsConstants for PortalEvents.constants');

indexJs.includes('TYPE_COLORS_PORTAL')
    ? pass('PortalEvents.constants.TYPE_COLORS aliases TYPE_COLORS_PORTAL')
    : fail('index.js must map TYPE_COLORS_PORTAL → TYPE_COLORS on PortalEvents.constants');

// ─── raffle-model.js ──────────────────────────────────────
console.log('\n── js/portal/events/core/raffle-model.js ─────────────────────────────────');

const raffleModel = read('js/portal/events/core/raffle-model.js');

// Must still be an IIFE (file starts with a comment then the IIFE)
raffleModel.includes('(function (root)')
    ? pass('Still wrapped in IIFE (no change to classic loading)')
    : fail('IIFE wrapper missing from raffle-model.js');

// window.EventsRaffleModel primary global must still be assigned
raffleModel.includes('root.EventsRaffleModel = api')
    ? pass('root.EventsRaffleModel = api (window.EventsRaffleModel preserved)')
    : fail('root.EventsRaffleModel assignment missing — would break detail/manage/raffle consumers');

// CJS compat must still be present
raffleModel.includes("typeof module !== 'undefined' && module.exports")
    ? pass("CJS module.exports compat preserved")
    : fail("CJS module.exports compat missing");

// Phase 2 bridge: PortalEvents.raffleModel
raffleModel.includes('root.PortalEvents.raffleModel = api')
    ? pass('root.PortalEvents.raffleModel = api (Phase 2 bridge present)')
    : fail('root.PortalEvents.raffleModel assignment missing');

// Guard before bridge assignment
raffleModel.includes("typeof root.PortalEvents === 'undefined'")
    ? pass('PortalEvents safe-init guard present inside IIFE')
    : fail('PortalEvents safe-init guard missing inside IIFE');

// Public API methods must all still be present
const apiMethods = [
    'normalizeConfig', 'createDefaultConfig', 'createCategory', 'createItem',
    'getOrderedCategories', 'getItemsForCategory', 'getTotalWinnerCount',
    'getDrawQueue', 'validateConfig',
];
apiMethods.forEach(method => {
    raffleModel.includes(method)
        ? pass(`Public API method present: ${method}`)
        : fail(`Public API method missing: ${method}`);
});

// Must NOT have native export
/\bexport\s+(default|const|let|var|function|class|\{)/.test(raffleModel)
    ? fail('Native export statement found — breaks classic script loading')
    : pass('No native export statement (file stays classic-script safe)');

// ─── portal/events.html invariants ────────────────────────
console.log('\n── portal/events.html invariants ─────────────────────────────────────────');

const html = read('portal/events.html');

html.includes('src="../js/components/events/constants.js"') && !html.includes('src="../js/components/events/constants.js" type="module"')
    ? pass('components/events/constants.js loaded before portal chain')
    : fail('shared constants.js not loaded as classic script in events.html');

html.includes('href="../css/tailwind.portal.css"') && !html.includes('cdn.tailwindcss.com')
    ? pass('portal/events.html uses built Tailwind CSS (no CDN)')
    : fail('portal/events.html should link tailwind.portal.css instead of CDN');

!html.includes('src="../js/portal/events/constants.js"')
    ? pass('portal events/constants.js not duplicated in events.html')
    : fail('portal events/constants.js should not be in events.html');

const loader = read('js/portal/events/classic-chain-loader.js');
loader.includes("'core/raffle-model.js'")
    ? pass('core/raffle-model.js in classic-chain-loader chain')
    : fail('core/raffle-model.js missing from classic-chain-loader');

sharedConstants.includes('EVENT_DOC_TYPES')
    ? pass('EVENT_DOC_TYPES present in EventsConstants')
    : fail('EVENT_DOC_TYPES missing from shared constants');

const detailData = read('js/portal/events/detail/data.js');
detailData.includes('TYPE_COLORS_PORTAL')
    ? pass('detail/data.js uses EventsConstants.TYPE_COLORS_PORTAL')
    : fail('detail/data.js must not rely on bare TYPE_COLORS global');

// ─── summary ──────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 2 static smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nPhase 2 static smoke: NEEDS REVIEW');
    process.exit(1);
}

console.log('\nPhase 2 static smoke: ALL PASS');
