// Phase 4H local-only runtime harness - compat/inline-handlers.js
//
// Run: node test/_harness-phase4h-inline-handlers-runtime.js
'use strict';

const path = require('path');

const ROOT = path.join(__dirname, '..');
const inlineHandlers = require(path.join(ROOT, 'js/portal/events/compat/inline-handlers.js'));

const GLOBAL_NAMES = [
    'evtHandleRsvp',
    'evtJoinWaitlist',
    'evtOpenDetail',
    'evtJoinCompetition',
    'evtOpenDocumentsPanel',
    'evtInitMap',
    'evtOpenScanner',
    'evtInvalidHandler',
    'evtOtherInvalidHandler',
    'evtExistingOnly'
];

let passed = 0;
let failed = 0;
const failures = [];

function check(label, ok, detail) {
    if (ok) {
        console.log('  PASS ' + label);
        passed++;
    } else {
        console.log('  FAIL ' + label + (detail ? ' - ' + detail : ''));
        failed++;
        failures.push(label);
    }
}

function snapshotGlobals() {
    const snapshot = new Map();
    GLOBAL_NAMES.forEach((name) => {
        snapshot.set(name, {
            had: Object.prototype.hasOwnProperty.call(globalThis, name),
            value: globalThis[name]
        });
    });
    return snapshot;
}

function clearGlobals() {
    GLOBAL_NAMES.forEach((name) => {
        delete globalThis[name];
    });
}

function restoreGlobals(snapshot) {
    snapshot.forEach((entry, name) => {
        if (entry.had) globalThis[name] = entry.value;
        else delete globalThis[name];
    });
}

function globalsMatchSnapshot(snapshot) {
    return GLOBAL_NAMES.every((name) => {
        const entry = snapshot.get(name);
        const hasNow = Object.prototype.hasOwnProperty.call(globalThis, name);
        if (entry.had !== hasNow) return false;
        if (!entry.had) return true;
        return Object.is(globalThis[name], entry.value);
    });
}

function withIsolatedGlobals(label, fn) {
    const snapshot = snapshotGlobals();
    clearGlobals();
    try {
        fn();
    } finally {
        restoreGlobals(snapshot);
        check(label + ' cleans up fake globals', globalsMatchSnapshot(snapshot));
    }
}

function expectSameFunction(label, actual, expected) {
    check(label, actual === expected);
}

function emptySummary(summary) {
    return summary.installed.length === 0 &&
        summary.preserved.length === 0 &&
        summary.skipped.length === 0 &&
        summary.replaced.length === 0;
}

function hasAll(values, expected) {
    return expected.every((value) => values.includes(value));
}

function createFn(name) {
    return function handler() {
        return name;
    };
}

console.log('\n-- Phase 4H inline-handlers runtime harness --');

console.log('\n-- assignHandler installs a new handler --');
withIsolatedGlobals('assignHandler install scenario', () => {
    const handler = createFn('rsvp');
    const summary = inlineHandlers.assignHandler('evtHandleRsvp', handler);

    expectSameFunction('assignHandler installs evtHandleRsvp', globalThis.evtHandleRsvp, handler);
    check('install summary records installed handler', hasAll(summary.installed, ['evtHandleRsvp']));
    check('install summary has no preserved entries', summary.preserved.length === 0);
    check('install summary has no skipped entries', summary.skipped.length === 0);
    check('install summary has no replaced entries', summary.replaced.length === 0);
});

console.log('\n-- Existing handlers are preserved by default --');
withIsolatedGlobals('preserve existing scenario', () => {
    const original = createFn('original');
    const replacement = createFn('replacement');
    globalThis.evtHandleRsvp = original;

    const summary = inlineHandlers.assignHandler('evtHandleRsvp', replacement);

    expectSameFunction('existing handler is preserved by default', globalThis.evtHandleRsvp, original);
    check('preserve summary records preserved handler', hasAll(summary.preserved, ['evtHandleRsvp']));
    check('preserve summary has no installed entries', summary.installed.length === 0);
    check('preserve summary has no skipped entries', summary.skipped.length === 0);
    check('preserve summary has no replaced entries', summary.replaced.length === 0);
});

console.log('\n-- Explicit replacement works --');
withIsolatedGlobals('explicit replacement scenario', () => {
    const original = createFn('original');
    const replacement = createFn('replacement');
    globalThis.evtHandleRsvp = original;

    const summary = inlineHandlers.assignHandler('evtHandleRsvp', replacement, { replaceExisting: true });

    expectSameFunction('replaceExisting replaces existing handler', globalThis.evtHandleRsvp, replacement);
    check('replace summary records replaced handler', hasAll(summary.replaced, ['evtHandleRsvp']));
    check('replace summary has no installed entries', summary.installed.length === 0);
    check('replace summary has no preserved entries', summary.preserved.length === 0);
    check('replace summary has no skipped entries', summary.skipped.length === 0);
});

console.log('\n-- Invalid non-function values are skipped --');
withIsolatedGlobals('invalid value scenario', () => {
    const summary = inlineHandlers.assignHandler('evtInvalidHandler', 'not a function');

    check('invalid handler is not installed', typeof globalThis.evtInvalidHandler === 'undefined');
    check('invalid summary records skipped handler', hasAll(summary.skipped, ['evtInvalidHandler']));
    check('invalid summary has no installed entries', summary.installed.length === 0);
    check('invalid summary has no preserved entries', summary.preserved.length === 0);
    check('invalid summary has no replaced entries', summary.replaced.length === 0);

    const missingNameSummary = inlineHandlers.assignHandler('', createFn('missing-name'));
    check('missing handler name is skipped', missingNameSummary.skipped.includes(''));
});

console.log('\n-- assignHandlers installs multiple handlers --');
withIsolatedGlobals('assignHandlers group scenario', () => {
    const evtHandleRsvp = createFn('rsvp');
    const evtJoinWaitlist = createFn('waitlist');
    const evtOpenDetail = createFn('detail');

    const summary = inlineHandlers.assignHandlers({
        evtHandleRsvp,
        evtJoinWaitlist,
        evtOpenDetail
    });

    expectSameFunction('assignHandlers installs evtHandleRsvp', globalThis.evtHandleRsvp, evtHandleRsvp);
    expectSameFunction('assignHandlers installs evtJoinWaitlist', globalThis.evtJoinWaitlist, evtJoinWaitlist);
    expectSameFunction('assignHandlers installs evtOpenDetail', globalThis.evtOpenDetail, evtOpenDetail);
    check('assignHandlers summary records all installed handlers', hasAll(summary.installed, ['evtHandleRsvp', 'evtJoinWaitlist', 'evtOpenDetail']));
    check('assignHandlers summary has no preserved entries', summary.preserved.length === 0);
    check('assignHandlers summary has no skipped entries', summary.skipped.length === 0);
    check('assignHandlers summary has no replaced entries', summary.replaced.length === 0);
});

console.log('\n-- installInlineHandlers installs grouped handlers --');
withIsolatedGlobals('grouped install scenario', () => {
    const handlers = {
        rsvp: { evtHandleRsvp: createFn('rsvp') },
        competition: { evtJoinCompetition: createFn('competition') },
        documents: { evtOpenDocumentsPanel: createFn('documents') },
        map: { evtInitMap: createFn('map') },
        scanner: { evtOpenScanner: createFn('scanner') },
        detail: { evtOpenDetail: createFn('detail') }
    };

    const summary = inlineHandlers.installInlineHandlers(handlers);

    expectSameFunction('grouped install adds evtHandleRsvp', globalThis.evtHandleRsvp, handlers.rsvp.evtHandleRsvp);
    expectSameFunction('grouped install adds evtJoinCompetition', globalThis.evtJoinCompetition, handlers.competition.evtJoinCompetition);
    expectSameFunction('grouped install adds evtOpenDocumentsPanel', globalThis.evtOpenDocumentsPanel, handlers.documents.evtOpenDocumentsPanel);
    expectSameFunction('grouped install adds evtInitMap', globalThis.evtInitMap, handlers.map.evtInitMap);
    expectSameFunction('grouped install adds evtOpenScanner', globalThis.evtOpenScanner, handlers.scanner.evtOpenScanner);
    expectSameFunction('grouped install adds evtOpenDetail', globalThis.evtOpenDetail, handlers.detail.evtOpenDetail);
    check('grouped install summary records all installed handlers', hasAll(summary.installed, [
        'evtHandleRsvp',
        'evtJoinCompetition',
        'evtOpenDocumentsPanel',
        'evtInitMap',
        'evtOpenScanner',
        'evtOpenDetail'
    ]));
    check('grouped install summary has no preserved entries', summary.preserved.length === 0);
    check('grouped install summary has no skipped entries', summary.skipped.length === 0);
    check('grouped install summary has no replaced entries', summary.replaced.length === 0);
});

console.log('\n-- Summary object is accurate across mixed outcomes --');
withIsolatedGlobals('mixed summary scenario', () => {
    const existing = createFn('existing');
    const replacement = createFn('replacement');
    const installed = createFn('installed');
    globalThis.evtExistingOnly = existing;

    const summary = inlineHandlers.assignHandlers({
        evtExistingOnly: replacement,
        evtHandleRsvp: installed,
        evtInvalidHandler: null,
        evtOtherInvalidHandler: 123
    });

    expectSameFunction('mixed summary preserves existing handler', globalThis.evtExistingOnly, existing);
    expectSameFunction('mixed summary installs new handler', globalThis.evtHandleRsvp, installed);
    check('mixed summary does not install null invalid handler', typeof globalThis.evtInvalidHandler === 'undefined');
    check('mixed summary does not install numeric invalid handler', typeof globalThis.evtOtherInvalidHandler === 'undefined');
    check('mixed summary installed field is accurate', summary.installed.length === 1 && summary.installed[0] === 'evtHandleRsvp');
    check('mixed summary preserved field is accurate', summary.preserved.length === 1 && summary.preserved[0] === 'evtExistingOnly');
    check('mixed summary skipped field is accurate', hasAll(summary.skipped, ['evtInvalidHandler', 'evtOtherInvalidHandler']) && summary.skipped.length === 2);
    check('mixed summary replaced field is accurate', summary.replaced.length === 0);
});

console.log('\n-- Idempotency --');
withIsolatedGlobals('idempotency scenario', () => {
    const handlers = {
        rsvp: { evtHandleRsvp: createFn('rsvp') },
        competition: { evtJoinCompetition: createFn('competition') },
        documents: { evtOpenDocumentsPanel: createFn('documents') },
        map: { evtInitMap: createFn('map') },
        scanner: { evtOpenScanner: createFn('scanner') },
        detail: { evtOpenDetail: createFn('detail') }
    };

    const firstSummary = inlineHandlers.installInlineHandlers(handlers);
    const firstRefs = {
        evtHandleRsvp: globalThis.evtHandleRsvp,
        evtJoinCompetition: globalThis.evtJoinCompetition,
        evtOpenDocumentsPanel: globalThis.evtOpenDocumentsPanel,
        evtInitMap: globalThis.evtInitMap,
        evtOpenScanner: globalThis.evtOpenScanner,
        evtOpenDetail: globalThis.evtOpenDetail
    };
    const secondSummary = inlineHandlers.installInlineHandlers(handlers);

    check('first idempotency install records installed handlers', firstSummary.installed.length === 6);
    expectSameFunction('idempotency preserves evtHandleRsvp', globalThis.evtHandleRsvp, firstRefs.evtHandleRsvp);
    expectSameFunction('idempotency preserves evtJoinCompetition', globalThis.evtJoinCompetition, firstRefs.evtJoinCompetition);
    expectSameFunction('idempotency preserves evtOpenDocumentsPanel', globalThis.evtOpenDocumentsPanel, firstRefs.evtOpenDocumentsPanel);
    expectSameFunction('idempotency preserves evtInitMap', globalThis.evtInitMap, firstRefs.evtInitMap);
    expectSameFunction('idempotency preserves evtOpenScanner', globalThis.evtOpenScanner, firstRefs.evtOpenScanner);
    expectSameFunction('idempotency preserves evtOpenDetail', globalThis.evtOpenDetail, firstRefs.evtOpenDetail);
    check('second idempotency summary records preserved handlers', secondSummary.preserved.length === 6);
    check('second idempotency summary has no installed handlers', secondSummary.installed.length === 0);
    check('second idempotency summary has no skipped handlers', secondSummary.skipped.length === 0);
    check('second idempotency summary has no replaced handlers', secondSummary.replaced.length === 0);
});

console.log('\n-- Empty input summaries --');
withIsolatedGlobals('empty input scenario', () => {
    check('assignHandlers empty input returns empty summary', emptySummary(inlineHandlers.assignHandlers(null)));
    check('installInlineHandlers empty input returns empty summary', emptySummary(inlineHandlers.installInlineHandlers(null)));
});

const total = passed + failed;
console.log('\n' + '='.repeat(54));
console.log('Phase 4H inline handlers runtime harness: ' + total + ' checks - ' + passed + ' pass, ' + failed + ' fail');
console.log('='.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach((failure) => console.log('  FAIL ' + failure));
    console.log('\nPhase 4H inline handlers runtime harness: NEEDS REVIEW');
    process.exit(1);
}

console.log('\nPhase 4H inline handlers runtime harness: ALL PASS');
