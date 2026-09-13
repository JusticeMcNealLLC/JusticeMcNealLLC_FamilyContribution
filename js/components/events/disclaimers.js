/* ════════════════════════════════════════════════════════════
   Events — Disclaimers helper (catalog + RSVP acknowledgments)
   Surface: window.EventsDisclaimers
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const TITLE_MAX = 80;
    const BODY_MAX = 4000;

    function escapeHtml(str) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(str);
        }
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function normalizeDisclaimers(items) {
        if (!Array.isArray(items)) return [];
        const out = [];
        for (const raw of items) {
            if (!raw || typeof raw !== 'object') continue;
            const title = String(raw.title || '').trim().slice(0, TITLE_MAX);
            const body = String(raw.body || '').trim().slice(0, BODY_MAX);
            if (!title || !body) continue;
            const id = String(raw.id || '').trim() || `disc-${out.length + 1}`;
            out.push({
                id,
                title,
                body,
                required: raw.required !== false,
                is_default: !!raw.is_default,
            });
        }
        return out;
    }

    function hasDisclaimers(catalog) {
        return normalizeDisclaimers(catalog).length > 0;
    }

    const DEFAULT_DISCLAIMERS = [
        {
            id: 'default-no-refunds',
            title: 'No refunds',
            body: 'Payments for this event are non-refundable for the payment period unless the event is cancelled or rescheduled by organizers.',
            required: true,
            is_default: true,
        },
        {
            id: 'default-flyers',
            title: 'Flyers / tickets',
            body: 'Guests who book their own travel (flights, etc.) are responsible for those costs; the event fee does not reimburse tickets or travel.',
            required: true,
            is_default: true,
        },
    ];

    /**
     * Normalized catalog, or seeded defaults for legacy paid RSVP events with empty disclaimers.
     * @param {object} event
     */
    function effectiveDisclaimers(event) {
        const normalized = normalizeDisclaimers(event?.disclaimers);
        if (normalized.length) return normalized;
        const isPaidRsvp = event?.pricing_mode === 'paid' && event?.rsvp_enabled !== false;
        return isPaidRsvp ? DEFAULT_DISCLAIMERS.map((d) => ({ ...d })) : [];
    }

    function scrollToAckField(root) {
        const scope = root || document;
        const prep = scope.querySelector('.ed-rsvp-prep');
        if (prep) {
            prep.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const unchecked = prep.querySelector('[data-disc-ack]:not(:checked)');
            if (unchecked && typeof unchecked.focus === 'function') unchecked.focus();
            return;
        }
        const unchecked = scope.querySelector('[data-disc-ack]:not(:checked)');
        if (unchecked && typeof unchecked.focus === 'function') {
            unchecked.scrollIntoView({ behavior: 'smooth', block: 'center' });
            unchecked.focus();
        }
    }

    function hasRequiredDisclaimers(catalog) {
        return requiredIds(catalog).length > 0;
    }

    function requiredIds(catalog) {
        return normalizeDisclaimers(catalog).filter((d) => d.required).map((d) => d.id);
    }

    function validateAcks(catalog, ackIds) {
        const required = requiredIds(catalog);
        if (!required.length) return null;
        const set = new Set(Array.isArray(ackIds) ? ackIds.map(String) : []);
        for (const id of required) {
            if (!set.has(id)) {
                const clause = normalizeDisclaimers(catalog).find((d) => d.id === id);
                return `Please acknowledge: ${clause?.title || 'required disclaimer'}.`;
            }
        }
        return null;
    }

    function acksPayload(catalog, ackIds) {
        const list = normalizeDisclaimers(catalog);
        const set = new Set(Array.isArray(ackIds) ? ackIds.map(String) : []);
        const now = new Date().toISOString();
        const out = [];
        for (const d of list) {
            if (!set.has(d.id)) continue;
            out.push({ id: d.id, acked_at: now });
        }
        return out;
    }

    /**
     * @param {Array} catalog
     * @param {{ idPrefix?: string, ackedIds?: string[] }} opts
     */
    function formFieldsHtml(catalog, opts) {
        const list = normalizeDisclaimers(catalog);
        if (!list.length) return '';
        const prefix = (opts && opts.idPrefix) || 'discAck';
        const acked = new Set(Array.isArray(opts?.ackedIds) ? opts.ackedIds.map(String) : []);
        const fields = list.map((d) => {
            const fieldId = `${prefix}-${d.id}`;
            const req = d.required ? ' <span class="text-red-500">*</span>' : '';
            const checked = acked.has(String(d.id)) ? ' checked' : '';
            return `
                <label class="ed-disc-ack" style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;padding:10px;border:1px solid #d5dfec;border-radius:12px;background:#fff;cursor:pointer">
                    <input type="checkbox" id="${escapeHtml(fieldId)}" data-disc-ack="${escapeHtml(d.id)}" ${d.required ? 'required' : ''}${checked} style="margin-top:3px;width:18px;height:18px;accent-color:#13366e;flex-shrink:0">
                    <span style="min-width:0">
                        <span style="display:block;font-size:13px;font-weight:700;color:#0b2545;margin-bottom:4px">${escapeHtml(d.title)}${req}</span>
                        <span style="display:block;font-size:12px;line-height:1.5;color:#374151">${escapeHtml(d.body)}</span>
                    </span>
                </label>
            `;
        }).join('');
        return `
            <div class="ed-disc-acks" data-disc-acks-root="${escapeHtml(prefix)}" style="margin:12px 0">
                <p style="font-size:13px;font-weight:700;color:#0b2545;margin:0 0 8px">Please acknowledge</p>
                ${fields}
            </div>
        `;
    }

    function readAckIdsFromRoot(root, catalog) {
        const list = normalizeDisclaimers(catalog);
        const scope = root || document;
        const out = [];
        for (const d of list) {
            const el = scope.querySelector(`[data-disc-ack="${CSS.escape(d.id)}"]`);
            if (el && el.checked) out.push(d.id);
        }
        return out;
    }

    const EventsDisclaimers = {
        TITLE_MAX,
        BODY_MAX,
        normalizeDisclaimers,
        hasDisclaimers,
        effectiveDisclaimers,
        scrollToAckField,
        hasRequiredDisclaimers,
        requiredIds,
        validateAcks,
        acksPayload,
        formFieldsHtml,
        readAckIdsFromRoot,
    };

    globalThis.EventsDisclaimers = EventsDisclaimers;
})();
