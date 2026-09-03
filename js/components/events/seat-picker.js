/* ════════════════════════════════════════════════════════════
   Events — Adult/kid seat picker (§13.8 self RSVP)
   Surface: window.EventsSeatPicker
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const INPUT_NAME = 'evtSeatRole';

    function escapeHtml(str) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(str);
        }
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function priceLabel(event, role) {
        if (window.EventsHelpers && typeof window.EventsHelpers.seatPriceLabel === 'function') {
            return window.EventsHelpers.seatPriceLabel(event, role);
        }
        return role === 'kid' ? 'Free' : '';
    }

    function shouldShow(event, ctx) {
        if (!event || event.event_type === 'competition' || event.rsvp_enabled === false) {
            return false;
        }
        if (ctx && ctx.isHost) return false;
        return true;
    }

    /**
     * @param {object} event
     * @param {{ idPrefix?: string, defaultRole?: string }} opts
     */
    function formFieldsHtml(event, opts) {
        if (!event) return '';
        const prefix = (opts && opts.idPrefix) || 'seatPicker';
        let defaultRole = (opts && opts.defaultRole) || 'adult';
        if (window.EventsIncludedItems && typeof window.EventsIncludedItems.defaultSeatRoleForCatalog === 'function') {
            defaultRole = opts && opts.defaultRole != null
                ? defaultRole
                : window.EventsIncludedItems.defaultSeatRoleForCatalog(event.included_items);
        }
        if (window.EventsHelpers && window.EventsHelpers.normalizeSeatRole) {
            defaultRole = window.EventsHelpers.normalizeSeatRole(defaultRole);
        } else {
            defaultRole = defaultRole === 'kid' ? 'kid' : 'adult';
        }
        const adultLabel = priceLabel(event, 'adult');
        const kidLabel = priceLabel(event, 'kid');

        return `
            <div class="ed-seat-picker" data-seat-picker-root="${escapeHtml(prefix)}" style="margin-bottom:12px">
                <p class="ed-seat-picker-label">Who is this RSVP for?</p>
                <div class="ed-seat-picker-options" role="radiogroup" aria-label="Seat type">
                    <label class="ed-seat-picker-option${defaultRole === 'adult' ? ' is-selected' : ''}">
                        <input type="radio" name="${escapeHtml(INPUT_NAME)}" value="adult" data-seat-role-input="1"
                            ${defaultRole === 'adult' ? 'checked' : ''}>
                        <span class="ed-seat-picker-option-body">
                            <span class="ed-seat-picker-option-title">Adult</span>
                            <span class="ed-seat-picker-option-price">${escapeHtml(adultLabel)}</span>
                        </span>
                    </label>
                    <label class="ed-seat-picker-option${defaultRole === 'kid' ? ' is-selected' : ''}">
                        <input type="radio" name="${escapeHtml(INPUT_NAME)}" value="kid" data-seat-role-input="1"
                            ${defaultRole === 'kid' ? 'checked' : ''}>
                        <span class="ed-seat-picker-option-body">
                            <span class="ed-seat-picker-option-title">Child</span>
                            <span class="ed-seat-picker-option-price">${escapeHtml(kidLabel)}</span>
                        </span>
                    </label>
                </div>
            </div>`;
    }

    function readRoleFromRoot(root) {
        const scope = root || document;
        const checked = scope.querySelector('[data-seat-role-input="1"]:checked');
        const raw = checked ? checked.value : 'adult';
        if (window.EventsHelpers && typeof window.EventsHelpers.normalizeSeatRole === 'function') {
            return window.EventsHelpers.normalizeSeatRole(raw);
        }
        return raw === 'kid' ? 'kid' : 'adult';
    }

    function wireRoleChange(root, event, onChange) {
        const scope = root || document;
        const inputs = scope.querySelectorAll('[data-seat-role-input="1"]');
        if (!inputs.length) return;

        function syncSelected() {
            inputs.forEach((input) => {
                const label = input.closest('.ed-seat-picker-option');
                if (label) label.classList.toggle('is-selected', input.checked);
            });
        }

        inputs.forEach((input) => {
            input.addEventListener('change', () => {
                syncSelected();
                if (typeof onChange === 'function') {
                    onChange(readRoleFromRoot(scope), event);
                }
            });
        });
    }

    const EventsSeatPicker = {
        INPUT_NAME,
        shouldShow,
        formFieldsHtml,
        readRoleFromRoot,
        wireRoleChange,
    };

    globalThis.EventsSeatPicker = EventsSeatPicker;
})();
