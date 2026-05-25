'use strict';

/** Re-render list/hero when admin changes event via manage sheet (events_006). */
document.addEventListener('events:manage:updated', () => {
    if (typeof globalThis.evtLoadEvents === 'function') {
        globalThis.evtLoadEvents();
    }
});
