// Portal Events — Manage overview: Disclaimers editor (hard-lock after RSVPs)

'use strict';

import {
    ensureDefaultDisclaimers,
    seedDefaultDisclaimers,
    validateDisclaimers,
} from '../create/step-disclaimers.js';

const TITLE_MAX = 80;
const BODY_MAX = 4000;

let _draft = null;
let _draftEventId = null;

function api() {
    return window.EventsManageOverviewApi || {};
}

function getState() {
    return api().getState?.() || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}

function newId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `disc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFromEvent(event) {
    const raw = window.EventsDisclaimers && typeof window.EventsDisclaimers.normalizeDisclaimers === 'function'
        ? window.EventsDisclaimers.normalizeDisclaimers(event?.disclaimers)
        : (Array.isArray(event?.disclaimers) ? event.disclaimers : []);
    const withDefaults = ensureDefaultDisclaimers(raw.length ? raw : seedDefaultDisclaimers());
    return withDefaults.map((d) => ({ ...d }));
}

function resetDraft(STATE) {
    _draft = normalizeFromEvent(STATE?.event);
    _draftEventId = STATE?.event?.id || null;
    return _draft;
}

function getDraft(STATE) {
    if (!_draft || _draftEventId !== STATE?.event?.id) {
        return resetDraft(STATE);
    }
    return _draft;
}

export function disclaimersLocked(STATE) {
    const members = Array.isArray(STATE?.rsvps) ? STATE.rsvps.length : 0;
    const guests = Array.isArray(STATE?.guestRsvps) ? STATE.guestRsvps.length : 0;
    return members + guests > 0;
}

async function countEventRsvps(eventId) {
    const [memberRes, guestRes] = await Promise.all([
        supabaseClient.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
        supabaseClient.from('event_guest_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    ]);
    if (memberRes.error) throw memberRes.error;
    if (guestRes.error) throw guestRes.error;
    return (memberRes.count || 0) + (guestRes.count || 0);
}

function clauseCardHtml(item, index, listLength, locked) {
    const isDefault = !!item.is_default;
    if (locked) {
        return `
            <div class="rounded-lg border border-gray-200 bg-white px-3 py-3 mb-2">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    ${isDefault ? 'Required default' : `Clause ${index + 1}`}
                    ${item.required ? ' · Required' : ''}
                </p>
                <p class="text-sm font-semibold text-gray-900 mb-1">${esc(item.title || '')}</p>
                <p class="text-xs text-gray-600 whitespace-pre-wrap">${esc(item.body || '')}</p>
            </div>`;
    }

    return `
        <div class="rounded-lg border border-gray-200 bg-white px-3 py-3 mb-2" data-em-disc-id="${esc(item.id)}">
            <div class="flex items-center justify-between gap-2 mb-2">
                <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    ${isDefault ? 'Required default' : `Clause ${index + 1}`}
                </span>
                <div class="flex items-center gap-1">
                    <button type="button" class="em-btn-ghost" style="padding:4px 8px" data-em-disc-up="${esc(item.id)}" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
                    <button type="button" class="em-btn-ghost" style="padding:4px 8px" data-em-disc-down="${esc(item.id)}" ${index === listLength - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
                    ${isDefault
                        ? '<span class="text-xs text-gray-400">Locked</span>'
                        : `<button type="button" class="em-btn-ghost" style="padding:4px 8px;color:#dc2626" data-em-disc-remove="${esc(item.id)}">Remove</button>`}
                </div>
            </div>
            <div class="mb-2">
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Title</label>
                <input class="em-input" type="text" maxlength="${TITLE_MAX}" data-em-disc-title="${esc(item.id)}" value="${esc(item.title || '')}">
            </div>
            <div class="mb-2">
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Body</label>
                <textarea class="em-textarea" rows="3" maxlength="${BODY_MAX}" data-em-disc-body="${esc(item.id)}" placeholder="Disclaimer text…">${esc(item.body || '')}</textarea>
            </div>
            <div>
                ${isDefault
                    ? `<label class="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" checked disabled><span>Required at RSVP (default)</span></label>`
                    : `<label class="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" data-em-disc-required="${esc(item.id)}" ${item.required ? 'checked' : ''}><span>Required at RSVP</span></label>`}
            </div>
        </div>`;
}

export function disclaimersEditorHtml(STATE) {
    const e = STATE.event;
    if (!e) return '';
    const locked = disclaimersLocked(STATE);
    const list = locked ? normalizeFromEvent(e) : getDraft(STATE);
    const lockBanner = locked
        ? `<div class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Disclaimers are locked after RSVPs. Acknowledgments already recorded stay as-is; changes aren’t applied retroactively.</div>`
        : `<p class="em-section-sub mb-3">Edit before anyone RSVPs. After the first RSVP, these clauses lock permanently.</p>`;

    return `
        <div class="em-card mb-3" id="emDisclaimersEditorCard">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Disclaimers</h3>
                    ${lockBanner}
                </div>
            </div>
            <div id="emDisclaimersForm">
                ${list.map((item, index) => clauseCardHtml(item, index, list.length, locked)).join('')}
                ${locked ? '' : `
                <button type="button" id="emDiscAdd" class="em-btn-ghost" style="margin-top:4px">+ Add clause</button>
                <div class="flex flex-wrap items-center gap-2 pt-3">
                    <button type="button" id="emDiscSave" class="em-btn-primary">Save disclaimers</button>
                    <button type="button" id="emDiscCancel" class="em-btn-ghost">Cancel</button>
                    <span id="emDiscStatus" class="text-xs text-gray-400"></span>
                </div>`}
                ${locked ? '<span id="emDiscStatus" class="hidden"></span>' : ''}
            </div>
        </div>
    `;
}

function rerenderOverviewKeepingStatus(message, isError) {
    api().renderTab?.('overview');
    setTimeout(() => {
        const status = document.getElementById('emDiscStatus');
        if (!status || !message) return;
        status.className = isError ? 'text-xs text-red-600' : 'text-xs text-gray-400';
        status.textContent = message;
        if (!isError) {
            setTimeout(() => { if (status.textContent === message) status.textContent = ''; }, 2500);
        }
    }, 0);
}

export function wireDisclaimersEditor() {
    const STATE = getState();
    if (!STATE.event) return;
    if (disclaimersLocked(STATE)) return;

    const list = getDraft(STATE);

    document.getElementById('emDiscAdd')?.addEventListener('click', () => {
        list.push({
            id: newId(),
            title: '',
            body: '',
            required: true,
            is_default: false,
        });
        api().renderTab?.('overview');
    });

    document.querySelectorAll('[data-em-disc-title]').forEach((el) => {
        el.addEventListener('input', () => {
            const item = list.find((d) => d.id === el.getAttribute('data-em-disc-title'));
            if (item) item.title = el.value.slice(0, TITLE_MAX);
        });
    });

    document.querySelectorAll('[data-em-disc-body]').forEach((el) => {
        el.addEventListener('input', () => {
            const item = list.find((d) => d.id === el.getAttribute('data-em-disc-body'));
            if (item) item.body = el.value.slice(0, BODY_MAX);
        });
    });

    document.querySelectorAll('[data-em-disc-required]').forEach((el) => {
        el.addEventListener('change', () => {
            const item = list.find((d) => d.id === el.getAttribute('data-em-disc-required'));
            if (item && !item.is_default) item.required = !!el.checked;
        });
    });

    document.querySelectorAll('[data-em-disc-up]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-em-disc-up');
            const i = list.findIndex((d) => d.id === id);
            if (i <= 0) return;
            const tmp = list[i - 1];
            list[i - 1] = list[i];
            list[i] = tmp;
            api().renderTab?.('overview');
        });
    });

    document.querySelectorAll('[data-em-disc-down]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-em-disc-down');
            const i = list.findIndex((d) => d.id === id);
            if (i < 0 || i >= list.length - 1) return;
            const tmp = list[i + 1];
            list[i + 1] = list[i];
            list[i] = tmp;
            api().renderTab?.('overview');
        });
    });

    document.querySelectorAll('[data-em-disc-remove]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-em-disc-remove');
            const item = list.find((d) => d.id === id);
            if (!item || item.is_default) return;
            if ((item.title || '').trim() || (item.body || '').trim()) {
                if (!confirm('Remove this disclaimer clause?')) return;
            }
            _draft = list.filter((d) => d.id !== id);
            api().renderTab?.('overview');
        });
    });

    document.getElementById('emDiscSave')?.addEventListener('click', () => {
        saveEventDisclaimers();
    });

    document.getElementById('emDiscCancel')?.addEventListener('click', () => {
        resetDraft(STATE);
        rerenderOverviewKeepingStatus('Changes discarded', false);
    });
}

export async function saveEventDisclaimers() {
    const STATE = getState();
    const e = STATE.event;
    const saveBtn = document.getElementById('emDiscSave');
    const status = document.getElementById('emDiscStatus');

    function setStatus(message, isError) {
        if (!status) return;
        status.className = isError ? 'text-xs text-red-600' : 'text-xs text-gray-400';
        status.textContent = message;
    }

    if (!e) return;
    if (disclaimersLocked(STATE)) {
        setStatus('Disclaimers are locked after RSVPs.', true);
        return;
    }

    const form = { disclaimers: getDraft(STATE) };
    const validationError = validateDisclaimers(form);
    if (validationError) {
        setStatus(validationError, true);
        return;
    }

    const normalized = (window.EventsDisclaimers && typeof window.EventsDisclaimers.normalizeDisclaimers === 'function')
        ? window.EventsDisclaimers.normalizeDisclaimers(form.disclaimers)
        : form.disclaimers;

    if (saveBtn) saveBtn.disabled = true;
    setStatus('Saving…', false);

    try {
        const rsvpCount = await countEventRsvps(e.id);
        if (rsvpCount > 0) {
            throw new Error('Disclaimers are locked after RSVPs. Refresh manage to see the lock.');
        }

        const { data, error } = await supabaseClient
            .from('events')
            .update({ disclaimers: normalized })
            .eq('id', e.id)
            .select('disclaimers')
            .single();
        if (error) throw error;

        STATE.event.disclaimers = data?.disclaimers ?? normalized;
        resetDraft(STATE);
        api().renderHeader?.();
        rerenderOverviewKeepingStatus('Saved disclaimers.', false);
        // Paint success after re-render (emerald)
        setTimeout(() => {
            const refreshed = document.getElementById('emDiscStatus');
            if (refreshed) {
                refreshed.className = 'text-xs text-emerald-600';
                refreshed.textContent = 'Saved disclaimers.';
                setTimeout(() => { refreshed.textContent = ''; }, 2500);
            }
        }, 0);
        api().notifyParent?.('updated', e.id);
    } catch (err) {
        setStatus('Update failed: ' + (err.message || 'unknown error'), true);
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

export const manageDisclaimersEditorApi = {
    disclaimersLocked,
    disclaimersEditorHtml,
    wireDisclaimersEditor,
    saveEventDisclaimers,
};

globalThis.EventsManageDisclaimersEditor = manageDisclaimersEditorApi;
