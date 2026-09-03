// Portal Events — Create sheet: Amenity voting (§13.13 create MVP / §13.7 results config)

'use strict';

const LABEL_MAX = 80;
const DESC_MAX = 240;

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function _newOptionId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `amenity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function _cfg() {
    const STATE = window.EventsCreateSteps.getState();
    if (!STATE.form.amenity_voting || typeof STATE.form.amenity_voting !== 'object') {
        STATE.form.amenity_voting = (window.EventsAmenityVoting && typeof window.EventsAmenityVoting.defaultConfig === 'function')
            ? window.EventsAmenityVoting.defaultConfig()
            : { enabled: false, options: [], closes_at: null, results_visible: 'after_close' };
    }
    return STATE.form.amenity_voting;
}

function _toDatetimeLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function _optionRow(opt, idx, locked) {
    const dis = locked ? ' disabled' : '';
    return `
        <div class="ec-amenity-row border border-gray-200 rounded-xl p-3 mb-2" data-amenity-idx="${idx}">
            <div class="flex gap-2 mb-2">
                <input type="text" class="ec-input flex-1 ec-amenity-label" placeholder="Option label" maxlength="${LABEL_MAX}" value="${_esc(opt.label || '')}"${dis} aria-label="Option label">
                ${locked ? '' : `<button type="button" class="ec-btn-ghost text-xs ec-amenity-remove" data-idx="${idx}">Remove</button>`}
            </div>
            <input type="text" class="ec-input w-full ec-amenity-desc" placeholder="Short description (optional)" maxlength="${DESC_MAX}" value="${_esc(opt.description || '')}"${dis} aria-label="Option description">
            ${locked ? '' : `<div class="flex gap-2 mt-2">
                <button type="button" class="ec-btn-ghost text-xs ec-amenity-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>Up</button>
                <button type="button" class="ec-btn-ghost text-xs ec-amenity-down" data-idx="${idx}">Down</button>
            </div>`}
        </div>`;
}

function html() {
    const STATE = window.EventsCreateSteps.getState();
    const cfg = _cfg();
    if (window.EventsAmenityVoting && typeof window.EventsAmenityVoting.normalizeConfig === 'function') {
        const norm = window.EventsAmenityVoting.normalizeConfig(cfg);
        STATE.form.amenity_voting = { ...norm, enabled: cfg.enabled === true && norm.options.length >= 2 ? true : !!cfg.enabled && norm.options.length >= 2 };
    }
    const locked = !!STATE.votingLocked;
    const av = STATE.form.amenity_voting;
    const options = Array.isArray(av.options) ? av.options : [];
    const optionsHtml = options.length
        ? options.map((o, i) => _optionRow(o, i, locked)).join('')
        : '<p class="text-sm text-gray-500 mb-2">Add at least two options for attendees to choose from.</p>';

    return `
        <div>
            <h2 class="text-lg font-bold text-gray-900 mb-1">Amenity voting</h2>
            <p class="text-sm text-gray-600 mb-4">Let attendees vote on trip amenities (e.g. lodging style). Votes are cast during RSVP — results show on the event detail page.</p>
            ${locked ? '<p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">Locked — at least one RSVP exists. Voting options cannot be changed.</p>' : ''}
            <label class="flex items-start gap-3 mb-4 cursor-pointer">
                <input type="checkbox" id="ecAmenityEnabled" class="mt-1" ${av.enabled ? 'checked' : ''}${locked ? ' disabled' : ''}>
                <span><span class="text-sm font-semibold text-gray-800">Enable amenity voting</span><span class="block text-xs text-gray-500">Requires at least two options.</span></span>
            </label>
            <div id="ecAmenityFields" class="${av.enabled ? '' : 'hidden'}">
                <p class="text-sm font-semibold text-gray-800 mb-2">Options</p>
                <div id="ecAmenityOptions">${optionsHtml}</div>
                ${locked ? '' : '<button type="button" id="ecAmenityAdd" class="ec-btn-ghost text-sm mb-4">+ Add option</button>'}
                <label class="ec-label">Voting closes (optional)</label>
                <input type="datetime-local" id="ecAmenityCloses" class="ec-input mb-3" value="${_esc(_toDatetimeLocal(av.closes_at))}"${locked ? ' disabled' : ''}>
                <label class="ec-label">Who can see results</label>
                <select id="ecAmenityResultsVisible" class="ec-input mb-2"${locked ? ' disabled' : ''}>
                    <option value="after_close" ${av.results_visible === 'after_close' ? 'selected' : ''}>After voting closes</option>
                    <option value="always" ${av.results_visible === 'always' ? 'selected' : ''}>Always (live tally)</option>
                    <option value="host_only" ${av.results_visible === 'host_only' ? 'selected' : ''}>Hosts only</option>
                </select>
            </div>
        </div>`;
}

function _syncFromDom() {
    const STATE = window.EventsCreateSteps.getState();
    const cfg = _cfg();
    const enabledEl = document.getElementById('ecAmenityEnabled');
    cfg.enabled = !!(enabledEl && enabledEl.checked);
    const closesEl = document.getElementById('ecAmenityCloses');
    cfg.closes_at = closesEl && closesEl.value ? new Date(closesEl.value).toISOString() : null;
    const visEl = document.getElementById('ecAmenityResultsVisible');
    cfg.results_visible = visEl ? visEl.value : 'after_close';
    const rows = document.querySelectorAll('#ecAmenityOptions .ec-amenity-row');
    cfg.options = Array.from(rows).map((row, idx) => {
        const prev = (cfg.options || [])[idx] || {};
        return {
            id: prev.id || _newOptionId(),
            label: row.querySelector('.ec-amenity-label')?.value?.trim() || '',
            description: row.querySelector('.ec-amenity-desc')?.value?.trim() || '',
        };
    }).filter((o) => o.label);
    if (window.EventsAmenityVoting && typeof window.EventsAmenityVoting.normalizeConfig === 'function') {
        const norm = window.EventsAmenityVoting.normalizeConfig(cfg);
        STATE.form.amenity_voting = { ...norm, enabled: cfg.enabled && norm.options.length >= 2 };
    }
}

function wire() {
    const STATE = window.EventsCreateSteps.getState();
    const locked = !!STATE.votingLocked;
    const enabledEl = document.getElementById('ecAmenityEnabled');
    const fieldsEl = document.getElementById('ecAmenityFields');
    enabledEl?.addEventListener('change', () => {
        _cfg().enabled = enabledEl.checked;
        fieldsEl?.classList.toggle('hidden', !enabledEl.checked);
    });
    document.getElementById('ecAmenityCloses')?.addEventListener('change', _syncFromDom);
    document.getElementById('ecAmenityResultsVisible')?.addEventListener('change', _syncFromDom);
    document.getElementById('ecAmenityAdd')?.addEventListener('click', () => {
        if (locked) return;
        _syncFromDom();
        _cfg().options.push({ id: _newOptionId(), label: '', description: '' });
        window.EventsCreateSteps.render();
    });
    document.getElementById('ecAmenityOptions')?.addEventListener('click', (e) => {
        if (locked) return;
        const rm = e.target.closest('.ec-amenity-remove');
        const up = e.target.closest('.ec-amenity-up');
        const down = e.target.closest('.ec-amenity-down');
        if (!rm && !up && !down) return;
        _syncFromDom();
        const opts = _cfg().options;
        const idx = Number((rm || up || down).dataset.idx);
        if (rm) opts.splice(idx, 1);
        else if (up && idx > 0) {
            [opts[idx - 1], opts[idx]] = [opts[idx], opts[idx - 1]];
        } else if (down && idx < opts.length - 1) {
            [opts[idx + 1], opts[idx]] = [opts[idx], opts[idx + 1]];
        }
        window.EventsCreateSteps.render();
    });
    document.getElementById('ecAmenityOptions')?.addEventListener('input', () => {
        if (locked) return;
        _syncFromDom();
    });
}

export function validateVoting(form) {
    const av = form.amenity_voting;
    if (!av || av.enabled !== true) return null;
    const norm = (window.EventsAmenityVoting && typeof window.EventsAmenityVoting.normalizeConfig === 'function')
        ? window.EventsAmenityVoting.normalizeConfig(av)
        : av;
    if (!norm.enabled) {
        if ((av.options || []).filter((o) => o && String(o.label || '').trim()).length >= 2) {
            return 'Enable amenity voting or remove extra options.';
        }
        return null;
    }
    if ((norm.options || []).length < 2) return 'Add at least two amenity options when voting is enabled.';
    return null;
}

export const createStepVotingApi = { html, wire, validateVoting };

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.voting = createStepVotingApi;
