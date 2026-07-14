// ═══════════════════════════════════════════════════════════
// Phase 3C static smoke test — manage/sheet.js compatibility bridge
//
// Verifies:
//   • manage/sheet.js file structure (IIFE, no native export, exists)
//   • window.EventsManage still assigned with all 3 keys (open, close, refreshRaffle)
//   • window._emToggleFeatured still assigned (inline onclick compatibility)
//   • window.PortalEvents.manage namespace and its keys (Phase 3C additions)
//   • detail.register('manage', …) call still present
//   • Custom events (events:manage:updated, events:manage:deleted, events:raffle:drawn)
//   • portal/events.html not switched to module mode
//   • manage/sheet.js in production load model (HTML or classic-chain-loader)
//   • No new manage/ subfile created without being loaded in production
//   • Phase 1 bridge still intact (init.js)
//   • Phase 2 bridges still intact (constants.js, raffle-model.js)
//   • Phase 3A list bridge still intact (list.js)
//   • Phase 3B detail bridge still intact (detail.js)
//
// Run: node test/_smoke-phase3c-manage-bridge.js
// ═══════════════════════════════════════════════════════════
'use strict';

const fs   = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const {
    parseClassicChain,
    isProductionLoaded,
    portalEventsHtmlScripts,
    productionEventsBootLast,
} = require('./_portal-events-classic-chain.js');
const {
    hasGlobalBridge,
    indexConstantsOk,
    listShellEsmOk,
    detailOrchestratorEsmOk,
    manageSheetEsmOk,
    manageModuleEsmOk,
} = require('./_esm-bridge-helpers.js');

function manageNsOk(src, globalName, exportName) {
    return manageModuleEsmOk(src, globalName, exportName)
        || src.includes(`globalThis.${globalName}`)
        || src.includes(`window.${globalName}`);
}

const MANAGE_SHEET_CHAIN = 'manage/sheet.js';
const MANAGE_SHEET_SRC = '../js/portal/events/' + MANAGE_SHEET_CHAIN;

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

// ─── manage/sheet.js file structure ──────────────────────
console.log('\n── js/portal/events/manage/sheet.js — file structure ─────────────────────');

const sheet = read('js/portal/events/manage/sheet.js');
const shell = read('js/portal/events/manage/shell.js');
const overview = read('js/portal/events/manage/overview.js');
const images = read('js/portal/events/manage/images.js');
const docs = read('js/portal/events/manage/docs.js');
const rsvps = read('js/portal/events/manage/rsvps.js');
const money = read('js/portal/events/manage/money.js');
const competition = read('js/portal/events/manage/competition.js');
const participation = read('js/portal/events/manage/participation.js');
const manageRaffle = read('js/portal/events/manage/raffle.js');
const danger = read('js/portal/events/manage/danger.js');

manageSheetEsmOk(sheet)
    ? pass('manage/sheet.js ESM orchestrator (Phase 7.8)')
    : fail('manage/sheet.js missing eventsManageApi bridge');

sheet.includes("'use strict';")
    ? pass("'use strict' present")
    : fail("'use strict' missing");

sheet.length > 8000
    ? pass(`File size reasonable (${sheet.length.toLocaleString()} chars — orchestrator after modularization)`)
    : fail('sheet.js appears truncated (< 8k chars)', `actual: ${sheet.length}`);

// ─── window.EventsManage (original public surface) ───────
console.log('\n── manage/sheet.js — window.EventsManage (original global preserved) ───────');

(sheet.includes('export const eventsManageApi') || sheet.includes('window.EventsManage = { open, close, refreshRaffle }'))
    ? pass('EventsManage public API present')
    : fail('EventsManage assignment missing or changed');

sheet.includes('window.EventsManage')
    ? pass('window.EventsManage referenced in source')
    : fail('window.EventsManage not referenced in source');

// ─── window._emToggleFeatured (inline onclick compatibility) ─
console.log('\n── manage/overview.js — window._emToggleFeatured (inline onclick bridge) ───');

hasGlobalBridge(overview, '_emToggleFeatured')
    ? pass('_emToggleFeatured bridged in overview.js (inline onclick compatibility preserved)')
    : fail('_emToggleFeatured assignment missing in overview.js — featured toggle will break');

overview.includes('window._emToggleFeatured()')
    ? pass('window._emToggleFeatured() called from inline onclick in overviewHtml')
    : fail('window._emToggleFeatured() call missing from overviewHtml');

// ─── window.PortalEvents.manage bridge (Phase 3C additions) ─
console.log('\n── manage/sheet.js — window.PortalEvents.manage bridge (Phase 3C) ─────────');

sheet.includes('PortalEvents.manage.open')
    ? pass('PortalEvents.manage.open bridged')
    : fail('PortalEvents.manage.open missing');

sheet.includes('PortalEvents.manage.close')
    ? pass('PortalEvents.manage.close bridged')
    : fail('PortalEvents.manage.close missing');

sheet.includes('PortalEvents.manage.refreshRaffle')
    ? pass('PortalEvents.manage.refreshRaffle bridged')
    : fail('PortalEvents.manage.refreshRaffle missing');

// ─── detail.register('manage', …) ────────────────────────
console.log('\n── manage/sheet.js — detail.register(\'manage\', …) call ─────────────────');

(sheet.includes("PortalEvents.detail.register === 'function'") || sheet.includes("window.PortalEvents.detail.register === 'function'"))
    ? pass("typeof PortalEvents.detail.register === 'function' guard present")
    : fail("typeof guard for PortalEvents.detail.register missing");

sheet.includes("detail.register('manage'")
    ? pass("detail.register('manage', …) call present — registers into detail registry")
    : fail("detail.register('manage', …) call missing");

// ─── Custom events ────────────────────────────────────────
console.log('\n── manage/sheet.js — custom event dispatches ─────────────────────────────');

// events:manage:updated (overview featured toggle; sheet _notifyParent for other tabs)
(sheet.includes("'events:manage:updated'") || overview.includes("'events:manage:updated'"))
    ? pass("'events:manage:updated' literal dispatch present (sheet or overview)")
    : fail("'events:manage:updated' literal dispatch missing");

// events:manage:deleted dispatched via _notifyParent helper (dynamic concatenation)
(sheet.includes("_notifyParent('deleted'") || danger.includes("notifyParent?.('deleted'"))
    ? pass("_notifyParent('deleted', …) dispatch present (sheet or danger module)")
    : fail("_notifyParent('deleted', …) call missing — events:manage:deleted would never fire");

// events:manage:* are emitted via _notifyParent helper
sheet.includes("'events:manage:' + type")
    ? pass("_notifyParent helper using 'events:manage:' + type pattern present")
    : fail("_notifyParent helper pattern missing");

// events:raffle:drawn dispatched from raffle module
(manageRaffle.includes("'events:raffle:drawn'") || sheet.includes("'events:raffle:drawn'"))
    ? pass("'events:raffle:drawn' custom event dispatch present (raffle module or sheet)")
    : fail("'events:raffle:drawn' custom event dispatch missing");

// ─── Core internal functions ──────────────────────────────
console.log('\n── manage/sheet.js — core internal functions ─────────────────────────────');

const CORE_FNS = [
    'async function open(',
    'function close(',
    'async function _loadEventData(',
    'function _renderTab(',
    'async function _renderTabAsync(',
    'function _overviewHtml(',
    'function _wireOverview(',
    'function refreshRaffle(',
    'async function _refreshEventManager(',
    'function _notifyParent(',
];

CORE_FNS.forEach(fn => {
    sheet.includes(fn)
        ? pass(`${fn} present in sheet.js (orchestrator/tabs)`)
        : fail(`${fn} missing from sheet.js — runtime will break`);
});

console.log('\n── manage/shell.js — shell module (Phase 5M.3A) ───────────────────────────');

manageNsOk(shell, 'EventsManageShell', 'manageShellApi')
    ? pass('EventsManageShell namespace assigned')
    : fail('EventsManageShell namespace missing');

['function ensureMounted(', 'function renderHeader(', 'function renderTabs(', 'function renderContent(', 'function setLoadingChrome(', 'function openPanel(', 'function closePanel('].forEach(fn => {
    shell.includes(fn)
        ? pass(`shell.js owns ${fn.trim()}`)
        : fail(`shell.js missing ${fn.trim()}`);
});

sheet.includes('Shell.ensureMounted')
    ? pass('sheet.js delegates to Shell.ensureMounted')
    : fail('sheet.js must delegate mount to EventsManageShell');

shell.includes('function getState()') && shell.includes('api().getState')
    ? pass('shell.js reads shared state via EventsManageShellApi.getState')
    : fail('shell.js must not reference bare STATE from sheet.js closure');

!shell.includes('STATE.activeTab = btn.dataset.tab') || shell.includes('getState()')
    ? pass('shell.js tab clicks use shared getState()')
    : fail('shell.js renderTabs must use getState(), not bare STATE');

overview.includes('function getState()')
    ? pass('overview.js reads shared state via getState()')
    : fail('overview.js must use getState() after 5M.3A split');

const raffle = read('js/portal/events/manage/raffle.js');
!raffle.includes('_raffleConfig(') && raffle.includes('const config = raffleConfig(e)')
    ? pass('raffle.js uses local helpers (not sheet-private _raffle* names)')
    : fail('raffle.js must call raffleConfig/raffleCategories helpers without underscore prefixes');

console.log('\n── manage/overview.js — overview module (Phase 5M.3A) ───────────────────────');

manageNsOk(overview, 'EventsManageOverview', 'manageOverviewApi')
    ? pass('EventsManageOverview namespace assigned')
    : fail('EventsManageOverview namespace missing');

['function overviewHtml(', 'function wireOverview(', 'function saveEventCopy(', 'function renderOverviewQrs(', 'function toggleFeatured('].forEach(fn => {
    overview.includes(fn)
        ? pass(`overview.js owns ${fn.trim()}`)
        : fail(`overview.js missing ${fn.trim()}`);
});

sheet.includes('Overview.overviewHtml')
    ? pass('sheet.js delegates overview tab to Overview module')
    : fail('sheet.js must delegate overview to EventsManageOverview');

sheet.includes('EventsManageShellApi')
    ? pass('EventsManageShellApi bridge bound in sheet.js')
    : fail('EventsManageShellApi bridge missing in sheet.js');

sheet.includes('EventsManageOverviewApi')
    ? pass('EventsManageOverviewApi bridge bound in sheet.js')
    : fail('EventsManageOverviewApi bridge missing in sheet.js');

console.log('\n── manage tab modules (Phase 5M.3B) ───────────────────────────────────────');

[
    [images, 'Images', 'EventsManageImages', 'manageImagesApi', ['function imagesHtml(', 'function wireImages('], 'Images.imagesHtml'],
    [docs, 'Docs', 'EventsManageDocs', 'manageDocsApi', ['async function loadDocs(', 'function docsHtml(', 'function wireDocs('], 'Docs.loadDocs'],
    [rsvps, 'Rsvps', 'EventsManageRsvps', 'manageRsvpsApi', ['function rsvpsHtml(', 'function wireRsvps('], 'Rsvps.rsvpsHtml'],
    [money, 'Money', 'EventsManageMoney', 'manageMoneyApi', ['async function loadMoney(', 'function moneyHtml(', 'function wireMoney('], 'Money.loadMoney'],
    [competition, 'Competition', 'EventsManageCompetition', 'manageCompetitionApi', ['async function loadComp(', 'function compHtml(', 'function wireComp('], 'Comp.loadComp'],
].forEach(([src, label, globalName, exportName, fns, delegate]) => {
    manageNsOk(src, globalName, exportName)
        ? pass(`${label}: namespace assigned`)
        : fail(`${label}: namespace missing`);
    fns.forEach(fn => {
        src.includes(fn)
            ? pass(`${label}: owns ${fn.trim()}`)
            : fail(`${label}: missing ${fn.trim()}`);
    });
    sheet.includes(delegate)
        ? pass(`sheet.js delegates to ${delegate}`)
        : fail(`sheet.js must delegate to ${delegate}`);
});

console.log('\n── manage tab modules (Phase 5M.3C) ───────────────────────────────────────');

[
    [participation, 'Participation', 'EventsManageParticipation', 'manageParticipationApi', ['async function getParticipationResetCounts(', 'async function resetParticipation(', 'async function removeParticipationPerson('], 'Participation.removeParticipationPerson'],
    [manageRaffle, 'Raffle', 'EventsManageRaffle', 'manageRaffleApi', ['async function loadRaffle(', 'function raffleHtml(', 'function wireRaffle(', 'function refreshRaffle('], 'Raffle.loadRaffle'],
    [danger, 'Danger', 'EventsManageDanger', 'manageDangerApi', ['function dangerHtml(', 'function wireDanger(', 'async function runDangerAction('], 'Danger.dangerHtml'],
].forEach(([src, label, globalName, exportName, fns, delegate]) => {
    manageNsOk(src, globalName, exportName)
        ? pass(`${label}: namespace assigned`)
        : fail(`${label}: namespace missing`);
    fns.forEach(fn => {
        src.includes(fn)
            ? pass(`${label}: owns ${fn.trim()}`)
            : fail(`${label}: missing ${fn.trim()}`);
    });
    sheet.includes(delegate)
        ? pass(`sheet.js delegates to ${delegate}`)
        : fail(`sheet.js must delegate to ${delegate}`);
});

participation.includes("action: 'reset_participation'")
    ? pass("reset_participation edge payload preserved in participation.js")
    : fail("reset_participation payload missing");

participation.includes("action: 'remove_rsvp'")
    ? pass("remove_rsvp edge payload preserved in participation.js")
    : fail("remove_rsvp payload missing");

danger.includes('data-action="delete"')
    ? pass('danger.js retains delete confirmation control')
    : fail('delete action missing from danger.js');

participation.includes('Type RESET')
    ? pass('reset participation Type RESET confirmation preserved in participation.js')
    : fail('Type RESET confirmation missing');

sheet.includes('function refreshRaffle(')
    ? pass('sheet.js still exposes refreshRaffle orchestrator')
    : fail('refreshRaffle missing from sheet.js');

!sheet.includes('function _loadRaffle(')
    ? pass('sheet.js no longer owns _loadRaffle (extracted to raffle.js)')
    : fail('sheet.js should not retain _loadRaffle after 5M.3C');

!sheet.includes('function _dangerHtml(')
    ? pass('sheet.js no longer owns _dangerHtml (extracted to danger.js)')
    : fail('sheet.js should not retain _dangerHtml after 5M.3C');

sheet.includes('EventsManageParticipationApi')
    ? pass('EventsManageParticipationApi bridge bound in sheet.js')
    : fail('EventsManageParticipationApi bridge missing');

sheet.includes('EventsManageDangerApi')
    ? pass('EventsManageDangerApi bridge bound in sheet.js')
    : fail('EventsManageDangerApi bridge missing');

sheet.includes('EventsManageRaffleApi')
    ? pass('EventsManageRaffleApi bridge bound in sheet.js')
    : fail('EventsManageRaffleApi bridge missing');

sheet.includes('EventsManageRsvpsApi')
    ? pass('EventsManageRsvpsApi bridge bound in sheet.js')
    : fail('EventsManageRsvpsApi bridge missing');

sheet.includes('EventsManageDocsApi')
    ? pass('EventsManageDocsApi bridge bound in sheet.js')
    : fail('EventsManageDocsApi bridge missing');

// ─── portal/events.html invariants ───────────────────────
console.log('\n── portal/events.html invariants ─────────────────────────────────────────');

const html = read('pages/portal/events.html');
const classicChain3c = parseClassicChain(root);

classicChain3c && classicChain3c.includes('manage/shell.js')
    ? pass('manage/shell.js present in classic-chain-loader.js chain')
    : fail('manage/shell.js missing from classic-chain-loader.js chain');

classicChain3c && classicChain3c.includes('manage/overview.js')
    ? pass('manage/overview.js present in classic-chain-loader.js chain')
    : fail('manage/overview.js missing from classic-chain-loader.js chain');

classicChain3c && classicChain3c.includes(MANAGE_SHEET_CHAIN)
    ? pass('manage/sheet.js?v=113 present in classic-chain-loader.js chain')
    : fail('manage/sheet.js?v=113 missing from classic-chain-loader.js chain');

(() => {
    const iScrap = classicChain3c.indexOf('detail/scrapbook.js');
    const iShell = classicChain3c.indexOf('manage/shell.js');
    const iOverview = classicChain3c.indexOf('manage/overview.js');
    const iImages = classicChain3c.indexOf('manage/images.js');
    const iDocs = classicChain3c.indexOf('manage/docs.js');
    const iRsvps = classicChain3c.indexOf('manage/rsvps.js');
    const iMoney = classicChain3c.indexOf('manage/money.js');
    const iComp = classicChain3c.indexOf('manage/competition.js');
    const iPart = classicChain3c.indexOf('manage/participation.js');
    const iRaffle = classicChain3c.indexOf('manage/raffle.js');
    const iDanger = classicChain3c.indexOf('manage/danger.js');
    const iReexports = classicChain3c.indexOf('compat/global-reexports.js');
    const iSheet = classicChain3c.indexOf(MANAGE_SHEET_CHAIN);
    const ok = iScrap >= 0 && iShell > iScrap && iOverview > iShell
        && iImages > iOverview && iDocs > iImages && iRsvps > iDocs
        && iMoney > iRsvps && iComp > iMoney
        && iPart > iComp && iRaffle > iPart && iDanger > iRaffle
        && iReexports > iDanger && iSheet > iReexports;
    ok
        ? pass('loader order: … → danger → global-reexports → sheet')
        : fail('manage module loader order incorrect');
})();

isProductionLoaded(html, classicChain3c, MANAGE_SHEET_SRC)
    ? pass('manage/sheet.js still loaded in production (HTML or classic-chain-loader)')
    : fail('manage/sheet.js not in production load model');

html.includes('events.bundle.js')
    ? pass('portal/events.html uses events.bundle.js (Phase 6 production model)')
    : fail('events.bundle.js not referenced in portal/events.html');

/src="\.\.\/js\/portal\/events\/manage\/sheet\.js[^"]*"[^>]*type="module"/.test(html)
    ? fail('manage/sheet.js loaded with type="module" — premature, Phase 5 only')
    : pass('manage/sheet.js does NOT have type="module" in HTML (Phase 5 deferred — correct)');

/<script[^>]+type="module"[^>]+src="\.\.\/js\/portal\/events\//.test(html)
    ? fail('A portal/events/* script has type="module" — premature')
    : pass('No portal/events/* scripts use type="module" yet (correct)');

const portalScripts3c = portalEventsHtmlScripts(html);
productionEventsBootLast(portalScripts3c)
    ? pass('events boot script is last before sw-register (bundle or init.js)')
    : fail('events.bundle.js or init.js must be the last portal/events script before sw-register');

// ─── No new manage/ subfile created without being loaded ─
console.log('\n── File split safety — no orphaned new manage/ files ─────────────────────');

const manageDir = path.join(root, 'js', 'portal', 'events', 'manage');
if (fs.existsSync(manageDir)) {
    const files = fs.readdirSync(manageDir).filter(f => f.endsWith('.js'));
    if (files.length === 0) {
        pass('js/portal/events/manage/ directory exists but is empty (no orphaned files)');
    } else {
        files.forEach(f => {
            const chainKey = f === 'sheet.js' ? MANAGE_SHEET_CHAIN : 'manage/' + f;
            const src = '../js/portal/events/' + chainKey;
            isProductionLoaded(html, classicChain3c, src)
                ? pass(`manage/${f} in production load (not orphaned)`)
                : fail(`manage/${f} exists but NOT in production load`, `File: ${chainKey}`);
        });
    }
} else {
    fail('js/portal/events/manage/ directory does not exist — sheet.js itself is missing');
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

// ─── Phase 3A list bridge still intact ───────────────────
console.log('\n── Phase 3A bridge (list.js) — regression check ───────────────────────────');

const listJs = read('js/portal/events/list/shell.js');
listShellEsmOk(listJs)
    ? pass('PortalEvents.list namespace still present (Phase 3A intact)')
    : fail('PortalEvents.list namespace missing — Phase 3A regression');
listJs.includes('export const portalEventsListApi')
    ? pass('list/shell.js ESM (Phase 7.9)')
    : fail('list/shell.js structure regression');

// ─── Phase 3B detail bridge still intact ─────────────────
console.log('\n── Phase 3B bridge (detail.js) — regression check ─────────────────────────');

const detailJs = read('js/portal/events/detail.js');
detailJs.includes('PortalEvents.detail')
    ? pass('PortalEvents.detail namespace still present (Phase 3B intact)')
    : fail('PortalEvents.detail safe-init missing — Phase 3B regression');
detailJs.includes('detail.register = function')
    ? pass('detail.register function still present (Phase 3B intact)')
    : fail('detail.register function missing — Phase 3B regression');
detailOrchestratorEsmOk(detailJs)
    ? pass('detail.js ESM orchestrator (Phase 7.10)')
    : fail('detail.js structure regression');

// ─── Summary ─────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 3C static smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    console.log('\nPhase 3C static smoke: NEEDS REVIEW');
    process.exit(1);
} else {
    console.log('\nPhase 3C static smoke: ALL PASS');
    process.exit(0);
}
