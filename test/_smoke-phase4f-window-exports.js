// ══════════════════════════════════════════════════════════════════
// Phase 4F Step 2 static smoke test — compat/window-exports.js
//
// Run: node test/_smoke-phase4f-window-exports.js
// ══════════════════════════════════════════════════════════════════
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const resolve = (rel) => path.join(ROOT, rel);

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

function syntaxOk(rel) {
    try {
        childProcess.execFileSync(process.execPath, ['--check', resolve(rel)], { stdio: 'pipe' });
        return true;
    } catch (err) {
        return false;
    }
}

function gitDiffNames(rel) {
    try {
        return childProcess.execFileSync('git', ['diff', '--name-only', '--', rel], {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        }).trim();
    } catch (err) {
        return 'GIT_DIFF_FAILED';
    }
}

const helperPath = 'js/portal/events/compat/window-exports.js';
const testPath = 'test/_smoke-phase4f-window-exports.js';
const helper = read(helperPath);
const eventsHtml = read('portal/events.html');
const windowExports = require(resolve(helperPath));

console.log('\n── Phase 4F window-exports.js — file and syntax ───────────────────────');
check('window-exports.js exists', exists(helperPath));
check('window-exports.js syntax passes', syntaxOk(helperPath));
check('Phase 4F window exports smoke syntax passes', syntaxOk(testPath));
check('No native export statement is used', !/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(helper));
check('No import statement is used', !/^\s*import\s+/m.test(helper));

console.log('\n── Helper surface ─────────────────────────────────────────────────────');
const helperFunctions = [
    'getRoot',
    'ensurePortalEvents',
    'assignNamespace',
    'assignGlobals',
    'installWindowExports'
];
helperFunctions.forEach((name) => {
    check(`${name} function exists in source`, helper.includes(`function ${name}(`));
    check(`${name} exported from CommonJS object`, typeof windowExports[name] === 'function');
});
check('CommonJS module.exports guard exists', helper.includes("if (typeof module !== 'undefined' && module.exports)"));
check('module.exports assigns WindowExports', helper.includes('module.exports = WindowExports'));
check('Browser window guard exists', helper.includes("if (typeof window !== 'undefined')"));
check('window.PortalEvents safe seed exists', helper.includes('window.PortalEvents = window.PortalEvents || {}'));
check('window.PortalEvents.windowExports bridge assignment exists', helper.includes('window.PortalEvents.windowExports = WindowExports'));

console.log('\n── Safe namespace and classic global behavior ─────────────────────────');
check('ensurePortalEvents seeds PortalEvents with || {}', helper.includes('target.PortalEvents = target.PortalEvents || {}'));
check('assignNamespace seeds namespace with || {}', helper.includes('root[key] = root[key] || {}'));
check('assignNamespace uses Object.assign into existing namespace', helper.includes('Object.assign(root[key], api)'));
check('preserveClassicGlobal helper exists', helper.includes('function preserveClassicGlobal('));
check('Classic globals preserve existing values by default', /typeof root\[key\] === 'undefined'/.test(helper));
check('Explicit replaceClassicGlobals option exists', helper.includes('replaceClassicGlobals === true'));

console.log('\n── installWindowExports API handling ──────────────────────────────────');
const apiKeys = [
    'initEventsPage',
    'constants',
    'raffleModel',
    'list',
    'detail',
    'manage',
    'create',
    'competition',
    'globals'
];
apiKeys.forEach((key) => {
    check(`installWindowExports handles ${key}`, helper.includes(`apis.${key}`));
});
check('initEventsPage assigned to PortalEvents', helper.includes('portal.initEventsPage = apis.initEventsPage'));
check('constants assigned through assignNamespace', helper.includes("assignNamespace(portal, 'constants', apis.constants)"));
check('list assigned through assignNamespace', helper.includes("assignNamespace(portal, 'list', apis.list)"));
check('detail assigned through assignNamespace', helper.includes("assignNamespace(portal, 'detail', apis.detail)"));
check('manage assigned through assignNamespace', helper.includes("assignNamespace(portal, 'manage', apis.manage)"));
check('create assigned through assignNamespace', helper.includes("assignNamespace(portal, 'create', apis.create)"));
check('competition assigned through assignNamespace', helper.includes("assignNamespace(portal, 'competition', apis.competition)"));
check('raffleModel assigned to PortalEvents.raffleModel', helper.includes('portal.raffleModel = apis.raffleModel'));
check('EventsRaffleModel referenced', helper.includes('EventsRaffleModel'));
check('EventsCreate referenced', helper.includes('EventsCreate'));
check('EventsManage referenced', helper.includes('EventsManage'));
check('assignGlobals exists and is used by installWindowExports', /function assignGlobals\(/.test(helper) && /if \(apis\.globals\)[\s\S]*assignGlobals\(apis\.globals\)/.test(helper));

console.log('\n── Runtime idempotency smoke ──────────────────────────────────────────');
const namesToRestore = [
    'PortalEvents',
    'EventsRaffleModel',
    'EventsCreate',
    'EventsManage',
    'evtLegacyAction'
];
const originalValues = new Map();
namesToRestore.forEach((name) => {
    originalValues.set(name, {
        had: Object.prototype.hasOwnProperty.call(globalThis, name),
        value: globalThis[name]
    });
    delete globalThis[name];
});

try {
    const existingCreate = { open: function oldOpen() {}, existing: true };
    const existingManage = { open: function oldManage() {}, existing: true };
    const existingRaffle = { normalizeConfig: function oldNormalize() {}, existing: true };
    globalThis.PortalEvents = { list: { existingListKey: true } };
    globalThis.EventsCreate = existingCreate;
    globalThis.EventsManage = existingManage;
    globalThis.EventsRaffleModel = existingRaffle;

    const initEventsPage = function initEventsPage() {};
    const createdPortal = windowExports.installWindowExports({
        initEventsPage,
        constants: { CATEGORY_EMOJI: {} },
        raffleModel: { normalizeConfig: function normalizeConfig() {} },
        list: { load: function load() {} },
        detail: { open: function open() {} },
        manage: { close: function close() {} },
        create: { close: function closeCreate() {} },
        competition: { join: function join() {} },
        globals: { evtLegacyAction: function evtLegacyAction() {} }
    });

    check('installWindowExports returns PortalEvents object', createdPortal === globalThis.PortalEvents);
    check('initEventsPage installed', globalThis.PortalEvents.initEventsPage === initEventsPage);
    check('constants namespace installed', !!globalThis.PortalEvents.constants.CATEGORY_EMOJI);
    check('list namespace preserves existing key', globalThis.PortalEvents.list.existingListKey === true);
    check('list namespace gets new key', typeof globalThis.PortalEvents.list.load === 'function');
    check('detail namespace gets new key', typeof globalThis.PortalEvents.detail.open === 'function');
    check('manage namespace gets new key', typeof globalThis.PortalEvents.manage.close === 'function');
    check('create namespace gets new key', typeof globalThis.PortalEvents.create.close === 'function');
    check('competition namespace gets new key', typeof globalThis.PortalEvents.competition.join === 'function');
    check('legacy evt* global installed from globals bag', typeof globalThis.evtLegacyAction === 'function');
    check('Existing EventsCreate preserved by default', globalThis.EventsCreate === existingCreate);
    check('Existing EventsManage preserved by default', globalThis.EventsManage === existingManage);
    check('Existing EventsRaffleModel preserved by default', globalThis.EventsRaffleModel === existingRaffle);

    windowExports.installWindowExports({
        create: { open: function replacementOpen() {} },
        options: { replaceClassicGlobals: true }
    });
    check('Explicit replaceClassicGlobals can replace EventsCreate', globalThis.EventsCreate !== existingCreate);
} finally {
    originalValues.forEach((entry, name) => {
        if (entry.had) globalThis[name] = entry.value;
        else delete globalThis[name];
    });
}

console.log('\n── portal/events.html invariants ──────────────────────────────────────');
check('portal/events.html has no unstaged content diff', gitDiffNames('portal/events.html') === '');
check('window-exports.js is not added to portal/events.html yet', !eventsHtml.includes('js/portal/events/compat/window-exports.js'));
check('external-globals.js is not added to portal/events.html yet', !eventsHtml.includes('js/portal/events/compat/external-globals.js'));
check('No portal events module entry exists yet', !eventsHtml.match(/<script[^>]+type=["']module["'][^>]+js\/portal\/events\/index\.js/));

console.log('\n── Supporting files remain present ────────────────────────────────────');
check('external-globals.js still exists', exists('js/portal/events/compat/external-globals.js'));
[
    'test/_smoke-phase1-bridge.js',
    'test/_smoke-phase2-low-risk-modules.js',
    'test/_smoke-phase3a-list-bridge.js',
    'test/_smoke-phase3b-detail-bridge.js',
    'test/_smoke-phase3c-manage-bridge.js',
    'test/_smoke-phase3d-create-bridge.js',
    'test/_smoke-phase3e-competition-bridge.js'
].forEach((rel) => check(`${rel} exists`, exists(rel)));

const total = passed + failed;
console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 4F window exports smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    console.log('\nPhase 4F window exports smoke: NEEDS REVIEW');
    process.exit(1);
}

console.log('\nPhase 4F window exports smoke: ALL PASS');
