// Portal Events — Create sheet: Pricing step (Phase 5M.1.2)
(function () {
    'use strict';

    function _esc(s) {
        return window.EventsCreateSteps.esc(s);
    }

    function html() {
        const STATE = window.EventsCreateSteps.getState();
        const f = STATE.form;
        const modes = [
            { key:'free', label:'Free', sub:'No payment required' },
            { key:'paid', label:'Paid RSVP', sub:'Stripe checkout on RSVP' },
            { key:'free_paid_raffle', label:'Free + paid raffle', sub:'Free entry, paid raffle entries' },
        ];
        const showRsvpCost = f.pricing_mode === 'paid';
        const showRaffleConfig = f.raffle_enabled;
        const raffleBuilderHtml = window.EventsCreateSteps.raffleBuilderHtml;
        return `
            <div class="ec-row">
                <label class="ec-label">Pricing mode</label>
                <div style="display:flex;flex-direction:column;gap:8px">
                    ${modes.map(m => `
                        <label class="ec-checkbox-row" style="cursor:pointer">
                            <input type="radio" name="ecMode" value="${m.key}" ${f.pricing_mode === m.key ? 'checked' : ''}>
                            <div class="flex-1">
                                <div class="text-sm font-bold text-gray-800">${m.label}</div>
                                <div class="text-xs text-gray-500">${m.sub}</div>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>

            ${showRsvpCost ? `
            <div class="ec-row">
                <label class="ec-label">RSVP price (USD)</label>
                <input id="ecCost" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(f.rsvp_cost_dollars)}">
            </div>
            ` : ''}

            <div class="ec-row">
                <label class="ec-checkbox-row">
                    <input type="checkbox" id="ecRaffleEnabled" ${f.raffle_enabled ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="text-sm font-bold text-gray-800">Add a raffle</div>
                        <div class="text-xs text-gray-500">Members can buy raffle entries for prizes.</div>
                    </div>
                </label>
            </div>

            ${showRaffleConfig && typeof raffleBuilderHtml === 'function' ? `
            ${raffleBuilderHtml()}
            ` : ''}

            <div class="ec-row">
                <label class="ec-checkbox-row">
                    <input type="checkbox" id="ecMemberOnly" ${f.member_only ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="text-sm font-bold text-gray-800">Members only</div>
                        <div class="text-xs text-gray-500">Hide from the public event page; logged-in members only.</div>
                    </div>
                </label>
            </div>
        `;
    }

    function wire() {
        const STATE = window.EventsCreateSteps.getState();
        const render = window.EventsCreateSteps.render;
        const ensureRaffleConfig = window.EventsCreateSteps.ensureRaffleConfig;
        const wireRaffleBuilder = window.EventsCreateSteps.wireRaffleBuilder;

        document.querySelectorAll('input[name="ecMode"]').forEach(el => {
            el.addEventListener('change', () => { STATE.form.pricing_mode = el.value; render(); });
        });
        document.getElementById('ecCost')?.addEventListener('input', e => STATE.form.rsvp_cost_dollars = e.target.value);
        document.getElementById('ecRaffleEnabled')?.addEventListener('change', e => {
            STATE.form.raffle_enabled = e.target.checked;
            if (STATE.form.raffle_enabled) ensureRaffleConfig();
            render();
        });
        document.getElementById('ecRafflePrice')?.addEventListener('input', e => STATE.form.raffle_entry_cost_dollars = e.target.value);
        if (typeof wireRaffleBuilder === 'function') wireRaffleBuilder();
        document.getElementById('ecMemberOnly')?.addEventListener('change', e => STATE.form.member_only = e.target.checked);
    }

    window.EventsCreateSteps = window.EventsCreateSteps || {};
    window.EventsCreateSteps.pricing = { html, wire };
})();
