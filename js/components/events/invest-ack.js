/* ════════════════════════════════════════════════════════════
   Events — Invest-eligible RSVP acknowledgment helper
   Surface: window.EventsInvestAck
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const ACK_COPY = 'Investment-eligible event. Funds may be allocated to LLC investment accounts. Past performance does not guarantee future results.';

    function escapeHtml(str) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(str);
        }
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function isRequired(event) {
        return !!(event && event.invest_eligible);
    }

    /**
     * @param {object} event
     * @param {{ idPrefix?: string }} opts
     */
    function formFieldHtml(event, opts) {
        if (!isRequired(event)) return '';
        const prefix = (opts && opts.idPrefix) || 'investAck';
        const fieldId = `${prefix}-checkbox`;
        return `
            <div class="ed-disc-acks" data-invest-ack-root="${escapeHtml(prefix)}" style="margin:12px 0">
                <p style="font-size:13px;font-weight:700;color:#0b2545;margin:0 0 8px">Investment acknowledgment</p>
                <label class="ed-disc-ack" style="display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid #d5dfec;border-radius:12px;background:#fff;cursor:pointer">
                    <input type="checkbox" id="${escapeHtml(fieldId)}" data-invest-ack="1" required style="margin-top:3px;width:18px;height:18px;accent-color:#13366e;flex-shrink:0">
                    <span style="min-width:0">
                        <span style="display:block;font-size:13px;font-weight:700;color:#0b2545;margin-bottom:4px">Fidelity investment risk <span class="text-red-500">*</span></span>
                        <span style="display:block;font-size:12px;line-height:1.5;color:#374151">${escapeHtml(ACK_COPY)}</span>
                    </span>
                </label>
            </div>
        `;
    }

    function readAcknowledgedFromRoot(root) {
        const scope = root || document;
        const el = scope.querySelector('[data-invest-ack="1"]');
        return !!(el && el.checked);
    }

    function validateAck(event, root) {
        if (!isRequired(event)) return null;
        if (readAcknowledgedFromRoot(root)) return null;
        return 'Please acknowledge the investment risk disclosure before continuing.';
    }

    const EventsInvestAck = {
        ACK_COPY,
        isRequired,
        formFieldHtml,
        readAcknowledgedFromRoot,
        validateAck,
    };

    globalThis.EventsInvestAck = EventsInvestAck;
})();
