// Portal Events — Legacy create: LLC cost breakdown (Phase 5M.1.5)
(function () {
    'use strict';

    const COST_CATEGORIES = [
        { value: 'lodging', label: '🏠 Lodging' },
        { value: 'transportation', label: '🚗 Transportation' },
        { value: 'food', label: '🍕 Food' },
        { value: 'gear', label: '🎿 Gear / Rentals' },
        { value: 'entertainment', label: '🎭 Entertainment' },
        { value: 'other', label: '📦 Other' },
    ];

    window.evtCostItems = window.evtCostItems || [];

    function evtToggleLlcFields() {
        const type = document.getElementById('eventType').value;
        const isLlc = type === 'llc';
        const isComp = type === 'competition';
        const llcSection = document.getElementById('llcFieldsSection');
        const compSection = document.getElementById('compFieldsSection');
        if (llcSection) llcSection.classList.toggle('hidden', !isLlc);
        if (compSection) compSection.classList.toggle('hidden', !isComp);
        if (isLlc) {
            const pm = document.getElementById('pricingMode');
            pm.value = 'paid';
            pm.dispatchEvent(new Event('change'));
            const rsvpCostGroup = document.getElementById('rsvpCostGroup');
            if (rsvpCostGroup) rsvpCostGroup.classList.add('hidden');
        }
        if (isComp) {
            document.getElementById('memberOnly').checked = true;
        }
    }

    function evtAddCostItem() {
        const id = crypto.randomUUID();
        window.evtCostItems.push({ id, name: '', category: 'other', total_cost_cents: 0, included_in_buyin: true, avg_per_person_cents: 0, notes: '' });
        evtRenderCostItems();
    }

    function evtRemoveCostItem(itemId) {
        window.evtCostItems = window.evtCostItems.filter(i => i.id !== itemId);
        evtRenderCostItems();
        evtRecalcCostSummary();
    }

    function evtRenderCostItems() {
        const container = document.getElementById('costItemsList');
        if (!container) return;
        const items = window.evtCostItems;
        container.innerHTML = items.map((item, idx) => `
        <div class="bg-white border border-gray-200 rounded-xl p-3 space-y-2" data-cost-id="${item.id}">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-400">#${idx + 1}</span>
                <button type="button" onclick="evtRemoveCostItem('${item.id}')" class="text-red-400 hover:text-red-600 transition p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Item name" value="${evtEscapeHtml(item.name)}" onchange="evtUpdateCostItem('${item.id}','name',this.value)"
                       class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                <select onchange="evtUpdateCostItem('${item.id}','category',this.value)"
                        class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                    ${COST_CATEGORIES.map(c => `<option value="${c.value}" ${item.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs text-gray-500">Total Cost ($)</label>
                    <input type="number" min="0" step="1" value="${item.total_cost_cents ? (item.total_cost_cents / 100) : ''}" placeholder="0"
                           onchange="evtUpdateCostItem('${item.id}','total_cost_cents',Math.round(this.value*100))"
                           class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                </div>
                <div>
                    <label class="text-xs text-gray-500">Type</label>
                    <select onchange="evtUpdateCostItem('${item.id}','included_in_buyin',this.value==='true')"
                            class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                        <option value="true" ${item.included_in_buyin ? 'selected' : ''}>Included in Buy-In</option>
                        <option value="false" ${!item.included_in_buyin ? 'selected' : ''}>Out of Pocket</option>
                    </select>
                </div>
            </div>
            ${!item.included_in_buyin ? `
            <div>
                <label class="text-xs text-gray-500">Avg Per Person ($)</label>
                <input type="number" min="0" step="1" value="${item.avg_per_person_cents ? (item.avg_per_person_cents / 100) : ''}" placeholder="0"
                       onchange="evtUpdateCostItem('${item.id}','avg_per_person_cents',Math.round(this.value*100))"
                       class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            </div>` : ''}
            <input type="text" placeholder="Notes / source link (optional)" value="${evtEscapeHtml(item.notes || '')}" onchange="evtUpdateCostItem('${item.id}','notes',this.value)"
                   class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent">
        </div>`).join('');
    }

    function evtUpdateCostItem(itemId, field, value) {
        const item = window.evtCostItems.find(i => i.id === itemId);
        if (item) {
            item[field] = value;
            if (field === 'included_in_buyin') evtRenderCostItems();
            evtRecalcCostSummary();
        }
    }

    function evtRecalcCostSummary() {
        const summary = document.getElementById('costSummary');
        if (!summary) return;

        const minPart = parseInt(document.getElementById('eventMinParticipants')?.value) || 0;
        const llcCutPct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
        const items = window.evtCostItems;

        const totalIncluded = items.filter(i => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
        const totalOop = items.filter(i => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);

        if (items.length === 0) { summary.classList.add('hidden'); return; }
        summary.classList.remove('hidden');

        const baseBuyIn = minPart > 0 ? Math.ceil(totalIncluded / minPart) : 0;
        const llcCutAmount = Math.round(baseBuyIn * llcCutPct / 100);
        const finalBuyIn = baseBuyIn + llcCutAmount;

        document.getElementById('costTotalIncluded').textContent = formatCurrency(totalIncluded);
        document.getElementById('costMaxPart').textContent = minPart > 0 ? minPart : '—';
        document.getElementById('costBuyIn').textContent = minPart > 0 ? `${formatCurrency(finalBuyIn)}/person` : 'Set min participants';
        document.getElementById('costOop').textContent = `~${formatCurrency(totalOop)}/person`;
        document.getElementById('costGrandTotal').textContent = minPart > 0 ? `~${formatCurrency(finalBuyIn + totalOop)}` : '—';

        const llcRow = document.getElementById('costLlcCutRow');
        if (llcCutPct > 0 && minPart > 0) {
            llcRow.classList.remove('hidden');
            document.getElementById('costLlcPct').textContent = llcCutPct;
            document.getElementById('costLlcAmount').textContent = `+${formatCurrency(llcCutAmount)}`;
        } else {
            llcRow.classList.add('hidden');
        }

        const overrideInput = document.getElementById('llcRsvpOverride');
        if (minPart > 0 && overrideInput && !overrideInput.dataset.userEdited) {
            overrideInput.value = Math.ceil(finalBuyIn / 100);
            overrideInput.placeholder = `Suggested: $${Math.ceil(finalBuyIn / 100)}`;
        }
    }

    window.evtToggleLlcFields = evtToggleLlcFields;
    window.evtAddCostItem = evtAddCostItem;
    window.evtRemoveCostItem = evtRemoveCostItem;
    window.evtRenderCostItems = evtRenderCostItems;
    window.evtUpdateCostItem = evtUpdateCostItem;
    window.evtRecalcCostSummary = evtRecalcCostSummary;
})();
