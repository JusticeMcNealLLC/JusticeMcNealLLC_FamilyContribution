// Portal Events — Create sheet: Review step (Phase 5M.1.2)

'use strict';

import { formatDateTimeLocal, monthlyEstimate } from './pricing-helpers.js';

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function _capacityReviewLabel(f) {
    if (f.capacity_mode === 'none') return 'No limit';
    const counts = f.capacity_counts === 'all' ? 'adults + kids' : 'adults only';
    const mode = f.capacity_mode === 'soft' ? 'Soft cap' : 'Hard cap';
    const n = f.max_participants || '—';
    return `${mode} · ${n} (${counts})`;
}

function html() {
    const STATE = window.EventsCreateSteps.getState();
    const CATEGORIES = window.EventsCreateSteps.CATEGORIES;
    const f = STATE.form;
    const cat = CATEGORIES.find(c => c.key === f.category)?.label || f.category;
    const start = f.start_date ? new Date(f.start_date).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '—';
    const pricingLabel = ({ free:'Free', paid:`Paid · $${f.adult_price_dollars || '0.00'} adult`, free_paid_raffle:'Free + paid raffle' })[f.pricing_mode];
    const fundEst = f.pricing_mode === 'paid' ? monthlyEstimate(f) : null;
    const raffleReviewHtml = window.EventsCreateSteps.raffleReviewHtml;
    return `
        <div id="ecError"></div>

        ${STATE.bannerPreviewUrl ? `<img src="${STATE.bannerPreviewUrl}" class="ec-banner-preview mb-3" alt="">` : ''}

        <div class="ec-review-grid">
        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">${_esc(f.title || 'Untitled event')}</h3>
            <div class="ec-review-row"><span>Type</span><span>${f.event_type}</span></div>
            <div class="ec-review-row"><span>Category</span><span>${cat}</span></div>
            ${f.description ? `<div class="ec-review-row"><span>Description</span><span style="max-width:60%">${_esc(f.description.slice(0, 120))}${f.description.length > 120 ? '…' : ''}</span></div>` : ''}
        </div>

        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">About</h3>
            <div class="ec-review-row"><span>Tabs</span><span>${(f.about_tabs || []).length
                ? _esc((f.about_tabs || []).map(t => (t.title || '').trim() || 'Untitled').join(' · '))
                : 'None'}</span></div>
        </div>

        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">Included</h3>
            <div class="ec-review-row"><span>Items</span><span>${(f.included_items || []).length
                ? _esc(`${(f.included_items || []).length} · ${(f.included_items || []).map(i => (i.name || '').trim() || 'Untitled').join(' · ')}`)
                : 'None'}</span></div>
        </div>

        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">When & Where</h3>
            <div class="ec-review-row"><span>Starts</span><span>${start}</span></div>
            <div class="ec-review-row"><span>Timezone</span><span>${f.timezone}</span></div>
            ${f.location_nickname ? `<div class="ec-review-row"><span>Location</span><span>${_esc(f.location_nickname)}</span></div>` : ''}
            ${f.location_text ? `<div class="ec-review-row"><span>Address</span><span style="max-width:60%">${_esc(f.location_text)}${STATE.geocode ? ' 📍' : ''}</span></div>` : ''}
            <div class="ec-review-row"><span>Capacity</span><span>${_capacityReviewLabel(f)}</span></div>
        </div>

        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">Pricing</h3>
            ${f.event_type === 'competition' ? `
            <div class="ec-review-row"><span>Mode</span><span>Competition entry fee (no trip RSVP)</span></div>
            ` : `
            <div class="ec-review-row"><span>Mode</span><span>${pricingLabel}</span></div>
            ${f.pricing_mode === 'paid' ? `<div class="ec-review-row"><span>Adult price</span><span>$${f.adult_price_dollars || '0.00'}</span></div>` : ''}
            ${f.pricing_mode === 'paid' ? `<div class="ec-review-row"><span>Kids</span><span>${f.kids_free ? 'Free' : `$${f.kid_price_dollars || '0.00'} per child`}</span></div>` : ''}
            ${f.pricing_mode === 'paid' && f.fund_deadline ? `<div class="ec-review-row"><span>Fund deadline</span><span>${formatDateTimeLocal(f.fund_deadline)}</span></div>` : ''}
            ${fundEst && !fundEst.error ? `<div class="ec-review-row"><span>Monthly estimate</span><span>~$${fundEst.monthly}/adult (${fundEst.months} mo.)</span></div>` : ''}
            <div class="ec-review-row"><span>Raffle</span><span>${f.raffle_enabled ? `Yes · $${f.raffle_entry_cost_dollars || '0.00'}/entry` : 'No'}</span></div>
            ${f.raffle_enabled && typeof raffleReviewHtml === 'function' ? raffleReviewHtml() : ''}
            <div class="ec-review-row"><span>Visibility</span><span>${f.member_only ? 'Members only' : 'Public'}</span></div>
            `}
        </div>

        ${f.event_type === 'llc' ? `
        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">LLC</h3>
            <div class="ec-review-row"><span>Min participants</span><span>${_esc(f.min_participants || '—')}</span></div>
            <div class="ec-review-row"><span>LLC cut</span><span>${_esc(f.llc_cut_pct || '0')}%</span></div>
            <div class="ec-review-row"><span>Invest-eligible</span><span>${f.invest_eligible ? 'Yes' : 'No'}</span></div>
            <div class="ec-review-row"><span>Cost items</span><span>${(f.cost_items || []).length
                ? _esc(`${(f.cost_items || []).length} · ${(f.cost_items || []).map(i => (i.name || '').trim() || 'Untitled').join(' · ')}`)
                : 'None'}</span></div>
            <div class="ec-review-row"><span>Show breakdown</span><span>${f.show_cost_breakdown ? 'Yes' : 'No'}</span></div>
            <div class="ec-review-row"><span>Transport</span><span>${f.transportation_enabled
                ? (f.transportation_mode === 'llc_provides'
                    ? `LLC provides · ${f.transportation_method === 'plane' ? 'plane' : 'car'}`
                    : `Self-arranged${f.transportation_estimate_dollars ? ` · ~$${f.transportation_estimate_dollars}` : ''}`)
                : 'Off'}</span></div>
            <div class="ec-review-row"><span>Location required</span><span>${f.location_required ? 'Yes' : 'No'}</span></div>
            ${f.llc_buyin_override_dollars ? `<div class="ec-review-row"><span>Buy-in override</span><span>$${f.llc_buyin_override_dollars}</span></div>` : ''}
        </div>` : ''}

        ${f.event_type === 'competition' ? `
        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">Competition</h3>
            <div class="ec-review-row"><span>Entry fee</span><span>${f.comp_entry_fee_dollars ? `$${f.comp_entry_fee_dollars}` : 'Free'}</span></div>
            <div class="ec-review-row"><span>House cut</span><span>${_esc(f.comp_house_pct || '0')}%</span></div>
            <div class="ec-review-row"><span>Winner tiers</span><span>${_esc(`${f.comp_tier1_pct}/${f.comp_tier2_pct}/${f.comp_tier3_pct}`)}%</span></div>
            <div class="ec-review-row"><span>Entry type</span><span>${_esc(f.comp_entry_type || 'any')}</span></div>
            <div class="ec-review-row"><span>Min entries</span><span>${_esc(f.comp_min_entries || '2')}</span></div>
            <div class="ec-review-row"><span>Registration ends</span><span>${f.comp_phase1_end ? formatDateTimeLocal(f.comp_phase1_end) : '—'}</span></div>
            <div class="ec-review-row"><span>Submission ends</span><span>${f.comp_phase2_end ? formatDateTimeLocal(f.comp_phase2_end) : '—'}</span></div>
            <div class="ec-review-row"><span>Voting ends</span><span>${f.comp_phase3_end ? formatDateTimeLocal(f.comp_phase3_end) : '—'}</span></div>
            <div class="ec-review-row"><span>Visibility</span><span>Members only</span></div>
        </div>` : ''}

        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">Disclaimers</h3>
            <div class="ec-review-row"><span>Clauses</span><span>${(f.disclaimers || []).length
                ? _esc(`${(f.disclaimers || []).length} · ${(f.disclaimers || []).map(d => (d.title || '').trim() || 'Untitled').join(' · ')}`)
                : 'None'}</span></div>
        </div>

        ${f.event_type !== 'competition' ? `
        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">Amenity voting</h3>
            <div class="ec-review-row"><span>Status</span><span>${(f.amenity_voting && f.amenity_voting.enabled)
                ? _esc(`${(f.amenity_voting.options || []).length} options`)
                : 'Off'}</span></div>
            ${f.amenity_voting && f.amenity_voting.enabled && f.amenity_voting.closes_at
                ? `<div class="ec-review-row"><span>Closes</span><span>${formatDateTimeLocal(f.amenity_voting.closes_at)}</span></div>`
                : ''}
            ${f.amenity_voting && f.amenity_voting.enabled
                ? `<div class="ec-review-row"><span>Results</span><span>${_esc(String(f.amenity_voting.results_visible || 'after_close').replace(/_/g, ' '))}</span></div>`
                : ''}
        </div>` : ''}
        </div>

        <p class="text-xs text-gray-400 text-center ec-review-span" style="margin-top:12px">${(typeof window.EventsCreateSteps.isEditMode === 'function' && window.EventsCreateSteps.isEditMode())
            ? 'Tap <strong>Save changes</strong> to update this event, or <strong>Save as draft</strong> to unpublish.'
            : 'Tap <strong>Publish</strong> to go live, or <strong>Save draft</strong> to finish later.'}</p>
    `;
}

function wire() { /* no-op */ }

export const createStepReviewApi = { html, wire };

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.review = createStepReviewApi;
