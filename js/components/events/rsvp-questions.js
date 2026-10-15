/*
   Events — creator-defined RSVP questions
   Surface: window.EventsRsvpQuestions
*/
(function () {
    'use strict';

    const TYPES = new Set(['yes_no', 'single_choice', 'multiple_choice', 'short_text', 'long_text']);
    const TYPE_LABELS = {
        yes_no: 'Yes / No',
        single_choice: 'Single choice',
        multiple_choice: 'Multiple choice',
        short_text: 'Short text',
        long_text: 'Long text',
    };

    function esc(value) {
        if (window.EventsHelpers?.escapeHtml) return window.EventsHelpers.escapeHtml(value);
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function slug(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 50);
    }

    function normalizeChoice(choice, index) {
        const raw = choice && typeof choice === 'object'
            ? choice
            : { label: choice };
        const label = String(raw.label || raw.name || '').trim().slice(0, 120);
        if (!label) return null;
        const base = slug(raw.id || label) || `choice-${index + 1}`;
        return { id: base, label };
    }

    function normalizeQuestion(question, index) {
        const raw = question && typeof question === 'object' ? question : {};
        const prompt = String(raw.prompt || raw.question || raw.label || '').trim().slice(0, 240);
        if (!prompt) return null;
        const type = TYPES.has(raw.type) ? raw.type : 'short_text';
        const choices = (Array.isArray(raw.choices) ? raw.choices : [])
            .map(normalizeChoice)
            .filter(Boolean)
            .slice(0, 12);
        const baseId = slug(raw.id || prompt) || `question-${index + 1}`;
        const finalChoices = type === 'yes_no'
            ? [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]
            : ((type === 'single_choice' || type === 'multiple_choice') ? choices : []);
        return {
            id: baseId,
            prompt,
            type,
            required: raw.required !== false,
            choices: finalChoices,
        };
    }

    function normalizeQuestions(input) {
        const rows = Array.isArray(input) ? input : [];
        const seen = new Set();
        return rows.map(normalizeQuestion).filter(Boolean).slice(0, 30).map((row, index) => {
            let id = row.id || `question-${index + 1}`;
            let n = 2;
            while (seen.has(id)) id = `${row.id}-${n++}`;
            seen.add(id);
            const needsChoices = row.type === 'yes_no' || row.type === 'single_choice' || row.type === 'multiple_choice';
            return { ...row, id, choices: needsChoices ? row.choices : [] };
        });
    }

    function hasQuestions(input) {
        return normalizeQuestions(input).length > 0;
    }

    function questionInputHtml(question, answer, idPrefix) {
        const id = `${idPrefix || 'rsvp'}-${question.id}`;
        const choices = question.choices || [];
        if (question.type === 'yes_no' || question.type === 'single_choice') {
            return choices.map((choice) => {
                const inputId = `${id}-${choice.id}`;
                const selected = answer === choice.id;
                return `<label class="er-check er-question-choice" for="${esc(inputId)}">
                    <input type="radio" id="${esc(inputId)}" name="${esc(id)}" value="${esc(choice.id)}" ${selected ? 'checked' : ''}>
                    <span>${esc(choice.label)}</span>
                </label>`;
            }).join('');
        }
        if (question.type === 'multiple_choice') {
            const selected = Array.isArray(answer) ? answer : [];
            return choices.map((choice) => {
                const inputId = `${id}-${choice.id}`;
                return `<label class="er-check er-question-choice" for="${esc(inputId)}">
                    <input type="checkbox" id="${esc(inputId)}" name="${esc(id)}" value="${esc(choice.id)}" ${selected.includes(choice.id) ? 'checked' : ''}>
                    <span>${esc(choice.label)}</span>
                </label>`;
            }).join('');
        }
        const value = typeof answer === 'string' ? answer : '';
        return question.type === 'long_text'
            ? `<textarea class="er-input er-question-text" id="${esc(id)}" rows="4" maxlength="2000" data-rsvp-question-input="1">${esc(value)}</textarea>`
            : `<input class="er-input er-question-text" id="${esc(id)}" type="text" maxlength="500" value="${esc(value)}" data-rsvp-question-input="1">`;
    }

    function formFieldsHtml(input, opts) {
        const questions = normalizeQuestions(input);
        const answers = opts?.answers && typeof opts.answers === 'object' ? opts.answers : {};
        const idPrefix = opts?.idPrefix || 'rsvpQuestion';
        if (!questions.length) return '';
        return `<section class="er-rsvp-questions" aria-label="RSVP questions">
            <p class="er-lead">A few quick questions for event planning.</p>
            ${questions.map((question) => `
                <div class="er-row er-question" data-rsvp-question-id="${esc(question.id)}" data-rsvp-question-type="${esc(question.type)}">
                    <label class="er-label" for="${esc(`${idPrefix}-${question.id}`)}">${esc(question.prompt)}${question.required ? ' *' : ' <span class="er-question-optional">(optional)</span>'}</label>
                    <div class="er-question-controls">${questionInputHtml(question, answers[question.id], idPrefix)}</div>
                </div>`).join('')}
        </section>`;
    }

    function readAnswersFromRoot(root, input) {
        const questions = normalizeQuestions(input);
        const scope = root || document;
        const answers = {};
        questions.forEach((question) => {
            const row = [...scope.querySelectorAll('[data-rsvp-question-id]')]
                .find((candidate) => candidate.getAttribute('data-rsvp-question-id') === question.id);
            if (!row) return;
            if (question.type === 'multiple_choice') {
                answers[question.id] = [...row.querySelectorAll('input[type="checkbox"]:checked')]
                    .map((el) => String(el.value || '').trim())
                    .filter(Boolean);
            } else if (question.type === 'yes_no' || question.type === 'single_choice') {
                answers[question.id] = row.querySelector('input[type="radio"]:checked')?.value || '';
            } else {
                answers[question.id] = row.querySelector('[data-rsvp-question-input]')?.value?.trim() || '';
            }
        });
        return answers;
    }

    function validateAnswers(input, answers) {
        const questions = normalizeQuestions(input);
        const values = answers && typeof answers === 'object' ? answers : {};
        for (const question of questions) {
            const value = values[question.id];
            const blank = Array.isArray(value) ? value.length === 0 : !String(value == null ? '' : value).trim();
            if (question.required && blank) return `Please answer: ${question.prompt}`;
            if (blank) continue;
            if (question.type === 'multiple_choice') {
                const allowed = new Set(question.choices.map((choice) => choice.id));
                if (!Array.isArray(value) || value.some((item) => !allowed.has(String(item)))) {
                    return `Please choose valid answers for: ${question.prompt}`;
                }
            } else if (question.type === 'yes_no' || question.type === 'single_choice') {
                const allowed = new Set(question.choices.map((choice) => choice.id));
                if (!allowed.has(String(value))) return `Please choose a valid answer for: ${question.prompt}`;
            }
        }
        return null;
    }

    function displayAnswer(question, value) {
        const choices = new Map((question.choices || []).map((choice) => [choice.id, choice.label]));
        if (Array.isArray(value)) return value.map((item) => choices.get(item) || item).join(', ');
        return choices.get(value) || String(value || '');
    }

    function summaryHtml(input, answers) {
        const questions = normalizeQuestions(input);
        const values = answers && typeof answers === 'object' ? answers : {};
        const rows = questions.map((question) => {
            const value = displayAnswer(question, values[question.id]);
            if (!value) return '';
            return `<div class="er-receipt-pick"><span>${esc(question.prompt)}</span><strong>${esc(value)}</strong></div>`;
        }).filter(Boolean).join('');
        return rows ? `<div class="er-receipt-picks er-rsvp-question-summary">${rows}</div>` : '';
    }

    window.EventsRsvpQuestions = {
        TYPES: { ...TYPE_LABELS },
        normalizeQuestions,
        hasQuestions,
        formFieldsHtml,
        readAnswersFromRoot,
        validateAnswers,
        summaryHtml,
    };
})();
