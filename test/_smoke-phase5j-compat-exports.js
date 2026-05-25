// ═══════════════════════════════════════════════════════════
// Phase 5J.1 static smoke — compat / export inventory
//
// Freezes post–5I export surfaces; confirms compat scripts stay dormant.
// No runtime wiring; portal/events.html must not load compat/*.
//
// Run: node test/_smoke-phase5j-compat-exports.js
// ═══════════════════════════════════════════════════════════
'use strict';

const fs = require('fs');
const path = require('path');
const { portalEventsHtmlScripts } = require('./_portal-events-classic-chain.js');
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
function fileExists(relPath) {
    return fs.existsSync(path.join(root, relPath));
}

const html = read('portal/events.html');
const detail = read('js/portal/events/detail.js');
const initJs = read('js/portal/events/init.js');
const globalReexportsJs = read('js/portal/events/compat/global-reexports.js');
const dataJs = read('js/portal/events/detail/data.js');
const sectionsJs = read('js/portal/events/detail/sections.js');
const templateJs = read('js/portal/events/detail/template.js');
const postRenderJs = read('js/portal/events/detail/post-render.js');
const mapOverlayJs = read('js/portal/events/detail/map-overlay.js');
const fragmentsJs = read('js/portal/events/detail/fragments.js');
const presentationJs = read('js/portal/events/detail/presentation.js');
const raffleRenderJs = read('js/portal/events/detail/raffle-render.js');
const teamToolsJs = read('js/portal/events/team/tools.js');
const teamChatJs = read('js/portal/events/team/chat.js');
const windowExportsJs = read('js/portal/events/compat/window-exports.js');
const inlineHandlersJs = read('js/portal/events/compat/inline-handlers.js');
const externalGlobalsJs = read('js/portal/events/compat/external-globals.js');

const handlerSources = [
    detail,
    templateJs,
    sectionsJs,
    raffleRenderJs,
    teamToolsJs,
    teamChatJs,
    postRenderJs,
].join('\n');

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

console.log('\n── Phase 5J.1 — HTML / compat dormant ────────────────────────────────────');

const compatScripts = [
    'js/portal/events/compat/window-exports.js',
    'js/portal/events/compat/inline-handlers.js',
    'js/portal/events/compat/external-globals.js',
];

compatScripts.forEach((rel) => {
    !html.includes(rel)
        ? pass(`portal/events.html does not load ${rel}`)
        : fail(`portal/events.html must not load ${rel}`);
});

['installWindowExports', 'installInlineHandlers', 'externalGlobals'].forEach((sym) => {
    !html.includes(sym)
        ? pass(`portal/events.html does not reference ${sym}`)
        : fail(`portal/events.html must not reference ${sym}`);
});

/<script[^>]+src="\.\.\/js\/portal\/events\/[^"]+\.js"[^>]*type="module"/.test(html)
    ? fail('portal Events scripts must not use type="module" yet')
    : pass('no type="module" on portal Events scripts');

const portalScripts = portalEventsHtmlScripts(html);

portalScripts.length === 1 && portalScripts[0].includes('events.bundle.js')
    ? pass('production loads single events.bundle.js before sw-register')
    : fail('portal/events.html must load events.bundle.js only', portalScripts.join(', '));

const bundleJs = fileExists('js/portal/events/events.bundle.js')
    ? read('js/portal/events/events.bundle.js')
    : '';
bundleJs.includes('document.addEventListener(\'DOMContentLoaded\', initEventsPage)')
    || bundleJs.includes('document.addEventListener("DOMContentLoaded", initEventsPage)')
    ? pass('bundle registers DOMContentLoaded → initEventsPage')
    : fail('bundle must include init.js tail; run npm run build:events');

console.log('\n── Phase 5J.1 — compat files present but dormant ─────────────────────────');

compatScripts.forEach((rel) => {
    fileExists(rel) ? pass(`${rel} exists`) : fail(`${rel} missing`);
});

windowExportsJs.includes('function installWindowExports')
    ? pass('window-exports.js defines installWindowExports')
    : fail('window-exports.js must define installWindowExports');

inlineHandlersJs.includes('function installInlineHandlers')
    ? pass('inline-handlers.js defines installInlineHandlers')
    : fail('inline-handlers.js must define installInlineHandlers');

externalGlobalsJs.includes('PortalEvents.externalGlobals')
    ? pass('external-globals.js exposes PortalEvents.externalGlobals')
    : fail('external-globals.js must expose PortalEvents.externalGlobals');

const strayCompatCalls = portalEventsJsFiles.filter((rel) => {
    const body = read(rel);
    return /\binstallWindowExports\s*\(/.test(body) || /\binstallInlineHandlers\s*\(/.test(body);
});
strayCompatCalls.length === 0
    ? pass(`no installWindowExports/installInlineHandlers calls in ${portalEventsJsFiles.length} loaded portal scripts`)
    : fail('loaded portal scripts must not invoke compat installers', strayCompatCalls.join(', '));

console.log('\n── Phase 5J.1 — detail pipeline owner exports ────────────────────────────');

[
    [dataJs, 'window.evtLoadDetailContext = evtLoadDetailContext', 'detail/data.js assigns evtLoadDetailContext'],
    [dataJs, 'PortalEvents.detail.data', 'detail/data.js PortalEvents.detail.data'],
    [dataJs, 'loadContext: evtLoadDetailContext', 'detail/data.js data.loadContext'],
    [sectionsJs, 'window.evtBuildDetailRsvpSectionHtml = evtBuildDetailRsvpSectionHtml', 'sections.js evtBuildDetailRsvpSectionHtml'],
    [sectionsJs, 'window.evtBuildDetailRaffleSectionHtml = evtBuildDetailRaffleSectionHtml', 'sections.js evtBuildDetailRaffleSectionHtml'],
    [sectionsJs, 'window.evtBuildDetailShareCardHtml = evtBuildDetailShareCardHtml', 'sections.js evtBuildDetailShareCardHtml'],
    [sectionsJs, 'PortalEvents.detail.sections', 'sections.js PortalEvents.detail.sections'],
    [templateJs, 'window.evtBuildDetailTemplate = evtBuildDetailTemplate', 'template.js evtBuildDetailTemplate'],
    [templateJs, 'PortalEvents.detail.template', 'template.js PortalEvents.detail.template'],
    [templateJs, 'build: evtBuildDetailTemplate', 'template.js template.build'],
    [postRenderJs, 'window.evtRunDetailPostRenderBasics = evtRunDetailPostRenderBasics', 'post-render runBasics'],
    [postRenderJs, 'window.evtRenderDetailQrCanvases = evtRenderDetailQrCanvases', 'post-render renderQrCanvases'],
    [postRenderJs, 'window.evtInitDetailInlineMaps = evtInitDetailInlineMaps', 'post-render initInlineMaps'],
    [postRenderJs, 'window.evtRunDetailPostRenderUi = evtRunDetailPostRenderUi', 'post-render runUi'],
    [postRenderJs, 'PortalEvents.detail.postRender', 'post-render PortalEvents.detail.postRender'],
    [mapOverlayJs, 'window.evtOpenFullscreenMap = evtOpenFullscreenMap', 'map-overlay evtOpenFullscreenMap'],
    [mapOverlayJs, 'window.evtCloseFullscreenMap = evtCloseFullscreenMap', 'map-overlay evtCloseFullscreenMap'],
    [mapOverlayJs, 'PortalEvents.detail.mapOverlay', 'map-overlay PortalEvents.detail.mapOverlay'],
    [fragmentsJs, 'window.evtEdCard = card', 'fragments evtEdCard'],
    [fragmentsJs, 'window.evtEdSectionHead = sectionHead', 'fragments evtEdSectionHead'],
    [fragmentsJs, 'PortalEvents.detail.fragments', 'fragments PortalEvents.detail.fragments'],
    [presentationJs, 'window.evtOpenLightbox = evtOpenLightbox', 'presentation evtOpenLightbox'],
    [presentationJs, 'PortalEvents.detail.presentation', 'presentation PortalEvents.detail.presentation'],
    [raffleRenderJs, 'window.evtDetailRaffleConfig = evtDetailRaffleConfig', 'raffle-render evtDetailRaffleConfig'],
    [raffleRenderJs, 'window.evtRaffleLockedDesktopHtml = evtRaffleLockedDesktopHtml', 'raffle-render evtRaffleLockedDesktopHtml'],
    [raffleRenderJs, 'PortalEvents.detail.raffleRender', 'raffle-render PortalEvents.detail.raffleRender'],
].forEach(([src, needle, label]) => {
    src.includes(needle) ? pass(label) : fail(label, `missing: ${needle}`);
});

console.log('\n── Phase 5J.1 — detail.js bridges ────────────────────────────────────────');

[
    ['detail.loadContext = window.evtLoadDetailContext', 'detail.loadContext bridge'],
    ['detail.buildTemplate = window.evtBuildDetailTemplate', 'detail.buildTemplate bridge'],
    ['detail.runPostRenderUi = window.evtRunDetailPostRenderUi', 'detail.runPostRenderUi bridge'],
    ['detail.renderQrCanvases = window.evtRenderDetailQrCanvases', 'detail.renderQrCanvases bridge'],
    ['detail.initInlineMaps = window.evtInitDetailInlineMaps', 'detail.initInlineMaps bridge'],
    ['detail.openTeamToolsPanel  = window.evtOpenTeamToolsPanel', 'detail.openTeamToolsPanel bridge'],
    ['detail.openTeamChat        = window.evtOpenTeamChat', 'detail.openTeamChat bridge'],
    ['detail.openFullscreenMap   = window.evtOpenFullscreenMap', 'detail.openFullscreenMap bridge'],
    ['detail.template = window.PortalEvents.detail.template', 'detail.template nested alias'],
    ['detail.postRender = window.PortalEvents.detail.postRender', 'detail.postRender nested alias'],
    ['detail.sections = window.PortalEvents.detail.sections', 'detail.sections nested alias'],
    ['detail.data = window.PortalEvents.detail.data', 'detail.data nested alias'],
].forEach(([needle, label]) => {
    detail.includes(needle) ? pass(label) : fail(label, `missing: ${needle}`);
});

detail.includes('async function evtOpenDetail')
    ? pass('detail.js defines async function evtOpenDetail')
    : fail('detail.js must define evtOpenDetail');

detail.includes('window.evtOpenDetail')
    ? pass('window.evtOpenDetail assigned')
    : fail('window.evtOpenDetail missing');

detail.includes('detail.register')
    ? pass('detail.register present')
    : fail('detail.register missing');

console.log('\n── Phase 5J.1 — team exports ─────────────────────────────────────────────');

[
    [teamToolsJs, 'window.evtOpenTeamToolsPanel = openTeamToolsPanel', 'team/tools evtOpenTeamToolsPanel'],
    [teamToolsJs, 'window.evtInitBottomNav = initBottomNav', 'team/tools evtInitBottomNav'],
    [teamToolsJs, 'PortalEvents.team.tools', 'team/tools PortalEvents.team.tools'],
    [teamChatJs, 'window.evtOpenTeamChat = open', 'team/chat evtOpenTeamChat'],
    [teamChatJs, 'window.evtSendTeamChatMessage = send', 'team/chat evtSendTeamChatMessage'],
    [teamChatJs, 'PortalEvents.team.chat', 'team/chat PortalEvents.team.chat'],
].forEach(([src, needle, label]) => {
    src.includes(needle) ? pass(label) : fail(label);
});

console.log('\n── Phase 5J.1 — global-reexports + init.js ───────────────────────────────');

[
    ["exp('evtHandleRsvp'", 'global-reexports evtHandleRsvp'],
    ["exp('evtHandleRaffleEntry'", 'global-reexports evtHandleRaffleEntry'],
    ["exp('evtOpenScanner'", 'global-reexports evtOpenScanner'],
    ["exp('evtNavigateToEvent'", 'global-reexports evtNavigateToEvent'],
    ["exp('evtNavigateToList'", 'global-reexports evtNavigateToList'],
].forEach(([needle, label]) => {
    globalReexportsJs.includes(needle) ? pass(label) : fail(label);
});

initJs.includes('window.PortalEvents.initEventsPage = initEventsPage')
    ? pass('PortalEvents.initEventsPage in init.js')
    : fail('PortalEvents.initEventsPage missing from init.js');

initJs.includes('compat/global-reexports.js')
    ? pass('init.js documents global-reexports for evt* onclick globals')
    : fail('init.js should reference compat/global-reexports.js');

console.log('\n── Phase 5J.1 — hard-required inline handler strings ─────────────────────');

const INLINE_HANDLERS = [
    'evtHandleRsvp',
    'evtHandleRaffleEntry',
    'evtHandleFreeRaffleEntry',
    'evtOpenTeamToolsPanel',
    'evtOpenLightbox',
    'evtOpenFullscreenMap',
    'evtPostComment',
    'evtCopyShareUrl',
    'evtDownloadIcs',
    'EventsManage.open',
    'evtJoinWaitlist',
    'evtLeaveWaitlist',
    'evtClaimWaitlistSpot',
    'evtRequestGraceRefund',
    'evtNavigateToEvent',
    'evtOpenDetail',
];

INLINE_HANDLERS.forEach((name) => {
    handlerSources.includes(name)
        ? pass(`inline handler string preserved: ${name}`)
        : fail(`inline handler string missing: ${name}`);
});

if (handlerSources.includes('evtMessageHost')) {
    note('evtMessageHost referenced in detail HTML (no implementation in portal/events — audit TODO)');
} else {
    fail('evtMessageHost string expected per audit inventory');
}

console.log('\n── Phase 5J.1 — compat inline-handlers inventory ─────────────────────────');

inlineHandlersJs.includes('EXPECTED_HANDLER_GROUPS')
    ? pass('inline-handlers.js maintains EXPECTED_HANDLER_GROUPS')
    : fail('EXPECTED_HANDLER_GROUPS missing');

['team', 'detailTemplate', 'detailSections', 'postRender'].forEach((group) => {
    inlineHandlersJs.includes(`${group}:`)
        ? pass(`EXPECTED_HANDLER_GROUPS includes ${group}`)
        : fail(`EXPECTED_HANDLER_GROUPS missing ${group} group`);
});

['evtOpenTeamToolsPanel', 'evtHandleFreeRaffleEntry', 'evtNavigateToList'].forEach((handler) => {
    inlineHandlersJs.includes(`'${handler}'`)
        ? pass(`inventory lists ${handler}`)
        : fail(`inventory must list ${handler}`);
});

console.log('\n═══════════════════════════════════════════════════════════');
if (failed === 0) {
    console.log(`Phase 5J.1 smoke: ALL ${passed} CHECKS PASSED${noted ? ` (${noted} noted)` : ''}`);
    process.exit(0);
}
console.log(`Phase 5J.1 smoke: ${failed} FAIL(S), ${passed} pass${noted ? `, ${noted} noted` : ''}`);
failures.forEach((f) => console.log(`  - ${f}`));
process.exit(1);
