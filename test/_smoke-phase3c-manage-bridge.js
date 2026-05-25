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
} = require('./_portal-events-classic-chain.js');

const MANAGE_SHEET_CHAIN = 'manage/sheet.js?v=112';
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

sheet.includes('(function ()')
    ? pass('IIFE wrapper present ((function () {)')
    : fail('IIFE wrapper missing — sheet.js must remain a classic-script IIFE');

sheet.includes("'use strict';")
    ? pass("'use strict' present inside IIFE")
    : fail("'use strict' missing");

/\bexport\s+(default|const|let|var|function|class|\{)/.test(sheet)
    ? fail('Native export statement found — breaks classic script loading')
    : pass('No native export statement (stays classic-script safe)');

sheet.length > 60000
    ? pass(`File size reasonable (${sheet.length.toLocaleString()} chars — no accidental truncation)`)
    : fail('sheet.js appears truncated (< 60k chars)', `actual: ${sheet.length}`);

// ─── window.EventsManage (original public surface) ───────
console.log('\n── manage/sheet.js — window.EventsManage (original global preserved) ───────');

sheet.includes('window.EventsManage = { open, close, refreshRaffle }')
    ? pass('window.EventsManage = { open, close, refreshRaffle } present')
    : fail('window.EventsManage assignment missing or changed');

sheet.includes('window.EventsManage')
    ? pass('window.EventsManage referenced in source')
    : fail('window.EventsManage not referenced in source');

// ─── window._emToggleFeatured (inline onclick compatibility) ─
console.log('\n── manage/overview.js — window._emToggleFeatured (inline onclick bridge) ───');

overview.includes('window._emToggleFeatured = ')
    ? pass('window._emToggleFeatured assigned in overview.js (inline onclick compatibility preserved)')
    : fail('window._emToggleFeatured assignment missing in overview.js — featured toggle will break');

overview.includes('window._emToggleFeatured()')
    ? pass('window._emToggleFeatured() called from inline onclick in overviewHtml')
    : fail('window._emToggleFeatured() call missing from overviewHtml');

// ─── window.PortalEvents.manage bridge (Phase 3C additions) ─
console.log('\n── manage/sheet.js — window.PortalEvents.manage bridge (Phase 3C) ─────────');

sheet.includes('window.PortalEvents.manage = window.PortalEvents.manage ||')
    ? pass('window.PortalEvents.manage safe-init guard present')
    : fail('window.PortalEvents.manage safe-init guard missing');

const MANAGE_BRIDGE_KEYS = [
    ['window.PortalEvents.manage.open = open',             'open (manage sheet entry point)'],
    ['window.PortalEvents.manage.close = close',           'close'],
    ['window.PortalEvents.manage.refreshRaffle = refreshRaffle', 'refreshRaffle'],
];

MANAGE_BRIDGE_KEYS.forEach(([substr, label]) => {
    sheet.includes(substr)
        ? pass(`window.PortalEvents.manage.${label} assigned`)
        : fail(`window.PortalEvents.manage.${label} assignment missing`);
});

// ─── detail.register('manage', …) ────────────────────────
console.log('\n── manage/sheet.js — detail.register(\'manage\', …) call ─────────────────');

sheet.includes("window.PortalEvents.detail.register === 'function'")
    ? pass("typeof window.PortalEvents.detail.register === 'function' guard present")
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
sheet.includes("_notifyParent('deleted'")
    ? pass("_notifyParent('deleted', …) call present — dispatches events:manage:deleted")
    : fail("_notifyParent('deleted', …) call missing — events:manage:deleted would never fire");

// events:manage:* are emitted via _notifyParent helper
sheet.includes("'events:manage:' + type")
    ? pass("_notifyParent helper using 'events:manage:' + type pattern present")
    : fail("_notifyParent helper pattern missing");

// events:raffle:drawn dispatched directly
sheet.includes("'events:raffle:drawn'")
    ? pass("'events:raffle:drawn' custom event dispatch present")
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
    'function _dangerHtml(',
    'function _wireOverview(',
    'function _wireDanger(',
    'async function _loadRaffle(',
    'function _raffleHtml(',
    'function _wireRaffle(',
    'function refreshRaffle(',
];

CORE_FNS.forEach(fn => {
    sheet.includes(fn)
        ? pass(`${fn} present in sheet.js (orchestrator/tabs)`)
        : fail(`${fn} missing from sheet.js — runtime will break`);
});

console.log('\n── manage/shell.js — shell module (Phase 5M.3A) ───────────────────────────');

shell.includes('window.EventsManageShell =')
    ? pass('window.EventsManageShell namespace assigned')
    : fail('window.EventsManageShell namespace missing');

['function ensureMounted(', 'function renderHeader(', 'function renderTabs(', 'function renderContent(', 'function setLoadingChrome(', 'function openPanel(', 'function closePanel('].forEach(fn => {
    shell.includes(fn)
        ? pass(`shell.js owns ${fn.trim()}`)
        : fail(`shell.js missing ${fn.trim()}`);
});

sheet.includes('Shell.ensureMounted')
    ? pass('sheet.js delegates to Shell.ensureMounted')
    : fail('sheet.js must delegate mount to EventsManageShell');

console.log('\n── manage/overview.js — overview module (Phase 5M.3A) ───────────────────────');

overview.includes('window.EventsManageOverview =')
    ? pass('window.EventsManageOverview namespace assigned')
    : fail('window.EventsManageOverview namespace missing');

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
    [images, 'Images', 'window.EventsManageImages =', ['function imagesHtml(', 'function wireImages('], 'Images.imagesHtml'],
    [docs, 'Docs', 'window.EventsManageDocs =', ['async function loadDocs(', 'function docsHtml(', 'function wireDocs('], 'Docs.loadDocs'],
    [rsvps, 'Rsvps', 'window.EventsManageRsvps =', ['function rsvpsHtml(', 'function wireRsvps('], 'Rsvps.rsvpsHtml'],
    [money, 'Money', 'window.EventsManageMoney =', ['async function loadMoney(', 'function moneyHtml(', 'function wireMoney('], 'Money.loadMoney'],
    [competition, 'Competition', 'window.EventsManageCompetition =', ['async function loadComp(', 'function compHtml(', 'function wireComp('], 'Comp.loadComp'],
].forEach(([src, label, nsAssign, fns, delegate]) => {
    src.includes(nsAssign)
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

sheet.includes('function _loadRaffle(')
    ? pass('sheet.js still owns _loadRaffle (5M.3C deferred)')
    : fail('sheet.js must keep raffle tab until 5M.3C');

sheet.includes('function _dangerHtml(')
    ? pass('sheet.js still owns _dangerHtml (5M.3C deferred)')
    : fail('sheet.js must keep danger tab until 5M.3C');

sheet.includes('EventsManageRsvpsApi')
    ? pass('EventsManageRsvpsApi bridge bound in sheet.js')
    : fail('EventsManageRsvpsApi bridge missing');

sheet.includes('EventsManageDocsApi')
    ? pass('EventsManageDocsApi bridge bound in sheet.js')
    : fail('EventsManageDocsApi bridge missing');

// ─── portal/events.html invariants ───────────────────────
console.log('\n── portal/events.html invariants ─────────────────────────────────────────');

const html = read('portal/events.html');
const classicChain3c = parseClassicChain(root);

classicChain3c && classicChain3c.includes('manage/shell.js')
    ? pass('manage/shell.js present in classic-chain-loader.js chain')
    : fail('manage/shell.js missing from classic-chain-loader.js chain');

classicChain3c && classicChain3c.includes('manage/overview.js')
    ? pass('manage/overview.js present in classic-chain-loader.js chain')
    : fail('manage/overview.js missing from classic-chain-loader.js chain');

classicChain3c && classicChain3c.includes(MANAGE_SHEET_CHAIN)
    ? pass('manage/sheet.js?v=112 present in classic-chain-loader.js chain')
    : fail('manage/sheet.js?v=112 missing from classic-chain-loader.js chain');

(() => {
    const iScrap = classicChain3c.indexOf('scrapbook.js');
    const iShell = classicChain3c.indexOf('manage/shell.js');
    const iOverview = classicChain3c.indexOf('manage/overview.js');
    const iImages = classicChain3c.indexOf('manage/images.js');
    const iDocs = classicChain3c.indexOf('manage/docs.js');
    const iRsvps = classicChain3c.indexOf('manage/rsvps.js');
    const iMoney = classicChain3c.indexOf('manage/money.js');
    const iComp = classicChain3c.indexOf('manage/competition.js');
    const iSheet = classicChain3c.indexOf(MANAGE_SHEET_CHAIN);
    const ok = iScrap >= 0 && iShell > iScrap && iOverview > iShell
        && iImages > iOverview && iDocs > iImages && iRsvps > iDocs
        && iMoney > iRsvps && iComp > iMoney && iSheet > iComp;
    ok
        ? pass('loader order: scrapbook → shell → overview → images → docs → rsvps → money → competition → sheet')
        : fail('manage module loader order incorrect');
})();

isProductionLoaded(html, classicChain3c, MANAGE_SHEET_SRC)
    ? pass('manage/sheet.js still loaded in production (HTML or classic-chain-loader)')
    : fail('manage/sheet.js not in production load model');

html.includes('classic-chain-loader.js')
    ? pass('portal/events.html uses classic-chain-loader.js (3-tag production model)')
    : fail('classic-chain-loader.js not referenced in portal/events.html');

/src="\.\.\/js\/portal\/events\/manage\/sheet\.js[^"]*"[^>]*type="module"/.test(html)
    ? fail('manage/sheet.js loaded with type="module" — premature, Phase 5 only')
    : pass('manage/sheet.js does NOT have type="module" in HTML (Phase 5 deferred — correct)');

/<script[^>]+type="module"[^>]+src="\.\.\/js\/portal\/events\//.test(html)
    ? fail('A portal/events/* script has type="module" — premature')
    : pass('No portal/events/* scripts use type="module" yet (correct)');

const portalScripts3c = portalEventsHtmlScripts(html);
portalScripts3c.length && portalScripts3c[portalScripts3c.length - 1] === '../js/portal/events/init.js'
    ? pass('init.js remains last among portal Events HTML script tags')
    : fail('init.js must be the last portal/events script before sw-register');

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

// ─── Phase 3B detail bridge still intact ─────────────────
console.log('\n── Phase 3B bridge (detail.js) — regression check ─────────────────────────');

const detailJs = read('js/portal/events/detail.js');
detailJs.includes('window.PortalEvents.detail = window.PortalEvents.detail ||')
    ? pass('window.PortalEvents.detail safe-init still present (Phase 3B intact)')
    : fail('window.PortalEvents.detail safe-init missing — Phase 3B regression');
detailJs.includes('detail.register = function')
    ? pass('detail.register function still present (Phase 3B intact)')
    : fail('detail.register function missing — Phase 3B regression');
detailJs.includes('(function ()')
    ? pass('detail.js still IIFE (Phase 3B structure intact)')
    : fail('detail.js lost IIFE wrapper — Phase 3B regression');

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
