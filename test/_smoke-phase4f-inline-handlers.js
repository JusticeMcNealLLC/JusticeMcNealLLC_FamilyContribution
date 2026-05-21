// ══════════════════════════════════════════════════════════════════
// Phase 4F Step 3 static smoke test — compat/inline-handlers.js
//
// Run: node test/_smoke-phase4f-inline-handlers.js
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

const helperPath = 'js/portal/events/compat/inline-handlers.js';
const testPath = 'test/_smoke-phase4f-inline-handlers.js';
const helper = read(helperPath);
const eventsHtml = read('portal/events.html');
const inlineHandlers = require(resolve(helperPath));

console.log('\n── Phase 4F inline-handlers.js — file and syntax ──────────────────────');
check('inline-handlers.js exists', exists(helperPath));
check('inline-handlers.js syntax passes', syntaxOk(helperPath));
check('Phase 4F inline handlers smoke syntax passes', syntaxOk(testPath));
check('No native export statement is used', !/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(helper));
check('No import statement is used', !/^\s*import\s+/m.test(helper));

console.log('\n── Helper surface and export strategy ─────────────────────────────────');
const helperFunctions = [
    'getRoot',
    'assignHandler',
    'assignHandlers',
    'installInlineHandlers'
];
helperFunctions.forEach((name) => {
    check(`${name} function exists in source`, helper.includes(`function ${name}(`));
    check(`${name} exported from CommonJS object`, typeof inlineHandlers[name] === 'function');
});
check('CommonJS module.exports guard exists', helper.includes("if (typeof module !== 'undefined' && module.exports)"));
check('module.exports assigns InlineHandlers', helper.includes('module.exports = InlineHandlers'));
check('Browser window guard exists', helper.includes("if (typeof window !== 'undefined')"));
check('window.PortalEvents safe seed exists', helper.includes('window.PortalEvents = window.PortalEvents || {}'));
check('window.PortalEvents.inlineHandlers bridge assignment exists', helper.includes('window.PortalEvents.inlineHandlers = InlineHandlers'));

console.log('\n── Handler groups and representative names ────────────────────────────');
const expectedGroups = [
    'rsvp',
    'waitlist',
    'raffle',
    'competition',
    'documents',
    'scrapbook',
    'map',
    'scanner',
    'detail',
    'create',
    'manage',
    'comments'
];
expectedGroups.forEach((group) => check(`${group} handler group documented`, helper.includes(`${group}:`)));

const representativeHandlers = [
    'evtHandleRsvp',
    'evtJoinWaitlist',
    'evtLeaveWaitlist',
    'evtClaimWaitlistSpot',
    'evtOpenRaffleDraw',
    'evtDrawWinner',
    'evtJoinCompetition',
    'evtSubmitEntry',
    'evtCastVote',
    'evtModerateEntry',
    'evtContributeToPrizePool',
    'evtStartPhase',
    'evtAdvancePhase',
    'evtFinalizeCompetition',
    'evtOpenDocumentsPanel',
    'evtUploadDocument',
    'evtDeleteDocument',
    'evtUploadPhoto',
    'evtDeletePhoto',
    'evtViewPhoto',
    'evtInitMap',
    'evtToggleLocationSharing',
    'evtOpenScanner',
    'evtCloseScanner',
    'evtOpenDetail',
    'evtOpenLightbox',
    'evtOpenFullscreenMap',
    'evtCloseFullscreenMap',
    'evtPostComment'
];
representativeHandlers.forEach((name) => check(`${name} representative handler documented`, helper.includes(name)));

console.log('\n── Preserve, replace, and summary behavior ────────────────────────────');
check('assignHandler preserves existing handlers by default', helper.includes("typeof root[name] === 'function' && !replaceExisting"));
check('replaceExisting option is present', helper.includes('replaceExisting'));
check('non-function handlers are skipped', helper.includes("typeof fn !== 'function'"));
check('installed summary field exists', helper.includes('installed: []'));
check('preserved summary field exists', helper.includes('preserved: []'));
check('skipped summary field exists', helper.includes('skipped: []'));
check('replaced summary field exists', helper.includes('replaced: []'));
check('assignHandlers uses assignHandler', /assignHandlers[\s\S]*assignHandler\(name, handlers\[name\], options\)/.test(helper));
check('installInlineHandlers uses assignHandlers', /installInlineHandlers[\s\S]*assignHandlers\(groups\[groupName\], options\)/.test(helper));

console.log('\n── Runtime idempotency smoke ──────────────────────────────────────────');
const namesToRestore = [
    'PortalEvents',
    'evtHandleRsvp',
    'evtJoinCompetition',
    'evtBrokenHandler'
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
    const first = function firstHandler() {};
    const second = function secondHandler() {};
    const installSummary = inlineHandlers.assignHandler('evtHandleRsvp', first);
    check('assigning a new handler installs it', globalThis.evtHandleRsvp === first);
    check('new handler summary records installed', installSummary.installed.includes('evtHandleRsvp'));

    const preserveSummary = inlineHandlers.assignHandler('evtHandleRsvp', second);
    check('assigning same handler name preserves by default', globalThis.evtHandleRsvp === first);
    check('preserve summary records preserved', preserveSummary.preserved.includes('evtHandleRsvp'));

    const replaceSummary = inlineHandlers.assignHandler('evtHandleRsvp', second, { replaceExisting: true });
    check('replaceExisting: true replaces existing handler', globalThis.evtHandleRsvp === second);
    check('replace summary records replaced', replaceSummary.replaced.includes('evtHandleRsvp'));

    const skipSummary = inlineHandlers.assignHandler('evtBrokenHandler', 'not a function');
    check('invalid non-function handler is skipped', typeof globalThis.evtBrokenHandler === 'undefined');
    check('skip summary records skipped', skipSummary.skipped.includes('evtBrokenHandler'));

    const groupedSummary = inlineHandlers.installInlineHandlers({
        competition: {
            evtJoinCompetition: first,
            evtSubmitEntry: second
        },
        documents: {
            evtOpenDocumentsPanel: first
        }
    });
    check('installInlineHandlers installs grouped competition handler', globalThis.evtJoinCompetition === first);
    check('installInlineHandlers installs grouped submit handler', globalThis.evtSubmitEntry === second);
    check('installInlineHandlers installs grouped documents handler', globalThis.evtOpenDocumentsPanel === first);
    check('grouped summary records installed handlers', groupedSummary.installed.includes('evtJoinCompetition') && groupedSummary.installed.includes('evtOpenDocumentsPanel'));
} finally {
    ['evtSubmitEntry', 'evtOpenDocumentsPanel'].forEach((name) => delete globalThis[name]);
    originalValues.forEach((entry, name) => {
        if (entry.had) globalThis[name] = entry.value;
        else delete globalThis[name];
    });
}

console.log('\n── portal/events.html invariants ──────────────────────────────────────');
check('portal/events.html has no unstaged content diff', gitDiffNames('portal/events.html') === '');
check('inline-handlers.js is not added to portal/events.html yet', !eventsHtml.includes('js/portal/events/compat/inline-handlers.js'));
check('window-exports.js is not added to portal/events.html yet', !eventsHtml.includes('js/portal/events/compat/window-exports.js'));
check('external-globals.js is not added to portal/events.html yet', !eventsHtml.includes('js/portal/events/compat/external-globals.js'));
check('No portal events module entry exists yet', !eventsHtml.match(/<script[^>]+type=["']module["'][^>]+js\/portal\/events\/index\.js/));

console.log('\n── Supporting files remain present ────────────────────────────────────');
check('external-globals.js still exists', exists('js/portal/events/compat/external-globals.js'));
check('window-exports.js still exists', exists('js/portal/events/compat/window-exports.js'));
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
console.log(`Phase 4F inline handlers smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    console.log('\nPhase 4F inline handlers smoke: NEEDS REVIEW');
    process.exit(1);
}

console.log('\nPhase 4F inline handlers smoke: ALL PASS');
