// Portal Events — Create sheet: Disclaimers step (§13.5 MVP — form state only)

'use strict';

const TITLE_MAX = 80;
const BODY_MAX = 4000;
const DEFAULT_NO_REFUNDS_ID = 'default-no-refunds';
const DEFAULT_FLYERS_ID = 'default-flyers';

export function seedDefaultDisclaimers() {
    return [
        {
            id: DEFAULT_NO_REFUNDS_ID,
            title: 'No refunds',
            body: 'Payments for this event are non-refundable for the payment period unless the event is cancelled or rescheduled by organizers.',
            required: true,
            is_default: true,
        },
        {
            id: DEFAULT_FLYERS_ID,
            title: 'Flyers / tickets',
            body: 'Guests who book their own travel (flights, etc.) are responsible for those costs; the event fee does not reimburse tickets or travel.',
            required: true,
            is_default: true,
        },
    ];
}

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function _newId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `disc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function _list() {
    const STATE = window.EventsCreateSteps.getState();
    if (!Array.isArray(STATE.form.disclaimers) || !STATE.form.disclaimers.length) {
        STATE.form.disclaimers = seedDefaultDisclaimers();
    }
    return STATE.form.disclaimers;
}

function _ensureDefaults(list) {
    const byId = new Map(list.map((d) => [d.id, d]));
    const seeded = seedDefaultDisclaimers();
    const out = [];
    for (const def of seeded) {
        const existing = byId.get(def.id);
        if (existing) {
            out.push({
                ...existing,
                id: def.id,
                required: true,
                is_default: true,
            });
            byId.delete(def.id);
        } else {
            out.push({ ...def });
        }
    }
    for (const d of list) {
        if (d.is_default || d.id === DEFAULT_NO_REFUNDS_ID || d.id === DEFAULT_FLYERS_ID) continue;
        out.push(d);
    }
    return out;
}

/** Ensure locked defaults are present; safe for manage + create. */
export function ensureDefaultDisclaimers(list) {
    return _ensureDefaults(Array.isArray(list) ? list : []);
}

function html() {
    const STATE = window.EventsCreateSteps.getState();
    STATE.form.disclaimers = _ensureDefaults(_list());
    const list = STATE.form.disclaimers;
    const locked = !!STATE.disclaimersLocked;

    if (locked) {
        return `
            <div class="ec-lock-banner">Disclaimers are locked after RSVPs. Acknowledgments already recorded stay as-is.</div>
            ${list.map((item, index) => {
                const isDefault = !!item.is_default;
                return `
                <div class="ec-raffle-item-wrap">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        ${isDefault ? 'Required default' : `Clause ${index + 1}`}${item.required ? ' · Required' : ''}
                    </span>
                    <p class="text-sm font-bold text-gray-900 mt-1">${_esc(item.title || '')}</p>
                    <p class="text-xs text-gray-600 mt-1 whitespace-pre-wrap">${_esc(item.body || '')}</p>
                </div>`;
            }).join('')}
        `;
    }

    return `
        <div class="ec-row">
            <p class="text-sm text-gray-600 mb-2">Guests must acknowledge these clauses when they RSVP. Two defaults are required; you can edit them and add more. Editable until the first RSVP, then locked.</p>
        </div>
        ${list.map((item, index) => {
            const isDefault = !!item.is_default;
            return `
            <div class="ec-raffle-item-wrap" data-disc-id="${_esc(item.id)}">
                <div class="ec-raffle-head">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        ${isDefault ? 'Required default' : `Clause ${index + 1}`}
                    </span>
                    <div class="flex items-center gap-1">
                        <button type="button" class="ec-icon-btn" data-disc-up="${_esc(item.id)}" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
                        <button type="button" class="ec-icon-btn" data-disc-down="${_esc(item.id)}" ${index === list.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
                        ${isDefault
                            ? '<span class="ec-help" style="margin:0">Locked</span>'
                            : `<button type="button" class="ec-mini-btn" data-disc-remove="${_esc(item.id)}" style="border-color:#fecaca;color:#dc2626">Remove</button>`}
                    </div>
                </div>
                <div class="ec-row" style="margin-bottom:10px">
                    <label class="ec-label">Title</label>
                    <input class="ec-input" type="text" maxlength="${TITLE_MAX}" data-disc-title="${_esc(item.id)}" value="${_esc(item.title || '')}">
                </div>
                <div class="ec-row" style="margin-bottom:10px">
                    <label class="ec-label">Body</label>
                    <textarea class="ec-input ec-textarea" maxlength="${BODY_MAX}" data-disc-body="${_esc(item.id)}" placeholder="Disclaimer text…">${_esc(item.body || '')}</textarea>
                </div>
                <div class="ec-row" style="margin-bottom:0">
                    ${isDefault
                        ? `<label class="ec-check"><input type="checkbox" checked disabled><span>Required at RSVP (default)</span></label>`
                        : `<label class="ec-check"><input type="checkbox" data-disc-required="${_esc(item.id)}" ${item.required ? 'checked' : ''}><span>Required at RSVP</span></label>`}
                </div>
            </div>
        `;
        }).join('')}
        <button type="button" id="ecDiscAdd" class="ec-mini-btn" style="margin-top:12px">+ Add clause</button>
    `;
}

function wire() {
    const STATE = window.EventsCreateSteps.getState();
    if (STATE.disclaimersLocked) return;
    const render = window.EventsCreateSteps.render;
    STATE.form.disclaimers = _ensureDefaults(_list());
    const list = STATE.form.disclaimers;

    document.getElementById('ecDiscAdd')?.addEventListener('click', () => {
        list.push({
            id: _newId(),
            title: '',
            body: '',
            required: true,
            is_default: false,
        });
        render();
    });

    document.querySelectorAll('[data-disc-title]').forEach((el) => {
        el.addEventListener('input', () => {
            const item = list.find((d) => d.id === el.getAttribute('data-disc-title'));
            if (item) item.title = el.value.slice(0, TITLE_MAX);
        });
    });

    document.querySelectorAll('[data-disc-body]').forEach((el) => {
        el.addEventListener('input', () => {
            const item = list.find((d) => d.id === el.getAttribute('data-disc-body'));
            if (item) item.body = el.value.slice(0, BODY_MAX);
        });
    });

    document.querySelectorAll('[data-disc-required]').forEach((el) => {
        el.addEventListener('change', () => {
            const item = list.find((d) => d.id === el.getAttribute('data-disc-required'));
            if (item && !item.is_default) item.required = !!el.checked;
        });
    });

    document.querySelectorAll('[data-disc-up]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-disc-up');
            const i = list.findIndex((d) => d.id === id);
            if (i <= 0) return;
            const tmp = list[i - 1];
            list[i - 1] = list[i];
            list[i] = tmp;
            render();
        });
    });

    document.querySelectorAll('[data-disc-down]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-disc-down');
            const i = list.findIndex((d) => d.id === id);
            if (i < 0 || i >= list.length - 1) return;
            const tmp = list[i + 1];
            list[i + 1] = list[i];
            list[i] = tmp;
            render();
        });
    });

    document.querySelectorAll('[data-disc-remove]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-disc-remove');
            const item = list.find((d) => d.id === id);
            if (!item || item.is_default) return;
            if ((item.title || '').trim() || (item.body || '').trim()) {
                if (!confirm('Remove this disclaimer clause?')) return;
            }
            STATE.form.disclaimers = list.filter((d) => d.id !== id);
            render();
        });
    });
}

export function validateDisclaimers(form) {
    let list = Array.isArray(form?.disclaimers) ? form.disclaimers : [];
    list = _ensureDefaults(list);
    if (form) form.disclaimers = list;

    const hasNoRefunds = list.some((d) => d.id === DEFAULT_NO_REFUNDS_ID);
    const hasFlyers = list.some((d) => d.id === DEFAULT_FLYERS_ID);
    if (!hasNoRefunds || !hasFlyers) {
        return 'Required default disclaimers are missing. Re-open the Disclaimers step.';
    }

    for (let i = 0; i < list.length; i++) {
        const item = list[i] || {};
        const title = String(item.title || '').trim();
        const body = String(item.body || '').trim();
        if (!title) return `Disclaimer ${i + 1} needs a title.`;
        if (title.length > TITLE_MAX) return `Disclaimer ${i + 1} title must be ${TITLE_MAX} characters or fewer.`;
        if (!body) return `Disclaimer ${i + 1} needs body text.`;
        if (body.length > BODY_MAX) return `Disclaimer ${i + 1} body must be ${BODY_MAX} characters or fewer.`;
        if (item.is_default && !item.required) {
            return `Default disclaimer "${title}" must stay required.`;
        }
    }
    return null;
}

export const createStepDisclaimersApi = {
    html,
    wire,
    validateDisclaimers,
    seedDefaultDisclaimers,
    ensureDefaultDisclaimers,
};

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.disclaimers = createStepDisclaimersApi;
globalThis.EventsCreateSteps.seedDefaultDisclaimers = seedDefaultDisclaimers;
