// Portal Events — Manage danger zone (Phase 5M.3C)

'use strict';

function api() {
    return window.EventsManageDangerApi || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}
function money(cents) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
}

// ─── Danger Zone tab ────────────────────────────────────────────
function dangerHtml() {
    const STATE = api().getState?.() || {};
    const e = STATE.event;
    const isCancelled = e.status === 'cancelled';
    const isCompleted = e.status === 'completed';
    const totalRsvps = STATE.rsvps.length + STATE.guestRsvps.length;
    const paidTickets = STATE.rsvps.filter(r => r.paid).length + STATE.guestRsvps.filter(r => r.paid).length;
    const checkins = STATE.checkins.length;
    const statusLabel = (e.status || 'draft').toUpperCase();

    return `
        <div class="em-card em-command-card mb-4" style="background:linear-gradient(135deg,#7f1d1d,#111827)">
            <p class="em-command-eyebrow">Danger zone</p>
            <h3 class="em-command-title">High-impact event controls</h3>
            <p class="em-command-copy">These actions change availability, visibility, or stored event records. Review attendance and money before making a destructive change.</p>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Status</span><strong style="font-size:18px">${esc(statusLabel)}</strong><small>Current lifecycle</small></div>
            <div class="em-metric"><span>RSVP records</span><strong>${totalRsvps}</strong><small>Member + guest</small></div>
            <div class="em-metric"><span>Paid tickets</span><strong>${paidTickets}</strong><small>Refund review</small></div>
            <div class="em-metric"><span>Check-ins</span><strong>${checkins}</strong><small>Attendance history</small></div>
        </div>

        ${!isCancelled && !isCompleted ? `
        <div class="em-danger-card">
            <p class="em-danger-title">Cancel event</p>
            <p class="em-danger-sub">Marks the event as cancelled. Paid RSVPs are NOT auto-refunded — handle refunds in M3b's Money tab or Stripe dashboard.</p>
            <button class="em-btn-danger" data-action="cancel">Cancel event</button>
        </div>` : ''}

        ${!isCompleted ? `
        <div class="em-danger-card" style="background:#fffbeb;border-color:#fde68a">
            <p class="em-danger-title" style="color:#92400e">Mark completed</p>
            <p class="em-danger-sub" style="color:#78350f">Closes RSVPs and locks the event. Use this after the event has ended.</p>
            <button class="em-btn-ghost" data-action="complete" style="background:#fde68a;color:#78350f">Mark completed</button>
        </div>` : ''}

        ${isCancelled ? `<div class="em-card mb-3"><div class="em-section-head"><div><h3 class="em-section-title">Event already cancelled</h3><p class="em-section-sub">Cancellation controls are hidden because this event is no longer open.</p></div></div></div>` : ''}
        ${isCompleted ? `<div class="em-card mb-3"><div class="em-section-head"><div><h3 class="em-section-title">Event completed</h3><p class="em-section-sub">Completion controls are hidden because this event has already been closed.</p></div></div></div>` : ''}

        <div class="em-danger-card" style="background:#fff7ed;border-color:#fed7aa">
            <p class="em-danger-title" style="color:#9a3412">Reset test participation</p>
            <p class="em-danger-sub" style="color:#7c2d12">Keeps the event, images, date, pricing, location, and public URL. Removes RSVPs, guest RSVPs, check-ins, raffle entries, and drawn raffle winners. This does not refund Stripe payments.</p>
            <button class="em-btn-danger" data-action="reset-participation" style="background:#ea580c">Reset participation</button>
        </div>

        <div class="em-danger-card">
            <p class="em-danger-title">Delete event permanently</p>
            <p class="em-danger-sub">Removes the event and ALL associated data: RSVPs, check-ins, raffle entries, documents, photos. You will be asked to type the event title to confirm.</p>
            <button class="em-btn-danger" data-action="delete">Delete event</button>
        </div>
    `;
}
function wireDanger() {
    const STATE = api().getState?.() || {};
    document.getElementById('emSheetContent').querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => runDangerAction(btn.dataset.action));
    });
}

function cancellationSmsDefaultBody(title) {
    return `Update: ${title} has been cancelled. Reply STOP to opt out.`;
}

async function offerCancellationSmsPrompt(event, optedInCount) {
    if (!optedInCount || optedInCount < 1) return;

    const defaultBody = cancellationSmsDefaultBody(event.title);
    const overlay = document.createElement('div');
    overlay.id = 'emCancelSmsOverlay';
    overlay.className = 'fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50';
    overlay.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-4" role="dialog" aria-labelledby="emCancelSmsTitle">
            <h3 id="emCancelSmsTitle" class="text-base font-semibold text-gray-900">Send cancellation text?</h3>
            <p class="text-sm text-gray-600 mt-1">Notify ${optedInCount} opted-in attendee${optedInCount === 1 ? '' : 's'}. You can edit the message below. Phone numbers stay masked.</p>
            <textarea id="emCancelSmsBody" class="em-textarea mt-3" rows="4" maxlength="1600">${esc(defaultBody)}</textarea>
            <p id="emCancelSmsResult" class="text-xs mt-2" style="min-height:1rem"></p>
            <div class="flex flex-wrap gap-2 mt-3 justify-end">
                <button type="button" class="em-btn-ghost" data-cancel-sms-skip>Skip</button>
                <button type="button" class="em-btn-primary" data-cancel-sms-send>Send SMS</button>
            </div>
        </div>
    `;

    const cleanup = () => overlay.remove();

    return new Promise((resolve) => {
        document.body.appendChild(overlay);

        overlay.querySelector('[data-cancel-sms-skip]')?.addEventListener('click', () => {
            cleanup();
            resolve({ sent: false, skipped: true });
        });

        overlay.querySelector('[data-cancel-sms-send]')?.addEventListener('click', async () => {
            const resultEl = overlay.querySelector('#emCancelSmsResult');
            const bodyEl = overlay.querySelector('#emCancelSmsBody');
            const body = (bodyEl?.value || '').trim();
            if (!body) {
                if (resultEl) {
                    resultEl.textContent = 'Enter a message before sending.';
                    resultEl.style.color = '#dc2626';
                }
                return;
            }
            if (!confirm(`Send cancellation SMS to ${optedInCount} opted-in recipient${optedInCount === 1 ? '' : 's'}?`)) return;

            const sendBtn = overlay.querySelector('[data-cancel-sms-send]');
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.textContent = 'Sending…';
            }
            if (resultEl) resultEl.textContent = '';

            try {
                const res = await callEdgeFunction('send-event-sms', {
                    event_id: event.id,
                    body,
                    message_type: 'cancellation',
                    recipient_ids: [],
                    select_all_opted_in: true,
                    dry_run: false,
                });
                const skipped = (res.skipped || 0) + (res.skipped_suppressed || 0) + (res.skipped_invalid || 0);
                if (resultEl) {
                    resultEl.textContent = res.ok
                        ? `Sent to ${res.sent || 0} recipient(s). Skipped: ${skipped}. Failed: ${res.failed || 0}.${res.dry_run ? ' (dry run)' : ''}`
                        : (res.error || 'Send failed.');
                    resultEl.style.color = res.ok ? '#059669' : '#dc2626';
                }
                if (res.ok) {
                    setTimeout(() => {
                        cleanup();
                        resolve({ sent: true, result: res });
                    }, 1200);
                }
            } catch (err) {
                if (resultEl) {
                    resultEl.textContent = err.message || 'Send failed.';
                    resultEl.style.color = '#dc2626';
                }
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Send SMS';
                }
            }
        });
    });
}

async function runDangerAction(action) {
    const STATE = api().getState?.() || {};
    const e = STATE.event;
    if (!e) return;

    if (action === 'delete') {
        const typed = prompt(`Type the event title to permanently delete:\n\n"${e.title}"`);
        if (!typed || typed.trim() !== e.title.trim()) {
            if (typed !== null) alert('Title did not match. Deletion cancelled.');
            return;
        }
        try {
            const { error } = await supabaseClient.from('events').delete().eq('id', e.id);
            if (error) throw error;
            alert('Event deleted.');
            api().close?.();
            api().notifyParent?.('deleted', e.id);
        } catch (err) {
            alert('Delete failed: ' + (err.message || 'unknown error'));
        }
        return;
    }

    if (action === 'cancel') {
        if (!confirm(`Mark "${e.title}" as cancelled?`)) return;
        try {
            const { error } = await supabaseClient.from('events').update({ status: 'cancelled' }).eq('id', e.id);
            if (error) throw error;
            STATE.event.status = 'cancelled';
            api().renderHeader?.();
            api().renderTab?.('danger');
            api().notifyParent?.('updated', e.id);

            try {
                const { count } = await supabaseClient
                    .from('event_sms_recipients')
                    .select('id', { count: 'exact', head: true })
                    .eq('event_id', e.id)
                    .eq('opted_in', true)
                    .is('opted_out_at', null);
                if (count && count > 0) {
                    await offerCancellationSmsPrompt(e, count);
                }
            } catch (smsErr) {
                console.warn('Cancellation SMS prompt skipped:', smsErr?.message || smsErr);
            }
        } catch (err) {
            alert('Cancel failed: ' + (err.message || 'unknown error'));
        }
        return;
    }

    if (action === 'reset-participation') {
        await api().resetParticipation?.();
        return;
    }

    if (action === 'complete') {
        if (!confirm(`Mark "${e.title}" as completed?`)) return;
        try {
            const { error } = await supabaseClient.from('events').update({ status: 'completed' }).eq('id', e.id);
            if (error) throw error;
            STATE.event.status = 'completed';
            api().renderHeader?.();
            api().renderTab?.('danger');
            api().notifyParent?.('updated', e.id);
        } catch (err) {
            alert('Complete failed: ' + (err.message || 'unknown error'));
        }
    }
}

export const manageDangerApi = {
    dangerHtml,
    wireDanger,
    runDangerAction
};

globalThis.EventsManageDanger = manageDangerApi;
