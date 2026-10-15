// Portal Events — Create sheet: RSVP questions
'use strict';

const QUESTION_TYPES = [
    ['yes_no', 'Yes / No'],
    ['single_choice', 'Single choice'],
    ['multiple_choice', 'Multiple choice'],
    ['short_text', 'Short text'],
    ['long_text', 'Long text'],
];

function _esc(value) {
    return window.EventsCreateSteps.esc(value);
}

function _newId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `rsvp-q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function _list() {
    const state = window.EventsCreateSteps.getState();
    if (!Array.isArray(state.form.rsvp_questions)) state.form.rsvp_questions = [];
    return state.form.rsvp_questions;
}

function _isChoiceType(type) {
    return type === 'single_choice' || type === 'multiple_choice';
}

function _choiceText(question) {
    return (Array.isArray(question.choices) ? question.choices : [])
        .map((choice) => String(choice?.label || '').trim())
        .filter(Boolean)
        .join('\n');
}

function _row(question, index, locked) {
    const type = QUESTION_TYPES.some(([key]) => key === question.type) ? question.type : 'short_text';
    const dis = locked ? ' disabled' : '';
    return `<div class="ec-raffle-item-wrap ec-rsvp-question-row" data-rsvp-q-id="${_esc(question.id)}">
        <div class="ec-raffle-head">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Question ${index + 1}</span>
            ${locked ? '<span class="ec-help" style="margin:0">Locked</span>' : `<button type="button" class="ec-mini-btn" data-rsvp-q-remove="${_esc(question.id)}" style="border-color:#fecaca;color:#dc2626">Remove</button>`}
        </div>
        <div class="ec-row" style="margin-bottom:10px">
            <label class="ec-label">Question</label>
            <input class="ec-input" type="text" maxlength="240" data-rsvp-q-prompt="${_esc(question.id)}" value="${_esc(question.prompt || '')}" placeholder="e.g. Do you plan on snowboarding?"${dis}>
        </div>
        <div class="ec-rsvp-question-grid">
            <div class="ec-row" style="margin-bottom:10px">
                <label class="ec-label">Answer type</label>
                <select class="ec-input" data-rsvp-q-type="${_esc(question.id)}"${dis}>
                    ${QUESTION_TYPES.map(([key, label]) => `<option value="${key}" ${type === key ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
            </div>
            <label class="ec-check" style="margin:25px 0 10px">
                <input type="checkbox" data-rsvp-q-required="${_esc(question.id)}" ${question.required !== false ? 'checked' : ''}${dis}>
                <span>Required at RSVP</span>
            </label>
        </div>
        <div class="ec-row ec-rsvp-question-choices ${_isChoiceType(type) ? '' : 'hidden'}" style="margin-bottom:0">
            <label class="ec-label">Choices <span class="font-normal text-gray-400">(one per line)</span></label>
            <textarea class="ec-input ec-textarea" rows="3" maxlength="1200" data-rsvp-q-choices="${_esc(question.id)}" placeholder="Yes\nNo"${dis}>${_esc(_choiceText(question))}</textarea>
        </div>
    </div>`;
}

function html() {
    const state = window.EventsCreateSteps.getState();
    const list = _list();
    const locked = !!state.rsvpQuestionsLocked;
    return `<div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">RSVP questions</h2>
        <p class="text-sm text-gray-600 mb-4">Ask attendees for details you need to plan the event. You can add multiple questions, choose the answer type, and make each question required or optional.</p>
        ${locked ? '<p class="ec-lock-banner">RSVP questions are locked after RSVPs. Existing answers stay tied to the original questions.</p>' : ''}
        <div id="ecRsvpQuestions">${list.length ? list.map((q, i) => _row(q, i, locked)).join('') : '<p class="text-sm text-gray-500 mb-3">No custom questions yet.</p>'}</div>
        ${locked ? '' : '<button type="button" id="ecRsvpQuestionAdd" class="ec-mini-btn" style="margin-top:12px">+ Add question</button>'}
    </div>`;
}

function _syncFromDom() {
    const list = _list();
    document.querySelectorAll('#ecRsvpQuestions .ec-rsvp-question-row').forEach((row) => {
        const id = row.getAttribute('data-rsvp-q-id');
        const question = list.find((item) => item.id === id);
        if (!question) return;
        question.prompt = row.querySelector('[data-rsvp-q-prompt]')?.value?.trim() || '';
        question.type = row.querySelector('[data-rsvp-q-type]')?.value || 'short_text';
        question.required = !!row.querySelector('[data-rsvp-q-required]')?.checked;
        const labels = (row.querySelector('[data-rsvp-q-choices]')?.value || '')
            .split(/\r?\n/)
            .map((label) => label.trim())
            .filter(Boolean);
        question.choices = labels.map((label, index) => ({
            id: (question.choices?.[index]?.id || `choice-${index + 1}`),
            label,
        }));
    });
}

function wire() {
    const state = window.EventsCreateSteps.getState();
    const list = _list();
    if (state.rsvpQuestionsLocked) return;
    document.getElementById('ecRsvpQuestionAdd')?.addEventListener('click', () => {
        list.push({ id: _newId(), prompt: '', type: 'yes_no', required: true, choices: [] });
        window.EventsCreateSteps.render();
    });
    document.getElementById('ecRsvpQuestions')?.addEventListener('input', _syncFromDom);
    document.getElementById('ecRsvpQuestions')?.addEventListener('change', (event) => {
        _syncFromDom();
        if (event.target.matches('[data-rsvp-q-type]')) window.EventsCreateSteps.render();
    });
    document.getElementById('ecRsvpQuestions')?.addEventListener('click', (event) => {
        const remove = event.target.closest('[data-rsvp-q-remove]');
        if (!remove) return;
        _syncFromDom();
        const id = remove.getAttribute('data-rsvp-q-remove');
        state.form.rsvp_questions = list.filter((item) => item.id !== id);
        window.EventsCreateSteps.render();
    });
}

export function normalizeQuestions(form) {
    const helper = window.EventsRsvpQuestions;
    const normalized = helper?.normalizeQuestions ? helper.normalizeQuestions(form?.rsvp_questions) : [];
    if (form) form.rsvp_questions = normalized;
    return normalized;
}

export function validateQuestions(form) {
    const raw = Array.isArray(form?.rsvp_questions) ? form.rsvp_questions : [];
    for (let i = 0; i < raw.length; i++) {
        const question = raw[i] || {};
        if (!String(question.prompt || '').trim()) return `Question ${i + 1} needs text.`;
        if (_isChoiceType(question.type)) {
            const choices = Array.isArray(question.choices) ? question.choices.filter((choice) => String(choice?.label || '').trim()) : [];
            if (choices.length < 2) return `Question ${i + 1} needs at least two choices.`;
        }
    }
    normalizeQuestions(form);
    return null;
}

export const createStepQuestionsApi = { html, wire, validateQuestions, normalizeQuestions };

globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.questions = createStepQuestionsApi;
