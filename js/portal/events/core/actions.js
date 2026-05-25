'use strict';

/**
 * Delegated click handling for portal Events UI.
 * Replaces inline onclick="evtFoo(...)" with data-evt-action attributes.
 *
 * Handlers resolve from globalThis at click time (populated by publishGlobals
 * in each module). New module code should import siblings; only HTML-facing
 * APIs need publishGlobals().
 */

/** @param {string} action evt* handler name on globalThis */
export function evtDataAction(action, ...args) {
    if (!action) return '';
    let attrs = `data-evt-action="${String(action).replace(/"/g, '&quot;')}"`;
    if (args.length) {
        const json = JSON.stringify(args);
        attrs += ` data-evt-args="${json.replace(/"/g, '&quot;')}"`;
    }
    return attrs;
}

let _delegateInstalled = false;

export function installEvtActionDelegate() {
    if (_delegateInstalled) return;
    _delegateInstalled = true;

    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-evt-action]');
        if (!el) return;

        const action = el.getAttribute('data-evt-action');
        if (!action) return;

        const fn = globalThis[action];
        if (typeof fn !== 'function') {
            console.warn(`[events actions] ${action} is not a function`);
            return;
        }

        let args = [];
        const raw = el.getAttribute('data-evt-args');
        if (raw) {
            try {
                args = JSON.parse(raw);
            } catch (_) {
                console.warn('[events actions] invalid data-evt-args on', el);
                return;
            }
        }

        fn(...args);
    });
}

/** Expose template helper for modules not yet importing evtDataAction directly. */
globalThis.evtDataAction = evtDataAction;

installEvtActionDelegate();
