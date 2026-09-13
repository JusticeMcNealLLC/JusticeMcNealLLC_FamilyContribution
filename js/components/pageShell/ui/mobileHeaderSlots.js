/**
 * Runtime API for filling #mobileHeader left/center/right slots.
 * Snapshot of the initial preset is taken after inject so resetMobileHeader works.
 */

const SLOT_IDS = {
    left: 'mhSlotLeft',
    center: 'mhSlotCenter',
    right: 'mhSlotRight',
};

let _snapshot = null;

function slotEl(key) {
    return document.getElementById(SLOT_IDS[key]);
}

function readSlots() {
    return {
        left: slotEl('left')?.innerHTML ?? '',
        center: slotEl('center')?.innerHTML ?? '',
        right: slotEl('right')?.innerHTML ?? '',
    };
}

function writeSlots(next) {
    ['left', 'center', 'right'].forEach((key) => {
        if (next[key] === undefined) return;
        const el = slotEl(key);
        if (el) el.innerHTML = next[key] == null ? '' : String(next[key]);
    });
    if (typeof loadBrandLogos === 'function') {
        try { loadBrandLogos(); } catch (_) { /* ignore */ }
    }
}

/** Capture current slot HTML as the page default (call once after inject). */
export function captureMobileHeaderSnapshot() {
    if (!document.getElementById('mobileHeader')) return;
    _snapshot = readSlots();
}

/**
 * Fill mobile header slots. Omitted keys are left unchanged.
 * @param {{ left?: string, center?: string, right?: string }} slots
 */
export function setMobileHeader(slots) {
    if (!slots || typeof slots !== 'object') return;
    if (!document.getElementById('mobileHeader')) return;
    writeSlots(slots);
}

/** Restore slots to the snapshot taken after pageShell inject. */
export function resetMobileHeader() {
    if (!_snapshot) return;
    writeSlots(_snapshot);
}

export function attachPageShellMobileHeaderApi(target) {
    const api = target && typeof target === 'object' ? target : {};
    api.setMobileHeader = setMobileHeader;
    api.resetMobileHeader = resetMobileHeader;
    return api;
}
