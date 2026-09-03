/* ════════════════════════════════════════════════════════════
   Events — Flow E attach-later pending guests
   Surface: window.EventsAttachGuests
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

    function formatMoney(cents) {
        if (window.EventsHelpers && typeof window.EventsHelpers.formatMoney === 'function') {
            return window.EventsHelpers.formatMoney(cents);
        }
        const n = Math.max(0, Number(cents) || 0) / 100;
        return `$${n.toFixed(2)}`;
    }

    /** Guest intent radios — show on paid events (and free for roster grouping). */
    function guestIntentHtml(event, opts) {
        const options = opts || {};
        const idPrefix = options.idPrefix || 'guestPayIntent';
        const show = event && (event.pricing_mode === 'paid' || options.forceShow);
        if (!show) return '';
        return `
            <div class="ed-attach-intent" data-attach-intent-root="${escapeHtml(idPrefix)}" style="margin:12px 0;padding:12px;border:1px solid var(--color-border,#d5dfec);border-radius:12px;background:#fff">
                <p style="font-size:13px;font-weight:700;color:#0b2545;margin:0 0 8px">Who pays?</p>
                <label style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;cursor:pointer;font-size:13px;color:#0b2545">
                    <input type="radio" name="${escapeHtml(idPrefix)}" value="self" data-payment-intent="self" checked style="margin-top:3px">
                    <span>I’ll pay for myself</span>
                </label>
                <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;font-size:13px;color:#0b2545">
                    <input type="radio" name="${escapeHtml(idPrefix)}" value="attach_later" data-payment-intent="attach_later" style="margin-top:3px">
                    <span>Someone else will pay for me</span>
                </label>
                <p style="margin:10px 0 0;font-size:12px;line-height:1.45;color:#6b7280">Paying with someone else’s bank via a verification code is not available. Either pay yourself, or ask them to add you to their party.</p>
            </div>`;
    }

    function readGuestIntent(root) {
        const scope = root || document;
        const checked = scope.querySelector('[data-payment-intent]:checked')
            || document.querySelector('[data-payment-intent]:checked');
        const v = checked ? String(checked.value || checked.getAttribute('data-payment-intent') || '') : 'self';
        return v === 'attach_later' ? 'attach_later' : 'self';
    }

    function wireGuestIntent(root, onChange) {
        const scope = root || document;
        scope.querySelectorAll('[data-payment-intent]').forEach((el) => {
            if (el.dataset.intentWired === '1') return;
            el.dataset.intentWired = '1';
            el.addEventListener('change', () => {
                if (typeof onChange === 'function') onChange(readGuestIntent(scope));
            });
        });
    }

    function panelShellHtml(idPrefix) {
        const id = idPrefix || 'attachGuests';
        return `<div id="${escapeHtml(id)}" class="ed-attach-guests" data-attach-guests-root="1" style="margin:12px 0"></div>`;
    }

    function renderPendingList(slot, pending, opts) {
        if (!slot) return;
        const options = opts || {};
        const unpaid = options.payerUnpaid !== false;
        if (!unpaid) {
            slot.innerHTML = '';
            return;
        }
        const list = Array.isArray(pending) ? pending : [];
        if (!list.length) {
            slot.innerHTML = `
                <div style="padding:10px 12px;border:1px dashed var(--color-border,#d5dfec);border-radius:12px;background:#fafbfc">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#0b2545">Add guest</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280">No guests are waiting to be added yet.</p>
                </div>`;
            return;
        }
        const rows = list.map((g) => {
            const name = escapeHtml(g.display_name || 'Guest');
            const role = g.role === 'kid' ? 'Kid' : 'Adult';
            const seats = Number(g.seat_count) > 1 ? ` · ${g.seat_count} seats` : '';
            const optsOk = g.options_complete ? '' : ' · sizes pending';
            return `
                <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-border,#d5dfec)">
                    <div style="min-width:0">
                        <p style="margin:0;font-size:13px;font-weight:700;color:#0b2545">${name}</p>
                        <p style="margin:2px 0 0;font-size:12px;color:#6b7280">${role}${seats}${optsOk}</p>
                    </div>
                    <button type="button" class="evt-action-btn" data-attach-guest-btn="1"
                        data-guest-rsvp-id="${escapeHtml(g.guest_rsvp_id)}"
                        data-pending-party-id="${escapeHtml(g.pending_party_id || '')}"
                        style="width:auto;padding:8px 14px;font-size:13px;flex-shrink:0">
                        Add
                    </button>
                </div>`;
        }).join('');
        slot.innerHTML = `
            <div style="padding:12px;border:1px solid var(--color-border,#d5dfec);border-radius:12px;background:#fff">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0b2545">Add guest</p>
                <p style="margin:0 0 8px;font-size:12px;color:#6b7280">Guests who asked someone else to pay. Adding updates your party total.</p>
                ${rows}
            </div>`;
    }

    /**
     * @param {HTMLElement} slot
     * @param {{ eventId: string, callEdge: Function, payerUnpaid?: boolean, onAttached?: Function }} opts
     */
    async function loadAndWire(slot, opts) {
        if (!slot || !opts || !opts.eventId || typeof opts.callEdge !== 'function') return;
        const payerUnpaid = opts.payerUnpaid !== false;
        if (!payerUnpaid) {
            slot.innerHTML = '';
            return;
        }
        slot.innerHTML = `<p style="font-size:12px;color:#6b7280;margin:8px 0">Loading guests…</p>`;
        try {
            const result = await opts.callEdge('event-party-attach', {
                action: 'list_pending',
                event_id: opts.eventId,
            });
            const pending = result?.pending_guests || [];
            renderPendingList(slot, pending, { payerUnpaid: true });
            slot.querySelectorAll('[data-attach-guest-btn]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    if (btn.disabled) return;
                    btn.disabled = true;
                    const prev = btn.textContent;
                    btn.textContent = 'Adding…';
                    try {
                        const attached = await opts.callEdge('event-party-attach', {
                            action: 'attach',
                            event_id: opts.eventId,
                            guest_rsvp_id: btn.getAttribute('data-guest-rsvp-id') || '',
                            pending_party_id: btn.getAttribute('data-pending-party-id') || '',
                        });
                        if (typeof opts.onAttached === 'function') {
                            await opts.onAttached(attached);
                        } else {
                            await loadAndWire(slot, opts);
                        }
                    } catch (err) {
                        alert(err.message || 'Could not add guest.');
                        btn.disabled = false;
                        btn.textContent = prev;
                    }
                });
            });
        } catch (_) {
            slot.innerHTML = `
                <div style="padding:10px 12px;border:1px solid var(--color-border,#d5dfec);border-radius:12px">
                    <p style="margin:0;font-size:12px;color:#6b7280">Could not load guests waiting to join.</p>
                </div>`;
        }
    }

    window.EventsAttachGuests = {
        guestIntentHtml,
        readGuestIntent,
        wireGuestIntent,
        panelShellHtml,
        renderPendingList,
        loadAndWire,
        formatMoney,
    };
})();
