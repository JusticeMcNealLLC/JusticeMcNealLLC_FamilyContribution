// Portal Events — Create sheet: Raffle builder (Phase 5M.1.3)

'use strict';

function _steps() {
    return window.EventsCreateSteps;
}

function _state() {
    return _steps().getState();
}

function _render() {
    _steps().render();
}

function _esc(s) {
    return _steps().esc(s);
}

function raffleModel() {
    if (!window.EventsRaffleModel) throw new Error('Raffle model helper is not loaded.');
    return window.EventsRaffleModel;
}

function ensureRaffleConfig() {
    const STATE = _state();
    const model = raffleModel();
    if (!STATE.form.raffle_config) STATE.form.raffle_config = model.createDefaultConfig();
    STATE.form.raffle_config = model.normalizeConfig(STATE.form.raffle_config);
    return STATE.form.raffle_config;
}

function normalizeRaffleConfig() {
    const STATE = _state();
    STATE.form.raffle_config = raffleModel().normalizeConfig(STATE.form.raffle_config);
    return STATE.form.raffle_config;
}

function _drawModeOptions(selected) {
    const options = [
        ['specific_item', 'Specific items'],
        ['random_item', 'Random item in category'],
        ['winner_choice', 'Winner chooses later'],
    ];
    return options.map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
}

function builderHtml() {
    const STATE = _state();
    const model = raffleModel();
    const config = ensureRaffleConfig();
    const categories = model.getOrderedCategories(config);
    const items = config.items || [];
    const validation = model.validateConfig(config);
    const totalWinners = model.getTotalWinnerCount(config);
    return `
        <div class="ec-row">
            <label class="ec-label">Raffle entry price (USD)</label>
            <input id="ecRafflePrice" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(STATE.form.raffle_entry_cost_dollars)}">
            <p class="ec-help">Use 0.00 for a free raffle. Prize images come later; emoji fallbacks are available now.</p>
        </div>

        <div class="ec-row ec-raffle-box">
            <div class="ec-raffle-head">
                <div>
                    <div class="text-sm font-extrabold text-gray-900">Prize categories</div>
                    <div class="text-xs text-gray-500">Draw order follows the category order below.</div>
                </div>
                <button type="button" class="ec-mini-btn" data-ec-raffle-add-category>Add category</button>
            </div>
            ${categories.map((category, index) => `
                <div class="ec-raffle-section" data-ec-category-row="${index}">
                    <div class="ec-raffle-grid">
                        <div>
                            <label class="ec-label">Category</label>
                            <input class="ec-input" data-ec-category-field="label" data-ec-category-id="${_esc(category.id)}" value="${_esc(category.label)}" maxlength="80">
                        </div>
                        <div>
                            <label class="ec-label">Draw mode</label>
                            <select class="ec-input" data-ec-category-field="draw_mode" data-ec-category-id="${_esc(category.id)}">
                                ${_drawModeOptions(category.draw_mode)}
                            </select>
                        </div>
                        <div>
                            <label class="ec-label">Winners</label>
                            <input class="ec-input" type="number" min="0" step="1" data-ec-category-field="winner_count" data-ec-category-id="${_esc(category.id)}" value="${category.winner_count ?? ''}">
                        </div>
                        <div style="display:flex;gap:4px">
                            <button type="button" class="ec-icon-btn" title="Move up" data-ec-category-move="up" data-ec-category-id="${_esc(category.id)}">↑</button>
                            <button type="button" class="ec-icon-btn" title="Move down" data-ec-category-move="down" data-ec-category-id="${_esc(category.id)}">↓</button>
                            <button type="button" class="ec-icon-btn" title="Remove" data-ec-category-remove="${_esc(category.id)}">×</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="ec-row ec-raffle-box">
            <div class="ec-raffle-head">
                <div>
                    <div class="text-sm font-extrabold text-gray-900">Prize items</div>
                    <div class="text-xs text-gray-500">Add the items being given away. Emoji is used when no image is uploaded.</div>
                </div>
                <button type="button" class="ec-mini-btn" data-ec-raffle-add-item>Add item</button>
            </div>
            ${items.length ? items.map((item, index) => {
                const preview = STATE.prizeImagePreviews[item.id] || item.image_url || null;
                const fileName = STATE.prizeImageFiles[item.id]?.name || null;
                return `
                <div class="ec-raffle-item-wrap" data-ec-item-row="${index}">
                    <div class="ec-raffle-item-grid">
                        <div>
                            <label class="ec-label">Emoji</label>
                            <input class="ec-input" data-ec-item-field="emoji" data-ec-item-id="${_esc(item.id)}" value="${_esc(item.emoji || '🎁')}" maxlength="4">
                        </div>
                        <div>
                            <label class="ec-label">Item name</label>
                            <input class="ec-input" data-ec-item-field="name" data-ec-item-id="${_esc(item.id)}" value="${_esc(item.name)}" maxlength="120">
                        </div>
                        <div>
                            <label class="ec-label">Category</label>
                            <select class="ec-input" data-ec-item-field="category_id" data-ec-item-id="${_esc(item.id)}">
                                ${categories.map(category => `<option value="${_esc(category.id)}" ${item.category_id === category.id ? 'selected' : ''}>${_esc(category.label)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="ec-label">Qty</label>
                            <input class="ec-input" type="number" min="1" step="1" data-ec-item-field="quantity" data-ec-item-id="${_esc(item.id)}" value="${item.quantity || 1}">
                        </div>
                        <div style="display:flex;gap:4px">
                            <button type="button" class="ec-icon-btn" title="Move up" data-ec-item-move="up" data-ec-item-id="${_esc(item.id)}">↑</button>
                            <button type="button" class="ec-icon-btn" title="Move down" data-ec-item-move="down" data-ec-item-id="${_esc(item.id)}">↓</button>
                            <button type="button" class="ec-icon-btn" title="Remove" data-ec-item-remove="${_esc(item.id)}">×</button>
                        </div>
                    </div>
                    <div class="ec-prize-img-row">
                        <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-ec-prize-file="${_esc(item.id)}">
                        <div class="ec-prize-img-drop" data-ec-prize-drop="${_esc(item.id)}" title="Click or drag an image here">
                            ${preview ? `<img src="${_esc(preview)}" alt="Prize image">` : `<span style="font-size:18px">📷</span>`}
                        </div>
                        <div class="ec-prize-img-label">
                            ${preview
                                ? `<strong>${fileName ? _esc(fileName) : 'Image set'}</strong><span>Drag a new image or click the thumbnail to replace</span>`
                                : `<strong>Prize image</strong><span>Click or drag &amp; drop a photo (PNG/JPG/WebP · max 5 MB)</span>`
                            }
                        </div>
                        ${preview ? `<button type="button" class="ec-prize-img-clear" data-ec-prize-clear="${_esc(item.id)}">Remove</button>` : ''}
                    </div>
                </div>`;
            }).join('') : `<div class="text-xs text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl p-3">No prize items yet. Add at least one item before publishing.</div>`}

            <div class="ec-raffle-summary">
                <span class="ec-raffle-chip">${categories.length} categories</span>
                <span class="ec-raffle-chip">${items.length} items</span>
                <span class="ec-raffle-chip">${totalWinners} winners</span>
            </div>
            ${validation.valid ? '' : `<div class="ec-error" style="margin-top:10px">${validation.errors.map(_esc).join('<br>')}</div>`}
        </div>
    `;
}

function _setPrizeImage(itemId, file) {
    const STATE = _state();
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) { alert('Please use a PNG, JPG, or WebP image.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
    STATE.prizeImageFiles[itemId] = file;
    const reader = new FileReader();
    reader.onload = () => { STATE.prizeImagePreviews[itemId] = reader.result; _render(); };
    reader.readAsDataURL(file);
}

function _updateCategory(categoryId, field, value, rerender = false) {
    const config = ensureRaffleConfig();
    const category = config.categories.find(entry => entry.id === categoryId);
    if (!category) return;
    if (field === 'winner_count') category[field] = value === '' ? null : Math.max(0, Math.floor(Number(value) || 0));
    else category[field] = value;
    normalizeRaffleConfig();
    if (rerender) _render();
}

function _updateItem(itemId, field, value, rerender = false) {
    const config = ensureRaffleConfig();
    const item = config.items.find(entry => entry.id === itemId);
    if (!item) return;
    if (field === 'quantity') item[field] = Math.max(1, Math.floor(Number(value) || 1));
    else item[field] = value;
    normalizeRaffleConfig();
    if (rerender) _render();
}

function _renumberSortOrders(entries) {
    entries.forEach((entry, index) => entry.sort_order = (index + 1) * 10);
}

function _moveEntry(entries, id, direction) {
    const ordered = [...entries].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
    const index = ordered.findIndex(entry => entry.id === id);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    const moving = ordered[index];
    ordered[index] = ordered[targetIndex];
    ordered[targetIndex] = moving;
    _renumberSortOrders(ordered);
    entries.splice(0, entries.length, ...ordered);
}

function _removeCategory(categoryId) {
    const config = ensureRaffleConfig();
    if (config.categories.length <= 1) {
        alert('Keep at least one raffle category.');
        return;
    }
    config.categories = config.categories.filter(category => category.id !== categoryId);
    const fallbackCategoryId = config.categories[0]?.id || 'general';
    config.items.forEach(item => {
        if (item.category_id === categoryId) item.category_id = fallbackCategoryId;
    });
    _renumberSortOrders(config.categories);
    normalizeRaffleConfig();
    _render();
}

function _removeItem(itemId) {
    const config = ensureRaffleConfig();
    config.items = config.items.filter(item => item.id !== itemId);
    _renumberSortOrders(config.items);
    normalizeRaffleConfig();
    _render();
}

function _moveCategory(categoryId, direction) {
    const config = ensureRaffleConfig();
    _moveEntry(config.categories, categoryId, direction);
    normalizeRaffleConfig();
    _render();
}

function _moveItem(itemId, direction) {
    const config = ensureRaffleConfig();
    _moveEntry(config.items, itemId, direction);
    normalizeRaffleConfig();
    _render();
}

function wire() {
    const STATE = _state();
    if (!STATE.form.raffle_enabled) return;
    document.querySelectorAll('[data-ec-category-field]').forEach(input => {
        input.addEventListener('input', () => _updateCategory(input.dataset.ecCategoryId, input.dataset.ecCategoryField, input.value));
        input.addEventListener('change', () => _updateCategory(input.dataset.ecCategoryId, input.dataset.ecCategoryField, input.value, true));
    });
    document.querySelectorAll('[data-ec-item-field]').forEach(input => {
        input.addEventListener('input', () => _updateItem(input.dataset.ecItemId, input.dataset.ecItemField, input.value));
        input.addEventListener('change', () => _updateItem(input.dataset.ecItemId, input.dataset.ecItemField, input.value, true));
    });
    document.querySelector('[data-ec-raffle-add-category]')?.addEventListener('click', () => {
        const model = raffleModel();
        const config = ensureRaffleConfig();
        const nextOrder = (config.categories.length + 1) * 10;
        config.categories.push(model.createCategory({ label: 'New Tier', sort_order: nextOrder, winner_count: 1 }));
        normalizeRaffleConfig();
        _render();
    });
    document.querySelector('[data-ec-raffle-add-item]')?.addEventListener('click', () => {
        const model = raffleModel();
        const config = ensureRaffleConfig();
        if (!config.categories.length) config.categories.push(model.createCategory({ id: 'general', label: 'Raffle Prizes', sort_order: 10 }));
        const nextOrder = (config.items.length + 1) * 10;
        config.items.push(model.createItem({ category_id: config.categories[0].id, name: 'New prize item', sort_order: nextOrder }));
        normalizeRaffleConfig();
        _render();
    });
    document.querySelectorAll('[data-ec-category-remove]').forEach(button => {
        button.addEventListener('click', () => _removeCategory(button.dataset.ecCategoryRemove));
    });
    document.querySelectorAll('[data-ec-item-remove]').forEach(button => {
        button.addEventListener('click', () => _removeItem(button.dataset.ecItemRemove));
    });
    document.querySelectorAll('[data-ec-category-move]').forEach(button => {
        button.addEventListener('click', () => _moveCategory(button.dataset.ecCategoryId, button.dataset.ecCategoryMove));
    });
    document.querySelectorAll('[data-ec-item-move]').forEach(button => {
        button.addEventListener('click', () => _moveItem(button.dataset.ecItemId, button.dataset.ecItemMove));
    });

    document.querySelectorAll('[data-ec-prize-drop]').forEach(zone => {
        const itemId = zone.dataset.ecPrizeDrop;
        const fileInput = document.querySelector(`[data-ec-prize-file="${CSS.escape(itemId)}"]`);
        if (!fileInput) return;

        zone.addEventListener('click', () => fileInput.click());

        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('ec-prize-img-drop--over');
        });
        zone.addEventListener('dragleave', e => {
            if (!zone.contains(e.relatedTarget)) zone.classList.remove('ec-prize-img-drop--over');
        });
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('ec-prize-img-drop--over');
            const f = e.dataTransfer?.files?.[0];
            if (!f) return;
            _setPrizeImage(itemId, f);
        });

        fileInput.addEventListener('change', () => {
            const f = fileInput.files?.[0];
            if (!f) return;
            _setPrizeImage(itemId, f);
        });
    });
    document.querySelectorAll('[data-ec-prize-clear]').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.ecPrizeClear;
            delete STATE.prizeImageFiles[itemId];
            delete STATE.prizeImagePreviews[itemId];
            const config = ensureRaffleConfig();
            const item = config.items.find(i => i.id === itemId);
            if (item) item.image_url = null;
            _render();
        });
    });
}

function reviewHtml() {
    const model = raffleModel();
    const config = ensureRaffleConfig();
    return model.getOrderedCategories(config).map(category => {
        const items = model.getItemsForCategory(config, category.id);
        const itemText = items.length
            ? items.map(item => `${item.emoji || '🎁'} ${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ')
            : 'No items yet';
        return `<div class="ec-review-row"><span>${_esc(category.label)}</span><span style="max-width:60%">${_esc(itemText)}</span></div>`;
    }).join('');
}

export const createRaffleBuilderApi = {
    builderHtml,
    wire,
    reviewHtml,
    ensureRaffleConfig,
    normalizeRaffleConfig,
    raffleModel,
};

globalThis.EventsCreateRaffleBuilder = createRaffleBuilderApi;
