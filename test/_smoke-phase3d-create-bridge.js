// ══════════════════════════════════════════════════════════════════
// Phase 3D static smoke test — create/sheet.js PortalEvents bridge
//
// Checks (60 total):
//   1.  File structure (IIFE, use strict, no export, file size)
//   2.  window.EventsCreate original global preserved
//   3.  window.PortalEvents.create bridge (Phase 3D new entries)
//   4.  Custom event: events:created
//   5.  Core internal functions still present
//   6.  Dependencies expected (supabaseClient, evtCurrentUser, etc.)
//   7.  portal/events.html invariants (no module mode; loader-aware load model)
//   8.  create.js + create/sheet.js in production load model
//   9.  File split safety (no orphaned new create/ files loaded)
//  10.  Phase 1 bridge regression
//  11.  Phase 2 bridges regression
//  12.  Phase 3A list bridge regression
//  13.  Phase 3B detail bridge regression
//  14.  Phase 3C manage bridge regression
//
// Run: node test/_smoke-phase3d-create-bridge.js
// ══════════════════════════════════════════════════════════════════
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const {
    parseClassicChain,
    isProductionLoaded,
    chainOrderOk,
    portalEventsHtmlScripts,
} = require('./_portal-events-classic-chain.js');

let passed = 0;
let failed = 0;
const failures = [];

function check(label, ok, detail) {
    if (ok) {
        console.log(`  ✓ ${label}`);
        passed++;
    } else {
        console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
        failed++;
        failures.push(label);
    }
}

const sheet  = read('js/portal/events/create/sheet.js');
const createJs = read('js/portal/events/create.js');
const geocodeJs = read('js/portal/events/create/geocode.js');
const stepBasicsJs = read('js/portal/events/create/step-basics.js');
const stepWhenJs = read('js/portal/events/create/step-when.js');
const stepPricingJs = read('js/portal/events/create/step-pricing.js');
const stepReviewJs = read('js/portal/events/create/step-review.js');
const raffleBuilderJs = read('js/portal/events/create/raffle-builder.js');
const events = read('portal/events.html');
const classicChain3d = parseClassicChain(ROOT);

// ── File structure ─────────────────────────────────────────────────────────
console.log('\n── js/portal/events/create/sheet.js — file structure ─────────────────────');

check('IIFE wrapper present ((function () {)',
    sheet.includes('(function () {'));

check("'use strict' present inside IIFE",
    sheet.includes("'use strict'"));

check('No native export statement (stays classic-script safe)',
    !(/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(sheet)));

check('File size reasonable (no accidental truncation)',
    sheet.length > 20000,
    `${sheet.length} chars`);
console.log(`  ℹ File length: ${sheet.length} chars`);

// ── window.EventsCreate (original global preserved) ───────────────────────
console.log('\n── create/sheet.js — window.EventsCreate (original global preserved) ──────');

check("window.EventsCreate = { open, close, isFlagOn } present",
    sheet.includes('window.EventsCreate = { open, close, isFlagOn }'));

check('window.EventsCreate.open referenced in source',
    sheet.includes('window.EventsCreate') && sheet.includes('open, close, isFlagOn'));

check('window.EventsCreate.close referenced in source',
    sheet.includes('close, isFlagOn'));

check('window.EventsCreate.isFlagOn present',
    sheet.includes('isFlagOn'));

check('function isFlagOn() present (always returns true)',
    sheet.includes('function isFlagOn()'));

// ── window.PortalEvents.create bridge (Phase 3D) ──────────────────────────
console.log('\n── create/sheet.js — window.PortalEvents.create bridge (Phase 3D) ─────────');

check('window.PortalEvents.create safe-init guard present',
    sheet.includes('window.PortalEvents.create = window.PortalEvents.create || {}'));

check('window.PortalEvents.create.open assigned',
    sheet.includes('window.PortalEvents.create.open = open'));

check('window.PortalEvents.create.close assigned',
    sheet.includes('window.PortalEvents.create.close = close'));

check('window.PortalEvents.create.isFlagOn assigned',
    sheet.includes('window.PortalEvents.create.isFlagOn = isFlagOn'));

check('window.PortalEvents safe seed guard present before create bridge',
    sheet.includes('window.PortalEvents = window.PortalEvents || {}'));

check('PortalEvents seed guard appears before PortalEvents.create assignment',
    sheet.indexOf('window.PortalEvents = window.PortalEvents || {}')
    < sheet.indexOf('window.PortalEvents.create = window.PortalEvents.create || {}'));

check('Phase 3D bridge placed after window.EventsCreate assignment',
    sheet.indexOf('window.PortalEvents.create = window.PortalEvents.create || {}')
    > sheet.indexOf('window.EventsCreate = { open, close, isFlagOn }'));

// ── Custom event dispatch ──────────────────────────────────────────────────
console.log('\n── create/sheet.js — custom event dispatch ───────────────────────────────');

check("'events:created' custom event present",
    sheet.includes("'events:created'"));

check("CustomEvent('events:created', ...) dispatch call present",
    sheet.includes("new CustomEvent('events:created'"));

// ── Core internal functions ────────────────────────────────────────────────
console.log('\n── create/sheet.js — core internal functions ─────────────────────────────');

const coreFns = [
    ['function open(',           'open (entry point)'],
    ['function close(',          'close'],
    ['function _ensureMounted(', '_ensureMounted (DOM injection)'],
    ['function _render(',        '_render (step renderer)'],
    ['function _validateStep(',  '_validateStep'],
    ['function _back(',          '_back'],
    ['function _next(',          '_next'],
    ['function _submit(',        '_submit (async Supabase insert)'],
    ['function _esc(',           '_esc (HTML escape helper)'],
    ['function _bindCreateStepsApi(', '_bindCreateStepsApi'],
    ['function _raffleApi(', '_raffleApi (orchestrator bridge to raffle module)'],
];
coreFns.forEach(([pattern, label]) => {
    check(`${label} present in sheet.js`, sheet.includes(pattern));
});

const movedFromSheet = [
    ['function _basicsHtml(', '_basicsHtml'],
    ['function _whenHtml(', '_whenHtml'],
    ['function _pricingHtml(', '_pricingHtml'],
    ['function _reviewHtml(', '_reviewHtml'],
    ['function _wireBasics(', '_wireBasics'],
    ['function _wireWhen(', '_wireWhen'],
    ['function _wirePricing(', '_wirePricing'],
    ['function _doGeocode(', '_doGeocode'],
    ['function _wireImageUpload(', '_wireImageUpload'],
    ['function _raffleBuilderHtml(', '_raffleBuilderHtml'],
    ['function _wireRaffleBuilder(', '_wireRaffleBuilder'],
    ['function _raffleReviewHtml(', '_raffleReviewHtml'],
    ['function _ensureRaffleConfig(', '_ensureRaffleConfig'],
    ['function _raffleModel(', '_raffleModel'],
];
movedFromSheet.forEach(([pattern, label]) => {
    check(`${label} removed from sheet.js (moved to step modules)`, !sheet.includes(pattern));
});

// ── External dependency references ─────────────────────────────────────────
console.log('\n── create/sheet.js — external dependencies ───────────────────────────────');

check("supabaseClient used in _submit (bare identifier)",
    sheet.includes('supabaseClient.from('));

check('raffle-builder.js uses window.EventsRaffleModel',
    raffleBuilderJs.includes('window.EventsRaffleModel'));

check('sheet.js delegates raffle validation/submit to EventsCreateRaffleBuilder',
    sheet.includes('EventsCreateRaffleBuilder') || sheet.includes('_raffleApi()'));

check("window.evtCurrentUser used for creator ID",
    sheet.includes('window.evtCurrentUser'));

check('when step uses window.evtGeocodeAddress (step-when.js)',
    stepWhenJs.includes('window.evtGeocodeAddress'));

check("events:created dispatch uses { event: data, status } detail",
    sheet.includes('{ event: data, status }'));

// ── create/geocode.js (Phase 5M.1.1) ──────────────────────────────────────
console.log('\n── js/portal/events/create/geocode.js — geocode module (5M.1.1) ─────────');

check('create/geocode.js IIFE wrapper present',
    geocodeJs.includes('(function ()'));

check("create/geocode.js 'use strict' present",
    geocodeJs.includes("'use strict'"));

check('create/geocode.js has no native export (classic-script safe)',
    !(/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(geocodeJs)));

check('create/geocode.js present in classic-chain-loader.js chain',
    classicChain3d && classicChain3d.includes('create/geocode.js'));

check('create/geocode.js loaded in production (HTML or classic-chain-loader)',
    isProductionLoaded(events, classicChain3d, '../js/portal/events/create/geocode.js'));

check('create/geocode.js defines evtGeocodeAddress',
    geocodeJs.includes('async function evtGeocodeAddress')
    || geocodeJs.includes('function evtGeocodeAddress'));

check('create/geocode.js assigns window.evtGeocodeAddress',
    geocodeJs.includes('window.evtGeocodeAddress = evtGeocodeAddress'));

check('create/geocode.js assigns window.evtExpandAddress',
    geocodeJs.includes('window.evtExpandAddress = evtExpandAddress'));

// ── create.js orchestrator (production chain) ─────────────────────────────
console.log('\n── js/portal/events/create.js — production chain + legacy create ──────────');

check('create.js present in classic-chain-loader.js chain',
    classicChain3d && classicChain3d.includes('create.js'));

check('create.js loaded in production (HTML or classic-chain-loader)',
    isProductionLoaded(events, classicChain3d, '../js/portal/events/create.js'));

check('load order: step-review → raffle-builder → create/sheet in classic chain',
    chainOrderOk(
        classicChain3d,
        'create/step-review.js',
        'create/raffle-builder.js',
        'create/sheet.js'
    ));

check('load order: create/geocode → create → step modules → raffle-builder → sheet',
    chainOrderOk(
        classicChain3d,
        'create/geocode.js',
        'create.js',
        'create/step-basics.js',
        'create/step-when.js',
        'create/step-pricing.js',
        'create/step-review.js',
        'create/raffle-builder.js',
        'create/sheet.js'
    ));

check('create.js does not define evtGeocodeAddress (moved to create/geocode.js)',
    !createJs.includes('async function evtGeocodeAddress')
    && !createJs.match(/function evtGeocodeAddress\s*\(/));

check('create.js uses window.evtGeocodeAddress for legacy location flow',
    createJs.includes('window.evtGeocodeAddress'));

check('create.js defines evtHandleCreate (legacy modal path)',
    createJs.includes('function evtHandleCreate') || createJs.includes('async function evtHandleCreate'));

check('create.js has no native export (classic-script safe)',
    !(/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(createJs)));

// ── portal/events.html invariants ─────────────────────────────────────────
console.log('\n── portal/events.html invariants ─────────────────────────────────────────');

check('create/sheet.js present in classic-chain-loader.js chain',
    classicChain3d && classicChain3d.includes('create/sheet.js'));

check('create/sheet.js loaded in production (HTML or classic-chain-loader)',
    isProductionLoaded(events, classicChain3d, '../js/portal/events/create/sheet.js'));

check('portal/events.html uses classic-chain-loader.js (3-tag production model)',
    events.includes('classic-chain-loader.js'));

check('create/sheet.js does NOT have type="module" in events.html',
    !events.match(/create\/sheet\.js[^"]*"[^>]*type="module"/));

check('No portal/events/* scripts use type="module" yet (correct)',
    !events.match(/<script[^>]+js\/portal\/events\/[^>]+type="module"/));

const portalScripts3d = portalEventsHtmlScripts(events);
check('init.js remains last among portal Events HTML script tags',
    portalScripts3d.length > 0
    && portalScripts3d[portalScripts3d.length - 1] === '../js/portal/events/init.js');

// ── Create step modules (Phase 5M.1.2) ────────────────────────────────────
console.log('\n── js/portal/events/create/step-*.js — sheet step modules (5M.1.2) ───────');

const stepModules = [
    ['create/step-basics.js', stepBasicsJs, 'basics'],
    ['create/step-when.js', stepWhenJs, 'when'],
    ['create/step-pricing.js', stepPricingJs, 'pricing'],
    ['create/step-review.js', stepReviewJs, 'review'],
];

stepModules.forEach(([rel, src, key]) => {
    check(`${rel} present in classic-chain-loader.js chain`,
        classicChain3d && classicChain3d.includes(rel));
    check(`${rel} loaded in production (HTML or classic-chain-loader)`,
        isProductionLoaded(events, classicChain3d, '../js/portal/events/' + rel));
    check(`${rel} registers EventsCreateSteps.${key}`,
        src.includes(`EventsCreateSteps.${key}`) && src.includes('html') && src.includes('wire'));
    check(`${rel} has no native export (classic-script safe)`,
        !(/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(src)));
});

check('step-basics.js wires banner and embed image upload',
    stepBasicsJs.includes('_wireImageUpload') && stepBasicsJs.includes('ecBannerDrop'));

check('step-pricing.js delegates raffle builder HTML to EventsCreateSteps',
    stepPricingJs.includes('raffleBuilderHtml'));

check('step-review.js delegates raffle review HTML to EventsCreateSteps',
    stepReviewJs.includes('raffleReviewHtml'));

check('sheet.js dispatches steps via EventsCreateSteps namespace',
    sheet.includes('EventsCreateSteps') && sheet.includes('steps.basics.html()'));

// ── Create raffle builder (Phase 5M.1.3) ──────────────────────────────────
console.log('\n── js/portal/events/create/raffle-builder.js — raffle builder (5M.1.3) ──');

check('create/raffle-builder.js IIFE wrapper present',
    raffleBuilderJs.includes('(function ()'));

check("create/raffle-builder.js 'use strict' present",
    raffleBuilderJs.includes("'use strict'"));

check('create/raffle-builder.js has no native export (classic-script safe)',
    !(/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(raffleBuilderJs)));

check('create/raffle-builder.js present in classic-chain-loader.js chain',
    classicChain3d && classicChain3d.includes('create/raffle-builder.js'));

check('create/raffle-builder.js loaded in production (HTML or classic-chain-loader)',
    isProductionLoaded(events, classicChain3d, '../js/portal/events/create/raffle-builder.js'));

check('create/raffle-builder.js assigns window.EventsCreateRaffleBuilder',
    raffleBuilderJs.includes('window.EventsCreateRaffleBuilder'));

check('raffle-builder.js defines builderHtml',
    raffleBuilderJs.includes('builderHtml') && raffleBuilderJs.includes('data-ec-raffle-add-category'));

check('raffle-builder.js defines wire and reviewHtml',
    raffleBuilderJs.includes('wire') && raffleBuilderJs.includes('reviewHtml'));

check('raffle-builder.js defines ensureRaffleConfig',
    raffleBuilderJs.includes('ensureRaffleConfig'));

check('sheet.js wires EventsCreateSteps raffle hooks from EventsCreateRaffleBuilder',
    sheet.includes('rb.builderHtml') && sheet.includes('rb.reviewHtml') && sheet.includes('rb.wire'));

// ── File split safety ─────────────────────────────────────────────────────
console.log('\n── File split safety — create/ sub-files in production chain ─────────────');

const createDir = path.join(ROOT, 'js/portal/events/create');
const EXPECTED_CREATE_FILES = [
    'geocode.js',
    'step-basics.js',
    'step-when.js',
    'step-pricing.js',
    'step-review.js',
    'raffle-builder.js',
    'sheet.js',
];
const createFiles = fs.readdirSync(createDir).filter(f => f.endsWith('.js'));

check('create/ contains expected step + geocode + sheet files',
    EXPECTED_CREATE_FILES.every(f => createFiles.includes(f)),
    `found: ${createFiles.join(', ')}`);

EXPECTED_CREATE_FILES.forEach(f => {
    check(`create/${f} in production load (not orphaned)`,
        isProductionLoaded(events, classicChain3d, '../js/portal/events/create/' + f));
});

// ── Phase 1 bridge regression ──────────────────────────────────────────────
console.log('\n── Phase 1 bridge (init.js) — regression check ───────────────────────────');

const init = read('js/portal/events/init.js');

check('window.PortalEvents.initEventsPage still present (Phase 1 bridge intact)',
    init.includes('window.PortalEvents.initEventsPage'));

check('Phase 1 duplicate-init guard still present in init.js',
    init.includes('_eventsPageInitialized'));

// ── Phase 2 bridges regression ────────────────────────────────────────────
console.log('\n── Phase 2 bridges — regression check ─────────────────────────────────────');

const constants   = read('js/portal/events/constants.js');
const raffleModel = read('js/portal/events/raffle-model.js');

check('window.PortalEvents.constants still present (Phase 2 constants bridge intact)',
    constants.includes('window.PortalEvents.constants'));

check('root.PortalEvents.raffleModel still present (Phase 2 raffle bridge intact)',
    raffleModel.includes('root.PortalEvents.raffleModel'));

check('root.EventsRaffleModel still present (primary classic global preserved)',
    raffleModel.includes('root.EventsRaffleModel'));

// ── Phase 3A regression ───────────────────────────────────────────────────
console.log('\n── Phase 3A bridge (list.js) — regression check ──────────────────────────');

const list = read('js/portal/events/list.js');

check('window.PortalEvents.list namespace still present (Phase 3A intact)',
    list.includes('window.PortalEvents.list'));

check('list.js still IIFE (Phase 3A structure intact)',
    list.includes('(function () {'));

// ── Phase 3B regression ───────────────────────────────────────────────────
console.log('\n── Phase 3B bridge (detail.js) — regression check ────────────────────────');

const detail = read('js/portal/events/detail.js');

check('window.PortalEvents.detail safe-init still present (Phase 3B intact)',
    detail.includes('window.PortalEvents.detail'));

check('detail.register function still present (Phase 3B intact)',
    detail.includes('detail.register = function'));

check('detail.js still IIFE (Phase 3B structure intact)',
    detail.includes('(function () {'));

// ── Phase 3C regression ───────────────────────────────────────────────────
console.log('\n── Phase 3C bridge (manage/sheet.js) — regression check ──────────────────');

const manage = read('js/portal/events/manage/sheet.js');

check('window.PortalEvents.manage safe-init still present (Phase 3C intact)',
    manage.includes('window.PortalEvents.manage = window.PortalEvents.manage || {}'));

check('window.PortalEvents.manage.open still present (Phase 3C intact)',
    manage.includes('window.PortalEvents.manage.open = open'));

check('window.PortalEvents.manage.close still present (Phase 3C intact)',
    manage.includes('window.PortalEvents.manage.close = close'));

check('window.EventsManage still preserved (Phase 3C original global)',
    manage.includes('window.EventsManage = { open, close, refreshRaffle }'));

// ── Summary ───────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 3D static smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    console.log('\nPhase 3D static smoke: NEEDS REVIEW');
    process.exit(1);
} else {
    console.log('\nPhase 3D static smoke: ALL PASS');
    process.exit(0);
}
