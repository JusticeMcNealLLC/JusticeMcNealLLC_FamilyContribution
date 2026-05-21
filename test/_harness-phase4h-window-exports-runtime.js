// Phase 4H local-only runtime harness - compat/window-exports.js
//
// Run: node test/_harness-phase4h-window-exports-runtime.js
'use strict';

const path = require('path');

const ROOT = path.join(__dirname, '..');
const windowExports = require(path.join(ROOT, 'js/portal/events/compat/window-exports.js'));

const GLOBAL_NAMES = [
    'PortalEvents',
    'EventsCreate',
    'EventsManage',
    'EventsRaffleModel',
    'evtLoadEvents',
    'evtOpenDetail',
    'evtHandleRsvp',
    'evtJoinCompetition',
    'evtOpenDocumentsPanel',
    'evtOpenScanner'
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

function createApis() {
    return {
        initEventsPage: function initEventsPage() {},
        constants: {
            CATEGORY_EMOJI: { meeting: 'M' },
            TYPE_COLORS: { meeting: '#123456' }
        },
        raffleModel: {
            normalizeConfig: function normalizeConfig() {}
        },
        list: {
            loadEvents: function loadEvents() {},
            render: function render() {}
        },
        detail: {
            open: function open() {},
            close: function close() {}
        },
        manage: {
            open: function manageOpen() {},
            close: function manageClose() {},
            refreshRaffle: function refreshRaffle() {}
        },
        create: {
            open: function createOpen() {},
            close: function createClose() {},
            isFlagOn: function isFlagOn() { return true; }
        },
        competition: {
            join: function join() {},
            submitEntry: function submitEntry() {}
        },
        globals: {
            evtLoadEvents: function evtLoadEvents() {},
            evtOpenDetail: function evtOpenDetail() {},
            evtHandleRsvp: function evtHandleRsvp() {},
            evtJoinCompetition: function evtJoinCompetition() {},
            evtOpenDocumentsPanel: function evtOpenDocumentsPanel() {},
            evtOpenScanner: function evtOpenScanner() {}
        }
    };
}

console.log('\n-- Phase 4H window-exports runtime harness --');

console.log('\n-- PortalEvents namespace creation --');
(() => {
    const root = {};
    const first = windowExports.ensurePortalEvents(root);
    check('ensurePortalEvents creates PortalEvents object', !!root.PortalEvents && first === root.PortalEvents);
    first.existing = true;
    const second = windowExports.ensurePortalEvents(root);
    check('ensurePortalEvents preserves existing PortalEvents object', second === first && second.existing === true);
})();

console.log('\n-- Namespace assignment --');
(() => {
    const root = { PortalEvents: { list: { existingListKey: true } } };
    const loadEvents = function loadEvents() {};
    const open = function open() {};

    const listNamespace = windowExports.assignNamespace(root.PortalEvents, 'list', { loadEvents });
    const detailNamespace = windowExports.assignNamespace(root.PortalEvents, 'detail', { open });

    check('assignNamespace preserves existing list namespace', listNamespace === root.PortalEvents.list && listNamespace.existingListKey === true);
    expectSameFunction('assignNamespace assigns list loadEvents', root.PortalEvents.list.loadEvents, loadEvents);
    check('assignNamespace creates detail namespace', detailNamespace === root.PortalEvents.detail);
    expectSameFunction('assignNamespace assigns detail open', root.PortalEvents.detail.open, open);
})();

console.log('\n-- Classic global preservation by default --');
withIsolatedGlobals('classic preservation scenario', () => {
    const existingCreate = { open: function existingCreateOpen() {}, existing: true };
    const existingManage = { open: function existingManageOpen() {}, existing: true };
    const existingRaffleModel = { normalizeConfig: function existingNormalizeConfig() {}, existing: true };
    const apis = createApis();

    globalThis.EventsCreate = existingCreate;
    globalThis.EventsManage = existingManage;
    globalThis.EventsRaffleModel = existingRaffleModel;

    windowExports.installWindowExports({
        create: apis.create,
        manage: apis.manage,
        raffleModel: apis.raffleModel
    });

    check('existing EventsCreate is preserved by default', globalThis.EventsCreate === existingCreate);
    check('existing EventsManage is preserved by default', globalThis.EventsManage === existingManage);
    check('existing EventsRaffleModel is preserved by default', globalThis.EventsRaffleModel === existingRaffleModel);
    expectSameFunction('PortalEvents.create still receives create API', globalThis.PortalEvents.create.open, apis.create.open);
    expectSameFunction('PortalEvents.manage still receives manage API', globalThis.PortalEvents.manage.open, apis.manage.open);
    check('PortalEvents.raffleModel still receives raffle model API', globalThis.PortalEvents.raffleModel === apis.raffleModel);
});

console.log('\n-- Classic global replacement only when explicit --');
withIsolatedGlobals('classic replacement scenario', () => {
    const existingCreate = { open: function existingCreateOpen() {}, existing: true };
    const existingManage = { open: function existingManageOpen() {}, existing: true };
    const existingRaffleModel = { normalizeConfig: function existingNormalizeConfig() {}, existing: true };
    const apis = createApis();

    globalThis.EventsCreate = existingCreate;
    globalThis.EventsManage = existingManage;
    globalThis.EventsRaffleModel = existingRaffleModel;

    windowExports.installWindowExports({
        create: apis.create,
        manage: apis.manage,
        raffleModel: apis.raffleModel,
        options: { replaceClassicGlobals: true }
    });

    check('replaceClassicGlobals replaces EventsCreate', globalThis.EventsCreate === apis.create);
    check('replaceClassicGlobals replaces EventsManage', globalThis.EventsManage === apis.manage);
    check('replaceClassicGlobals replaces EventsRaffleModel', globalThis.EventsRaffleModel === apis.raffleModel);
});

console.log('\n-- Install full bridge APIs --');
withIsolatedGlobals('full bridge installation scenario', () => {
    const apis = createApis();
    const portal = windowExports.installWindowExports(apis);

    check('installWindowExports returns global PortalEvents', portal === globalThis.PortalEvents);
    expectSameFunction('initEventsPage installed', portal.initEventsPage, apis.initEventsPage);
    check('constants namespace installed', portal.constants.CATEGORY_EMOJI === apis.constants.CATEGORY_EMOJI);
    check('raffleModel installed on PortalEvents', portal.raffleModel === apis.raffleModel);
    expectSameFunction('list API installed', portal.list.loadEvents, apis.list.loadEvents);
    expectSameFunction('detail API installed', portal.detail.open, apis.detail.open);
    expectSameFunction('manage API installed', portal.manage.open, apis.manage.open);
    expectSameFunction('create API installed', portal.create.open, apis.create.open);
    expectSameFunction('competition API installed', portal.competition.join, apis.competition.join);
    check('EventsCreate installed when missing', globalThis.EventsCreate === apis.create);
    check('EventsManage installed when missing', globalThis.EventsManage === apis.manage);
    check('EventsRaffleModel installed when missing', globalThis.EventsRaffleModel === apis.raffleModel);
});

console.log('\n-- Legacy evt* globals --');
withIsolatedGlobals('legacy evt globals scenario', () => {
    const apis = createApis();
    windowExports.installWindowExports({ globals: apis.globals });

    expectSameFunction('evtLoadEvents installed', globalThis.evtLoadEvents, apis.globals.evtLoadEvents);
    expectSameFunction('evtOpenDetail installed', globalThis.evtOpenDetail, apis.globals.evtOpenDetail);
    expectSameFunction('evtHandleRsvp installed', globalThis.evtHandleRsvp, apis.globals.evtHandleRsvp);
    expectSameFunction('evtJoinCompetition installed', globalThis.evtJoinCompetition, apis.globals.evtJoinCompetition);
    expectSameFunction('evtOpenDocumentsPanel installed', globalThis.evtOpenDocumentsPanel, apis.globals.evtOpenDocumentsPanel);
    expectSameFunction('evtOpenScanner installed', globalThis.evtOpenScanner, apis.globals.evtOpenScanner);
});

console.log('\n-- Idempotency --');
withIsolatedGlobals('idempotency scenario', () => {
    const apis = createApis();
    globalThis.PortalEvents = {
        list: { existingListKey: true },
        detail: { existingDetailKey: true }
    };

    const firstPortal = windowExports.installWindowExports(apis);
    firstPortal.list.localAfterFirstInstall = true;
    firstPortal.detail.localAfterFirstInstall = true;

    const secondPortal = windowExports.installWindowExports(apis);

    check('installWindowExports preserves PortalEvents object across calls', secondPortal === firstPortal);
    check('installWindowExports preserves existing list key across calls', secondPortal.list.existingListKey === true);
    check('installWindowExports preserves post-install list key across calls', secondPortal.list.localAfterFirstInstall === true);
    check('installWindowExports preserves existing detail key across calls', secondPortal.detail.existingDetailKey === true);
    check('installWindowExports preserves post-install detail key across calls', secondPortal.detail.localAfterFirstInstall === true);
    expectSameFunction('list loadEvents remains installed after repeated calls', secondPortal.list.loadEvents, apis.list.loadEvents);
    expectSameFunction('detail open remains installed after repeated calls', secondPortal.detail.open, apis.detail.open);
    expectSameFunction('evtHandleRsvp remains installed after repeated calls', globalThis.evtHandleRsvp, apis.globals.evtHandleRsvp);
});

const total = passed + failed;
console.log('\n' + '='.repeat(54));
console.log('Phase 4H window exports runtime harness: ' + total + ' checks - ' + passed + ' pass, ' + failed + ' fail');
console.log('='.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach((failure) => console.log('  FAIL ' + failure));
    console.log('\nPhase 4H window exports runtime harness: NEEDS REVIEW');
    process.exit(1);
}

console.log('\nPhase 4H window exports runtime harness: ALL PASS');
