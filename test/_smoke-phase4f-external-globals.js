// ══════════════════════════════════════════════════════════════════
// Phase 4F Step 1 static smoke test — compat/external-globals.js
//
// Run: node test/_smoke-phase4f-external-globals.js
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

const helperPath = 'js/portal/events/compat/external-globals.js';
const testPath = 'test/_smoke-phase4f-external-globals.js';
const helper = read(helperPath);
const eventsHtml = read('pages/portal/events.html');
const externalGlobals = require(resolve(helperPath));

console.log('\n── Phase 4F external-globals.js — file and syntax ─────────────────────');
check('external-globals.js exists', exists(helperPath));
check('external-globals.js syntax passes', syntaxOk(helperPath));
check('Phase 4F smoke test syntax passes', syntaxOk(testPath));
check('No native export statement is used', !/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(helper));
check('No import statement is used', !/^\s*import\s+/m.test(helper));

console.log('\n── Accessor surface ───────────────────────────────────────────────────');
const requiredFunctions = [
    'requireGlobal',
    'optionalGlobal',
    'getSupabaseClient',
    'getCheckAuth',
    'getHasPermission',
    'getCallEdgeFunction',
    'getFunctionUrl',
    'getQRCode',
    'getJsQR',
    'getLeaflet',
    'getNotificationsApi',
    'getPushApi',
    'getExternalDeps'
];
requiredFunctions.forEach((name) => {
    check(`${name} function exists in source`, helper.includes(`function ${name}(`));
    check(`${name} exported from CommonJS object`, typeof externalGlobals[name] === 'function');
});

console.log('\n── Required vs optional dependency behavior ───────────────────────────');
check('Required dependency comments are present', /Required dependency/.test(helper));
check('Action-dependent dependency comments are present', /Action-dependent dependency/.test(helper));
check('Optional dependency comments are present', /Optional dependency/.test(helper));
check('supabaseClient is required', helper.includes("requireGlobal('supabaseClient'"));
check('checkAuth is required', helper.includes("requireGlobal('checkAuth'"));
check('hasPermission is required and fail-hard', helper.includes("requireGlobal('hasPermission'"));
check('callEdgeFunction is action-dependent and required when requested', helper.includes("requireGlobal('callEdgeFunction'"));
check('getFunctionUrl is action-dependent and required when requested', helper.includes("requireGlobal('getFunctionUrl'"));
check('QRCode is optional', helper.includes("optionalGlobal('QRCode')"));
check('jsQR is optional', helper.includes("optionalGlobal('jsQR')"));
check('Leaflet L is optional', helper.includes("optionalGlobal('L')"));
check('Notifications API is optional', /function getNotificationsApi\(\)[\s\S]*firstOptionalGlobal/.test(helper));
check('Push API is optional', /function getPushApi\(\)[\s\S]*firstOptionalGlobal/.test(helper));

console.log('\n── CommonJS and browser bridge strategy ───────────────────────────────');
check('CommonJS module.exports guard exists', helper.includes("if (typeof module !== 'undefined' && module.exports)"));
check('module.exports assigns ExternalGlobals', helper.includes('module.exports = ExternalGlobals'));
check('window.PortalEvents safe seed exists', helper.includes('window.PortalEvents = window.PortalEvents || {}'));
check('window.PortalEvents.externalGlobals bridge assignment exists', helper.includes('window.PortalEvents.externalGlobals = ExternalGlobals'));

console.log('\n── Runtime accessor smoke ─────────────────────────────────────────────');
const namesToRestore = [
    'supabaseClient',
    'checkAuth',
    'hasPermission',
    'callEdgeFunction',
    'getFunctionUrl',
    'QRCode',
    'jsQR',
    'L',
    'JMNotifications',
    'NotificationsApi',
    'notificationsApi',
    'JMPush',
    'PushApi',
    'pushApi'
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
    let threw = false;
    try { externalGlobals.getSupabaseClient(); } catch (err) { threw = /supabaseClient is required/.test(err.message); }
    check('getSupabaseClient throws clear required error when missing', threw);
    check('getQRCode returns null when missing', externalGlobals.getQRCode() === null);
    check('getJsQR returns null when missing', externalGlobals.getJsQR() === null);
    check('getLeaflet returns null when missing', externalGlobals.getLeaflet() === null);
    check('getNotificationsApi returns null when no notification API global exists', externalGlobals.getNotificationsApi() === null);
    check('getPushApi returns null when no push API global exists', externalGlobals.getPushApi() === null);

    globalThis.supabaseClient = { from: function () {} };
    globalThis.checkAuth = function checkAuth() {};
    globalThis.hasPermission = function hasPermission() {};
    globalThis.callEdgeFunction = function callEdgeFunction() {};
    globalThis.getFunctionUrl = function getFunctionUrl() {};
    globalThis.QRCode = { toCanvas: function () {} };
    globalThis.jsQR = function jsQR() {};
    globalThis.L = { map: function () {} };
    globalThis.JMPush = { subscribe: function () {} };

    const deps = externalGlobals.getExternalDeps();
    check('getExternalDeps returns supabaseClient', deps.supabaseClient === globalThis.supabaseClient);
    check('getExternalDeps returns checkAuth', deps.checkAuth === globalThis.checkAuth);
    check('getExternalDeps returns hasPermission', deps.hasPermission === globalThis.hasPermission);
    check('getExternalDeps returns callEdgeFunction', deps.callEdgeFunction === globalThis.callEdgeFunction);
    check('getExternalDeps returns getFunctionUrl', deps.getFunctionUrl === globalThis.getFunctionUrl);
    check('getExternalDeps returns QRCode', deps.QRCode === globalThis.QRCode);
    check('getExternalDeps returns jsQR', deps.jsQR === globalThis.jsQR);
    check('getExternalDeps returns Leaflet alias from L', deps.Leaflet === globalThis.L);
    check('getExternalDeps returns null notifications when no API exists', deps.notifications === null);
    check('getExternalDeps returns push API from JMPush', deps.push === globalThis.JMPush);
} finally {
    originalValues.forEach((entry, name) => {
        if (entry.had) globalThis[name] = entry.value;
        else delete globalThis[name];
    });
}

console.log('\n── portal/events.html invariants ──────────────────────────────────────');
check('portal/events.html has no unstaged content diff', gitDiffNames('pages/portal/events.html') === '');
check('external-globals.js is not added to portal/events.html yet', !eventsHtml.includes('js/portal/events/compat/external-globals.js'));
check('No portal events module entry exists yet', !eventsHtml.match(/<script[^>]+type=["']module["'][^>]+js\/portal\/events\/index\.js/));

console.log('\n── Phase 1-3E bridge files still exist ────────────────────────────────');
[
    'js/portal/events/index.js',
    'js/portal/events/init.js',
    'js/components/events/constants.js',
    'js/portal/events/core/raffle-model.js',
    'js/portal/events/list/shell.js',
    'js/portal/events/detail.js',
    'js/portal/events/manage/sheet.js',
    'js/portal/events/create/sheet.js',
    'js/portal/events/detail/competition.js'
].forEach((rel) => check(`${rel} exists`, exists(rel)));

console.log('\n── Phase 4 docs remain intact ─────────────────────────────────────────');
[
    ['docs/audit/pages/events/011_phase_4b_compatibility_wrapper_design.md', 'Phase 4B Compatibility Wrapper Design'],
    ['docs/audit/pages/events/012_phase_4c_module_import_map_design.md', 'Phase 4C Module Import Map Design'],
    ['docs/audit/pages/events/014_phase_4e_pre_phase_5_readiness_review.md', 'Phase 4E Pre-Phase-5 Readiness Review']
].forEach(([rel, title]) => {
    check(`${rel} exists`, exists(rel));
    check(`${rel} title intact`, read(rel).includes(title));
});

const total = passed + failed;
console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 4F external globals smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    console.log('\nPhase 4F external globals smoke: NEEDS REVIEW');
    process.exit(1);
}

console.log('\nPhase 4F external globals smoke: ALL PASS');
