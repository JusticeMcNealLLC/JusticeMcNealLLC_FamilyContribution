/**
 * Phase 1 Bridge — Static Smoke Test
 *
 * Verifies all code-level invariants of the Phase 1 changes without
 * needing a browser or credentials. Checks init.js and index.js.
 *
 * Run from repo root:
 *   node test/_smoke-phase1-bridge.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const root  = path.resolve(__dirname, '..');
const read  = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const initJs  = read('js/portal/events/init.js');
const indexJs = read('js/portal/events/index.js');

let passed = 0;
let failed = 0;

function check(label, value) {
    if (value) {
        console.log(`  ✓ ${label}`);
        passed++;
    } else {
        console.log(`  ✗ ${label}`);
        failed++;
    }
}

// ── init.js checks ──────────────────────────────────────────────────────────

console.log('\n── init.js ─────────────────────────────────────────────');

// Guard flag declared at module scope
check(
    'One-time guard flag declared: let _eventsPageInitialized = false',
    /let _eventsPageInitialized\s*=\s*false/.test(initJs)
);

// Named function declaration (not arrow, not class)
check(
    'initEventsPage declared as a named async function',
    /async function initEventsPage\s*\(/.test(initJs)
);

// Guard check is the first statement inside the function
check(
    'Guard check is first line inside initEventsPage',
    /async function initEventsPage\s*\(\s*\)\s*\{[\s\n\r]*if\s*\(\s*_eventsPageInitialized\s*\)\s*return/.test(initJs)
);

// Guard set to true (and window mirror) before any await — Phase 5L.2 sync gate
check(
    'Guard flags set before await checkAuth inside initEventsPage',
    /if\s*\(\s*_eventsPageInitialized\s*\)\s*return;\s*[\s\n\r]*_eventsPageInitialized\s*=\s*true;\s*[\s\n\r]*window\._eventsPageInitialized\s*=\s*true;\s*[\s\n\r]*evtCurrentUser\s*=\s*await/.test(initJs)
);

// DOMContentLoaded still registered with named function (not anonymous arrow)
check(
    'DOMContentLoaded still registered: addEventListener("DOMContentLoaded", initEventsPage)',
    /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*initEventsPage\s*\)/.test(initJs)
);

// No anonymous DOMContentLoaded arrow in init.js anymore
check(
    'No anonymous DOMContentLoaded arrow/async function (old pattern removed)',
    !/document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*async\s*\(\s*\)\s*=>/.test(initJs)
);

// Bridge exposure on PortalEvents namespace
check(
    'window.PortalEvents = window.PortalEvents || {} guard before bridge assignment',
    /window\.PortalEvents\s*=\s*window\.PortalEvents\s*\|\|\s*\{\}/.test(initJs)
);

check(
    'window.PortalEvents.initEventsPage = initEventsPage assigned',
    /window\.PortalEvents\.initEventsPage\s*=\s*initEventsPage/.test(initJs)
);

// Legacy window exports still present (unchanged)
check(
    'window.evtHandleRsvp export still present',
    /window\.evtHandleRsvp\s*=\s*evtHandleRsvp/.test(initJs)
);
check(
    'window.evtOpenScanner export still present',
    /window\.evtOpenScanner\s*=\s*evtOpenScanner/.test(initJs)
);
check(
    'window.evtToggleModal export still present',
    /window\.evtToggleModal\s*=\s*evtToggleModal/.test(initJs)
);

// Old window.evtCurrentUser NOT assigned via window.X = ...; it's still a plain global write
check(
    'evtCurrentUser is still assigned as a classic global (not window.evtCurrentUser = )',
    /evtCurrentUser\s*=\s*await\s*checkAuth\(\)/.test(initJs)
);

// evtSetupListeners still called
check(
    'evtSetupListeners() still called inside initEventsPage',
    /evtSetupListeners\s*\(\s*\)/.test(initJs)
);

// evtLoadEvents still called
check(
    'evtLoadEvents() still called inside initEventsPage',
    /await\s*evtLoadEvents\s*\(\s*\)/.test(initJs)
);

// evtRouteByUrl still called
check(
    'evtRouteByUrl() still called inside initEventsPage',
    /evtRouteByUrl\s*\(\s*\)/.test(initJs)
);

// popstate still wired
check(
    'popstate listener still registered inside initEventsPage',
    /window\.addEventListener\s*\(\s*['"]popstate['"]/.test(initJs)
);

// evtUpdateRaffleCostHint still defined (should not have been changed)
check(
    'evtUpdateRaffleCostHint still defined',
    /function evtUpdateRaffleCostHint\s*\(\s*\)/.test(initJs)
);

// evtSetupListeners still defined
check(
    'evtSetupListeners still defined',
    /function evtSetupListeners\s*\(\s*\)/.test(initJs)
);

// No "import" or "export" statements — still a classic script
check(
    'No ES module import/export statements in init.js (stays classic)',
    !/^\s*import\s+/m.test(initJs) && !/^\s*export\s+/m.test(initJs)
);

// ── index.js checks ─────────────────────────────────────────────────────────

console.log('\n── index.js ────────────────────────────────────────────');

// Namespace seed still present
check(
    'window.PortalEvents = window.PortalEvents || {} in index.js (safe seed)',
    /window\.PortalEvents\s*=\s*window\.PortalEvents\s*\|\|\s*\{\}/.test(indexJs)
);

// IIFE still wraps the file
check(
    'IIFE wrapper still present in index.js',
    /\(function\s*\(\s*\)\s*\{/.test(indexJs) && /\}\s*\)\s*\(\s*\)\s*;/.test(indexJs)
);

// use strict still present
check(
    "'use strict' still present in index.js",
    /'use strict'/.test(indexJs)
);

// Phase 5 placeholder comment present
check(
    'Phase 5 future-use comment present in index.js',
    /Phase 5/.test(indexJs)
);

// index.js does NOT call initEventsPage() outside of comments — would cause premature init
check(
    'index.js does NOT call initEventsPage() directly (no premature init)',
    // Strip single-line comments before checking so the placeholder comment doesn't trip this
    !indexJs.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').match(/initEventsPage\s*\(\s*\)/)
);

// No ES module import/export in index.js
check(
    'No ES module import/export in index.js (stays classic)',
    !/^\s*import\s+/m.test(indexJs) && !/^\s*export\s+/m.test(indexJs)
);

// ── Cross-file check ─────────────────────────────────────────────────────────

console.log('\n── Cross-file invariants ───────────────────────────────');

// portal/events.html must still have the classic script tags — not changed in Phase 1
const eventsHtml = read('portal/events.html');

check(
    'portal/events.html still loads init.js as a classic script',
    /src=["'][^"']*portal\/events\/init\.js/.test(eventsHtml)
);
check(
    'portal/events.html still loads index.js as a classic script',
    /src=["'][^"']*portal\/events\/index\.js/.test(eventsHtml)
);
check(
    'portal/events.html does NOT have a type="module" events entry yet (Phase 5)',
    !/type=["']module["'][^>]*portal\/events\/index\.js/.test(eventsHtml)
);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════');
console.log(`Phase 1 static smoke: ${passed + failed} checks — ${passed} pass, ${failed} fail`);
console.log('══════════════════════════════════════════════════════');

if (failed > 0) {
    console.log('\nPhase 1 static smoke: NEEDS REVIEW');
    process.exit(1);
} else {
    console.log('\nPhase 1 static smoke: ALL PASS');
}
