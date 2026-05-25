// ═══════════════════════════════════════════════════════════
// Phase 5L.1 / 5L.2 / 5L.3 Option C static smoke — load model + boot guard
//
// Freezes classic-script load model before any Phase 5L implementation.
// No runtime wiring; portal/events.html must stay classic-only.
//
// Run: node test/_smoke-phase5l-readiness.js
// ═══════════════════════════════════════════════════════════
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
let noted = 0;
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
function note(msg) {
    console.log(`  ○ ${msg}`);
    noted++;
}
function read(relPath) {
    return fs.readFileSync(path.join(root, relPath), 'utf8');
}
function lineCount(relPath) {
    return read(relPath).split(/\r?\n/).length;
}

const html = read('portal/events.html');
const indexJs = read('js/portal/events/index.js');
const initJs = read('js/portal/events/init.js');
const smoke5j = read('test/_smoke-phase5j-compat-exports.js');

const portalBlock = html.slice(html.indexOf('<!-- Events modules'));
const moduleSection = portalBlock.slice(0, portalBlock.indexOf('sw-register'));
const portalScripts = [...moduleSection.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)]
    .map((m) => m[1])
    .filter((s) => s.includes('portal/events'));

const portalEventsJsFiles = [];
function walkPortalEvents(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'compat') continue;
            walkPortalEvents(full);
        } else if (ent.name.endsWith('.js')) {
            portalEventsJsFiles.push(path.relative(root, full).replace(/\\/g, '/'));
        }
    }
}
walkPortalEvents(path.join(root, 'js/portal/events'));

const EXPECTED_PORTAL_SCRIPT_COUNT = 3;
const PRODUCTION_CHAIN_LOADER = '../js/portal/events/classic-chain-loader.js';

const DETAIL_PIPELINE_TAGS = [
    '../js/portal/events/team/chat.js',
    '../js/portal/events/team/tools.js',
    '../js/portal/events/detail/presentation.js',
    '../js/portal/events/detail/raffle-render.js',
    '../js/portal/events/detail/map-overlay.js',
    '../js/portal/events/detail/fragments.js',
    '../js/portal/events/detail/data.js',
    '../js/portal/events/detail/sections.js',
    '../js/portal/events/detail/post-render.js',
    '../js/portal/events/detail/template.js',
    '../js/portal/events/detail.js',
];

const COMPAT_SCRIPTS = [
    'js/portal/events/compat/window-exports.js',
    'js/portal/events/compat/inline-handlers.js',
    'js/portal/events/compat/external-globals.js',
];

const MONOLITHS = [
    'js/portal/events/list.js',
    'js/portal/events/manage/sheet.js',
    'js/portal/events/create/sheet.js',
];

console.log('\n── Phase 5L.1 — HTML / classic script order ──────────────────────────────');

portalScripts.length === EXPECTED_PORTAL_SCRIPT_COUNT
    ? pass(`portal/events.html loads ${EXPECTED_PORTAL_SCRIPT_COUNT} portal Events classic scripts`)
    : fail(`expected ${EXPECTED_PORTAL_SCRIPT_COUNT} portal Events scripts`, `found ${portalScripts.length}`);

/<script[^>]+src="\.\.\/js\/portal\/events\/[^"]+\.js"[^>]*type="module"/.test(html)
    ? fail('portal Events scripts must not use type="module" yet (5L not started)')
    : pass('no type="module" on portal Events script tags');

portalScripts[portalScripts.length - 1] === '../js/portal/events/init.js'
    ? pass('init.js is last among portal Events scripts')
    : fail('init.js must be last', `last: ${portalScripts[portalScripts.length - 1]}`);

portalScripts[0] === '../js/portal/events/index.js'
    ? pass('index.js is first among portal Events scripts')
    : fail('index.js must be first', `first: ${portalScripts[0]}`);

!/\binitEventsPage\s*\(/.test(indexJs.replace(/\/\/[^\n]*/g, ''))
    ? pass('index.js does not call initEventsPage()')
    : fail('index.js must not boot initEventsPage yet');

indexJs.includes('window.PortalEvents = window.PortalEvents || {}')
    ? pass('index.js remains namespace shell only')
    : fail('index.js must seed PortalEvents');

portalScripts[1] === PRODUCTION_CHAIN_LOADER
    ? pass('production uses classic-chain-loader.js as middle tag')
    : fail('middle tag must be classic-chain-loader.js', portalScripts[1]);

!portalScripts.some((s) => s.includes('rehearsal/'))
    ? pass('production HTML does not load rehearsal/ loader path')
    : fail('production must use js/portal/events/classic-chain-loader.js not rehearsal/');

/<script[^>]+src="\.\.\/js\/portal\/events\/[^"]+\.js"[^>]*type="module"/.test(html)
    ? fail('no module-only single-entry loader without classic chain')
    : portalScripts.length === 3 && portalScripts[0].includes('index.js')
    ? pass('production consolidated to 3-tag classic chain (not module-only)')
    : fail('unexpected production load model');

COMPAT_SCRIPTS.forEach((rel) => {
    const htmlPath = rel.replace('js/portal/events/', '../js/portal/events/');
    !portalScripts.some((s) => s.includes('compat/'))
        ? pass(`compat not loaded: ${rel}`)
        : fail(`portal/events.html must not load ${rel}`);
});

console.log('\n── Phase 5L.3 — classic-chain-loader middle order ────────────────────────');

const loaderJs = read('js/portal/events/classic-chain-loader.js');
const chainMatch = loaderJs.match(/var chain = \[([\s\S]*?)\];/);
if (!chainMatch) {
    fail('classic-chain-loader.js must define chain array');
} else {
    const chainPaths = [...chainMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const detailSlice = DETAIL_PIPELINE_TAGS.map((t) => t.replace('../js/portal/events/', ''));
    const teamChatIdx = chainPaths.indexOf('team/chat.js');
    const presentationIdx = chainPaths.indexOf('detail/presentation.js');
    const postRenderIdx = chainPaths.indexOf('detail/post-render.js');
    const templateIdx = chainPaths.indexOf('detail/template.js');
    const detailIdx = chainPaths.indexOf('detail.js');
    const createGeoIdx = chainPaths.indexOf('create/geocode.js');
    const legacyCostsIdx = chainPaths.indexOf('create/legacy-costs.js');
    const legacyLocationIdx = chainPaths.indexOf('create/legacy-location.js');
    const legacyPreviewIdx = chainPaths.indexOf('create/legacy-preview.js');
    const legacySubmitIdx = chainPaths.indexOf('create/legacy-submit.js');
    const createIdx = chainPaths.indexOf('create.js');
    const stepBasicsIdx = chainPaths.indexOf('create/step-basics.js');
    const stepWhenIdx = chainPaths.indexOf('create/step-when.js');
    const stepPricingIdx = chainPaths.indexOf('create/step-pricing.js');
    const stepReviewIdx = chainPaths.indexOf('create/step-review.js');
    const raffleBuilderIdx = chainPaths.indexOf('create/raffle-builder.js');
    const submitIdx = chainPaths.indexOf('create/submit.js');
    const createSheetIdx = chainPaths.indexOf('create/sheet.js');
    const raffleModelIdx = chainPaths.indexOf('raffle-model.js');
    const listSearchIdx = chainPaths.indexOf('list/search.js');
    const listRightRailIdx = chainPaths.indexOf('list/right-rail.js');
    const listHeaderIdx = chainPaths.indexOf('list/header.js');
    const listIdx = chainPaths.indexOf('list.js');
    const listFiltersIdx = chainPaths.indexOf('list/filters.js');
    const listCalendarIdx = chainPaths.indexOf('list/calendar.js');
    chainPaths.length === 43
        ? pass('classic-chain-loader injects 43 middle scripts')
        : fail('loader chain must have 43 entries', `found ${chainPaths.length}`);
    raffleModelIdx >= 0 && listSearchIdx > raffleModelIdx
        && listRightRailIdx > listSearchIdx && listHeaderIdx > listRightRailIdx
        && listFiltersIdx > listHeaderIdx && listCalendarIdx > listFiltersIdx
        && listIdx > listCalendarIdx
        ? pass('loader order: raffle-model → list/search → … → filters → calendar → list.js')
        : fail('loader list module order');
    createGeoIdx >= 0 && legacyCostsIdx > createGeoIdx
        && legacyLocationIdx > legacyCostsIdx && legacyPreviewIdx > legacyLocationIdx
        && legacySubmitIdx > legacyPreviewIdx && createIdx > legacySubmitIdx
        && stepBasicsIdx > createIdx && stepWhenIdx > stepBasicsIdx
        && stepPricingIdx > stepWhenIdx && stepReviewIdx > stepPricingIdx
        && raffleBuilderIdx > stepReviewIdx && submitIdx > raffleBuilderIdx
        && createSheetIdx > submitIdx
        ? pass('loader order: geocode → legacy-* → create → steps → raffle-builder → submit → sheet')
        : fail('loader geocode → legacy → create → steps → raffle-builder → submit → sheet order');
    teamChatIdx >= 0 && presentationIdx > teamChatIdx
        ? pass('loader order: team before detail/presentation')
        : fail('loader team → detail pipeline order');
    detailSlice.every((rel) => chainPaths.includes(rel))
        ? pass('loader chain includes full detail pipeline scripts')
        : fail('loader missing detail pipeline script');
    postRenderIdx >= 0 && templateIdx > postRenderIdx && detailIdx > templateIdx
        ? pass('loader order: post-render → template → detail.js')
        : fail('loader post-render → template → detail.js order');
}

console.log('\n── Phase 5L.2 — init.js boot guard (idempotent) ──────────────────────────');

initJs.includes('async function initEventsPage')
    ? pass('init.js defines initEventsPage')
    : fail('init.js must define initEventsPage');

initJs.includes('let _eventsPageInitialized = false')
    ? pass('init.js has module _eventsPageInitialized guard flag')
    : fail('init.js must declare _eventsPageInitialized');

/if\s*\(\s*_eventsPageInitialized\s*\)\s*return/.test(initJs)
    ? pass('initEventsPage returns early when already initialized')
    : fail('initEventsPage must guard on _eventsPageInitialized');

/initEventsPage[\s\S]*_eventsPageInitialized\s*=\s*true[\s\S]*window\._eventsPageInitialized\s*=\s*true/.test(initJs)
    ? pass('guard flags set before await checkAuth (sync gate)')
    : fail('_eventsPageInitialized must be set before first await');

/initEventsPage[\s\S]*_eventsPageInitialized\s*=\s*true[\s\S]*evtSetupListeners/.test(initJs)
    && !/evtSetupListeners[\s\S]*_eventsPageInitialized\s*=\s*true/.test(initJs)
    ? pass('duplicate guard runs before evtSetupListeners / heavy boot')
    : fail('init guard must precede evtSetupListeners');

initJs.includes('window.PortalEvents.initEventsPage = initEventsPage')
    ? pass('PortalEvents.initEventsPage points to initEventsPage')
    : fail('PortalEvents.initEventsPage assignment missing');

initJs.includes('document.addEventListener(\'DOMContentLoaded\', initEventsPage)')
    || initJs.includes('document.addEventListener("DOMContentLoaded", initEventsPage)')
    ? pass('DOMContentLoaded → initEventsPage (same guarded function)')
    : fail('DOMContentLoaded boot path missing');

initJs.includes('_eventsListenersBound')
    && /function evtSetupListeners[\s\S]*if\s*\(\s*_eventsListenersBound\s*\)\s*return/.test(initJs)
    ? pass('evtSetupListeners binds DOM listeners once')
    : fail('evtSetupListeners must guard duplicate listener registration');

initJs.includes('_eventsPopstateListenerBound')
    && /_eventsPopstateListenerBound/.test(initJs)
    && /addEventListener\(\s*['"]popstate['"]/.test(initJs)
    ? pass('popstate listener bound once')
    : fail('popstate must not register on duplicate init');

!/document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*async/.test(initJs)
    ? pass('no duplicate anonymous DOMContentLoaded boot handler')
    : fail('avoid anonymous DOMContentLoaded handlers');

console.log('\n── Phase 5L.1 — Phase 5J export smoke prerequisite ───────────────────────');

fs.existsSync(path.join(root, 'test/_smoke-phase5j-compat-exports.js'))
    ? pass('test/_smoke-phase5j-compat-exports.js exists')
    : fail('5J compat export smoke missing — run 5J.1 first');

[
    ['compat/window-exports.js', '5J checks dormant compat'],
    ['installWindowExports', '5J no installer in HTML'],
    ['evtLoadDetailContext', '5J detail/data export'],
    ['evtBuildDetailTemplate', '5J template export'],
    ['evtRunDetailPostRenderUi', '5J post-render export'],
    ['evtOpenTeamToolsPanel', '5J team export'],
    ['PortalEvents.initEventsPage', '5J init barrel'],
].forEach(([needle, label]) => {
    smoke5j.includes(needle) ? pass(`5J smoke covers: ${label}`) : fail(`5J smoke must cover ${label}`);
});

console.log('\n── Phase 5L.1 — large monolith awareness (info) ──────────────────────────');

MONOLITHS.forEach((rel) => {
    fs.existsSync(path.join(root, rel))
        ? note(`${rel} present (~${lineCount(rel)} lines) — not split in 5L.1`)
        : fail(`monolith file missing: ${rel}`);
});

console.log('\n── Phase 5L.1 — compat dormant (post–5L.3 Option C) ────────────────────────');

const strayCompatCalls = portalEventsJsFiles.filter((rel) => {
    const body = read(rel);
    return /\binstallWindowExports\s*\(/.test(body) || /\binstallInlineHandlers\s*\(/.test(body);
});
strayCompatCalls.length === 0
    ? pass(`no compat installer calls in ${portalEventsJsFiles.length} loaded portal scripts`)
    : fail('compat installers invoked from loaded scripts', strayCompatCalls.join(', '));

fs.existsSync(path.join(root, 'js/portal/events/compat/window-exports.js'))
    && read('js/portal/events/compat/window-exports.js').includes('installWindowExports')
    ? pass('compat/window-exports.js exists (dormant on disk)')
    : fail('compat/window-exports.js missing');

!html.includes('bootstrap') && !portalScripts.some((s) => /events\/bootstrap|events\/main\.js|type="module"/i.test(s))
    ? pass('no module-entry bootstrap script in portal/events.html')
    : fail('unexpected module-entry bootstrap in HTML');

console.log('\n═══════════════════════════════════════════════════════════');
if (failed === 0) {
    console.log(`Phase 5L readiness smoke: ALL ${passed} CHECKS PASSED${noted ? ` (${noted} noted)` : ''}`);
    process.exit(0);
}
console.log(`Phase 5L readiness smoke: ${failed} FAIL(S), ${passed} pass${noted ? `, ${noted} noted` : ''}`);
failures.forEach((f) => console.log(`  - ${f}`));
process.exit(1);
