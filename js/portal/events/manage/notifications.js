// Portal Events — Manage Notifications tab (Event SMS Phase 4)

'use strict';

const SOURCE_LABELS = {
    guest_rsvp: 'Guest RSVP',
    member_rsvp: 'Member RSVP',
    member_profile: 'Member profile',
    admin_manual: 'Admin',
};

const MESSAGE_TYPES = [
    { value: 'manual', label: 'Manual update' },
    { value: 'cancellation', label: 'Cancellation' },
    { value: 'update', label: 'Schedule / location update' },
];

const UI = {
    filter: 'all',
    search: '',
    selected: new Set(),
    expandedMessageId: null,
    prefillBody: '',
    messageType: 'manual',
    selectAllOptedInOnLoad: false,
};

function api() {
    return window.EventsManageNotificationsApi || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}

function maskPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 4) return '***';
    return `***-***-${digits.slice(-4)}`;
}

function contactPhone(row) {
    const c = row.sms_phone_contacts;
    if (!c) return '';
    return Array.isArray(c) ? (c[0]?.phone_e164 || '') : (c.phone_e164 || '');
}

function isGuestRecipient(r) {
    return r.consent_source === 'guest_rsvp' || !!r.guest_rsvp_id;
}

function isMemberRecipient(r) {
    return !isGuestRecipient(r);
}

function optOutLabel(r) {
    if (r.opted_in && !r.opted_out_at) return 'Opted in';
    if (r.opted_out_at) return 'Opted out';
    return 'Not opted in';
}

function optOutClass(r) {
    if (r.opted_in && !r.opted_out_at) return 'em-pill-going';
    if (r.opted_out_at) return 'em-pill-not';
    return 'em-pill-maybe';
}

function _smsSchemaMissingMessage(err) {
    const code = String(err?.code || '');
    const msg = String(err?.message || err?.details || '').toLowerCase();
    const missing =
        code === 'PGRST205' ||
        code === '42P01' ||
        msg.includes('does not exist') ||
        msg.includes('could not find') ||
        msg.includes('schema cache') ||
        msg.includes('not found');
    if (!missing) return null;
    return (
        'Event SMS tables are not deployed on this Supabase project yet. ' +
        'Apply migration supabase/migrations/094_event_sms_notifications.sql ' +
        '(Supabase Dashboard → SQL, or `supabase db push` on the linked project), then reload.'
    );
}

function _throwIfDbError(err, fallback) {
    if (!err) return;
    throw new Error(_smsSchemaMissingMessage(err) || err.message || fallback);
}

async function loadNotifications() {
    const STATE = api().getState?.() || {};
    const eventId = STATE.eventId;
    if (!eventId) return { recipients: [], messages: [], suppressedPhones: new Set(), lastSentAt: null };

    const { data: recipients, error: recErr } = await supabaseClient
        .from('event_sms_recipients')
        .select(`
            id, contact_id, display_name, email, user_id, guest_rsvp_id, event_rsvp_id,
            opted_in, opted_in_at, opted_out_at, consent_source,
            sms_phone_contacts ( phone_e164 )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    _throwIfDbError(recErr, 'Failed to load SMS recipients');

    const rows = recipients || [];
    const phones = [...new Set(rows.map(contactPhone).filter(Boolean))];
    let suppressedPhones = new Set();

    if (phones.length) {
        const { data: supps } = await supabaseClient
            .from('sms_global_suppressions')
            .select('phone_e164')
            .in('phone_e164', phones)
            .is('released_at', null);
        suppressedPhones = new Set((supps || []).map((s) => s.phone_e164));
    }

    const { data: messages, error: msgErr } = await supabaseClient
        .from('sms_messages')
        .select('id, body, message_type, sender_user_id, recipient_count, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

    _throwIfDbError(msgErr, 'Failed to load SMS messages');

    const messageList = messages || [];
    const messageIds = messageList.map((m) => m.id);
    let deliveries = [];

    if (messageIds.length) {
        const { data: delRows, error: delErr } = await supabaseClient
            .from('sms_message_deliveries')
            .select('id, message_id, event_sms_recipient_id, phone_e164, status, status_updated_at, error_message')
            .in('message_id', messageIds);
        _throwIfDbError(delErr, 'Failed to load SMS deliveries');
        deliveries = delRows || [];
    }

    const latestByRecipient = {};
    for (const d of deliveries) {
        if (!d.event_sms_recipient_id) continue;
        const prev = latestByRecipient[d.event_sms_recipient_id];
        const ts = new Date(d.status_updated_at || 0).getTime();
        if (!prev || ts >= prev._ts) {
            latestByRecipient[d.event_sms_recipient_id] = { ...d, _ts: ts };
        }
    }

    const deliveriesByMessage = {};
    for (const d of deliveries) {
        if (!deliveriesByMessage[d.message_id]) deliveriesByMessage[d.message_id] = [];
        deliveriesByMessage[d.message_id].push(d);
    }

    const enriched = rows.map((r) => {
        const phone = contactPhone(r);
        return {
            ...r,
            phone_e164: phone,
            phone_masked: maskPhone(phone),
            globally_suppressed: phone ? suppressedPhones.has(phone) : false,
            latest_delivery: latestByRecipient[r.id] || null,
        };
    });

    const lastSentAt = messageList.length ? messageList[0].created_at : null;

    return {
        recipients: enriched,
        messages: messageList,
        deliveriesByMessage,
        suppressedPhones,
        lastSentAt,
        senderProfiles: {},
    };
}

function getFilteredRecipients(data) {
    const q = UI.search.trim().toLowerCase();
    return (data.recipients || []).filter((r) => {
        if (UI.filter === 'opted_in' && !(r.opted_in && !r.opted_out_at)) return false;
        if (UI.filter === 'opted_out' && (r.opted_in && !r.opted_out_at)) return false;
        if (UI.filter === 'guests' && !isGuestRecipient(r)) return false;
        if (UI.filter === 'members' && !isMemberRecipient(r)) return false;
        if (UI.filter === 'failed') {
            const st = r.latest_delivery?.status;
            if (st !== 'failed' && st !== 'undelivered') return false;
        }
        if (q) {
            const last4 = (r.phone_e164 || '').replace(/\D/g, '').slice(-4);
            const hay = `${r.display_name || ''} ${r.email || ''} ${last4}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

function isEligibleToSend(r) {
    return !!(r.opted_in && !r.opted_out_at && r.phone_e164 && !r.globally_suppressed);
}

function summaryMetrics(data) {
    const all = data.recipients || [];
    const optedIn = all.filter((r) => r.opted_in && !r.opted_out_at).length;
    const optedOutCount = all.filter((r) => r.opted_out_at || !r.opted_in).length;
    const suppressed = all.filter((r) => r.globally_suppressed).length;
    return {
        total: all.length,
        optedIn,
        optedOut: optedOutCount,
        suppressed,
        lastSentAt: data.lastSentAt,
    };
}

function notificationsHtml() {
    const STATE = api().getState?.() || {};
    const data = STATE.tabData?.notifications || { recipients: [], messages: [] };
    const metrics = summaryMetrics(data);
    const visible = getFilteredRecipients(data);
    const selectedEligible = [...UI.selected].filter((id) => {
        const row = data.recipients.find((r) => r.id === id);
        return row && isEligibleToSend(row);
    });

    const lastSentLabel = metrics.lastSentAt
        ? new Date(metrics.lastSentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'Never';

    const recipientRows = visible.length
        ? visible.map((r) => {
            const checked = UI.selected.has(r.id) ? ' checked' : '';
            const disabled = isEligibleToSend(r) ? '' : ' disabled';
            const delivery = r.latest_delivery?.status
                ? `<span class="em-pill">${esc(r.latest_delivery.status)}</span>`
                : '<span class="text-xs text-gray-400">—</span>';
            const suppressed = r.globally_suppressed
                ? '<span class="em-pill em-pill-not">STOP</span>'
                : '';
            return `
                <div class="em-row em-notif-row" data-recipient-id="${esc(r.id)}">
                    <input type="checkbox" class="em-notif-check" data-recipient-id="${esc(r.id)}"${checked}${disabled} aria-label="Select ${esc(r.display_name || 'recipient')}">
                    <div class="flex-1 min-w-0">
                        <p class="em-attendee-name">${esc(r.display_name || 'Unknown')}</p>
                        <p class="em-attendee-sub">${esc(r.phone_masked)}${r.email ? ` · ${esc(r.email)}` : ''}</p>
                        <div class="flex flex-wrap gap-1 mt-1">
                            <span class="em-pill ${optOutClass(r)}">${esc(optOutLabel(r))}</span>
                            <span class="em-pill">${esc(SOURCE_LABELS[r.consent_source] || r.consent_source)}</span>
                            ${suppressed}
                            ${delivery}
                        </div>
                    </div>
                </div>`;
        }).join('')
        : '<p class="text-xs text-gray-400 italic py-3">No recipients match this filter.</p>';

    const historyRows = (data.messages || []).length
        ? data.messages.map((m) => {
            const dels = data.deliveriesByMessage?.[m.id] || [];
            const counts = dels.reduce((acc, d) => {
                acc[d.status] = (acc[d.status] || 0) + 1;
                return acc;
            }, {});
            const summary = Object.keys(counts).map((k) => `${k}: ${counts[k]}`).join(' · ') || 'No deliveries';
            const expanded = UI.expandedMessageId === m.id;
            const preview = (m.body || '').length > 120 ? `${m.body.slice(0, 120)}…` : (m.body || '');
            const detail = expanded
                ? `<div class="mt-2 space-y-1">${dels.map((d) => {
                    const name = data.recipients.find((r) => r.id === d.event_sms_recipient_id)?.display_name;
                    return `<p class="text-xs text-gray-600">${esc(name || maskPhone(d.phone_e164))} · ${esc(d.status)}${d.error_message ? ` — ${esc(d.error_message)}` : ''}</p>`;
                }).join('') || '<p class="text-xs text-gray-400">No per-recipient rows.</p>'}</div>`
                : '';
            return `
                <div class="em-card mb-2">
                    <button type="button" class="w-full text-left" data-toggle-message="${esc(m.id)}">
                        <div class="flex justify-between gap-2">
                            <strong class="text-sm text-gray-900">${esc(m.message_type)}</strong>
                            <span class="text-xs text-gray-400">${new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">${esc(preview)}</p>
                        <p class="text-xs text-gray-400 mt-1">${m.recipient_count} recipients · ${esc(summary)}</p>
                    </button>
                    ${detail}
                </div>`;
        }).join('')
        : '<p class="text-xs text-gray-400 italic py-2">No messages sent for this event yet.</p>';

    return `
        <div class="em-card em-command-card mb-4" style="background:linear-gradient(135deg,#0f172a,#4338ca)">
            <p class="em-command-eyebrow">Notifications</p>
            <h3 class="em-command-title">Event SMS</h3>
            <p class="em-command-copy">Send manual updates to opted-in recipients. Phones are masked in this view.</p>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Recipients</span><strong>${metrics.total}</strong><small>All contacts</small></div>
            <div class="em-metric"><span>Opted in</span><strong>${metrics.optedIn}</strong><small>Eligible to send</small></div>
            <div class="em-metric"><span>Opted out</span><strong>${metrics.optedOut}</strong><small>Event preference</small></div>
            <div class="em-metric"><span>Global STOP</span><strong>${metrics.suppressed}</strong><small>Last sent: ${esc(lastSentLabel)}</small></div>
        </div>

        <div class="em-card mb-4">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">Compose SMS</h3>
                    <p class="em-section-sub">${selectedEligible.length} selected · only opted-in, non-suppressed recipients will receive messages.</p>
                </div>
            </div>
            <label class="text-xs text-gray-600 block mb-1">Message type</label>
            <select id="emNotifMessageType" class="em-input mb-2" aria-label="SMS message type">
                ${MESSAGE_TYPES.map((t) => {
                    const sel = UI.messageType === t.value ? ' selected' : '';
                    return `<option value="${esc(t.value)}"${sel}>${esc(t.label)}</option>`;
                }).join('')}
            </select>
            <textarea id="emNotifBody" class="em-textarea" maxlength="1600" placeholder="Write your event update…">${esc(UI.prefillBody || '')}</textarea>
            <p class="text-xs text-gray-400 mt-1"><span id="emNotifCharCount">${(UI.prefillBody || '').length}</span> / 1600 characters</p>
            <div class="flex flex-wrap gap-2 mt-3">
                <button type="button" class="em-btn-primary" id="emNotifSendBtn"${selectedEligible.length ? '' : ' disabled'}>Send SMS</button>
                <button type="button" class="em-btn-ghost" id="emNotifSelectOptedIn">Select all opted-in</button>
                <button type="button" class="em-btn-ghost" id="emNotifClearSelection">Clear selection</button>
            </div>
            <p id="emNotifSendResult" class="text-xs mt-2" style="min-height:1rem"></p>
        </div>

        <div class="em-card mb-4">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">Recipients</h3>
                    <p class="em-section-sub">Filter and select who should receive the next message.</p>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 mb-3">
                ${['all', 'opted_in', 'opted_out', 'guests', 'members', 'failed'].map((f) => {
                    const label = { all: 'All', opted_in: 'Opted in', opted_out: 'Opted out', guests: 'Guests', members: 'Members', failed: 'Failed' }[f];
                    const active = UI.filter === f ? 'background:#eef2ff;color:#4338ca' : 'background:#f3f4f6;color:#374151';
                    return `<button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 10px;${active}" data-notif-filter="${f}">${label}</button>`;
                }).join('')}
            </div>
            <input type="search" id="emNotifSearch" class="em-input mb-3" placeholder="Search name, email, or last 4 of phone" value="${esc(UI.search)}">
            <label class="text-xs text-gray-500 flex items-center gap-2 mb-2">
                <input type="checkbox" id="emNotifSelectVisible"> Select all visible
            </label>
            ${recipientRows}
        </div>

        <div class="em-card">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">Message history</h3>
                    <p class="em-section-sub">Tap a message to expand delivery details.</p>
                </div>
            </div>
            ${historyRows}
        </div>
    `;
}

async function refreshNotificationsTab() {
    const STATE = api().getState?.() || {};
    STATE.tabData.notifications = await loadNotifications();
    api().renderTab?.('notifications');
}

async function sendSelectedSms() {
    const STATE = api().getState?.() || {};
    const data = STATE.tabData?.notifications;
    if (!data) return;

    const body = document.getElementById('emNotifBody')?.value?.trim() || '';
    const resultEl = document.getElementById('emNotifSendResult');
    const selectedIds = [...UI.selected].filter((id) => {
        const row = data.recipients.find((r) => r.id === id);
        return row && isEligibleToSend(row);
    });

    if (!body) {
        if (resultEl) resultEl.textContent = 'Enter a message before sending.';
        return;
    }
    if (!selectedIds.length) {
        if (resultEl) resultEl.textContent = 'Select at least one opted-in recipient.';
        return;
    }

    const messageType = document.getElementById('emNotifMessageType')?.value || UI.messageType || 'manual';
    const typeLabel = MESSAGE_TYPES.find((t) => t.value === messageType)?.label || messageType;
    const ok = confirm(`Send this ${typeLabel} SMS to ${selectedIds.length} recipient${selectedIds.length === 1 ? '' : 's'}?`);
    if (!ok) return;

    const btn = document.getElementById('emNotifSendBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending…';
    }
    if (resultEl) resultEl.textContent = '';

    try {
        const res = await callEdgeFunction('send-event-sms', {
            event_id: STATE.eventId,
            body,
            message_type: messageType,
            recipient_ids: selectedIds,
            select_all_opted_in: false,
            dry_run: false,
        });

        const skipped = (res.skipped || 0) + (res.skipped_suppressed || 0) + (res.skipped_invalid || 0);
        if (resultEl) {
            resultEl.textContent = res.ok
                ? `Sent to ${res.sent || 0} recipient(s). Skipped: ${skipped}. Failed: ${res.failed || 0}.${res.dry_run ? ' (dry run)' : ''}`
                : (res.error || 'Send failed.');
            resultEl.style.color = res.ok ? '#059669' : '#dc2626';
        }
        UI.selected.clear();
        UI.prefillBody = '';
        await refreshNotificationsTab();
    } catch (err) {
        if (resultEl) {
            resultEl.textContent = err.message || 'Send failed.';
            resultEl.style.color = '#dc2626';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Send SMS';
        }
    }
}

function wireNotifications() {
    const STATE = api().getState?.() || {};
    const data = STATE.tabData?.notifications;
    const root = document.getElementById('emSheetContent');
    if (!root || !data) return;

    root.querySelectorAll('[data-notif-filter]').forEach((btn) => {
        btn.addEventListener('click', () => {
            UI.filter = btn.dataset.notifFilter || 'all';
            api().renderTab?.('notifications');
        });
    });

    const search = document.getElementById('emNotifSearch');
    if (search) {
        search.addEventListener('input', () => {
            UI.search = search.value;
            api().renderTab?.('notifications');
        });
    }

    const body = document.getElementById('emNotifBody');
    const charCount = document.getElementById('emNotifCharCount');
    if (body) {
        body.addEventListener('input', () => {
            UI.prefillBody = body.value;
            if (charCount) charCount.textContent = String(body.value.length);
        });
    }

    const typeSelect = document.getElementById('emNotifMessageType');
    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            UI.messageType = typeSelect.value || 'manual';
        });
    }

    if (UI.selectAllOptedInOnLoad) {
        (data.recipients || []).forEach((r) => {
            if (isEligibleToSend(r)) UI.selected.add(r.id);
        });
        UI.selectAllOptedInOnLoad = false;
    }

    root.querySelectorAll('.em-notif-check').forEach((cb) => {
        cb.addEventListener('change', () => {
            const id = cb.dataset.recipientId;
            if (!id || cb.disabled) return;
            if (cb.checked) UI.selected.add(id);
            else UI.selected.delete(id);
            api().renderTab?.('notifications');
        });
    });

    document.getElementById('emNotifSelectVisible')?.addEventListener('change', (e) => {
        const visible = getFilteredRecipients(data);
        if (e.target.checked) {
            visible.forEach((r) => { if (isEligibleToSend(r)) UI.selected.add(r.id); });
        } else {
            visible.forEach((r) => UI.selected.delete(r.id));
        }
        api().renderTab?.('notifications');
    });

    document.getElementById('emNotifSelectOptedIn')?.addEventListener('click', () => {
        (data.recipients || []).forEach((r) => {
            if (isEligibleToSend(r)) UI.selected.add(r.id);
        });
        api().renderTab?.('notifications');
    });

    document.getElementById('emNotifClearSelection')?.addEventListener('click', () => {
        UI.selected.clear();
        api().renderTab?.('notifications');
    });

    document.getElementById('emNotifSendBtn')?.addEventListener('click', () => sendSelectedSms());

    root.querySelectorAll('[data-toggle-message]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.toggleMessage;
            UI.expandedMessageId = UI.expandedMessageId === id ? null : id;
            api().renderTab?.('notifications');
        });
    });
}

function resetNotificationsUi(prefill = '') {
    UI.filter = 'all';
    UI.search = '';
    UI.selected.clear();
    UI.expandedMessageId = null;
    if (prefill && typeof prefill === 'object') {
        UI.prefillBody = prefill.body || '';
        UI.messageType = prefill.messageType || 'manual';
        UI.selectAllOptedInOnLoad = !!prefill.selectAllOptedIn;
    } else {
        UI.prefillBody = prefill || '';
        UI.messageType = 'manual';
        UI.selectAllOptedInOnLoad = false;
    }
}

/** Send cancellation/update to all opted-in recipients (user must confirm in caller). */
async function sendSmsAllOptedIn(eventId, body, messageType) {
    return callEdgeFunction('send-event-sms', {
        event_id: eventId,
        body,
        message_type: messageType,
        recipient_ids: [],
        select_all_opted_in: true,
        dry_run: false,
    });
}

export const manageNotificationsApi = {
    loadNotifications,
    notificationsHtml,
    wireNotifications,
    resetNotificationsUi,
    refreshNotificationsTab,
    sendSmsAllOptedIn,
};

globalThis.EventsManageNotifications = manageNotificationsApi;
