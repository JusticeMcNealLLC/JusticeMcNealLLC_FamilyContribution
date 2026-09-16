/* ════════════════════════════════════════════════════════════
   Events — Included items helper (catalog + RSVP answers)
   Surface: window.EventsIncludedItems
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const NAME_MAX = 80;
    const CHOICE_MAX = 40;
    const CHOICES_MAX = 40;
    const ANSWER_MAX = 120;
    const IMAGE_URL_MAX = 2000;
    const OPTION_TYPES = ['size', 'color', 'text', 'select', 'info'];
    const APPLIES_TO = ['all', 'adult', 'kid'];
    const SIZE_PRESET = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const COLOR_PRESET = ['Black', 'White', 'Navy', 'Gray', 'Red', 'Green'];

    function escapeHtml(str) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(str);
        }
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function needsChoices(type) {
        return type === 'size' || type === 'color' || type === 'select';
    }

    function normalizeImageUrl(raw) {
        const v = String(raw || '').trim();
        if (!v || v.length > IMAGE_URL_MAX) return '';
        if (/^https:\/\//i.test(v)) return v;
        if (/^\/assets\/[A-Za-z0-9._\-\/]+\.(?:jpg|jpeg|png|webp)$/i.test(v)) return v;
        return '';
    }

    function looksLikeClothing(item) {
        if (!item) return false;
        if (item.option_type === 'size' || item.option_type === 'color') return true;
        return /cloth|hoodie|shirt|apparel|jacket|tee|sweat|beanie|hat|pant/i.test(String(item.name || ''));
    }

    function normalizeAppliesTo(raw) {
        const v = String(raw || '').trim();
        return APPLIES_TO.includes(v) ? v : 'all';
    }

    function normalizeIncludedItems(items) {
        if (!Array.isArray(items)) return [];
        const out = [];
        for (const raw of items) {
            if (!raw || typeof raw !== 'object') continue;
            const name = String(raw.name || '').trim().slice(0, NAME_MAX);
            if (!name) continue;
            const option_type = String(raw.option_type || '').trim();
            if (!OPTION_TYPES.includes(option_type)) continue;
            let choices = [];
            if (needsChoices(option_type)) {
                const seen = new Set();
                const src = Array.isArray(raw.choices) ? raw.choices : [];
                for (const c of src) {
                    const v = String(c || '').trim().slice(0, CHOICE_MAX);
                    if (!v) continue;
                    const key = v.toLowerCase();
                    if (seen.has(key)) continue;
                    seen.add(key);
                    choices.push(v);
                    if (choices.length >= CHOICES_MAX) break;
                }
                if (!choices.length) continue;
            }
            const id = String(raw.id || '').trim() || `inc-${out.length + 1}`;
            const image_url = normalizeImageUrl(raw.image_url);
            const row = {
                id,
                name,
                required: option_type === 'info' ? false : !!raw.required,
                option_type,
                choices,
                applies_to: normalizeAppliesTo(raw.applies_to),
            };
            if (image_url) row.image_url = image_url;
            out.push(row);
        }
        return out;
    }

    function forRole(catalog, role) {
        const list = normalizeIncludedItems(catalog);
        const r = role === 'kid' ? 'kid' : (role === 'adult' ? 'adult' : null);
        if (!r) return list;
        return list.filter((item) => item.applies_to === 'all' || item.applies_to === r);
    }

    function hasCatalog(catalog) {
        return normalizeIncludedItems(catalog).length > 0;
    }

    function hasCatalogForRole(catalog, role) {
        return forRole(catalog, role).length > 0;
    }

    function seatOptionsTitle(role) {
        const r = role === 'kid' ? 'kid' : 'adult';
        return r === 'kid' ? 'Your choices (child seat)' : 'Your choices (adult seat)';
    }

    /** Default seat role when catalog is kid-only (no adult/all items). */
    function defaultSeatRoleForCatalog(catalog) {
        const list = normalizeIncludedItems(catalog);
        if (!list.length) return 'adult';
        const hasAdultOrAll = list.some((item) => item.applies_to === 'all' || item.applies_to === 'adult');
        if (hasAdultOrAll) return 'adult';
        const hasKid = list.some((item) => item.applies_to === 'kid');
        return hasKid ? 'kid' : 'adult';
    }

    function validateAnswers(catalog, answers, role) {
        const list = role ? forRole(catalog, role) : normalizeIncludedItems(catalog);
        const map = answers && typeof answers === 'object' ? answers : {};
        for (const item of list) {
            if (item.option_type === 'info') continue;
            const raw = map[item.id];
            const value = raw == null ? '' : String(raw).trim();
            if (item.required && !value) {
                return `${item.name} is required.`;
            }
            if (!value) continue;
            if (value.length > ANSWER_MAX) {
                return `${item.name} must be ${ANSWER_MAX} characters or fewer.`;
            }
            if (needsChoices(item.option_type)) {
                const ok = item.choices.some((c) => c === value);
                if (!ok) return `Pick a valid option for ${item.name}.`;
            }
        }
        return null;
    }

    function answersComplete(catalog, answers, role) {
        return validateAnswers(catalog, answers, role) == null;
    }

    function sanitizeAnswers(catalog, answers, role) {
        const list = role ? forRole(catalog, role) : normalizeIncludedItems(catalog);
        const map = answers && typeof answers === 'object' ? answers : {};
        const out = {};
        for (const item of list) {
            if (item.option_type === 'info') continue;
            const value = map[item.id] == null ? '' : String(map[item.id]).trim().slice(0, ANSWER_MAX);
            if (!value) continue;
            if (needsChoices(item.option_type) && !item.choices.includes(value)) continue;
            out[item.id] = value;
        }
        return out;
    }

    const COLOR_HEX = {
        black: '#0B2545',
        white: '#FFFFFF',
        navy: '#13366E',
        gray: '#9CA3AF',
        grey: '#9CA3AF',
        red: '#B91C1C',
        green: '#166534',
        blue: '#2563EB',
        teal: '#0E8B8B',
        cream: '#F5F0E8',
        khaki: '#C3B091',
        olive: '#6B8E23',
        pink: '#DB2777',
        purple: '#7C3AED',
        orange: '#EA580C',
        yellow: '#CA8A04',
        brown: '#92400E',
    };

    function colorHexForLabel(label) {
        const key = String(label || '').trim().toLowerCase();
        if (COLOR_HEX[key]) return COLOR_HEX[key];
        // CSS named color fallback for simple tokens
        if (/^[a-z]+$/i.test(key) && typeof document !== 'undefined') {
            return key;
        }
        return '#EEF2F6';
    }

    function isLightHex(hex) {
        const h = String(hex || '').replace('#', '');
        if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return true;
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 180;
    }

    function choiceChipsHtml(item, fieldId, selectedValue) {
        const selected = String(selectedValue || '').trim();
        const chips = item.choices.map((c) => {
            const safe = escapeHtml(c);
            const pressed = selected && c === selected ? 'true' : 'false';
            const selCls = pressed === 'true' ? ' is-selected' : '';
            return `<button type="button" class="ed-inc-chip${selCls}" data-inc-choice="${safe}" aria-pressed="${pressed}">${safe}</button>`;
        }).join('');
        return `
            <div class="ed-inc-chips" role="group" aria-label="${escapeHtml(item.name)}">
                <input type="hidden" id="${escapeHtml(fieldId)}" class="ed-inc-input"
                    data-inc-answer="${escapeHtml(item.id)}" value="${escapeHtml(selected)}" ${item.required ? 'required' : ''}>
                ${chips}
            </div>`;
    }

    function choiceSwatchesHtml(item, fieldId, selectedValue) {
        const selected = String(selectedValue || '').trim();
        const swatches = item.choices.map((c) => {
            const safe = escapeHtml(c);
            const hex = colorHexForLabel(c);
            const light = isLightHex(hex) ? ' is-light' : '';
            const pressed = selected && c === selected ? 'true' : 'false';
            const selCls = pressed === 'true' ? ' is-selected' : '';
            return `<button type="button" class="ed-inc-swatch${light}${selCls}" data-inc-choice="${safe}"
                aria-pressed="${pressed}" aria-label="${safe}" title="${safe}"
                style="--ed-inc-swatch:${escapeHtml(hex)}">
                <span class="ed-inc-swatch-dot" aria-hidden="true"></span>
                <span class="ed-inc-swatch-label">${safe}</span>
            </button>`;
        }).join('');
        return `
            <div class="ed-inc-swatches" role="group" aria-label="${escapeHtml(item.name)}">
                <input type="hidden" id="${escapeHtml(fieldId)}" class="ed-inc-input"
                    data-inc-answer="${escapeHtml(item.id)}" value="${escapeHtml(selected)}" ${item.required ? 'required' : ''}>
                ${swatches}
            </div>`;
    }

    function joinItemNames(items) {
        const names = items.map((item) => String(item.name || '').trim()).filter(Boolean);
        if (!names.length) return '';
        if (names.length === 1) return names[0];
        if (names.length === 2) return names[0] + ' and ' + names[1];
        return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
    }

    function teaserHtml(catalog) {
        const list = normalizeIncludedItems(catalog);
        if (!list.length) return '';
        const answerable = list.filter((item) => item.option_type !== 'info');
        const label = joinItemNames(answerable.length ? answerable : list);
        if (!label) return '';
        const line = answerable.length
            ? `You&apos;ll choose ${escapeHtml(label)} when you RSVP.`
            : `Package includes ${escapeHtml(label)}.`;
        return `
        <div class="ed-included-catalog ed-included-teaser">
            <p class="ed-hint" style="margin-top:14px;margin-bottom:0">${line}</p>
        </div>`;
    }

    function packageIntroHtml(catalog) {
        const list = normalizeIncludedItems(catalog);
        if (!list.length) return '';
        const clothing = list.some(looksLikeClothing);
        const answerable = list.filter((item) => item.option_type !== 'info');
        let copy = 'This event includes items with your RSVP package. Choose your options below.';
        if (!answerable.length) {
            copy = 'These items are included with the event package.';
        } else if (clothing) {
            copy = 'This event includes clothing items with the event package. Pick your size so we can order yours.';
        }
        const seen = new Set();
        const figs = [];
        for (const item of list) {
            if (!item.image_url || seen.has(item.image_url)) continue;
            seen.add(item.image_url);
            figs.push(`
                <figure class="ed-inc-preview">
                    <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" loading="lazy">
                    <figcaption>${escapeHtml(item.name)}</figcaption>
                </figure>`);
        }
        return `
            <div class="ed-inc-intro">
                <p class="ed-inc-intro-copy">${copy}</p>
                ${figs.length ? `<div class="ed-inc-previews">${figs.join('')}</div>` : ''}
            </div>`;
    }

    /**
     * @param {Array} catalog
     * @param {{ idPrefix?: string, role?: string, answers?: Record<string, string>, includeIntro?: boolean }} opts
     */
    function formFieldsHtml(catalog, opts) {
        const role = (opts && opts.role) || 'adult';
        const answers = (opts && opts.answers && typeof opts.answers === 'object') ? opts.answers : {};
        const list = forRole(catalog, role);
        if (!list.length) return '';
        const prefix = (opts && opts.idPrefix) || 'incOpt';
        const includeIntro = !opts || opts.includeIntro !== false;
        const answerable = list.filter((item) => item.option_type !== 'info');
        if (!answerable.length) {
            return includeIntro
                ? `<div class="ed-inc-options" data-inc-options-root="${escapeHtml(prefix)}">${packageIntroHtml(list)}</div>`
                : '';
        }
        const fields = answerable.map((item) => {
            const fieldId = `${prefix}-${item.id}`;
            const req = item.required ? ' <span class="text-red-500">*</span>' : '';
            const selected = String(answers[item.id] || '').trim().slice(0, ANSWER_MAX);
            let control = '';
            if (item.option_type === 'color') {
                control = choiceSwatchesHtml(item, fieldId, selected);
            } else if (item.option_type === 'size' || item.option_type === 'select') {
                control = choiceChipsHtml(item, fieldId, selected);
            } else {
                control = `<input class="ec-input ed-inc-input" type="text" id="${escapeHtml(fieldId)}" data-inc-answer="${escapeHtml(item.id)}" maxlength="${ANSWER_MAX}" placeholder="Your answer" value="${escapeHtml(selected)}" ${item.required ? 'required' : ''}>`;
            }
            return `
                <div class="ed-inc-field">
                    <label class="ec-label ed-inc-field-label" for="${escapeHtml(fieldId)}">${escapeHtml(item.name)}${req}</label>
                    ${control}
                </div>
            `;
        }).join('');
        return `
            <div class="ed-inc-options" data-inc-options-root="${escapeHtml(prefix)}">
                ${includeIntro ? packageIntroHtml(list) : ''}
                <p class="ed-inc-options-title">${escapeHtml(seatOptionsTitle(role))}</p>
                ${fields}
            </div>
        `;
    }

    function readAnswersFromRoot(root, catalog, role) {
        const list = role ? forRole(catalog, role) : normalizeIncludedItems(catalog);
        const scope = root || document;
        const out = {};
        for (const item of list) {
            const el = scope.querySelector(`[data-inc-answer="${CSS.escape(item.id)}"]`);
            if (!el) continue;
            const value = String(el.value || '').trim().slice(0, ANSWER_MAX);
            if (value) out[item.id] = value;
        }
        return out;
    }

    function wireChoiceControls(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-inc-options-root]').forEach((groupRoot) => {
            if (groupRoot.dataset.incChoicesWired === '1') return;
            groupRoot.dataset.incChoicesWired = '1';
            groupRoot.addEventListener('click', (ev) => {
                const btn = ev.target.closest('[data-inc-choice]');
                if (!btn || !groupRoot.contains(btn)) return;
                const wrap = btn.closest('.ed-inc-chips, .ed-inc-swatches');
                if (!wrap) return;
                const hidden = wrap.querySelector('[data-inc-answer]');
                if (!hidden) return;
                const value = btn.getAttribute('data-inc-choice') || '';
                const same = hidden.value === value;
                hidden.value = same ? '' : value;
                wrap.querySelectorAll('[data-inc-choice]').forEach((el) => {
                    const on = !same && el === btn;
                    el.classList.toggle('is-selected', on);
                    el.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
                hidden.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }

    function optionTypeLabel(type) {
        if (type === 'size') return 'Size';
        if (type === 'color') return 'Color';
        if (type === 'select') return 'Choice';
        if (type === 'info') return 'Included';
        return 'Text';
    }

    function appliesToLabel(appliesTo) {
        if (appliesTo === 'adult') return 'Adults';
        if (appliesTo === 'kid') return 'Kids';
        return 'All';
    }

    /**
     * Read-only catalog list for event detail (browse before RSVP).
     * @param {Array} catalog
     */
    function catalogListHtml(catalog) {
        const list = normalizeIncludedItems(catalog);
        if (!list.length) return '';
        const rows = list.map((item) => {
            const typeLabel = optionTypeLabel(item.option_type);
            const appliesLabel = appliesToLabel(item.applies_to);
            const requiredBadge = item.required
                ? '<span class="ed-inc-pill ed-inc-pill-required">Required</span>'
                : '';
            const appliesBadge = `<span class="ed-inc-pill ed-inc-pill-applies">${escapeHtml(appliesLabel)}</span>`;
            let choicesHtml = '';
            if (needsChoices(item.option_type) && item.choices.length) {
                choicesHtml = `<div class="ed-inc-catalog-choices">${item.choices.map((c) => `<span class="ed-inc-pill ed-inc-pill-choice">${escapeHtml(c)}</span>`).join('')}</div>`;
            } else if (item.option_type === 'text') {
                choicesHtml = '<p class="ed-inc-catalog-note">Free-text answer at RSVP</p>';
            } else if (item.option_type === 'info') {
                choicesHtml = '<p class="ed-inc-catalog-note">Included with the package — no RSVP choice</p>';
            }
            const thumb = item.image_url
                ? `<img class="ed-inc-catalog-thumb" src="${escapeHtml(item.image_url)}" alt="" loading="lazy">`
                : '';
            return `
                <li class="ed-inc-catalog-item">
                    <div class="ed-inc-catalog-head">
                        ${thumb}
                        <span class="ed-inc-catalog-name">${escapeHtml(item.name)}</span>
                        <div class="ed-inc-catalog-badges">${requiredBadge}${appliesBadge}<span class="ed-inc-pill ed-inc-pill-type">${escapeHtml(typeLabel)}</span></div>
                    </div>
                    ${choicesHtml}
                </li>`;
        }).join('');
        return `<ul class="ed-inc-catalog-list">${rows}</ul>`;
    }

    const EventsIncludedItems = {
        NAME_MAX,
        CHOICE_MAX,
        CHOICES_MAX,
        ANSWER_MAX,
        IMAGE_URL_MAX,
        OPTION_TYPES,
        APPLIES_TO,
        SIZE_PRESET,
        COLOR_PRESET,
        needsChoices,
        normalizeAppliesTo,
        normalizeIncludedItems,
        forRole,
        hasCatalog,
        hasCatalogForRole,
        seatOptionsTitle,
        defaultSeatRoleForCatalog,
        validateAnswers,
        answersComplete,
        sanitizeAnswers,
        formFieldsHtml,
        teaserHtml,
        packageIntroHtml,
        readAnswersFromRoot,
        wireChoiceControls,
        catalogListHtml,
        optionTypeLabel,
        appliesToLabel,
    };

    globalThis.EventsIncludedItems = EventsIncludedItems;
})();
