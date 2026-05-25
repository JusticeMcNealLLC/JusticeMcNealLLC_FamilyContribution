// Portal Events — Create sheet: When & Where step (Phase 5M.1.2)
(function () {
    'use strict';

    let _locDebounce;

    function _esc(s) {
        return window.EventsCreateSteps.esc(s);
    }

    function html() {
        const STATE = window.EventsCreateSteps.getState();
        const TIMEZONES = window.EventsCreateSteps.TIMEZONES;
        const f = STATE.form;
        return `
            <div class="ec-grid-2">
                <div class="ec-row">
                    <label class="ec-label">Starts</label>
                    <input id="ecStart" class="ec-input" type="datetime-local" value="${_esc(f.start_date)}">
                </div>
                <div class="ec-row">
                    <label class="ec-label">Ends (optional)</label>
                    <input id="ecEnd" class="ec-input" type="datetime-local" value="${_esc(f.end_date)}">
                </div>
            </div>

            <div class="ec-row">
                <label class="ec-label">Timezone</label>
                <select id="ecTz" class="ec-input">
                    ${TIMEZONES.map(tz => `<option value="${tz}" ${tz === f.timezone ? 'selected' : ''}>${tz.replace('_', ' ')}</option>`).join('')}
                </select>
            </div>

            <div class="ec-row">
                <label class="ec-label">Location nickname</label>
                <input id="ecLocNick" class="ec-input" type="text" maxlength="60" placeholder="e.g. Mom's house, Cabin in the woods" value="${_esc(f.location_nickname)}">
                <p class="ec-help">Shown on the banner instead of the full address.</p>
            </div>

            <div class="ec-row">
                <label class="ec-label">Address</label>
                <input id="ecLoc" class="ec-input" type="text" placeholder="123 Main St, City, ST" value="${_esc(f.location_text)}">
                <div id="ecLocStatus" class="ec-loc-status" style="color:#9ca3af">${STATE.geocode ? `📍 ${_esc(STATE.geocode.display || 'Located')}` : 'Type an address to geocode (optional).'}</div>
            </div>

            <div class="ec-grid-2">
                <div class="ec-row">
                    <label class="ec-label">Max attendees (optional)</label>
                    <input id="ecMax" class="ec-input" type="number" min="1" placeholder="No limit" value="${_esc(f.max_participants)}">
                </div>
                <div class="ec-row">
                    <label class="ec-label">RSVP deadline (optional)</label>
                    <input id="ecDeadline" class="ec-input" type="datetime-local" value="${_esc(f.rsvp_deadline)}">
                </div>
            </div>
        `;
    }

    function wire() {
        const STATE = window.EventsCreateSteps.getState();
        const get = id => document.getElementById(id);
        get('ecStart')?.addEventListener('input', e => STATE.form.start_date = e.target.value);
        get('ecEnd')?.addEventListener('input', e => STATE.form.end_date = e.target.value);
        get('ecTz')?.addEventListener('change', e => STATE.form.timezone = e.target.value);
        get('ecLocNick')?.addEventListener('input', e => STATE.form.location_nickname = e.target.value);
        get('ecMax')?.addEventListener('input', e => STATE.form.max_participants = e.target.value);
        get('ecDeadline')?.addEventListener('input', e => STATE.form.rsvp_deadline = e.target.value);
        const loc = get('ecLoc');
        loc?.addEventListener('input', e => {
            STATE.form.location_text = e.target.value;
            STATE.geocode = null;
            clearTimeout(_locDebounce);
            const status = get('ecLocStatus');
            if (status) { status.textContent = '…'; status.style.color = '#9ca3af'; }
            _locDebounce = setTimeout(_doGeocode, 700);
        });
    }

    async function _doGeocode() {
        const STATE = window.EventsCreateSteps.getState();
        const status = document.getElementById('ecLocStatus');
        const addr = (STATE.form.location_text || '').trim();
        if (!addr || addr.length < 6) {
            if (status) { status.textContent = 'Type an address to geocode (optional).'; status.style.color = '#9ca3af'; }
            return;
        }
        try {
            if (typeof window.evtGeocodeAddress === 'function') {
                const r = await window.evtGeocodeAddress(addr);
                if (r && r.lat && r.lng) {
                    STATE.geocode = { lat: r.lat, lng: r.lng, display: r.display || addr };
                    if (status) { status.textContent = `📍 ${STATE.geocode.display}`; status.style.color = '#059669'; }
                    return;
                }
            }
            if (status) { status.textContent = '⚠️ Could not locate — saved as text only.'; status.style.color = '#d97706'; }
        } catch (_) {
            if (status) { status.textContent = '⚠️ Geocoding error — saved as text only.'; status.style.color = '#d97706'; }
        }
    }

    window.EventsCreateSteps = window.EventsCreateSteps || {};
    window.EventsCreateSteps.when = { html, wire };
})();
