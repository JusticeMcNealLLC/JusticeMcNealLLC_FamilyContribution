/* ════════════════════════════════════════════════════════════
   Events — Payer-owned multi-guest party seats (§13.9 Flow A)
   Surface: window.EventsPartySeats
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const MAX_PARTY_SEATS = 12;
    const DISPLAY_NAME_MAX = 120;

    function escapeHtml(str) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(str);
        }
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function normalizeSeatRole(raw) {
        if (window.EventsHelpers && typeof window.EventsHelpers.normalizeSeatRole === 'function') {
            return window.EventsHelpers.normalizeSeatRole(raw);
        }
        return String(raw || '').trim().toLowerCase() === 'kid' ? 'kid' : 'adult';
    }

    function seatPriceCents(event, role) {
        if (window.EventsHelpers && typeof window.EventsHelpers.seatPriceCents === 'function') {
            return window.EventsHelpers.seatPriceCents(event, role);
        }
        return Number(event?.rsvp_cost_cents || 0);
    }

    function seatPriceLabel(event, role) {
        if (window.EventsHelpers && typeof window.EventsHelpers.seatPriceLabel === 'function') {
            return window.EventsHelpers.seatPriceLabel(event, role);
        }
        const cents = seatPriceCents(event, role);
        return cents <= 0 ? 'Free' : `$${(cents / 100).toFixed(0)}`;
    }

    function formatMoney(cents) {
        if (window.EventsHelpers && typeof window.EventsHelpers.formatMoney === 'function') {
            return window.EventsHelpers.formatMoney(cents);
        }
        return `$${((Number(cents) || 0) / 100).toFixed(0)}`;
    }

    function partyBaseTotalCents(event, seats) {
        let total = 0;
        for (const seat of seats || []) {
            total += seatPriceCents(event, seat.role);
        }
        return total;
    }

    function validatePartySeats(event, seats, catalog, opts) {
        const allowIncompleteGuests = !!(opts && opts.allowIncompleteGuests);
        if (!seats || !seats.length) return 'Add at least one person to your party.';
        if (seats.length > MAX_PARTY_SEATS) {
            return `Parties are limited to ${MAX_PARTY_SEATS} people.`;
        }
        if (!seats.some((s) => s.is_payer)) return 'The payer must be included in your party.';
        for (const seat of seats) {
            if (!String(seat.display_name || '').trim()) {
                return seat.is_payer ? 'Your name is required.' : 'Each guest needs a name.';
            }
            if (allowIncompleteGuests && !seat.is_payer) continue;
            if (window.EventsIncludedItems && typeof window.EventsIncludedItems.validateAnswers === 'function') {
                const err = window.EventsIncludedItems.validateAnswers(catalog, seat.options || {}, seat.role);
                if (err) {
                    const who = seat.is_payer ? 'Your' : `${seat.display_name}'s`;
                    return `${who} ${err.charAt(0).toLowerCase()}${err.slice(1)}`;
                }
            }
        }
        return null;
    }

    function shouldShow(event, ctx) {
        if (!event || event.event_type === 'competition' || event.rsvp_enabled === false) {
            return false;
        }
        if (ctx && ctx.isHost) return false;
        return true;
    }

    function defaultPayerRole(event) {
        if (window.EventsIncludedItems && typeof window.EventsIncludedItems.defaultSeatRoleForCatalog === 'function') {
            return window.EventsIncludedItems.defaultSeatRoleForCatalog(event.included_items);
        }
        return 'adult';
    }

    function seatRowIncludedHtml(event, prefix, index, role, answers) {
        if (!window.EventsIncludedItems || typeof window.EventsIncludedItems.formFieldsHtml !== 'function') {
            return '';
        }
        const catalog = event.included_items;
        if (!window.EventsIncludedItems.hasCatalogForRole(catalog, role)) return '';
        return window.EventsIncludedItems.formFieldsHtml(catalog, {
            idPrefix: `${prefix}-seat-${index}`,
            role,
            answers: answers || {},
        });
    }

    function seatRoleRadiosHtml(event, prefix, index, role, isPayer) {
        // Payer cannot be a child seat — they are the RSVPing adult
        if (isPayer) {
            return `
                <input type="hidden" data-party-seat-fixed-role="${index}" value="adult">
                <span class="ed-party-seat-role-badge">Adult · ${escapeHtml(seatPriceLabel(event, 'adult'))}</span>`;
        }
        const adultLabel = seatPriceLabel(event, 'adult');
        const kidLabel = seatPriceLabel(event, 'kid');
        const name = `${prefix}-role-${index}`;
        const r = normalizeSeatRole(role);
        return `
            <div class="ed-party-seat-roles" role="radiogroup" aria-label="Seat type">
                <label class="ed-seat-picker-option${r === 'adult' ? ' is-selected' : ''}">
                    <input type="radio" name="${escapeHtml(name)}" value="adult" data-party-seat-role="1"
                        data-party-seat-index="${index}" ${r === 'adult' ? 'checked' : ''}>
                    <span class="ed-seat-picker-option-body">
                        <span class="ed-seat-picker-option-title">Adult</span>
                        <span class="ed-seat-picker-option-price">${escapeHtml(adultLabel)}</span>
                    </span>
                </label>
                <label class="ed-seat-picker-option${r === 'kid' ? ' is-selected' : ''}">
                    <input type="radio" name="${escapeHtml(name)}" value="kid" data-party-seat-role="1"
                        data-party-seat-index="${index}" ${r === 'kid' ? 'checked' : ''}>
                    <span class="ed-seat-picker-option-body">
                        <span class="ed-seat-picker-option-title">Child</span>
                        <span class="ed-seat-picker-option-price">${escapeHtml(kidLabel)}</span>
                    </span>
                </label>
            </div>`;
    }

    function seatRowHtml(event, prefix, index, seat, opts) {
        const isPayer = !!seat.is_payer;
        const hidePayerName = !!(opts && opts.hidePayerName);
        const role = isPayer ? 'adult' : normalizeSeatRole(seat.role);
        const title = isPayer ? 'You (payer)' : `Guest ${index}`;
        const removeBtn = isPayer ? '' : `
            <button type="button" class="ed-party-seat-remove" data-party-seat-remove="${index}"
                aria-label="Remove guest">Remove</button>`;
        const roleBlock = isPayer
            ? seatRoleRadiosHtml(event, prefix, index, role, true)
            : `<input type="hidden" data-party-seat-fixed-role="${index}" value="${escapeHtml(role)}">
               <span class="ed-party-seat-role-badge">${role === 'kid' ? 'Child' : 'Adult'} · ${escapeHtml(seatPriceLabel(event, role))}</span>`;

        const nameId = `${prefix}-name-${index}`;
        const nameValue = escapeHtml(seat.display_name || '');
        const nameField = (isPayer && hidePayerName)
            ? `<input type="hidden" class="ed-party-seat-name" id="${escapeHtml(nameId)}"
                    data-party-seat-name="${index}" data-party-seat-payer="1"
                    maxlength="${DISPLAY_NAME_MAX}" value="${nameValue}">`
            : `<label class="ec-label" for="${escapeHtml(nameId)}">Name</label>
                <input type="text" class="ec-input ed-party-seat-name" id="${escapeHtml(nameId)}"
                    data-party-seat-name="${index}" maxlength="${DISPLAY_NAME_MAX}"
                    value="${nameValue}" ${isPayer ? 'data-party-seat-payer="1"' : ''}
                    placeholder="${isPayer ? 'Your name' : 'Guest name'}" required>`;

        return `
            <div class="ed-party-seat-row${isPayer ? ' is-payer' : ''}" data-party-seat-row="${index}">
                <div class="ed-party-seat-header">
                    <span class="ed-party-seat-title">${escapeHtml(title)}</span>
                    ${removeBtn}
                </div>
                ${nameField}
                ${roleBlock}
                <div class="ed-party-seat-inc" data-party-seat-inc="${index}">
                    ${seatRowIncludedHtml(event, prefix, index, role, seat.options || {})}
                </div>
                ${!isPayer && window.EventsIncludedItems
                    && typeof window.EventsIncludedItems.hasCatalogForRole === 'function'
                    && window.EventsIncludedItems.hasCatalogForRole(event.included_items, role)
                    ? '<p class="ed-party-seat-invite-hint">Leave blank to send an invite link after RSVP.</p>'
                    : ''}
            </div>`;
    }

    /**
     * Sync contact name into the hidden/visible payer seat name field.
     * @param {ParentNode} root
     * @param {string} name
     */
    function syncPayerNameFromContact(root, name) {
        const scope = root || document;
        const partyRoot = scope.querySelector
            ? (scope.querySelector('[data-party-seats-root]') || scope)
            : document;
        const payerNameEl = partyRoot.querySelector
            ? partyRoot.querySelector('[data-party-seat-payer="1"]')
            : null;
        if (!payerNameEl) return;
        payerNameEl.value = String(name || '').trim().slice(0, DISPLAY_NAME_MAX);
    }

    /**
     * @param {object} event
     * @param {{ idPrefix?: string, payerName?: string, defaultRole?: string, hidePayerName?: boolean, hideLabel?: boolean, initialSeats?: Array }} opts
     */
    function formFieldsHtml(event, opts) {
        if (!event) return '';
        const prefix = (opts && opts.idPrefix) || 'partySeats';
        const hidePayerName = !!(opts && opts.hidePayerName);
        const hideLabel = !!(opts && opts.hideLabel);
        const payerName = String((opts && opts.payerName) || '').trim();
        const initial = Array.isArray(opts?.initialSeats) ? opts.initialSeats.filter(Boolean) : [];

        let seats;
        if (initial.length) {
            seats = initial.map((s, i) => {
                const isPayer = i === 0 || !!s.is_payer;
                return {
                    role: isPayer ? 'adult' : normalizeSeatRole(s.role),
                    display_name: String(s.display_name || (isPayer ? payerName : '')).trim(),
                    is_payer: isPayer,
                    options: (s.options && typeof s.options === 'object') ? s.options : {},
                };
            });
            // Exactly one payer — first seat
            seats.forEach((s, i) => { s.is_payer = i === 0; });
            if (seats[0] && !seats[0].display_name && payerName) seats[0].display_name = payerName;
        } else {
            seats = [{
                role: 'adult',
                display_name: payerName,
                is_payer: true,
                options: {},
            }];
        }
        const total = partyBaseTotalCents(event, seats);

        return `
            <div class="ed-party-seats" data-party-seats-root="${escapeHtml(prefix)}"
                data-hide-payer-name="${hidePayerName ? '1' : '0'}">
                ${hideLabel ? '' : '<p class="ed-party-seats-label">Who\'s coming?</p>'}
                <div class="ed-party-seat-rows" data-party-seat-rows="1">
                    ${seats.map((seat, i) => seatRowHtml(event, prefix, i, seat, opts)).join('')}
                </div>
                <div class="ed-party-seat-actions">
                    <button type="button" class="ed-btn-secondary ed-party-add-seat" data-party-add-role="adult">+ Add Adult</button>
                    <button type="button" class="ed-btn-secondary ed-party-add-seat" data-party-add-role="kid">+ Add Child</button>
                </div>
                <p class="ed-party-total" data-party-total="1">Party total: <strong>${escapeHtml(formatMoney(total))}</strong></p>
            </div>`;
    }

    function readRoleFromRow(row, index) {
        const fixed = row.querySelector(`[data-party-seat-fixed-role="${index}"]`);
        if (fixed) return normalizeSeatRole(fixed.value);
        const checked = row.querySelector(`[data-party-seat-role="1"][data-party-seat-index="${index}"]:checked`);
        return normalizeSeatRole(checked ? checked.value : 'adult');
    }

    function readAnswersFromRow(row, catalog, role) {
        if (window.EventsIncludedItems && typeof window.EventsIncludedItems.readAnswersFromRoot === 'function') {
            return window.EventsIncludedItems.readAnswersFromRoot(row, catalog, role);
        }
        return {};
    }

    function resolvePartyRoot(root) {
        const scope = root || document;
        if (scope.getAttribute && scope.getAttribute('data-party-seats-root') != null) {
            return scope;
        }
        if (scope.querySelector) {
            return scope.querySelector('[data-party-seats-root]');
        }
        return null;
    }

    function readSeatsFromRoot(root, event) {
        const partyRoot = resolvePartyRoot(root);
        if (!partyRoot) return [];
        const prefix = partyRoot.getAttribute('data-party-seats-root') || 'partySeats';
        const rows = partyRoot.querySelectorAll('[data-party-seat-row]');
        const catalog = (window.EventsIncludedItems && typeof window.EventsIncludedItems.normalizeIncludedItems === 'function')
            ? window.EventsIncludedItems.normalizeIncludedItems(event && event.included_items)
            : [];
        const seats = [];
        rows.forEach((row) => {
            const index = Number(row.getAttribute('data-party-seat-row'));
            const nameEl = row.querySelector(`[data-party-seat-name="${index}"]`);
            const isPayer = !!row.querySelector('[data-party-seat-payer="1"]');
            // Payer is always adult — never treat as child even if stale radio exists
            let role = readRoleFromRow(row, index);
            if (isPayer) role = 'adult';
            const display_name = String(nameEl?.value || '').trim().slice(0, DISPLAY_NAME_MAX);
            const options = readAnswersFromRow(row, catalog, role);
            seats.push({
                role,
                display_name,
                is_payer: isPayer,
                ...(Object.keys(options).length ? { options } : {}),
            });
        });
        if (seats.length && !seats.some((s) => s.is_payer)) seats[0].is_payer = true;
        return seats;
    }

    function readPayerRoleFromRoot(root) {
        const seats = readSeatsFromRoot(root, {});
        const payer = seats.find((s) => s.is_payer) || seats[0];
        return payer ? normalizeSeatRole(payer.role) : 'adult';
    }

    function updateTotalLabel(partyRoot, event) {
        const totalEl = partyRoot.querySelector('[data-party-total="1"]');
        if (!totalEl || !event) return;
        const seats = readSeatsFromRoot(partyRoot, event);
        const total = partyBaseTotalCents(event, seats);
        totalEl.innerHTML = `Party total: <strong>${escapeHtml(formatMoney(total))}</strong>`;
    }

    function partyRowOpts(partyRoot) {
        return {
            hidePayerName: partyRoot.getAttribute('data-hide-payer-name') === '1',
        };
    }

    function wireIncludedChoices(scope) {
        if (window.EventsIncludedItems && typeof window.EventsIncludedItems.wireChoiceControls === 'function') {
            window.EventsIncludedItems.wireChoiceControls(scope);
        }
    }

    function reindexRows(partyRoot, event, prefix) {
        const rowsWrap = partyRoot.querySelector('[data-party-seat-rows="1"]');
        if (!rowsWrap) return;
        const rowOpts = partyRowOpts(partyRoot);
        const rows = Array.from(rowsWrap.querySelectorAll('[data-party-seat-row]'));
        rows.forEach((row, i) => {
            const isPayer = row.classList.contains('is-payer');
            const nameEl = row.querySelector('.ed-party-seat-name');
            const display_name = String(nameEl?.value || '').trim();
            const role = readRoleFromRow(row, Number(row.getAttribute('data-party-seat-row')));
            const seat = { role, display_name, is_payer: isPayer };
            const tmp = document.createElement('div');
            tmp.innerHTML = seatRowHtml(event, prefix, i, seat, rowOpts);
            const newRow = tmp.firstElementChild;
            rowsWrap.replaceChild(newRow, row);
        });
        wireRowEvents(partyRoot, event, prefix);
    }

    function wireRowEvents(partyRoot, event, prefix) {
        const onChange = partyRoot._partyOnChange;
        const rowOpts = partyRowOpts(partyRoot);

        partyRoot.querySelectorAll('[data-party-seat-role="1"]').forEach((input) => {
            if (input.dataset.wired) return;
            input.dataset.wired = '1';
            input.addEventListener('change', () => {
                const index = Number(input.getAttribute('data-party-seat-index'));
                const row = partyRoot.querySelector(`[data-party-seat-row="${index}"]`);
                if (!row) return;
                row.querySelectorAll('.ed-seat-picker-option').forEach((label) => {
                    const radio = label.querySelector('input[type="radio"]');
                    label.classList.toggle('is-selected', !!(radio && radio.checked));
                });
                const role = readRoleFromRow(row, index);
                const incWrap = row.querySelector(`[data-party-seat-inc="${index}"]`);
                if (incWrap) {
                    incWrap.innerHTML = seatRowIncludedHtml(event, prefix, index, role);
                    wireIncludedChoices(incWrap);
                }
                updateTotalLabel(partyRoot, event);
                if (typeof onChange === 'function') onChange(readSeatsFromRoot(partyRoot, event), event);
            });
        });

        partyRoot.querySelectorAll('.ed-party-seat-name').forEach((input) => {
            if (input.dataset.wired) return;
            input.dataset.wired = '1';
            input.addEventListener('input', () => {
                updateTotalLabel(partyRoot, event);
                if (typeof onChange === 'function') onChange(readSeatsFromRoot(partyRoot, event), event);
            });
        });

        partyRoot.querySelectorAll('[data-party-seat-remove]').forEach((btn) => {
            if (btn.dataset.wired) return;
            btn.dataset.wired = '1';
            btn.addEventListener('click', () => {
                const index = Number(btn.getAttribute('data-party-seat-remove'));
                const row = partyRoot.querySelector(`[data-party-seat-row="${index}"]`);
                if (row && !row.classList.contains('is-payer')) {
                    row.remove();
                    reindexRows(partyRoot, event, prefix);
                    updateTotalLabel(partyRoot, event);
                    if (typeof onChange === 'function') onChange(readSeatsFromRoot(partyRoot, event), event);
                }
            });
        });

        partyRoot.querySelectorAll('[data-party-add-role]').forEach((btn) => {
            if (btn.dataset.wired) return;
            btn.dataset.wired = '1';
            btn.addEventListener('click', () => {
                const rowsWrap = partyRoot.querySelector('[data-party-seat-rows="1"]');
                const count = rowsWrap ? rowsWrap.querySelectorAll('[data-party-seat-row]').length : 0;
                if (count >= MAX_PARTY_SEATS) {
                    alert(`Parties are limited to ${MAX_PARTY_SEATS} people.`);
                    return;
                }
                const addRole = normalizeSeatRole(btn.getAttribute('data-party-add-role'));
                const seat = { role: addRole, display_name: '', is_payer: false };
                const tmp = document.createElement('div');
                tmp.innerHTML = seatRowHtml(event, prefix, count, seat, rowOpts);
                rowsWrap.appendChild(tmp.firstElementChild);
                reindexRows(partyRoot, event, prefix);
                updateTotalLabel(partyRoot, event);
                if (typeof onChange === 'function') onChange(readSeatsFromRoot(partyRoot, event), event);
            });
        });

        wireIncludedChoices(partyRoot);
    }

    function wireForm(root, event, onChange) {
        const scope = root || document;
        const partyRoot = resolvePartyRoot(scope);
        if (!partyRoot || !event) return;
        const prefix = partyRoot.getAttribute('data-party-seats-root') || 'partySeats';
        partyRoot._partyOnChange = onChange;
        wireRowEvents(partyRoot, event, prefix);
        updateTotalLabel(partyRoot, event);
    }

    const EventsPartySeats = {
        MAX_PARTY_SEATS,
        shouldShow,
        formFieldsHtml,
        readSeatsFromRoot,
        readPayerRoleFromRoot,
        validatePartySeats,
        partyBaseTotalCents,
        syncPayerNameFromContact,
        wireForm,
    };

    globalThis.EventsPartySeats = EventsPartySeats;
})();
