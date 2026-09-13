// Portal Events — Create sheet: Pricing step (Phase 5M.1.2)

'use strict';

import { formatDateTimeLocal, monthlyEstimateHtml } from './pricing-helpers.js';

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function html() {
    const STATE = window.EventsCreateSteps.getState();
    const f = STATE.form;
    const locked = !!STATE.pricingLocked;
    const isLlc = f.event_type === 'llc';
    if (isLlc && f.pricing_mode !== 'paid') f.pricing_mode = 'paid';
    const disabledAttr = locked ? 'disabled' : '';
    const modes = isLlc
        ? [{ key:'paid', label:'Paid RSVP (buy-in)', sub:'LLC trips require a paid buy-in — set details on the LLC step' }]
        : [
            { key:'free', label:'Free', sub:'No payment required' },
            { key:'paid', label:'Paid RSVP', sub:'Stripe checkout on RSVP' },
            { key:'free_paid_raffle', label:'Free + paid raffle', sub:'Free entry, paid raffle entries' },
        ];
    const showAdultPrice = f.pricing_mode === 'paid';
    const showRaffleConfig = f.raffle_enabled && !locked;
    const raffleBuilderHtml = window.EventsCreateSteps.raffleBuilderHtml;
    const lockBanner = locked
        ? `<div class="ec-lock-banner">Pricing is locked after RSVPs. Changes aren’t applied retroactively. You can still edit About, Included, When &amp; Where, and images.</div>`
        : '';
    return `
        ${lockBanner}
        <div class="ec-row">
            <label class="ec-label">Pricing mode</label>
            <div class="${isLlc ? '' : 'ec-grid-3'}">
                ${modes.map(m => `
                    <label class="ec-checkbox-row ec-choice-card" style="cursor:${locked || isLlc ? 'default' : 'pointer'}">
                        <input type="radio" name="ecMode" value="${m.key}" ${f.pricing_mode === m.key ? 'checked' : ''} ${disabledAttr}${isLlc ? ' disabled' : ''}>
                        <div class="min-w-0">
                            <div class="ec-choice-title">${m.label}</div>
                            <div class="ec-choice-sub">${m.sub}</div>
                        </div>
                    </label>
                `).join('')}
            </div>
            ${isLlc ? '<p class="ec-help">Buy-in amount is calculated or overridden on the next LLC step.</p>' : ''}
        </div>

        ${showAdultPrice && !isLlc ? `
        <div class="ec-grid-2 ec-grid-keep">
            <div class="ec-row">
                <label class="ec-label">Adult price (USD)</label>
                <input id="ecAdultPrice" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(f.adult_price_dollars)}" ${disabledAttr}>
                <p class="ec-help">Price per paying adult.</p>
            </div>
            <div class="ec-row">
                <label class="ec-label">Fund deadline</label>
                <input id="ecFundDeadline" class="ec-input" type="datetime-local" value="${_esc(f.fund_deadline)}" ${disabledAttr}>
                <p class="ec-help">${f.start_date ? 'Event starts: ' + _esc(formatDateTimeLocal(f.start_date)) : 'Last date to finish paying.'}</p>
            </div>
        </div>
        <div id="ecMonthlyEstimate">${monthlyEstimateHtml(f, _esc)}</div>

        <div class="ec-grid-2 ec-grid-keep">
            <div class="ec-row">
                <label class="ec-checkbox-row ec-choice-card" style="cursor:${locked ? 'not-allowed' : 'pointer'}">
                    <input type="checkbox" id="ecKidsFree" ${f.kids_free ? 'checked' : ''} ${disabledAttr}>
                    <div class="min-w-0">
                        <div class="ec-choice-title">Kids attend free</div>
                        <div class="ec-choice-sub">Children are not billed.</div>
                    </div>
                </label>
            </div>
            ${!f.kids_free ? `
            <div class="ec-row">
                <label class="ec-label">Kid price (USD)</label>
                <input id="ecKidPrice" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(f.kid_price_dollars)}" ${disabledAttr}>
            </div>
            ` : '<div class="ec-row"></div>'}
        </div>
        ` : ''}

        ${showAdultPrice && isLlc ? `
        <div class="ec-grid-2 ec-grid-keep">
            <div class="ec-row">
                <label class="ec-checkbox-row ec-choice-card" style="cursor:${locked ? 'not-allowed' : 'pointer'}">
                    <input type="checkbox" id="ecKidsFree" ${f.kids_free ? 'checked' : ''} ${disabledAttr}>
                    <div class="min-w-0">
                        <div class="ec-choice-title">Kids attend free</div>
                        <div class="ec-choice-sub">Children are not billed.</div>
                    </div>
                </label>
            </div>
            ${!f.kids_free ? `
            <div class="ec-row">
                <label class="ec-label">Kid price (USD)</label>
                <input id="ecKidPrice" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(f.kid_price_dollars)}" ${disabledAttr}>
            </div>
            ` : `
            <div class="ec-row">
                <label class="ec-label">Fund deadline</label>
                <input id="ecFundDeadline" class="ec-input" type="datetime-local" value="${_esc(f.fund_deadline)}" ${disabledAttr}>
            </div>
            `}
        </div>
        ${!f.kids_free ? `
        <div class="ec-row">
            <label class="ec-label">Fund deadline</label>
            <input id="ecFundDeadline" class="ec-input" type="datetime-local" value="${_esc(f.fund_deadline)}" ${disabledAttr}>
            <p class="ec-help">${f.start_date ? 'Event starts: ' + _esc(formatDateTimeLocal(f.start_date)) : 'Last date to finish paying.'}</p>
        </div>
        ` : ''}
        <div id="ecMonthlyEstimate">${monthlyEstimateHtml(f, _esc)}</div>
        ` : ''}

        <div class="ec-grid-2 ec-grid-keep">
            <div class="ec-row">
                <label class="ec-checkbox-row ec-choice-card" style="cursor:${locked ? 'not-allowed' : 'pointer'}">
                    <input type="checkbox" id="ecRaffleEnabled" ${f.raffle_enabled ? 'checked' : ''} ${disabledAttr}>
                    <div class="min-w-0">
                        <div class="ec-choice-title">Add a raffle</div>
                        <div class="ec-choice-sub">Paid raffle entries for prizes.</div>
                    </div>
                </label>
            </div>
            <div class="ec-row">
                <label class="ec-checkbox-row ec-choice-card">
                    <input type="checkbox" id="ecMemberOnly" ${f.member_only ? 'checked' : ''}>
                    <div class="min-w-0">
                        <div class="ec-choice-title">Members only</div>
                        <div class="ec-choice-sub">Hidden from the public page.</div>
                    </div>
                </label>
            </div>
        </div>

        ${showRaffleConfig && typeof raffleBuilderHtml === 'function' ? raffleBuilderHtml() : ''}
    `;
}

function _refreshMonthlyEstimate() {
    const host = document.getElementById('ecMonthlyEstimate');
    if (!host) return;
    const STATE = window.EventsCreateSteps.getState();
    host.innerHTML = monthlyEstimateHtml(STATE.form, _esc);
}

function wire() {
    const STATE = window.EventsCreateSteps.getState();
    const render = window.EventsCreateSteps.render;
    const ensureRaffleConfig = window.EventsCreateSteps.ensureRaffleConfig;
    const wireRaffleBuilder = window.EventsCreateSteps.wireRaffleBuilder;
    const locked = !!STATE.pricingLocked;

    if (!locked) {
        document.querySelectorAll('input[name="ecMode"]').forEach(el => {
            el.addEventListener('change', () => { STATE.form.pricing_mode = el.value; render(); });
        });
        document.getElementById('ecAdultPrice')?.addEventListener('input', e => {
            STATE.form.adult_price_dollars = e.target.value;
            _refreshMonthlyEstimate();
        });
        document.getElementById('ecKidsFree')?.addEventListener('change', e => {
            STATE.form.kids_free = e.target.checked;
            if (STATE.form.kids_free) STATE.form.kid_price_dollars = '';
            render();
        });
        document.getElementById('ecKidPrice')?.addEventListener('input', e => STATE.form.kid_price_dollars = e.target.value);
        document.getElementById('ecFundDeadline')?.addEventListener('input', e => {
            STATE.form.fund_deadline = e.target.value;
            _refreshMonthlyEstimate();
        });
        document.getElementById('ecRaffleEnabled')?.addEventListener('change', e => {
            STATE.form.raffle_enabled = e.target.checked;
            if (STATE.form.raffle_enabled) ensureRaffleConfig();
            render();
        });
        document.getElementById('ecRafflePrice')?.addEventListener('input', e => STATE.form.raffle_entry_cost_dollars = e.target.value);
        if (typeof wireRaffleBuilder === 'function') wireRaffleBuilder();
    }
    document.getElementById('ecMemberOnly')?.addEventListener('change', e => STATE.form.member_only = e.target.checked);
}

export const createStepPricingApi = { html, wire };

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.pricing = createStepPricingApi;
