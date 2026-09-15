// Portal Events — Create sheet: Included items (§13.4 FINAL presets + per-role)

'use strict';

const NAME_MAX = 80;
const CHOICE_MAX = 40;
const CHOICES_MAX = 40;
const OPTION_TYPES = [
    { key: 'size', label: 'Size' },
    { key: 'color', label: 'Color' },
    { key: 'text', label: 'Text' },
    { key: 'select', label: 'Select' },
];
const APPLIES_OPTIONS = [
    { key: 'all', label: 'Everyone' },
    { key: 'adult', label: 'Adults only' },
    { key: 'kid', label: 'Kids only' },
];
const SIZE_PRESET = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLOR_PRESET = ['Black', 'White', 'Navy', 'Gray', 'Red', 'Green'];

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function _alert(message, title) {
    if (window.EventsCreateSteps?.alert) return window.EventsCreateSteps.alert(message, title);
    if (window.EventsHelpers?.alertDialog) {
        return window.EventsHelpers.alertDialog({
            title: title || 'Please check this step',
            message: String(message || ''),
        });
    }
    window.alert(String(message || ''));
    return Promise.resolve();
}

function _newItemId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `inc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function _items() {
    const STATE = window.EventsCreateSteps.getState();
    if (!Array.isArray(STATE.form.included_items)) STATE.form.included_items = [];
    return STATE.form.included_items;
}

function _needsChoices(type) {
    return type === 'size' || type === 'color' || type === 'select';
}

function _typeOptions(selected) {
    return OPTION_TYPES.map((t) =>
        `<option value="${t.key}" ${selected === t.key ? 'selected' : ''}>${t.label}</option>`
    ).join('');
}

function _appliesOptions(selected) {
    const cur = selected || 'all';
    return APPLIES_OPTIONS.map((t) =>
        `<option value="${t.key}" ${cur === t.key ? 'selected' : ''}>${t.label}</option>`
    ).join('');
}

function _mergeChoices(item, preset) {
    if (!Array.isArray(item.choices)) item.choices = [];
    const seen = new Set(item.choices.map((c) => String(c).toLowerCase()));
    for (const raw of preset) {
        if (item.choices.length >= CHOICES_MAX) break;
        const v = String(raw || '').trim().slice(0, CHOICE_MAX);
        if (!v) continue;
        const key = v.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        item.choices.push(v);
    }
}

function _presetsBarHtml(showAdd) {
    return `
        <div class="ec-actions-row" role="toolbar" aria-label="Included presets">
            <button type="button" id="ecIncPackClothing" class="ec-mini-btn">+ Trip clothing</button>
            ${showAdd ? '<button type="button" id="ecIncAdd" class="ec-mini-btn">+ Add item</button>' : ''}
        </div>
        <p class="ec-help" style="margin-top:0;margin-bottom:10px">Trip clothing adds size + color items. Use Size / Color preset on each item to fill common choices.</p>
    `;
}

function _imageHtml(item) {
    const STATE = window.EventsCreateSteps.getState();
    const files = STATE.includedImageFiles || {};
    const previews = STATE.includedImagePreviews || {};
    const preview = previews[item.id] || item.image_url || '';
    const fileName = files[item.id]?.name || '';
    return `
        <div class="ec-prize-img-row" style="margin-top:12px">
            <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-inc-image-file="${_esc(item.id)}">
            <div class="ec-prize-img-drop" data-inc-image-drop="${_esc(item.id)}" title="Click or drag an image of this item">
                ${preview ? `<img src="${_esc(preview)}" alt="Included item">` : `<span style="font-size:18px">📷</span>`}
            </div>
            <div class="ec-prize-img-label">
                ${preview
                    ? `<strong>${fileName ? _esc(fileName) : 'Photo set'}</strong><span>Shown on RSVP when guests pick size or color</span>`
                    : `<strong>Item photo</strong><span>Optional. Guests see this on the RSVP clothing step.</span>`
                }
            </div>
            ${preview ? `<button type="button" class="ec-prize-img-clear" data-inc-image-clear="${_esc(item.id)}">Remove</button>` : ''}
        </div>
    `;
}

function _setItemImage(item, file, render) {
    const STATE = window.EventsCreateSteps.getState();
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
        _alert('Please use a PNG, JPG, or WebP image.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        _alert('Image must be under 5 MB.');
        return;
    }
    if (!STATE.includedImageFiles) STATE.includedImageFiles = {};
    if (!STATE.includedImagePreviews) STATE.includedImagePreviews = {};
    STATE.includedImageFiles[item.id] = file;
    const reader = new FileReader();
    reader.onload = () => {
        STATE.includedImagePreviews[item.id] = reader.result;
        render();
    };
    reader.readAsDataURL(file);
}

function _choicesHtml(item) {
    if (!_needsChoices(item.option_type)) return '';
    const choices = Array.isArray(item.choices) ? item.choices : [];
    const presetBtn = item.option_type === 'size'
        ? `<button type="button" class="ec-mini-btn" data-inc-preset="size" data-inc-preset-for="${_esc(item.id)}">Size preset</button>`
        : (item.option_type === 'color'
            ? `<button type="button" class="ec-mini-btn" data-inc-preset="color" data-inc-preset-for="${_esc(item.id)}">Color preset</button>`
            : '');
    return `
        <div class="ec-row" style="margin-bottom:0;margin-top:10px">
            <label class="ec-label">Choices</label>
            <div class="ec-choice-list" data-inc-choices="${_esc(item.id)}">
                ${choices.map((c) => `
                    <span class="ec-choice-chip">
                        ${_esc(c)}
                        <button type="button" class="ec-choice-chip-x" data-inc-choice-remove="${_esc(item.id)}" data-inc-choice-value="${_esc(c)}" aria-label="Remove ${_esc(c)}">×</button>
                    </span>
                `).join('')}
            </div>
            <div class="ec-choice-add-row">
                <input class="ec-input" type="text" maxlength="${CHOICE_MAX}" data-inc-choice-input="${_esc(item.id)}" placeholder="Add choice…">
                <button type="button" class="ec-mini-btn" data-inc-choice-add="${_esc(item.id)}">Add</button>
                ${presetBtn}
            </div>
            <p class="ec-help">Guests pick one of these at RSVP.</p>
        </div>
    `;
}

function html() {
    const items = _items();
    if (!items.length) {
        return `
            <div class="ec-row">
                <p class="text-sm text-gray-600">Optional catalog of what’s included — e.g. a hoodie with size and color choices collected at RSVP.</p>
                <p class="ec-help">Skip if this event doesn’t need sizes, colors, or other per-person options.</p>
            </div>
            ${_presetsBarHtml(true)}
        `;
    }

    return `
        <div class="ec-row">
            <p class="text-sm text-gray-600 mb-2">Items guests will configure when they RSVP. Reorder with Up / Down. Scope adults vs kids per item.</p>
        </div>
        ${_presetsBarHtml(true)}
        ${items.map((item, index) => `
            <div class="ec-raffle-item-wrap" data-inc-id="${_esc(item.id)}">
                <div class="ec-raffle-head">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Item ${index + 1}</span>
                    <div class="flex items-center gap-1">
                        <button type="button" class="ec-icon-btn" data-inc-up="${_esc(item.id)}" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
                        <button type="button" class="ec-icon-btn" data-inc-down="${_esc(item.id)}" ${index === items.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
                        <button type="button" class="ec-mini-btn" data-inc-remove="${_esc(item.id)}" style="border-color:#fecaca;color:#dc2626">Remove</button>
                    </div>
                </div>
                <div class="ec-grid-2 ec-grid-keep" style="margin-bottom:10px">
                    <div>
                        <label class="ec-label">Name</label>
                        <input class="ec-input" type="text" maxlength="${NAME_MAX}" data-inc-name="${_esc(item.id)}" placeholder="e.g. Trip hoodie" value="${_esc(item.name || '')}">
                    </div>
                    <div>
                        <label class="ec-label">Applies to</label>
                        <select class="ec-input" data-inc-applies="${_esc(item.id)}">${_appliesOptions(item.applies_to || 'all')}</select>
                    </div>
                </div>
                <div class="ec-grid-2 ec-grid-keep" style="margin-bottom:0">
                    <div>
                        <label class="ec-label">Option type</label>
                        <select class="ec-input" data-inc-type="${_esc(item.id)}">${_typeOptions(item.option_type || 'size')}</select>
                    </div>
                    <div style="display:flex;align-items:flex-end;min-height:42px">
                        <label class="ec-check">
                            <input type="checkbox" data-inc-required="${_esc(item.id)}" ${item.required ? 'checked' : ''}>
                            <span>Required at RSVP</span>
                        </label>
                    </div>
                </div>
                ${_choicesHtml(item)}
                ${_imageHtml(item)}
            </div>
        `).join('')}
    `;
}

function _addChoice(item, raw, render) {
    const value = String(raw || '').trim().slice(0, CHOICE_MAX);
    if (!value) return;
    if (!Array.isArray(item.choices)) item.choices = [];
    const exists = item.choices.some((c) => c.toLowerCase() === value.toLowerCase());
    if (exists) return;
    if (item.choices.length >= CHOICES_MAX) {
        _alert(`At most ${CHOICES_MAX} choices per item.`);
        return;
    }
    item.choices.push(value);
    render();
}

function _addTripClothing(items, render) {
    const names = new Set(items.map((i) => String(i.name || '').trim().toLowerCase()).filter(Boolean));
    let added = false;
    if (!names.has('clothing size')) {
        const sizeItem = {
            id: _newItemId(),
            name: 'Clothing size',
            required: true,
            option_type: 'size',
            applies_to: 'all',
            choices: [],
        };
        _mergeChoices(sizeItem, SIZE_PRESET);
        items.push(sizeItem);
        added = true;
    }
    if (!names.has('clothing color')) {
        const colorItem = {
            id: _newItemId(),
            name: 'Clothing color',
            required: true,
            option_type: 'color',
            applies_to: 'all',
            choices: [],
        };
        _mergeChoices(colorItem, COLOR_PRESET);
        items.push(colorItem);
        added = true;
    }
    if (!added) {
        _alert('Trip clothing items are already in the list.');
        return;
    }
    render();
}

function wire() {
    const STATE = window.EventsCreateSteps.getState();
    const render = window.EventsCreateSteps.render;
    const items = _items();

    document.getElementById('ecIncAdd')?.addEventListener('click', () => {
        items.push({
            id: _newItemId(),
            name: '',
            required: true,
            option_type: 'size',
            applies_to: 'all',
            choices: [],
        });
        render();
    });

    document.getElementById('ecIncPackClothing')?.addEventListener('click', () => {
        _addTripClothing(items, render);
    });

    document.querySelectorAll('[data-inc-name]').forEach((el) => {
        el.addEventListener('input', () => {
            const item = items.find((i) => i.id === el.getAttribute('data-inc-name'));
            if (item) item.name = el.value.slice(0, NAME_MAX);
        });
    });

    document.querySelectorAll('[data-inc-required]').forEach((el) => {
        el.addEventListener('change', () => {
            const item = items.find((i) => i.id === el.getAttribute('data-inc-required'));
            if (item) item.required = !!el.checked;
        });
    });

    document.querySelectorAll('[data-inc-applies]').forEach((el) => {
        el.addEventListener('change', () => {
            const item = items.find((i) => i.id === el.getAttribute('data-inc-applies'));
            if (!item) return;
            const v = el.value;
            item.applies_to = (v === 'adult' || v === 'kid' || v === 'all') ? v : 'all';
        });
    });

    document.querySelectorAll('[data-inc-type]').forEach((el) => {
        el.addEventListener('change', () => {
            const item = items.find((i) => i.id === el.getAttribute('data-inc-type'));
            if (!item) return;
            item.option_type = el.value;
            if (!_needsChoices(item.option_type)) item.choices = [];
            else if (!Array.isArray(item.choices)) item.choices = [];
            render();
        });
    });

    document.querySelectorAll('[data-inc-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-inc-preset-for');
            const kind = btn.getAttribute('data-inc-preset');
            const item = items.find((i) => i.id === id);
            if (!item) return;
            if (kind === 'size') _mergeChoices(item, SIZE_PRESET);
            if (kind === 'color') _mergeChoices(item, COLOR_PRESET);
            render();
        });
    });

    document.querySelectorAll('[data-inc-choice-add]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-inc-choice-add');
            const item = items.find((i) => i.id === id);
            const input = document.querySelector(`[data-inc-choice-input="${CSS.escape(id)}"]`);
            if (!item || !input) return;
            _addChoice(item, input.value, render);
        });
    });

    document.querySelectorAll('[data-inc-choice-input]').forEach((input) => {
        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const id = input.getAttribute('data-inc-choice-input');
            const item = items.find((i) => i.id === id);
            if (!item) return;
            _addChoice(item, input.value, render);
        });
    });

    document.querySelectorAll('[data-inc-choice-remove]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-inc-choice-remove');
            const value = btn.getAttribute('data-inc-choice-value');
            const item = items.find((i) => i.id === id);
            if (!item || !Array.isArray(item.choices)) return;
            item.choices = item.choices.filter((c) => c !== value);
            render();
        });
    });

    document.querySelectorAll('[data-inc-up]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-inc-up');
            const i = items.findIndex((it) => it.id === id);
            if (i <= 0) return;
            const tmp = items[i - 1];
            items[i - 1] = items[i];
            items[i] = tmp;
            render();
        });
    });

    document.querySelectorAll('[data-inc-down]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-inc-down');
            const i = items.findIndex((it) => it.id === id);
            if (i < 0 || i >= items.length - 1) return;
            const tmp = items[i + 1];
            items[i + 1] = items[i];
            items[i] = tmp;
            render();
        });
    });

    document.querySelectorAll('[data-inc-image-drop]').forEach((zone) => {
        const id = zone.getAttribute('data-inc-image-drop');
        const fileInput = document.querySelector(`[data-inc-image-file="${CSS.escape(id)}"]`);
        const item = items.find((i) => i.id === id);
        if (!item || !fileInput) return;
        zone.addEventListener('click', () => fileInput.click());
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('ec-prize-img-drop--over');
        });
        zone.addEventListener('dragleave', (e) => {
            if (!zone.contains(e.relatedTarget)) zone.classList.remove('ec-prize-img-drop--over');
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('ec-prize-img-drop--over');
            _setItemImage(item, e.dataTransfer?.files?.[0], render);
        });
        fileInput.addEventListener('change', () => _setItemImage(item, fileInput.files?.[0], render));
    });

    document.querySelectorAll('[data-inc-image-clear]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-inc-image-clear');
            const item = items.find((i) => i.id === id);
            if (STATE.includedImageFiles) delete STATE.includedImageFiles[id];
            if (STATE.includedImagePreviews) delete STATE.includedImagePreviews[id];
            if (item) item.image_url = '';
            render();
        });
    });

    document.querySelectorAll('[data-inc-remove]').forEach((el) => {
        el.addEventListener('click', async () => {
            const id = el.getAttribute('data-inc-remove');
            const item = items.find((i) => i.id === id);
            if (item && ((item.name || '').trim() || (item.choices || []).length)) {
                const ok = window.EventsHelpers?.confirmDialog
                    ? await window.EventsHelpers.confirmDialog({
                        title: 'Remove this item?',
                        message: 'Remove this included item?',
                        confirmLabel: 'Remove',
                        cancelLabel: 'Keep',
                    })
                    : window.confirm('Remove this included item?');
                if (!ok) return;
            }
            if (STATE.includedImageFiles) delete STATE.includedImageFiles[id];
            if (STATE.includedImagePreviews) delete STATE.includedImagePreviews[id];
            STATE.form.included_items = items.filter((i) => i.id !== id);
            render();
        });
    });
}

export function validateIncludedItems(form) {
    const list = Array.isArray(form?.included_items) ? form.included_items : [];
    for (let i = 0; i < list.length; i++) {
        const item = list[i] || {};
        const name = String(item.name || '').trim();
        if (!name) return `Included item ${i + 1} needs a name.`;
        if (name.length > NAME_MAX) return `Included item ${i + 1} name must be ${NAME_MAX} characters or fewer.`;
        const type = item.option_type || '';
        if (!OPTION_TYPES.some((t) => t.key === type)) {
            return `Included item ${i + 1} needs a valid option type.`;
        }
        const applies = item.applies_to || 'all';
        if (!APPLIES_OPTIONS.some((a) => a.key === applies)) {
            return `Included item ${i + 1} needs a valid Applies to setting.`;
        }
        if (_needsChoices(type)) {
            const choices = (Array.isArray(item.choices) ? item.choices : [])
                .map((c) => String(c || '').trim())
                .filter(Boolean);
            if (!choices.length) return `Included item ${i + 1} needs at least one choice.`;
        }
    }
    return null;
}

export const createStepIncludedApi = { html, wire, validateIncludedItems };

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.included = createStepIncludedApi;
