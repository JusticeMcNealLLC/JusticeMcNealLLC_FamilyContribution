// ═══════════════════════════════════════════════════════════
// Phase 5L.3 Option B — rehearsal harness static smoke
//
// Validates portal/events.rehearsal.html consolidation experiment
// production portal/events.html uses 3-tag Option C model after 5L.3.
//
// Run: node test/_smoke-phase5l3-rehearsal.js
// ═══════════════════════════════════════════════════════════
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

function pass(msg) {
    console.log(`  ✓ ${msg}`);
    passed++;
}
function fail(msg, detail) {
    console.log(`  ✗ ${msg}`);
    if (detail) console.log(`    detail: ${detail}`);
    failed++;
    failures.push(msg);
}

function read(relPath) {
    return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function portalEventsScriptsFromHtml(html) {
    const portalBlock = html.slice(html.indexOf('<!-- Events modules'));
    const moduleSection = portalBlock.slice(0, portalBlock.indexOf('sw-register'));
    return [...moduleSection.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)]
        .map((m) => m[1])
        .filter((s) => s.includes('portal/events'));
}

const PROD_HTML = 'portal/events.html';
const REH_HTML = 'portal/events.rehearsal.html';
const PROD_COUNT = 3;
const REH_COUNT = 3;
const LOADER = 'js/portal/events/classic-chain-loader.js';
const PROD_LOADER_TAG = '../js/portal/events/classic-chain-loader.js';

const prodHtml = read(PROD_HTML);
const rehHtml = read(REH_HTML);
const loaderJs = read(LOADER);

const prodScripts = portalEventsScriptsFromHtml(prodHtml);
const rehScripts = portalEventsScriptsFromHtml(rehHtml);

console.log('\n── Phase 5L.3 — rehearsal harness ────────────────────────────────────────');

fs.existsSync(path.join(root, REH_HTML))
    ? pass('portal/events.rehearsal.html exists')
    : fail('rehearsal HTML missing');

/rehearsal|REHEARSAL|5L\.3/.test(rehHtml)
    ? pass('rehearsal page marked as non-production')
    : fail('rehearsal page must declare REHEARSAL / 5L.3');

prodScripts.length === PROD_COUNT
    ? pass(`production portal/events.html has ${PROD_COUNT} portal Events scripts (Option C)`)
    : fail(`production expected ${PROD_COUNT} portal Events tags`, `found ${prodScripts.length}`);

!/<script[^>]+src="[^"]*portal\/events\/[^"]+\.js"[^>]*type="module"/.test(prodHtml)
    ? pass('production: no type="module" on portal Events scripts')
    : fail('production must not use type="module" on portal Events');

rehScripts.length === REH_COUNT
    ? pass(`rehearsal loads ${REH_COUNT} portal Events script tags (consolidation experiment)`)
    : fail(`rehearsal expected ${REH_COUNT} portal Events tags`, `found ${rehScripts.length}`);

rehScripts[0] === '../js/portal/events/index.js'
    ? pass('rehearsal: index.js first')
    : fail('rehearsal index.js must be first', rehScripts[0]);

rehScripts[rehScripts.length - 1] === '../js/portal/events/init.js'
    ? pass('rehearsal: init.js last')
    : fail('rehearsal init.js must be last', rehScripts[rehScripts.length - 1]);

prodScripts[1] === PROD_LOADER_TAG && rehScripts[1] === PROD_LOADER_TAG
    ? pass('production and rehearsal share classic-chain-loader.js middle tag')
    : fail('middle tag must be classic-chain-loader.js', `prod=${prodScripts[1]} reh=${rehScripts[1]}`);

!rehHtml.includes('compat/window-exports') && !rehHtml.includes('compat/inline-handlers')
    ? pass('rehearsal: compat scripts not in HTML')
    : fail('rehearsal must not load compat installers');

!prodHtml.includes('compat/window-exports') && !prodHtml.includes('rehearsal/classic-chain-loader')
    ? pass('production: no compat or rehearsal loader in portal/events.html')
    : fail('production HTML must not reference compat or rehearsal loader');

fs.existsSync(path.join(root, LOADER))
    ? pass('classic-chain-loader.js exists')
    : fail('loader file missing');

const chainMatch = loaderJs.match(/var chain = \[([\s\S]*?)\];/);
if (!chainMatch) {
    fail('loader must define chain array');
} else {
    const chainEntries = [...chainMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    chainEntries.length === 43
        ? pass(`loader chain has ${chainEntries.length} middle scripts (production order)`)
        : fail('loader chain must have 43 entries', `found ${chainEntries.length}`);
    const raffleModelIdx = chainEntries.indexOf('raffle-model.js');
    const listSearchIdx = chainEntries.indexOf('list/search.js');
    const listRightRailIdx = chainEntries.indexOf('list/right-rail.js');
    const listHeaderIdx = chainEntries.indexOf('list/header.js');
    const listFiltersIdx = chainEntries.indexOf('list/filters.js');
    const listCalendarIdx = chainEntries.indexOf('list/calendar.js');
    const listIdx = chainEntries.indexOf('list.js');
    raffleModelIdx >= 0 && listSearchIdx > raffleModelIdx
        && listRightRailIdx > listSearchIdx && listHeaderIdx > listRightRailIdx
        && listFiltersIdx > listHeaderIdx && listCalendarIdx > listFiltersIdx
        && listIdx > listCalendarIdx
        ? pass('loader order: raffle-model → list/search → … → filters → calendar → list.js')
        : fail('loader list module order');
    const geoIdx = chainEntries.indexOf('create/geocode.js');
    const legacyCostsIdx = chainEntries.indexOf('create/legacy-costs.js');
    const legacyLocationIdx = chainEntries.indexOf('create/legacy-location.js');
    const legacyPreviewIdx = chainEntries.indexOf('create/legacy-preview.js');
    const legacySubmitIdx = chainEntries.indexOf('create/legacy-submit.js');
    const createIdx = chainEntries.indexOf('create.js');
    const stepBasicsIdx = chainEntries.indexOf('create/step-basics.js');
    const stepWhenIdx = chainEntries.indexOf('create/step-when.js');
    const stepPricingIdx = chainEntries.indexOf('create/step-pricing.js');
    const stepReviewIdx = chainEntries.indexOf('create/step-review.js');
    const raffleBuilderIdx = chainEntries.indexOf('create/raffle-builder.js');
    const submitIdx = chainEntries.indexOf('create/submit.js');
    const sheetIdx = chainEntries.indexOf('create/sheet.js');
    geoIdx >= 0 && legacyCostsIdx > geoIdx
        && legacyLocationIdx > legacyCostsIdx && legacyPreviewIdx > legacyLocationIdx
        && legacySubmitIdx > legacyPreviewIdx && createIdx > legacySubmitIdx
        && stepBasicsIdx > createIdx && stepWhenIdx > stepBasicsIdx
        && stepPricingIdx > stepWhenIdx && stepReviewIdx > stepPricingIdx
        && raffleBuilderIdx > stepReviewIdx && submitIdx > raffleBuilderIdx
        && sheetIdx > submitIdx
        ? pass('loader order: geocode → legacy-* → create → steps → raffle-builder → submit → sheet')
        : fail('loader geocode → legacy → create → steps → raffle-builder → submit → sheet order');
}

loaderJs.includes('document.write') && !loaderJs.includes('type="module"')
    ? pass('loader uses classic synchronous document.write (no module)')
    : fail('loader must use classic sync injection');

const prodDiff = fs.readFileSync(path.join(root, PROD_HTML), 'utf8');
const rehOnly = rehHtml.includes('events.rehearsal') || rehHtml.includes('REHEARSAL');
rehOnly
    ? pass('rehearsal HTML is distinguishable from production file')
    : fail('rehearsal HTML should be clearly labeled');

console.log('\n── Phase 5L.3 — production unchanged guard ───────────────────────────────');

const prodSnapshot = portalEventsScriptsFromHtml(prodHtml);
prodSnapshot[0] === '../js/portal/events/index.js' && prodSnapshot[prodSnapshot.length - 1] === '../js/portal/events/init.js'
    ? pass('production: index.js first, init.js last preserved')
    : fail('production load order contract broken');

console.log(failed
    ? `\nPhase 5L.3 rehearsal smoke: ${failed} FAIL(S), ${passed} pass`
    : `\nPhase 5L.3 rehearsal smoke: ALL ${passed} CHECKS PASSED`);
if (failures.length) failures.forEach((f) => console.log(`  - ${f}`));
process.exit(failed ? 1 : 0);
