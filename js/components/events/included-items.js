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
    const OPTION_TYPES = ['size', 'color', 'text', 'select'];
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
            out.push({
                id,
                name,
                required: !!raw.required,
                option_type,
                choices,
                applies_to: normalizeAppliesTo(raw.applies_to),
            });
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
            const value = map[item.id] == null ? '' : String(map[item.id]).trim().slice(0, ANSWER_MAX);
            if (!value) continue;
            if (needsChoices(item.option_type) && !item.choices.includes(value)) continue;
            out[item.id] = value;
        }
        return out;
    }

    /**
     * @param {Array} catalog
     * @param {{ idPrefix?: string, role?: string }} opts
     */
    function formFieldsHtml(catalog, opts) {
        const role = (opts && opts.role) || 'adult';
        const list = forRole(catalog, role);
        if (!list.length) return '';
        const prefix = (opts && opts.idPrefix) || 'incOpt';
        const fields = list.map((item) => {
            const fieldId = `${prefix}-${item.id}`;
            const req = item.required ? ' <span class="text-red-500">*</span>' : '';
            let control = '';
            if (needsChoices(item.option_type)) {
                const optsHtml = [
                    `<option value="">Select…</option>`,
                    ...item.choices.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`),
                ].join('');
                control = `<select class="ec-input ed-inc-input" id="${escapeHtml(fieldId)}" data-inc-answer="${escapeHtml(item.id)}" ${item.required ? 'required' : ''}>${optsHtml}</select>`;
            } else {
                control = `<input class="ec-input ed-inc-input" type="text" id="${escapeHtml(fieldId)}" data-inc-answer="${escapeHtml(item.id)}" maxlength="${ANSWER_MAX}" placeholder="Your answer" ${item.required ? 'required' : ''}>`;
            }
            return `
                <div class="ed-inc-field" style="margin-bottom:10px">
                    <label class="ec-label" for="${escapeHtml(fieldId)}" style="display:block;font-size:12px;font-weight:600;color:#0b2545;margin-bottom:4px">${escapeHtml(item.name)}${req}</label>
                    ${control}
                </div>
            `;
        }).join('');
        return `
            <div class="ed-inc-options" data-inc-options-root="${escapeHtml(prefix)}">
                <p class="ed-inc-options-title" style="font-size:13px;font-weight:700;color:#0b2545;margin:0 0 8px">${escapeHtml(seatOptionsTitle(role))}</p>
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

    function optionTypeLabel(type) {
        if (type === 'size') return 'Size';
        if (type === 'color') return 'Color';
        if (type === 'select') return 'Choice';
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
            }
            return `
                <li class="ed-inc-catalog-item">
                    <div class="ed-inc-catalog-head">
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
        readAnswersFromRoot,
        catalogListHtml,
        optionTypeLabel,
        appliesToLabel,
    };

    globalThis.EventsIncludedItems = EventsIncludedItems;
})();
