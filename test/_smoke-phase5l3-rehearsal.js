// ═══════════════════════════════════════════════════════════
// Phase 5L.3 Option B — rehearsal harness static smoke
//
// Validates portal/events.rehearsal.html consolidation experiment
// production portal/events.html uses single events.bundle.js (5L.4).
//
// Run: node test/_smoke-phase5l3-rehearsal.js
// ═══════════════════════════════════════════════════════════
'use strict';

const fs = require('fs');
const path = require('path');
const { eventsHtmlBlockStart } = require('./_portal-events-classic-chain.js');
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
    const start = eventsHtmlBlockStart(html);
    if (start < 0) return [];
    const portalBlock = html.slice(start);
    const moduleSection = portalBlock.slice(0, portalBlock.indexOf('sw-register'));
    return [...moduleSection.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)]
        .map((m) => m[1])
        .filter((s) => s.includes('portal/events'));
}

const PROD_HTML = 'pages/portal/events.html';
const REH_HTML = 'pages/portal/events.rehearsal.html';
const PROD_COUNT = 1;
const REH_COUNT = 1;
const BUNDLE_TAG = '../js/portal/events/events.bundle.js';
const MAIN = 'js/portal/events/main.js';

const prodHtml = read(PROD_HTML);
const rehHtml = read(REH_HTML);
const mainJs = read(MAIN);

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

prodScripts[0].includes('events.bundle.js') && rehScripts[0].includes('events.bundle.js')
    ? pass('production and rehearsal both load events.bundle.js')
    : fail('prod/rehearsal must use events.bundle.js', `prod=${prodScripts[0]} reh=${rehScripts[0]}`);

!rehHtml.includes('compat/window-exports') && !rehHtml.includes('compat/inline-handlers')
    ? pass('rehearsal: compat scripts not in HTML')
    : fail('rehearsal must not load compat installers');

!prodHtml.includes('compat/window-exports') && !prodHtml.includes('rehearsal/classic-chain-loader')
    ? pass('production: no compat or rehearsal loader in portal/events.html')
    : fail('production HTML must not reference compat or rehearsal loader');

fs.existsSync(path.join(root, MAIN))
    ? pass('main.js manifest exists')
    : fail('main.js missing');

const chainEntries = [...mainJs.matchAll(/import\s+['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]).filter((p) => p !== 'index.js' && p !== 'init.js');
if (!chainEntries.length) {
    fail('main.js must list portal/events imports');
} else {
    const scrapbookIdx = chainEntries.indexOf('detail/scrapbook.js');
    const manageShellIdx = chainEntries.indexOf('manage/shell.js');
    const manageOverviewIdx = chainEntries.indexOf('manage/overview.js');
    const manageSheetIdx = chainEntries.indexOf('manage/sheet.js');
    const manageImagesIdx = chainEntries.indexOf('manage/images.js');
    const manageDocsIdx = chainEntries.indexOf('manage/docs.js');
    const manageRsvpsIdx = chainEntries.indexOf('manage/rsvps.js');
    const manageMoneyIdx = chainEntries.indexOf('manage/money.js');
    const manageCompIdx = chainEntries.indexOf('manage/competition.js');
    const managePartIdx = chainEntries.indexOf('manage/participation.js');
    const manageRaffleIdx = chainEntries.indexOf('manage/raffle.js');
    const manageDangerIdx = chainEntries.indexOf('manage/danger.js');
    const globalReexportsIdx = chainEntries.indexOf('compat/global-reexports.js');
    chainEntries.length === 55
        ? pass(`main.js lists ${chainEntries.length} middle imports (production order)`)
        : fail('main.js must have 55 middle imports', `found ${chainEntries.length}`);
    const raffleModelIdx = chainEntries.indexOf('core/raffle-model.js');
    const listSearchIdx = chainEntries.indexOf('list/search.js');
    const listRightRailIdx = chainEntries.indexOf('list/right-rail.js');
    const listHeaderIdx = chainEntries.indexOf('list/header.js');
    const listFiltersIdx = chainEntries.indexOf('list/filters.js');
    const listCalendarIdx = chainEntries.indexOf('list/calendar.js');
    const listHeroRailsIdx = chainEntries.indexOf('list/hero-rails.js');
    const listBucketsIdx = chainEntries.indexOf('list/buckets.js');
    const listIdx = chainEntries.indexOf('list/shell.js');
    raffleModelIdx >= 0 && listSearchIdx > raffleModelIdx
        && listRightRailIdx > listSearchIdx && listHeaderIdx > listRightRailIdx
        && listFiltersIdx > listHeaderIdx && listCalendarIdx > listFiltersIdx
        && listHeroRailsIdx > listCalendarIdx && listBucketsIdx > listHeroRailsIdx
        && listIdx > listBucketsIdx
        ? pass('loader order: raffle-model → list/search → … → hero-rails → buckets → list/shell.js')
        : fail('loader list module order');
    scrapbookIdx >= 0 && manageShellIdx > scrapbookIdx
        && manageOverviewIdx > manageShellIdx
        && manageImagesIdx > manageOverviewIdx && manageDocsIdx > manageImagesIdx
        && manageRsvpsIdx > manageDocsIdx && manageMoneyIdx > manageRsvpsIdx
        && manageCompIdx > manageMoneyIdx
        && managePartIdx > manageCompIdx && manageRaffleIdx > managePartIdx
        && manageDangerIdx > manageRaffleIdx && globalReexportsIdx > manageDangerIdx
        && manageSheetIdx > globalReexportsIdx
        ? pass('loader order: … → danger → global-reexports → sheet')
        : fail('loader manage module order');
    const geoIdx = chainEntries.indexOf('create/geocode.js');
    const legacyCostsIdx = chainEntries.indexOf('create/legacy-costs.js');
    const legacyLocationIdx = chainEntries.indexOf('create/legacy-location.js');
    const legacyPreviewIdx = chainEntries.indexOf('create/legacy-preview.js');
    const legacySubmitIdx = chainEntries.indexOf('create/legacy-submit.js');
    const stepBasicsIdx = chainEntries.indexOf('create/step-basics.js');
    const stepWhenIdx = chainEntries.indexOf('create/step-when.js');
    const stepPricingIdx = chainEntries.indexOf('create/step-pricing.js');
    const stepReviewIdx = chainEntries.indexOf('create/step-review.js');
    const raffleBuilderIdx = chainEntries.indexOf('create/raffle-builder.js');
    const submitIdx = chainEntries.indexOf('create/submit.js');
    const sheetIdx = chainEntries.indexOf('create/sheet.js');
    geoIdx >= 0 && legacyCostsIdx > geoIdx
        && legacyLocationIdx > legacyCostsIdx && legacyPreviewIdx > legacyLocationIdx
        && legacySubmitIdx > legacyPreviewIdx && stepBasicsIdx > legacySubmitIdx
        && stepWhenIdx > stepBasicsIdx
        && stepPricingIdx > stepWhenIdx && stepReviewIdx > stepPricingIdx
        && raffleBuilderIdx > stepReviewIdx && submitIdx > raffleBuilderIdx
        && sheetIdx > submitIdx
        ? pass('loader order: geocode → legacy-* → steps → raffle-builder → submit → sheet')
        : fail('loader geocode → legacy → steps → raffle-builder → submit → sheet order');
}

!fs.existsSync(path.join(root, 'js/portal/events/classic-chain-loader.js'))
    ? pass('classic-chain-loader removed (main.js is manifest)')
    : fail('remove classic-chain-loader.js; use main.js only');
mainJs.includes("import './init.js'")
    ? pass('main.js is ESM entry with init last')
    : fail('main.js must import init.js');

const prodDiff = fs.readFileSync(path.join(root, PROD_HTML), 'utf8');
const rehOnly = rehHtml.includes('events.rehearsal') || rehHtml.includes('REHEARSAL');
rehOnly
    ? pass('rehearsal HTML is distinguishable from production file')
    : fail('rehearsal HTML should be clearly labeled');

console.log('\n── Phase 5L.3 — production unchanged guard ───────────────────────────────');

const prodSnapshot = portalEventsScriptsFromHtml(prodHtml);
prodSnapshot.length === 1 && prodSnapshot[0].includes('events.bundle.js')
    ? pass('production: single bundle tag preserved')
    : fail('production load order contract broken');

console.log(failed
    ? `\nPhase 5L.3 rehearsal smoke: ${failed} FAIL(S), ${passed} pass`
    : `\nPhase 5L.3 rehearsal smoke: ALL ${passed} CHECKS PASSED`);
if (failures.length) failures.forEach((f) => console.log(`  - ${f}`));
process.exit(failed ? 1 : 0);
