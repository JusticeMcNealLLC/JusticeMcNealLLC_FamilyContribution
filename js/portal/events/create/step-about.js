// Portal Events — Create sheet: About tabs step (§13.3 FINAL markdown toolbar)

'use strict';

const TITLE_MAX = 60;
const BODY_MAX = 8000;

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function _newTabId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function _tabs() {
    const STATE = window.EventsCreateSteps.getState();
    if (!Array.isArray(STATE.form.about_tabs)) STATE.form.about_tabs = [];
    return STATE.form.about_tabs;
}

function _isHttpUrl(url) {
    return /^https?:\/\/.+/i.test(String(url || '').trim());
}

function _syncBody(textarea, tab) {
    if (!textarea || !tab) return;
    tab.body = String(textarea.value || '').slice(0, BODY_MAX);
    if (textarea.value !== tab.body) textarea.value = tab.body;
}

function _replaceSelection(textarea, insertText, selectOffset, selectLength) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const next = `${before}${insertText}${after}`.slice(0, BODY_MAX);
    textarea.value = next;
    const selStart = Math.min(start + (selectOffset || 0), next.length);
    const selEnd = Math.min(selStart + (selectLength || 0), next.length);
    textarea.focus();
    textarea.setSelectionRange(selStart, selEnd);
}

function _wrapSelection(textarea, before, after, placeholder) {
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = textarea.value.slice(start, end);
    const inner = selected || placeholder || '';
    const insert = `${before}${inner}${after}`;
    _replaceSelection(textarea, insert, before.length, inner.length);
}

function _toolbarHtml(tabId) {
    return `
        <div class="ec-md-toolbar" role="toolbar" aria-label="Formatting">
            <button type="button" class="ec-md-btn" data-about-md="bold" data-about-md-for="${_esc(tabId)}" title="Bold" aria-label="Bold"><strong>B</strong></button>
            <button type="button" class="ec-md-btn" data-about-md="italic" data-about-md-for="${_esc(tabId)}" title="Italic" aria-label="Italic"><em>I</em></button>
            <button type="button" class="ec-md-btn" data-about-md="link" data-about-md-for="${_esc(tabId)}" title="Link" aria-label="Insert link">Link</button>
            <button type="button" class="ec-md-btn" data-about-md="image" data-about-md-for="${_esc(tabId)}" title="Image URL" aria-label="Insert image URL">Image</button>
        </div>
    `;
}

function html() {
    const tabs = _tabs();
    if (!tabs.length) {
        return `
            <div class="ec-row">
                <p class="text-sm text-gray-600">Add optional About sections for the event page — itinerary, lodging, what to bring, and anything else guests need.</p>
                <p class="ec-help">You can skip this step and add tabs later before publishing.</p>
            </div>
            <button type="button" id="ecAboutAdd" class="ec-mini-btn">+ Add tab</button>
        `;
    }

    return `
        <div class="ec-row">
            <p class="text-sm text-gray-600 mb-2">Custom About tabs shown on the event page. Drag order with Up / Down.</p>
        </div>
        ${tabs.map((tab, index) => `
            <div class="ec-raffle-item-wrap" data-about-id="${_esc(tab.id)}">
                <div class="ec-raffle-head">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Tab ${index + 1}</span>
                    <div class="flex items-center gap-1">
                        <button type="button" class="ec-icon-btn" data-about-up="${_esc(tab.id)}" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
                        <button type="button" class="ec-icon-btn" data-about-down="${_esc(tab.id)}" ${index === tabs.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
                        <button type="button" class="ec-mini-btn" data-about-remove="${_esc(tab.id)}" style="border-color:#fecaca;color:#dc2626">Remove</button>
                    </div>
                </div>
                <div class="ec-row" style="margin-bottom:10px">
                    <label class="ec-label">Title</label>
                    <input class="ec-input" type="text" maxlength="${TITLE_MAX}" data-about-title="${_esc(tab.id)}" placeholder="e.g. Itinerary" value="${_esc(tab.title || '')}">
                </div>
                <div class="ec-row" style="margin-bottom:0">
                    <label class="ec-label">Body</label>
                    ${_toolbarHtml(tab.id)}
                    <textarea class="ec-input ec-textarea" maxlength="${BODY_MAX}" data-about-body="${_esc(tab.id)}" placeholder="Details for this section…">${_esc(tab.body || '')}</textarea>
                    <p class="ec-help">Use the toolbar for bold, links, and image URLs.</p>
                </div>
            </div>
        `).join('')}
        <button type="button" id="ecAboutAdd" class="ec-mini-btn" style="margin-top:12px">+ Add tab</button>
    `;
}

function _applyMdAction(action, textarea, tab) {
    if (action === 'bold') {
        _wrapSelection(textarea, '**', '**', 'bold text');
        _syncBody(textarea, tab);
        return;
    }
    if (action === 'italic') {
        _wrapSelection(textarea, '*', '*', 'italic text');
        _syncBody(textarea, tab);
        return;
    }
    if (action === 'link') {
        const url = window.prompt('Link URL (https://…)', 'https://');
        if (url == null) return;
        const trimmed = String(url).trim();
        if (!_isHttpUrl(trimmed)) {
            window.alert('Enter a full http:// or https:// URL.');
            return;
        }
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const selected = textarea.value.slice(start, end) || 'link text';
        const insert = `[${selected}](${trimmed})`;
        _replaceSelection(textarea, insert, 1, selected.length);
        _syncBody(textarea, tab);
        return;
    }
    if (action === 'image') {
        const url = window.prompt('Image URL (https://…)', 'https://');
        if (url == null) return;
        const trimmed = String(url).trim();
        if (!_isHttpUrl(trimmed)) {
            window.alert('Enter a full http:// or https:// image URL.');
            return;
        }
        const alt = window.prompt('Image description (alt text)', 'Image') || 'Image';
        const insert = `![${String(alt).replace(/[\[\]]/g, '')}](${trimmed})`;
        _replaceSelection(textarea, insert, 0, 0);
        _syncBody(textarea, tab);
    }
}

function wire() {
    const STATE = window.EventsCreateSteps.getState();
    const render = window.EventsCreateSteps.render;
    const tabs = _tabs();

    document.getElementById('ecAboutAdd')?.addEventListener('click', () => {
        tabs.push({ id: _newTabId(), title: '', body: '' });
        render();
    });

    document.querySelectorAll('[data-about-title]').forEach((el) => {
        el.addEventListener('input', () => {
            const tab = tabs.find((t) => t.id === el.getAttribute('data-about-title'));
            if (tab) tab.title = el.value.slice(0, TITLE_MAX);
        });
    });

    document.querySelectorAll('[data-about-body]').forEach((el) => {
        el.addEventListener('input', () => {
            const tab = tabs.find((t) => t.id === el.getAttribute('data-about-body'));
            if (tab) tab.body = el.value.slice(0, BODY_MAX);
        });
    });

    document.querySelectorAll('[data-about-md]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-about-md-for');
            const action = btn.getAttribute('data-about-md');
            const tab = tabs.find((t) => t.id === id);
            const textarea = document.querySelector(`[data-about-body="${CSS.escape(id)}"]`);
            if (!tab || !textarea) return;
            _applyMdAction(action, textarea, tab);
        });
    });

    document.querySelectorAll('[data-about-up]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-about-up');
            const i = tabs.findIndex((t) => t.id === id);
            if (i <= 0) return;
            const tmp = tabs[i - 1];
            tabs[i - 1] = tabs[i];
            tabs[i] = tmp;
            render();
        });
    });

    document.querySelectorAll('[data-about-down]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-about-down');
            const i = tabs.findIndex((t) => t.id === id);
            if (i < 0 || i >= tabs.length - 1) return;
            const tmp = tabs[i + 1];
            tabs[i + 1] = tabs[i];
            tabs[i] = tmp;
            render();
        });
    });

    document.querySelectorAll('[data-about-remove]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-about-remove');
            const tab = tabs.find((t) => t.id === id);
            if (tab && ((tab.title || '').trim() || (tab.body || '').trim())) {
                if (!confirm('Remove this About tab?')) return;
            }
            STATE.form.about_tabs = tabs.filter((t) => t.id !== id);
            render();
        });
    });
}

export function validateAboutTabs(form) {
    const list = Array.isArray(form?.about_tabs) ? form.about_tabs : [];
    for (let i = 0; i < list.length; i++) {
        const title = String(list[i].title || '').trim();
        if (!title) return `About tab ${i + 1} needs a title.`;
        if (title.length > TITLE_MAX) return `About tab ${i + 1} title must be ${TITLE_MAX} characters or fewer.`;
        if (String(list[i].body || '').length > BODY_MAX) {
            return `About tab ${i + 1} body must be ${BODY_MAX} characters or fewer.`;
        }
    }
    return null;
}

export const createStepAboutApi = { html, wire, validateAboutTabs };

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.about = createStepAboutApi;
