// Portal Events — Create sheet: Review step (Phase 5M.1.2)
(function () {
    'use strict';

    function _esc(s) {
        return window.EventsCreateSteps.esc(s);
    }

    function html() {
        const STATE = window.EventsCreateSteps.getState();
        const CATEGORIES = window.EventsCreateSteps.CATEGORIES;
        const f = STATE.form;
        const cat = CATEGORIES.find(c => c.key === f.category)?.label || f.category;
        const start = f.start_date ? new Date(f.start_date).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '—';
        const pricingLabel = ({ free:'Free', paid:`Paid · $${f.rsvp_cost_dollars || '0.00'}`, free_paid_raffle:'Free + paid raffle' })[f.pricing_mode];
        const raffleReviewHtml = window.EventsCreateSteps.raffleReviewHtml;
        return `
            <div id="ecError"></div>

            ${STATE.bannerPreviewUrl ? `<img src="${STATE.bannerPreviewUrl}" class="ec-banner-preview mb-3" alt="">` : ''}

            <div class="ec-review-card">
                <h3 class="font-bold text-gray-800 text-sm mb-2">${_esc(f.title || 'Untitled event')}</h3>
                <div class="ec-review-row"><span>Type</span><span>${f.event_type}</span></div>
                <div class="ec-review-row"><span>Category</span><span>${cat}</span></div>
                ${f.description ? `<div class="ec-review-row"><span>Description</span><span style="max-width:60%">${_esc(f.description.slice(0, 120))}${f.description.length > 120 ? '…' : ''}</span></div>` : ''}
            </div>

            <div class="ec-review-card">
                <h3 class="font-bold text-gray-800 text-sm mb-2">When & Where</h3>
                <div class="ec-review-row"><span>Starts</span><span>${start}</span></div>
                <div class="ec-review-row"><span>Timezone</span><span>${f.timezone}</span></div>
                ${f.location_nickname ? `<div class="ec-review-row"><span>Location</span><span>${_esc(f.location_nickname)}</span></div>` : ''}
                ${f.location_text ? `<div class="ec-review-row"><span>Address</span><span style="max-width:60%">${_esc(f.location_text)}${STATE.geocode ? ' 📍' : ''}</span></div>` : ''}
                ${f.max_participants ? `<div class="ec-review-row"><span>Max attendees</span><span>${f.max_participants}</span></div>` : ''}
            </div>

            <div class="ec-review-card">
                <h3 class="font-bold text-gray-800 text-sm mb-2">Pricing</h3>
                <div class="ec-review-row"><span>Mode</span><span>${pricingLabel}</span></div>
                <div class="ec-review-row"><span>Raffle</span><span>${f.raffle_enabled ? `Yes · $${f.raffle_entry_cost_dollars || '0.00'}/entry` : 'No'}</span></div>
                ${f.raffle_enabled && typeof raffleReviewHtml === 'function' ? raffleReviewHtml() : ''}
                <div class="ec-review-row"><span>Visibility</span><span>${f.member_only ? 'Members only' : 'Public'}</span></div>
            </div>

            <p class="text-xs text-gray-400 text-center">Tap <strong>Publish</strong> to go live, or <strong>Save draft</strong> to finish later.</p>
        `;
    }

    function wire() { /* no-op */ }

    window.EventsCreateSteps = window.EventsCreateSteps || {};
    window.EventsCreateSteps.review = { html, wire };
})();
