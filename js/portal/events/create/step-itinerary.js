// Portal Events — Create sheet: structured itinerary calendar

'use strict';

function _esc(s) {
    return window.EventsCreateSteps.esc(s);
}

function _id(prefix) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function _cfg() {
    const STATE = window.EventsCreateSteps.getState();
    const Itinerary = window.EventsItinerary;
    const raw = STATE.form.itinerary || { enabled: false, days: [] };
    STATE.form.itinerary = Itinerary ? Itinerary.normalizeConfig(raw) : raw;
    return STATE.form.itinerary;
}

function _syncRange() {
    const STATE = window.EventsCreateSteps.getState();
    const Itinerary = window.EventsItinerary;
    if (!Itinerary) return _cfg();
    const cfg = _cfg();
    STATE.form.itinerary = Itinerary.syncDaysToRange(cfg, STATE.form.start_date, STATE.form.end_date, STATE.form.timezone);
    return STATE.form.itinerary;
}

function _findDay(dayId) {
    return (_cfg().days || []).find((day) => day.id === dayId);
}

function _activityHtml(day, activity) {
    return `
        <div class="ec-itinerary-activity" data-itinerary-activity-row="${_esc(activity.id)}">
            <div class="ec-itinerary-activity-head">
                <span class="ec-label" style="margin:0">Activity</span>
                <button type="button" class="ec-mini-btn" data-itinerary-remove-activity="${_esc(activity.id)}" data-itinerary-day-id="${_esc(day.id)}">Remove</button>
            </div>
            <input class="ec-input" type="text" maxlength="120" data-itinerary-activity="title" data-itinerary-activity-id="${_esc(activity.id)}" data-itinerary-day-id="${_esc(day.id)}" placeholder="e.g. Snowboarding" value="${_esc(activity.title || '')}">
            <textarea class="ec-input ec-textarea" maxlength="1000" data-itinerary-activity="details" data-itinerary-activity-id="${_esc(activity.id)}" data-itinerary-day-id="${_esc(day.id)}" placeholder="Optional details">${_esc(activity.details || '')}</textarea>
        </div>`;
}

function html() {
    const STATE = window.EventsCreateSteps.getState();
    const Itinerary = window.EventsItinerary;
    const cfg = _cfg();
    if (cfg.enabled && Itinerary) _syncRange();
    const days = STATE.form.itinerary?.days || [];

    return `
        <div>
            <h2 class="text-lg font-bold text-gray-900 mb-1">Itinerary calendar</h2>
            <p class="text-sm text-gray-600 mb-4">Show guests a day-by-day calendar inside the Itinerary tab. Add more than one activity to the same date when plans overlap.</p>
            <label class="ec-check mb-4">
                <input type="checkbox" id="ecItineraryEnabled" ${STATE.form.itinerary?.enabled ? 'checked' : ''}>
                <span>Show an itinerary calendar on the event page</span>
            </label>
            ${STATE.form.itinerary?.enabled ? `
                ${!STATE.form.start_date ? '<p class="ec-error">Choose the event dates in the When &amp; Where step before adding itinerary days.</p>' : ''}
                <div class="ec-itinerary-editor">
                    ${days.length ? days.map((day, index) => `
                        <section class="ec-itinerary-day" data-itinerary-day="${_esc(day.id)}">
                            <div class="ec-itinerary-day-head">
                                <div><span class="ec-itinerary-day-number">Day ${index + 1}</span><strong>${_esc(Itinerary?.dateLabel(day.date, { weekday: true, year: true }) || day.date)}</strong></div>
                                <span class="ec-itinerary-date-key">${_esc(day.date)}</span>
                            </div>
                            <input class="ec-input" type="text" maxlength="120" data-itinerary-day-title="${_esc(day.id)}" placeholder="Day label, e.g. Arrival &amp; rest day" value="${_esc(day.title || '')}">
                            <div class="ec-itinerary-activities-editor">
                                ${(day.activities || []).map((activity) => _activityHtml(day, activity)).join('') || '<p class="ec-help">No activities yet. Add one below.</p>'}
                            </div>
                            <button type="button" class="ec-mini-btn" data-itinerary-add-activity="${_esc(day.id)}">+ Add activity</button>
                        </section>
                    `).join('') : '<p class="text-sm text-gray-500">Set a start date to generate the calendar days.</p>'}
                </div>
            ` : '<p class="ec-help">Leave this off if the event does not need a day-by-day itinerary.</p>'}
        </div>`;
}

function wire() {
    const STATE = window.EventsCreateSteps.getState();
    const render = window.EventsCreateSteps.render;
    document.getElementById('ecItineraryEnabled')?.addEventListener('change', (event) => {
        const cfg = _cfg();
        cfg.enabled = !!event.target.checked;
        if (cfg.enabled) _syncRange();
        render();
    });

    document.querySelectorAll('[data-itinerary-day-title]').forEach((input) => {
        input.addEventListener('input', () => {
            const day = _findDay(input.dataset.itineraryDayTitle);
            if (day) day.title = input.value.slice(0, 120);
        });
    });

    document.querySelectorAll('[data-itinerary-activity]').forEach((input) => {
        input.addEventListener('input', () => {
            const day = _findDay(input.dataset.itineraryDayId);
            const activity = day?.activities?.find((entry) => entry.id === input.dataset.itineraryActivityId);
            if (activity) activity[input.dataset.itineraryActivity] = input.value.slice(0, input.dataset.itineraryActivity === 'title' ? 120 : 1000);
        });
    });

    document.querySelectorAll('[data-itinerary-add-activity]').forEach((button) => {
        button.addEventListener('click', () => {
            const day = _findDay(button.dataset.itineraryAddActivity);
            if (!day) return;
            day.activities.push({ id: _id('activity'), title: '', details: '' });
            render();
        });
    });

    document.querySelectorAll('[data-itinerary-remove-activity]').forEach((button) => {
        button.addEventListener('click', () => {
            const day = _findDay(button.dataset.itineraryDayId);
            if (!day) return;
            day.activities = day.activities.filter((activity) => activity.id !== button.dataset.itineraryRemoveActivity);
            render();
        });
    });
}

export function validateItinerary(form) {
    const cfg = form?.itinerary;
    if (!cfg || cfg.enabled !== true) return null;
    if (!form.start_date) return 'Choose event dates before enabling the itinerary calendar.';
    return null;
}

export const createStepItineraryApi = { html, wire, validateItinerary };

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.itinerary = createStepItineraryApi;
