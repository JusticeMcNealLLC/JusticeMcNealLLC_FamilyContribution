'use strict';

function getRoot() {
    if (typeof window !== 'undefined') return window;
    if (typeof globalThis !== 'undefined') return globalThis;
    return null;
}

function ensurePortalEvents(root) {
    var target = root || getRoot();
    if (!target) {
        throw new Error('A global root is required to install portal event window exports');
    }
    target.PortalEvents = target.PortalEvents || {};
    return target.PortalEvents;
}

function assignNamespace(root, key, api) {
    if (!root || !key || !api) return null;
    root[key] = root[key] || {};
    Object.assign(root[key], api);
    return root[key];
}

function assignGlobals(globals) {
    var root = getRoot();
    if (!root || !globals) return root;

    Object.keys(globals).forEach(function (key) {
        if (typeof globals[key] !== 'undefined') {
            root[key] = globals[key];
        }
    });

    return root;
}

function preserveClassicGlobal(root, key, api, replaceExisting) {
    if (!root || !key || !api) return null;
    if (replaceExisting || typeof root[key] === 'undefined' || root[key] === null) {
        root[key] = api;
    }
    return root[key];
}

function installWindowExports(apis) {
    var root = getRoot();
    var portal = ensurePortalEvents(root);
    var options = (apis && apis.options) || {};
    var replaceClassicGlobals = options.replaceClassicGlobals === true;

    apis = apis || {};

    if (apis.initEventsPage) {
        portal.initEventsPage = apis.initEventsPage;
    }

    if (apis.constants) {
        assignNamespace(portal, 'constants', apis.constants);
    }

    if (apis.raffleModel) {
        portal.raffleModel = apis.raffleModel;
        preserveClassicGlobal(root, 'EventsRaffleModel', apis.raffleModel, replaceClassicGlobals);
    }

    if (apis.list) {
        assignNamespace(portal, 'list', apis.list);
    }

    if (apis.detail) {
        assignNamespace(portal, 'detail', apis.detail);
    }

    if (apis.manage) {
        assignNamespace(portal, 'manage', apis.manage);
        preserveClassicGlobal(root, 'EventsManage', apis.manage, replaceClassicGlobals);
    }

    if (apis.create) {
        assignNamespace(portal, 'create', apis.create);
        preserveClassicGlobal(root, 'EventsCreate', apis.create, replaceClassicGlobals);
    }

    if (apis.competition) {
        assignNamespace(portal, 'competition', apis.competition);
    }

    if (apis.globals) {
        assignGlobals(apis.globals);
    }

    return portal;
}

var WindowExports = {
    getRoot: getRoot,
    ensurePortalEvents: ensurePortalEvents,
    assignNamespace: assignNamespace,
    assignGlobals: assignGlobals,
    installWindowExports: installWindowExports
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WindowExports;
}

if (typeof window !== 'undefined') {
    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.windowExports = WindowExports;
}
