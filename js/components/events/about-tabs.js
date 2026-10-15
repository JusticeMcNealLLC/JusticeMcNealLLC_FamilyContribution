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

    function isItineraryTitle(title) {
        return /^itinerary$/i.test(String(title || '').trim());
    }

    /**
     * Extra About sections (Itinerary, etc.). Empty when the event is description-only.
     * @param {Array} tabs
     * @param {{ idPrefix?: string, overview?: string }} opts
     */
    function aboutTabsHtml(tabs, opts) {
        const extra = normalizeAboutTabs(tabs);
        const prefix = (opts && opts.idPrefix) || 'aboutTabs';
        const overview = String(opts && opts.overview || '').trim();
        const itinerary = opts && opts.itinerary;
        const hasItinerary = !!(itinerary && itinerary.enabled === true);
        if (!extra.length && !hasItinerary) return '';
        const list = extra.slice();
        if (overview && !extra.some((t) => isOverviewTitle(t.title))) {
            list.unshift({
                id: `${prefix}-overview`,
                title: 'Overview',
                body: overview.slice(0, BODY_MAX),
            });
        }
        if (hasItinerary && !list.some((t) => isItineraryTitle(t.title))) {
            list.push({
                id: `${prefix}-itinerary`,
                title: 'Itinerary',
                body: '',
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
                ${isItineraryTitle(tab.title) && hasItinerary && window.EventsItinerary && typeof window.EventsItinerary.calendarHtml === 'function'
                    ? window.EventsItinerary.calendarHtml(itinerary, opts.event)
                    : ''}
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
        const roots = [];
        if (scope.matches && scope.matches('[data-about-tabs-root]')) roots.push(scope);
        if (scope.querySelectorAll) {
            scope.querySelectorAll('[data-about-tabs-root]').forEach((wrap) => roots.push(wrap));
        }

        roots.forEach((wrap) => {
            if (wrap.dataset.aboutWired === '1') return;
            wrap.dataset.aboutWired = '1';
            wrap.addEventListener('click', (event) => {
                const btn = event.target && event.target.closest
                    ? event.target.closest('[data-about-tab]')
                    : null;
                if (!btn || !wrap.contains(btn)) return;

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
    }

    const EventsAboutTabs = {
        TITLE_MAX,
        BODY_MAX,
        normalizeAboutTabs,
        isOverviewTitle,
        isItineraryTitle,
        aboutTabsHtml,
        wireAboutTabs,
    };

    globalThis.EventsAboutTabs = EventsAboutTabs;
})();
