/* ════════════════════════════════════════════════════════════
   Public seat info invite — Flow B (§13.9)
   Guest fills included options only; no payment.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    function escapeHtml(str) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(str);
        }
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function getToken() {
        const params = new URLSearchParams(window.location.search);
        return (params.get('t') || params.get('token') || '').trim();
    }

    function showError(msg) {
        const root = document.getElementById('seatInfoRoot');
        if (!root) return;
        root.innerHTML = `
            <div class="seat-info-error">
                <h1>Invite unavailable</h1>
                <p class="seat-info-muted">${escapeHtml(msg || 'This invite link is invalid or has expired.')}</p>
            </div>`;
    }

    function showSuccess(name) {
        const root = document.getElementById('seatInfoRoot');
        if (!root) return;
        root.innerHTML = `
            <div class="seat-info-success">
                <h1>Thanks — you’re all set</h1>
                <p class="seat-info-muted">${escapeHtml(name || 'Your')} details were saved. No payment is needed on this page.</p>
            </div>`;
    }

    async function loadInvite(token) {
        const result = await callEdgeFunctionPublic('event-seat-info', {
            action: 'get',
            token,
        });
        return result;
    }

    function renderForm(data, token) {
        const root = document.getElementById('seatInfoRoot');
        if (!root) return;
        const event = data.event || {};
        const seat = data.seat || {};
        const roleLabel = seat.role === 'kid' ? 'Child' : 'Adult';
        const catalog = event.included_items || [];
        let fieldsHtml = '';
        if (window.EventsIncludedItems && typeof window.EventsIncludedItems.formFieldsHtml === 'function') {
            fieldsHtml = window.EventsIncludedItems.formFieldsHtml(catalog, {
                idPrefix: 'seatInfoInc',
                role: seat.role === 'kid' ? 'kid' : 'adult',
            });
        }
        if (!fieldsHtml) {
            fieldsHtml = '<p class="seat-info-muted">No size or option choices are needed for this seat.</p>';
        }

        root.innerHTML = `
            <div class="seat-info-card">
                <h1>${escapeHtml(event.title || 'Event')}</h1>
                <p class="seat-info-sub">Fill in your sizes and choices. The person who RSVP’d still handles payment.</p>
                <span class="seat-info-badge">${escapeHtml(roleLabel)}</span>
                <label class="ec-label" for="seatInfoName">Name</label>
                <input type="text" class="ec-input" id="seatInfoName" maxlength="120"
                    value="${escapeHtml(seat.display_name || '')}" required>
                <div id="seatInfoOptions" style="margin-top:12px">${fieldsHtml}</div>
                <div class="seat-info-actions">
                    <button type="button" class="seat-info-submit" id="seatInfoSubmit">Save details</button>
                </div>
            </div>`;

        // Prefill existing answers
        const options = seat.options && typeof seat.options === 'object' ? seat.options : {};
        Object.keys(options).forEach((id) => {
            const el = root.querySelector(`[data-inc-answer="${CSS.escape(id)}"]`);
            if (el) el.value = options[id];
        });

        const btn = document.getElementById('seatInfoSubmit');
        if (btn) {
            btn.addEventListener('click', () => submitInvite(token, catalog, seat.role));
        }
    }

    async function submitInvite(token, catalog, role) {
        const btn = document.getElementById('seatInfoSubmit');
        const nameEl = document.getElementById('seatInfoName');
        const display_name = String(nameEl?.value || '').trim();
        if (!display_name) {
            alert('Your name is required.');
            return;
        }

        let options = {};
        if (window.EventsIncludedItems) {
            options = window.EventsIncludedItems.readAnswersFromRoot(
                document.getElementById('seatInfoOptions') || document,
                catalog,
                role,
            );
            const err = window.EventsIncludedItems.validateAnswers(catalog, options, role);
            if (err) {
                alert(err);
                return;
            }
        }

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving…';
        }

        try {
            const result = await callEdgeFunctionPublic('event-seat-info', {
                action: 'submit',
                token,
                display_name,
                options,
            });
            if (result?.error) throw new Error(result.error);
            showSuccess(display_name);
        } catch (err) {
            alert(err.message || 'Could not save. Please try again.');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Save details';
            }
        }
    }

    async function init() {
        const token = getToken();
        if (!token) {
            showError('Missing invite token. Ask the person who RSVP’d to send you a new link.');
            return;
        }
        try {
            const data = await loadInvite(token);
            if (data?.error) throw new Error(data.error);
            renderForm(data, token);
            if (data?.event?.title) {
                document.title = `${data.event.title} — your details | Justice McNeal LLC`;
            }
        } catch (err) {
            showError(err.message);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
