// Phase 4H local-only runtime harness - compat/external-globals.js
//
// Run: node test/_harness-phase4h-external-globals-runtime.js
'use strict';

const path = require('path');

const ROOT = path.join(__dirname, '..');
const externalGlobals = require(path.join(ROOT, 'js/portal/events/compat/external-globals.js'));

const GLOBAL_NAMES = [
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

function expectThrowContains(label, fn, expected) {
    let ok = false;
    let actual = '';
    try {
        fn();
    } catch (err) {
        actual = err && err.message ? err.message : String(err);
        ok = actual.includes(expected);
    }
    check(label, ok, ok ? '' : 'expected message containing "' + expected + '", got "' + actual + '"');
}

console.log('\n-- Phase 4H external-globals runtime harness --');

console.log('\n-- Required globals present --');
withIsolatedGlobals('required globals present scenario', () => {
    const supabaseClient = { from: function from() {} };
    const checkAuth = function checkAuth() {};
    const hasPermission = function hasPermission() {};

    globalThis.supabaseClient = supabaseClient;
    globalThis.checkAuth = checkAuth;
    globalThis.hasPermission = hasPermission;

    check('getSupabaseClient returns mocked client', externalGlobals.getSupabaseClient() === supabaseClient);
    check('getCheckAuth returns mocked function', externalGlobals.getCheckAuth() === checkAuth);
    check('getHasPermission returns mocked function', externalGlobals.getHasPermission() === hasPermission);
});

console.log('\n-- Action-dependent globals present --');
withIsolatedGlobals('action-dependent globals present scenario', () => {
    const callEdgeFunction = function callEdgeFunction() {};
    const getFunctionUrl = function getFunctionUrl() {};

    globalThis.callEdgeFunction = callEdgeFunction;
    globalThis.getFunctionUrl = getFunctionUrl;

    check('getCallEdgeFunction returns mocked function', externalGlobals.getCallEdgeFunction() === callEdgeFunction);
    check('getFunctionUrl returns mocked function', externalGlobals.getFunctionUrl() === getFunctionUrl);
});

console.log('\n-- Optional globals present --');
withIsolatedGlobals('optional globals present scenario', () => {
    const QRCode = { toCanvas: function toCanvas() {} };
    const jsQR = function jsQR() {};
    const Leaflet = { map: function map() {} };
    const notifications = { notify: function notify() {} };
    const push = { subscribe: function subscribe() {} };

    globalThis.QRCode = QRCode;
    globalThis.jsQR = jsQR;
    globalThis.L = Leaflet;
    globalThis.JMNotifications = notifications;
    globalThis.JMPush = push;

    check('getQRCode returns mocked QRCode', externalGlobals.getQRCode() === QRCode);
    check('getJsQR returns mocked jsQR', externalGlobals.getJsQR() === jsQR);
    check('getLeaflet returns mocked Leaflet', externalGlobals.getLeaflet() === Leaflet);
    check('getNotificationsApi returns primary notifications global', externalGlobals.getNotificationsApi() === notifications);
    check('getPushApi returns primary push global', externalGlobals.getPushApi() === push);
});

console.log('\n-- Optional fallback globals present --');
withIsolatedGlobals('optional fallback globals present scenario', () => {
    const notificationsFallback = { toast: function toast() {} };
    const pushFallback = { enable: function enable() {} };

    globalThis.NotificationsApi = notificationsFallback;
    globalThis.PushApi = pushFallback;

    check('getNotificationsApi returns fallback NotificationsApi', externalGlobals.getNotificationsApi() === notificationsFallback);
    check('getPushApi returns fallback PushApi', externalGlobals.getPushApi() === pushFallback);

    delete globalThis.NotificationsApi;
    delete globalThis.PushApi;
    globalThis.notificationsApi = notificationsFallback;
    globalThis.pushApi = pushFallback;

    check('getNotificationsApi returns fallback notificationsApi', externalGlobals.getNotificationsApi() === notificationsFallback);
    check('getPushApi returns fallback pushApi', externalGlobals.getPushApi() === pushFallback);
});

console.log('\n-- Optional globals missing --');
withIsolatedGlobals('optional globals missing scenario', () => {
    check('getQRCode returns null when missing', externalGlobals.getQRCode() === null);
    check('getJsQR returns null when missing', externalGlobals.getJsQR() === null);
    check('getLeaflet returns null when missing', externalGlobals.getLeaflet() === null);
    check('getNotificationsApi returns null when missing', externalGlobals.getNotificationsApi() === null);
    check('getPushApi returns null when missing', externalGlobals.getPushApi() === null);
});

console.log('\n-- Required globals missing --');
withIsolatedGlobals('required globals missing scenario', () => {
    expectThrowContains('getSupabaseClient throws clear required error', externalGlobals.getSupabaseClient, 'supabaseClient is required for portal events data access');
    expectThrowContains('getCheckAuth throws clear required error', externalGlobals.getCheckAuth, 'checkAuth is required for portal events authentication');
    expectThrowContains('getHasPermission throws clear required error', externalGlobals.getHasPermission, 'hasPermission is required for portal events permission checks');
    expectThrowContains('getCallEdgeFunction throws clear required error', externalGlobals.getCallEdgeFunction, 'callEdgeFunction is required for portal events Edge Function actions');
    expectThrowContains('getFunctionUrl throws clear required error', externalGlobals.getFunctionUrl, 'getFunctionUrl is required for portal events function URL actions');
});

console.log('\n-- getExternalDeps with optional dependencies present --');
withIsolatedGlobals('getExternalDeps optional present scenario', () => {
    const supabaseClient = { from: function from() {} };
    const checkAuth = function checkAuth() {};
    const hasPermission = function hasPermission() {};
    const callEdgeFunction = function callEdgeFunction() {};
    const getFunctionUrl = function getFunctionUrl() {};
    const QRCode = { toString: function toString() {} };
    const jsQR = function jsQR() {};
    const Leaflet = { marker: function marker() {} };
    const notifications = { success: function success() {} };
    const push = { unsubscribe: function unsubscribe() {} };

    Object.assign(globalThis, {
        supabaseClient,
        checkAuth,
        hasPermission,
        callEdgeFunction,
        getFunctionUrl,
        QRCode,
        jsQR,
        L: Leaflet,
        JMNotifications: notifications,
        JMPush: push
    });

    const deps = externalGlobals.getExternalDeps();
    check('getExternalDeps returns supabaseClient', deps.supabaseClient === supabaseClient);
    check('getExternalDeps returns checkAuth', deps.checkAuth === checkAuth);
    check('getExternalDeps returns hasPermission', deps.hasPermission === hasPermission);
    check('getExternalDeps returns callEdgeFunction', deps.callEdgeFunction === callEdgeFunction);
    check('getExternalDeps returns getFunctionUrl', deps.getFunctionUrl === getFunctionUrl);
    check('getExternalDeps returns QRCode', deps.QRCode === QRCode);
    check('getExternalDeps returns jsQR', deps.jsQR === jsQR);
    check('getExternalDeps returns Leaflet from L', deps.Leaflet === Leaflet);
    check('getExternalDeps returns notifications API', deps.notifications === notifications);
    check('getExternalDeps returns push API', deps.push === push);
});

console.log('\n-- getExternalDeps with optional dependencies missing --');
withIsolatedGlobals('getExternalDeps optional missing scenario', () => {
    const supabaseClient = { from: function from() {} };
    const checkAuth = function checkAuth() {};
    const hasPermission = function hasPermission() {};
    const callEdgeFunction = function callEdgeFunction() {};
    const getFunctionUrl = function getFunctionUrl() {};

    Object.assign(globalThis, {
        supabaseClient,
        checkAuth,
        hasPermission,
        callEdgeFunction,
        getFunctionUrl
    });

    const deps = externalGlobals.getExternalDeps();
    check('getExternalDeps returns required supabaseClient when optional deps are missing', deps.supabaseClient === supabaseClient);
    check('getExternalDeps returns required checkAuth when optional deps are missing', deps.checkAuth === checkAuth);
    check('getExternalDeps returns required hasPermission when optional deps are missing', deps.hasPermission === hasPermission);
    check('getExternalDeps returns action-dependent callEdgeFunction when optional deps are missing', deps.callEdgeFunction === callEdgeFunction);
    check('getExternalDeps returns action-dependent getFunctionUrl when optional deps are missing', deps.getFunctionUrl === getFunctionUrl);
    check('getExternalDeps returns null QRCode when missing', deps.QRCode === null);
    check('getExternalDeps returns null jsQR when missing', deps.jsQR === null);
    check('getExternalDeps returns null Leaflet when missing', deps.Leaflet === null);
    check('getExternalDeps returns null notifications when missing', deps.notifications === null);
    check('getExternalDeps returns null push when missing', deps.push === null);
});

const total = passed + failed;
console.log('\n' + '='.repeat(54));
console.log('Phase 4H external globals runtime harness: ' + total + ' checks - ' + passed + ' pass, ' + failed + ' fail');
console.log('='.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach((failure) => console.log('  FAIL ' + failure));
    console.log('\nPhase 4H external globals runtime harness: NEEDS REVIEW');
    process.exit(1);
}

console.log('\nPhase 4H external globals runtime harness: ALL PASS');
