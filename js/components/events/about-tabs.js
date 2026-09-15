/* ════════════════════════════════════════════════════════════
   Events — About tabs helper (create normalize + detail render)
   Surface: window.EventsAboutTabs
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const TITLE_MAX = 60;
    const BODY_MAX = 8000;

    function escapeHtml(str) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(str);
        }
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function normalizeAboutTabs(tabs) {
        if (!Array.isArray(tabs)) return [];
        const out = [];
        for (const raw of tabs) {
            if (!raw || typeof raw !== 'object') continue;
            const title = String(raw.title || '').trim().slice(0, TITLE_MAX);
            if (!title) continue;
            const body = String(raw.body || '').slice(0, BODY_MAX);
            const id = String(raw.id || '').trim() || `tab-${out.length + 1}`;
            out.push({ id, title, body });
        }
        return out;
    }

    function bodyToHtml(body) {
        const md = (window.EventsHelpers && typeof window.EventsHelpers.miniMarkdown === 'function')
            ? window.EventsHelpers.miniMarkdown(body || '', true)
            : escapeHtml(body || '');
        return md.replace(/\n/g, '<br>');
    }

    function isOverviewTitle(title) {
        return /^(overview|about)$/i.test(String(title || '').trim());
    }

    /**
     * Extra About sections (Itinerary, etc.). Empty when the event is description-only.
     * @param {Array} tabs
     * @param {{ idPrefix?: string, overview?: string }} opts
     */
    function aboutTabsHtml(tabs, opts) {
        const extra = normalizeAboutTabs(tabs);
        if (!extra.length) return '';
        const prefix = (opts && opts.idPrefix) || 'aboutTabs';
        const overview = String(opts && opts.overview || '').trim();
        const list = extra.slice();
        if (overview && !extra.some((t) => isOverviewTitle(t.title))) {
            list.unshift({
                id: `${prefix}-overview`,
                title: 'Overview',
                body: overview.slice(0, BODY_MAX),
            });
        }
        const buttons = list.map((tab, i) => `
            <button type="button"
                class="ed-about-tab${i === 0 ? ' is-active' : ''}"
                data-about-tab="${escapeHtml(tab.id)}"
                aria-selected="${i === 0 ? 'true' : 'false'}">${escapeHtml(tab.title)}</button>
        `).join('');
        const panels = list.map((tab, i) => `
            <div class="ed-about-tab-panel${i === 0 ? '' : ' hidden'}"
                data-about-panel="${escapeHtml(tab.id)}"
                ${i === 0 ? '' : 'hidden'}>
                <div class="ed-about-tab-body">${bodyToHtml(tab.body)}</div>
            </div>
        `).join('');
        return `
            <div class="ed-about-tabs" id="${escapeHtml(prefix)}Root" data-about-tabs-root>
                <div class="ed-about-tablist" role="tablist">${buttons}</div>
                <div class="ed-about-tabpanels">${panels}</div>
            </div>
        `;
    }

    function wireAboutTabs(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-about-tabs-root]').forEach((wrap) => {
            if (wrap.dataset.aboutWired === '1') return;
            wrap.dataset.aboutWired = '1';
            wrap.querySelectorAll('[data-about-tab]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-about-tab');
                    wrap.querySelectorAll('[data-about-tab]').forEach((b) => {
                        const on = b.getAttribute('data-about-tab') === id;
                        b.classList.toggle('is-active', on);
                        b.setAttribute('aria-selected', on ? 'true' : 'false');
                    });
                    wrap.querySelectorAll('[data-about-panel]').forEach((panel) => {
                        const on = panel.getAttribute('data-about-panel') === id;
                        panel.classList.toggle('hidden', !on);
                        if (on) panel.removeAttribute('hidden');
                        else panel.setAttribute('hidden', '');
                    });
                    btn.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
                });
            });
        });
    }

    const EventsAboutTabs = {
        TITLE_MAX,
        BODY_MAX,
        normalizeAboutTabs,
        isOverviewTitle,
        aboutTabsHtml,
        wireAboutTabs,
    };

    globalThis.EventsAboutTabs = EventsAboutTabs;
})();
