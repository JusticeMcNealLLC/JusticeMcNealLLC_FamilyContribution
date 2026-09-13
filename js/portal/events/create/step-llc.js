// Portal Events — Create sheet: LLC step (§13.6 thin MVP)

'use strict';

export const LLC_COST_CATEGORIES = [
    { value: 'lodging', label: 'Lodging' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'food', label: 'Food' },
    { value: 'gear', label: 'Gear / Rentals' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'other', label: 'Other' },
];

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function _newId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `cost-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function _money(cents) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format((cents || 0) / 100);
}

/** Compute cost_breakdown JSON + suggested buy-in (cents). */
export function computeLlcCostBreakdown(costItems, minParticipants, llcCutPct) {
    const items = Array.isArray(costItems) ? costItems : [];
    const minPart = Number(minParticipants) || 0;
    const cutPct = Number(llcCutPct) || 0;
    const totalIncluded = items
        .filter((i) => i.included_in_buyin !== false)
        .reduce((sum, i) => sum + (Number(i.total_cost_cents) || 0), 0);
    const totalOop = items
        .filter((i) => i.included_in_buyin === false)
        .reduce((sum, i) => sum + (Number(i.avg_per_person_cents) || 0), 0);
    if (!items.length || minPart <= 0) {
        return {
            total_included_cents: totalIncluded,
            total_oop_per_person_cents: totalOop,
            base_buyin_cents: 0,
            llc_cut_cents: 0,
            final_buyin_cents: 0,
        };
    }
    const baseBuyIn = Math.ceil(totalIncluded / minPart);
    const llcCut = Math.round((baseBuyIn * cutPct) / 100);
    return {
        total_included_cents: totalIncluded,
        total_oop_per_person_cents: totalOop,
        base_buyin_cents: baseBuyIn,
        llc_cut_cents: llcCut,
        final_buyin_cents: baseBuyIn + llcCut,
    };
}

export function resolveLlcBuyInCents(form) {
    const override = Number(form.llc_buyin_override_dollars);
    if (Number.isFinite(override) && override > 0) {
        return Math.round(override * 100);
    }
    const summary = computeLlcCostBreakdown(
        form.cost_items,
        form.min_participants,
        form.llc_cut_pct,
    );
    if (summary.final_buyin_cents > 0) return summary.final_buyin_cents;
    const adult = Number(form.adult_price_dollars);
    if (Number.isFinite(adult) && adult > 0) return Math.round(adult * 100);
    return 0;
}

export function validateLlc(form) {
    if (form.event_type !== 'llc') return null;
    const minPart = Number(form.min_participants);
    if (!minPart || minPart <= 0) return 'LLC events need a minimum participant count.';
    const cut = Number(form.llc_cut_pct);
    if (Number.isNaN(cut) || cut < 0 || cut > 100) return 'LLC cut % must be between 0 and 100.';
    const items = Array.isArray(form.cost_items) ? form.cost_items : [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i] || {};
        if (!String(item.name || '').trim()) return `Cost item ${i + 1} needs a name.`;
        if ((Number(item.total_cost_cents) || 0) < 0) return `Cost item ${i + 1} cost cannot be negative.`;
        if (item.included_in_buyin === false && (Number(item.avg_per_person_cents) || 0) < 0) {
            return `Cost item ${i + 1} per-person amount cannot be negative.`;
        }
    }
    const buyIn = resolveLlcBuyInCents(form);
    if (buyIn <= 0 && !items.length) {
        return 'Add cost items or set a buy-in override greater than zero.';
    }
    if (buyIn <= 0) return 'Buy-in must be greater than zero (check min participants and cost items, or set an override).';
    if (form.transportation_enabled && form.transportation_mode === 'llc_provides') {
        if (form.transportation_method !== 'car' && form.transportation_method !== 'plane') {
            return 'Choose whether LLC provides car or plane transport.';
        }
    }
    if (form.transportation_enabled && form.transportation_mode === 'self_arranged') {
        const est = form.transportation_estimate_dollars;
        if (est !== '' && est != null && (Number.isNaN(Number(est)) || Number(est) < 0)) {
            return 'Transport estimate must be a valid non-negative amount.';
        }
    }
    return null;
}

function _syncAdultFromBuyIn(STATE) {
    const cents = resolveLlcBuyInCents(STATE.form);
    if (cents > 0) {
        STATE.form.adult_price_dollars = (cents / 100).toFixed(2);
        STATE.form.pricing_mode = 'paid';
    }
}

function _summaryCardHtml(summary, costItems) {
    if (!Array.isArray(costItems) || !costItems.length) return '';
    return `
        <div class="ec-review-card">
            <div class="ec-review-row"><span>Included total</span><span>${_money(summary.total_included_cents)}</span></div>
            <div class="ec-review-row"><span>Base buy-in</span><span>${summary.base_buyin_cents ? _money(summary.base_buyin_cents) : '—'}</span></div>
            ${summary.llc_cut_cents ? `<div class="ec-review-row"><span>LLC cut</span><span>+${_money(summary.llc_cut_cents)}</span></div>` : ''}
            <div class="ec-review-row"><span>Suggested buy-in</span><span>${summary.final_buyin_cents ? _money(summary.final_buyin_cents) + '/person' : '—'}</span></div>
            <div class="ec-review-row"><span>Out of pocket</span><span>~${_money(summary.total_oop_per_person_cents)}/person</span></div>
        </div>`;
}

function _refreshLlcDerived() {
    const STATE = window.EventsCreateSteps.getState();
    const f = STATE.form;
    _syncAdultFromBuyIn(STATE);
    const summary = computeLlcCostBreakdown(f.cost_items, f.min_participants, f.llc_cut_pct);
    const host = document.getElementById('ecLlcSummary');
    if (host) host.innerHTML = _summaryCardHtml(summary, f.cost_items);
    const override = document.getElementById('ecLlcBuyInOverride');
    if (override) {
        const suggestedDollars = summary.final_buyin_cents > 0
            ? Math.ceil(summary.final_buyin_cents / 100)
            : '';
        override.placeholder = suggestedDollars ? `Suggested: ${suggestedDollars}` : '0.00';
    }
}

function html() {
    const STATE = window.EventsCreateSteps.getState();
    const f = STATE.form;
    if (!Array.isArray(f.cost_items)) f.cost_items = [];
    const summary = computeLlcCostBreakdown(f.cost_items, f.min_participants, f.llc_cut_pct);
    const suggestedDollars = summary.final_buyin_cents > 0
        ? Math.ceil(summary.final_buyin_cents / 100)
        : '';
    const transportOn = !!f.transportation_enabled;

    return `
        <div class="ec-row">
            <p class="text-sm text-gray-600 mb-2">LLC trip settings: minimum headcount, cost items, and buy-in. Detail and manage already show this data once saved.</p>
        </div>

        <div class="ec-grid-2">
            <div class="ec-row">
                <label class="ec-label">Min participants</label>
                <input id="ecLlcMin" class="ec-input" type="number" min="1" step="1" placeholder="e.g. 10" value="${_esc(f.min_participants)}">
            </div>
            <div class="ec-row">
                <label class="ec-label">LLC cut %</label>
                <input id="ecLlcCut" class="ec-input" type="number" min="0" max="100" step="0.1" value="${_esc(f.llc_cut_pct)}">
            </div>
        </div>

        <div class="ec-row">
            <label class="ec-checkbox-row">
                <input type="checkbox" id="ecLlcInvestEligible" ${f.invest_eligible ? 'checked' : ''}>
                <div class="flex-1">
                    <div class="text-sm font-bold text-gray-800">Invest-eligible</div>
                    <div class="text-xs text-gray-500">Allow funds to be invested via Fidelity (events &gt;6 months out). RSVPs require a risk acknowledgment.</div>
                </div>
            </label>
        </div>

        <div class="ec-row">
            <label class="ec-checkbox-row">
                <input type="checkbox" id="ecLlcShowBreakdown" ${f.show_cost_breakdown ? 'checked' : ''}>
                <div class="flex-1">
                    <div class="text-sm font-bold text-gray-800">Show cost breakdown to attendees</div>
                    <div class="text-xs text-gray-500">Display itemized costs on the event page.</div>
                </div>
            </label>
        </div>

        <div class="ec-row">
            <label class="ec-checkbox-row">
                <input type="checkbox" id="ecLlcLocRequired" ${f.location_required ? 'checked' : ''}>
                <div class="flex-1">
                    <div class="text-sm font-bold text-gray-800">Location required</div>
                    <div class="text-xs text-gray-500">Attendees must have address details before trip logistics.</div>
                </div>
            </label>
        </div>

        <div class="ec-row">
            <label class="ec-checkbox-row">
                <input type="checkbox" id="ecLlcTransportOn" ${transportOn ? 'checked' : ''}>
                <div class="flex-1">
                    <div class="text-sm font-bold text-gray-800">Transportation</div>
                    <div class="text-xs text-gray-500">Track how travel is handled for this trip.</div>
                </div>
            </label>
        </div>

        ${transportOn ? `
        <div class="ec-row">
            <label class="ec-label">Transport mode</label>
            <div style="display:flex;flex-direction:column;gap:8px">
                <label class="ec-checkbox-row">
                    <input type="radio" name="ecLlcTransportMode" value="llc_provides" ${f.transportation_mode === 'llc_provides' ? 'checked' : ''}>
                    <span class="text-sm font-medium text-gray-800">LLC provides</span>
                </label>
                <label class="ec-checkbox-row">
                    <input type="radio" name="ecLlcTransportMode" value="self_arranged" ${f.transportation_mode !== 'llc_provides' ? 'checked' : ''}>
                    <span class="text-sm font-medium text-gray-800">Self-arranged</span>
                </label>
            </div>
        </div>
        ${f.transportation_mode === 'llc_provides' ? `
        <div class="ec-row">
            <label class="ec-label">Transport method</label>
            <div style="display:flex;flex-direction:column;gap:8px">
                <label class="ec-checkbox-row">
                    <input type="radio" name="ecLlcTransportMethod" value="car" ${f.transportation_method !== 'plane' ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="text-sm font-medium text-gray-800">Car</div>
                        <div class="text-xs text-gray-500">Ground transport — no tickets required.</div>
                    </div>
                </label>
                <label class="ec-checkbox-row">
                    <input type="radio" name="ecLlcTransportMethod" value="plane" ${f.transportation_method === 'plane' ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="text-sm font-medium text-gray-800">Plane</div>
                        <div class="text-xs text-gray-500">Flights — tickets appear in Docs when ready.</div>
                    </div>
                </label>
            </div>
        </div>` : `
        <div class="ec-row">
            <label class="ec-label">Estimate per person (USD)</label>
            <input id="ecLlcTransportEst" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(f.transportation_estimate_dollars)}">
        </div>`}
        ` : ''}

        <div class="ec-row">
            <div class="ec-raffle-head">
                <label class="ec-label" style="margin:0">Cost items</label>
                <button type="button" id="ecLlcAddCost" class="ec-mini-btn">+ Add item</button>
            </div>
            ${f.cost_items.length ? f.cost_items.map((item, index) => `
                <div class="ec-raffle-item-wrap" data-cost-id="${_esc(item.id)}">
                    <div class="ec-raffle-head">
                        <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Item ${index + 1}</span>
                        <button type="button" class="ec-mini-btn" data-cost-remove="${_esc(item.id)}" style="border-color:#fecaca;color:#dc2626">Remove</button>
                    </div>
                    <div class="ec-grid-2" style="margin-bottom:10px">
                        <div>
                            <label class="ec-label">Name</label>
                            <input class="ec-input" type="text" maxlength="80" data-cost-name="${_esc(item.id)}" value="${_esc(item.name || '')}">
                        </div>
                        <div>
                            <label class="ec-label">Category</label>
                            <select class="ec-input" data-cost-cat="${_esc(item.id)}">
                                ${LLC_COST_CATEGORIES.map((c) =>
                                    `<option value="${c.value}" ${item.category === c.value ? 'selected' : ''}>${c.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="ec-grid-2" style="margin-bottom:10px">
                        <div>
                            <label class="ec-label">Total cost (USD)</label>
                            <input class="ec-input" type="number" min="0" step="0.01" data-cost-total="${_esc(item.id)}" value="${item.total_cost_cents ? (item.total_cost_cents / 100) : ''}">
                        </div>
                        <div>
                            <label class="ec-label">Type</label>
                            <select class="ec-input" data-cost-included="${_esc(item.id)}">
                                <option value="true" ${item.included_in_buyin !== false ? 'selected' : ''}>Included in buy-in</option>
                                <option value="false" ${item.included_in_buyin === false ? 'selected' : ''}>Out of pocket</option>
                            </select>
                        </div>
                    </div>
                    ${item.included_in_buyin === false ? `
                    <div class="ec-row" style="margin-bottom:0">
                        <label class="ec-label">Avg per person (USD)</label>
                        <input class="ec-input" type="number" min="0" step="0.01" data-cost-avg="${_esc(item.id)}" value="${item.avg_per_person_cents ? (item.avg_per_person_cents / 100) : ''}">
                    </div>` : ''}
                </div>
            `).join('') : '<p class="text-xs text-gray-400 mb-2">No cost items yet. Add lodging, food, etc., or set a buy-in override below.</p>'}
        </div>

        <div id="ecLlcSummary">${_summaryCardHtml(summary, f.cost_items)}</div>

        <div class="ec-row">
            <label class="ec-label">Buy-in override (USD / adult)</label>
            <input id="ecLlcBuyInOverride" class="ec-input" type="number" min="0" step="0.01" placeholder="${suggestedDollars ? `Suggested: ${suggestedDollars}` : '0.00'}" value="${_esc(f.llc_buyin_override_dollars)}">
            <p class="ec-help">Leave blank to use the suggested buy-in from cost items. Saved as both adult and RSVP price.</p>
        </div>
    `;
}

function wire() {
    const STATE = window.EventsCreateSteps.getState();
    const render = window.EventsCreateSteps.render;
    if (!Array.isArray(STATE.form.cost_items)) STATE.form.cost_items = [];
    const list = STATE.form.cost_items;

    if (STATE.form.transportation_enabled && STATE.form.transportation_mode === 'llc_provides') {
        if (STATE.form.transportation_method !== 'car' && STATE.form.transportation_method !== 'plane') {
            STATE.form.transportation_method = 'car';
        }
    }

    document.getElementById('ecLlcMin')?.addEventListener('input', (e) => {
        STATE.form.min_participants = e.target.value;
        _refreshLlcDerived();
    });
    document.getElementById('ecLlcCut')?.addEventListener('input', (e) => {
        STATE.form.llc_cut_pct = e.target.value;
        _refreshLlcDerived();
    });
    document.getElementById('ecLlcInvestEligible')?.addEventListener('change', (e) => {
        STATE.form.invest_eligible = !!e.target.checked;
    });
    document.getElementById('ecLlcShowBreakdown')?.addEventListener('change', (e) => {
        STATE.form.show_cost_breakdown = !!e.target.checked;
    });
    document.getElementById('ecLlcLocRequired')?.addEventListener('change', (e) => {
        STATE.form.location_required = !!e.target.checked;
    });
    document.getElementById('ecLlcTransportOn')?.addEventListener('change', (e) => {
        STATE.form.transportation_enabled = !!e.target.checked;
        if (!STATE.form.transportation_enabled) {
            STATE.form.transportation_mode = 'self_arranged';
            STATE.form.transportation_method = '';
            STATE.form.transportation_estimate_dollars = '';
        }
        render();
    });
    document.querySelectorAll('input[name="ecLlcTransportMode"]').forEach((el) => {
        el.addEventListener('change', () => {
            STATE.form.transportation_mode = el.value;
            if (el.value === 'llc_provides') {
                if (STATE.form.transportation_method !== 'car' && STATE.form.transportation_method !== 'plane') {
                    STATE.form.transportation_method = 'car';
                }
                STATE.form.transportation_estimate_dollars = '';
            } else {
                STATE.form.transportation_method = '';
            }
            render();
        });
    });
    document.querySelectorAll('input[name="ecLlcTransportMethod"]').forEach((el) => {
        el.addEventListener('change', () => {
            STATE.form.transportation_method = el.value;
            render();
        });
    });
    document.getElementById('ecLlcTransportEst')?.addEventListener('input', (e) => {
        STATE.form.transportation_estimate_dollars = e.target.value;
    });
    document.getElementById('ecLlcBuyInOverride')?.addEventListener('input', (e) => {
        STATE.form.llc_buyin_override_dollars = e.target.value;
        _syncAdultFromBuyIn(STATE);
    });

    document.getElementById('ecLlcAddCost')?.addEventListener('click', () => {
        list.push({
            id: _newId(),
            name: '',
            category: 'other',
            total_cost_cents: 0,
            included_in_buyin: true,
            avg_per_person_cents: 0,
            notes: '',
        });
        render();
    });

    document.querySelectorAll('[data-cost-remove]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-cost-remove');
            STATE.form.cost_items = list.filter((i) => i.id !== id);
            _syncAdultFromBuyIn(STATE);
            render();
        });
    });

    document.querySelectorAll('[data-cost-name]').forEach((el) => {
        el.addEventListener('input', () => {
            const item = list.find((i) => i.id === el.getAttribute('data-cost-name'));
            if (item) item.name = el.value.slice(0, 80);
        });
    });
    document.querySelectorAll('[data-cost-cat]').forEach((el) => {
        el.addEventListener('change', () => {
            const item = list.find((i) => i.id === el.getAttribute('data-cost-cat'));
            if (item) item.category = el.value;
        });
    });
    document.querySelectorAll('[data-cost-total]').forEach((el) => {
        el.addEventListener('input', () => {
            const item = list.find((i) => i.id === el.getAttribute('data-cost-total'));
            if (item) item.total_cost_cents = Math.round(Number(el.value || 0) * 100);
            _refreshLlcDerived();
        });
    });
    document.querySelectorAll('[data-cost-included]').forEach((el) => {
        el.addEventListener('change', () => {
            const item = list.find((i) => i.id === el.getAttribute('data-cost-included'));
            if (item) item.included_in_buyin = el.value === 'true';
            _syncAdultFromBuyIn(STATE);
            render();
        });
    });
    document.querySelectorAll('[data-cost-avg]').forEach((el) => {
        el.addEventListener('input', () => {
            const item = list.find((i) => i.id === el.getAttribute('data-cost-avg'));
            if (item) item.avg_per_person_cents = Math.round(Number(el.value || 0) * 100);
            _refreshLlcDerived();
        });
    });
}

export const createStepLlcApi = {
    html,
    wire,
    validateLlc,
    computeLlcCostBreakdown,
    resolveLlcBuyInCents,
    LLC_COST_CATEGORIES,
};

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.llc = createStepLlcApi;
