'use strict';
/** Copy named exports / fns onto globalThis + window for init.js and onclick handlers. */
export function publishGlobals(map) {
    for (const [name, fn] of Object.entries(map)) {
        if (typeof fn === 'function') {
            globalThis[name] = fn;
            if (typeof window !== 'undefined') window[name] = fn;
        }
    }
}
