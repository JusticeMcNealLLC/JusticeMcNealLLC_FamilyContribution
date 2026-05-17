// ═══════════════════════════════════════════════════════════
// Phase 2 static smoke test — low-risk module bridge
// Checks constants.js and raffle-model.js without a browser.
// Run: node test/_smoke-phase2-low-risk-modules.js
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

// ─── constants.js ─────────────────────────────────────────
console.log('\n── js/portal/events/constants.js ─────────────────────────────────────────');

const constants = read('js/portal/events/constants.js');

// Bare const declarations must still be present (classic-script compat)
constants.includes('const CATEGORY_EMOJI')
    ? pass('CATEGORY_EMOJI declared as bare const (classic-script compat preserved)')
    : fail('CATEGORY_EMOJI bare const missing — classic consumers like detail.js would break');

constants.includes('const TYPE_COLORS')
    ? pass('TYPE_COLORS declared as bare const (classic-script compat preserved)')
    : fail('TYPE_COLORS bare const missing');

constants.includes('const STATUS_COLORS')
    ? pass('STATUS_COLORS declared as bare const (classic-script compat preserved)')
    : fail('STATUS_COLORS bare const missing');

// Must NOT be wrapped in an IIFE (that would break detail.js bare TYPE_COLORS access)
/^\(function\s*\(\)/.test(constants.trim())
    ? fail('constants.js is wrapped in IIFE — breaks detail.js bare TYPE_COLORS identifier access')
    : pass('No IIFE wrapper (correct — bare globals must remain accessible as identifiers)');

// Must NOT have native ES module export
/\bexport\s+(default|const|let|var|function|class|\{)/.test(constants)
    ? fail('Native export statement found — breaks classic script loading')
    : pass('No native export statement (file stays classic-script safe)');

// Phase 2 bridge: window.PortalEvents.constants must be assigned
constants.includes('window.PortalEvents.constants')
    ? pass('window.PortalEvents.constants assigned (Phase 2 bridge present)')
    : fail('window.PortalEvents.constants not assigned');

// Bridge must include all three keys
constants.includes('CATEGORY_EMOJI,') || constants.includes('CATEGORY_EMOJI\n')
    ? pass('PortalEvents.constants includes CATEGORY_EMOJI')
    : fail('PortalEvents.constants missing CATEGORY_EMOJI');
constants.includes('TYPE_COLORS,') || constants.includes('TYPE_COLORS\n')
    ? pass('PortalEvents.constants includes TYPE_COLORS')
    : fail('PortalEvents.constants missing TYPE_COLORS');
constants.includes('STATUS_COLORS,') || constants.includes('STATUS_COLORS\n') || constants.includes('STATUS_COLORS\r')
    ? pass('PortalEvents.constants includes STATUS_COLORS')
    : fail('PortalEvents.constants missing STATUS_COLORS');

// Guard: window.PortalEvents = window.PortalEvents || {} must appear before assignment
constants.includes('window.PortalEvents = window.PortalEvents ||')
    ? pass('window.PortalEvents safe-initialization guard present')
    : fail('window.PortalEvents guard missing — could overwrite PortalEvents set by index.js');

// ─── raffle-model.js ──────────────────────────────────────
console.log('\n── js/portal/events/raffle-model.js ──────────────────────────────────────');

const raffleModel = read('js/portal/events/raffle-model.js');

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

html.includes('src="../js/portal/events/constants.js"') && !html.includes('src="../js/portal/events/constants.js" type="module"')
    ? pass('constants.js still loaded as a classic script in events.html')
    : fail('constants.js not loaded as classic script, or events.html was modified');

html.includes('src="../js/portal/events/raffle-model.js"') && !html.includes('src="../js/portal/events/raffle-model.js" type="module"')
    ? pass('raffle-model.js still loaded as a classic script in events.html')
    : fail('raffle-model.js not loaded as classic script, or events.html was modified');

// No scripts in events.html should be type="module" for events modules yet
const moduleScriptInEvents = /<script[^>]+type="module"[^>]+src="\.\.\/js\/portal\/events\/[^"]/.test(html);
moduleScriptInEvents
    ? fail('A portal/events/* script has type="module" — Phase 5 not yet started, this is premature')
    : pass('No portal/events/* scripts have type="module" yet (Phase 5 deferred, correct)');

// ─── Summary ──────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 2 static smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    console.log('\nPhase 2 static smoke: NEEDS REVIEW');
    process.exit(1);
} else {
    console.log('\nPhase 2 static smoke: ALL PASS');
    process.exit(0);
}
