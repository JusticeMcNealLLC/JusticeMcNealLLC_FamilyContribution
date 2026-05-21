'use strict';

function getRoot() {
    if (typeof window !== 'undefined') return window;
    if (typeof globalThis !== 'undefined') return globalThis;
    return null;
}

function requireGlobal(name, purpose) {
    var root = getRoot();
    if (!root || typeof root[name] === 'undefined' || root[name] === null) {
        throw new Error(name + ' is required for ' + purpose);
    }
    return root[name];
}

function optionalGlobal(name) {
    var root = getRoot();
    if (!root || typeof root[name] === 'undefined' || root[name] === null) {
        return null;
    }
    return root[name];
}

function firstOptionalGlobal(names) {
    for (var i = 0; i < names.length; i++) {
        var value = optionalGlobal(names[i]);
        if (value) return value;
    }
    return null;
}

// Required dependency: portal events cannot safely boot private event data without the configured Supabase client.
function getSupabaseClient() {
    return requireGlobal('supabaseClient', 'portal events data access');
}

// Required dependency: auth must fail clearly before private portal data loads.
function getCheckAuth() {
    return requireGlobal('checkAuth', 'portal events authentication');
}

// Required dependency: fail hard for now so create/manage affordances cannot accidentally fail open.
function getHasPermission() {
    return requireGlobal('hasPermission', 'portal events permission checks');
}

// Action-dependent dependency: fail hard when checkout or admin action code explicitly asks for it.
function getCallEdgeFunction() {
    return requireGlobal('callEdgeFunction', 'portal events Edge Function actions');
}

// Action-dependent dependency: fail hard when function URL construction is explicitly requested.
function getFunctionUrl() {
    return requireGlobal('getFunctionUrl', 'portal events function URL actions');
}

// Optional dependency: QR-only UI can degrade without blocking list/detail boot.
function getQRCode() {
    return optionalGlobal('QRCode');
}

// Optional dependency: scanner UI can report unavailable without blocking the events page.
function getJsQR() {
    return optionalGlobal('jsQR');
}

// Optional dependency: map UI can report unavailable without blocking other detail sections.
function getLeaflet() {
    return optionalGlobal('L');
}

// Optional dependency: notification panel/helper globals are not required for events page boot.
function getNotificationsApi() {
    return firstOptionalGlobal(['JMNotifications', 'NotificationsApi', 'notificationsApi']);
}

// Optional dependency: current push helper exposes window.JMPush, but events page boot should not depend on it.
function getPushApi() {
    return firstOptionalGlobal(['JMPush', 'PushApi', 'pushApi']);
}

function getExternalDeps() {
    return {
        supabaseClient: getSupabaseClient(),
        checkAuth: getCheckAuth(),
        hasPermission: getHasPermission(),
        callEdgeFunction: getCallEdgeFunction(),
        getFunctionUrl: getFunctionUrl(),
        QRCode: getQRCode(),
        jsQR: getJsQR(),
        Leaflet: getLeaflet(),
        notifications: getNotificationsApi(),
        push: getPushApi()
    };
}

var ExternalGlobals = {
    requireGlobal: requireGlobal,
    optionalGlobal: optionalGlobal,
    getSupabaseClient: getSupabaseClient,
    getCheckAuth: getCheckAuth,
    getHasPermission: getHasPermission,
    getCallEdgeFunction: getCallEdgeFunction,
    getFunctionUrl: getFunctionUrl,
    getQRCode: getQRCode,
    getJsQR: getJsQR,
    getLeaflet: getLeaflet,
    getNotificationsApi: getNotificationsApi,
    getPushApi: getPushApi,
    getExternalDeps: getExternalDeps
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExternalGlobals;
}

if (typeof window !== 'undefined') {
    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.externalGlobals = ExternalGlobals;
}
