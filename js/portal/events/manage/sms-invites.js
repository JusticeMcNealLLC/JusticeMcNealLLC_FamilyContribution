// Portal Events — Manage Overview: Host SMS invites (§13.12 line 457)

'use strict';

const PUBLIC_SITE_URL = 'https://justicemcneal.com';

const inviteUi = {
    members: [],
    selected: new Set(),
    search: '',
    loading: false,
    loaded: false,
    status: '',
    recentInvites: [],
};

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

function publicInviteUrl(event) {
    const slug = event?.slug || '';
    if (typeof globalThis.evtPublicEventInviteUrl === 'function') {
        return globalThis.evtPublicEventInviteUrl(slug);
    }
    return PUBLIC_SITE_URL + '/events/?e=' + encodeURIComponent(slug);
}

function invitePreviewBody(event) {
    const title = (event?.title || 'Event').trim() || 'Event';
    const url = publicInviteUrl(event);
    return `${title}: You're invited. ${url}`;
}

function filteredMembers() {
    const q = String(inviteUi.search || '').trim().toLowerCase();
    if (!q) return inviteUi.members;
    return inviteUi.members.filter((m) => {
        const name = `${m.first_name || ''} ${m.last_name || ''}`.trim().toLowerCase();
        const phone = String(m.phone || '').replace(/\D/g, '');
        return name.includes(q) || phone.includes(q.replace(/\D/g, ''));
    });
}

function renderMemberList() {
    const list = document.getElementById('emSmsInviteList');
    if (!list) return;
    if (inviteUi.loading) {
        list.innerHTML = `<p class="text-xs text-gray-400 italic py-2">Loading members with phones…</p>`;
        return;
    }
    const rows = filteredMembers();
    if (!inviteUi.loaded) {
        list.innerHTML = `<p class="text-xs text-gray-400 italic py-2">Preparing member list…</p>`;
        return;
    }
    if (!inviteUi.members.length) {
        list.innerHTML = `<p class="text-xs text-gray-400 italic py-2">No active members with a phone on file. Add numbers below.</p>`;
        return;
    }
    if (!rows.length) {
        list.innerHTML = `<p class="text-xs text-gray-400 italic py-2">No members match this search.</p>`;
        return;
    }
    list.innerHTML = rows.map((m) => {
        const name = `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member';
        const checked = inviteUi.selected.has(m.id) ? 'checked' : '';
        return `
            <label class="em-attendee-card" style="cursor:pointer;align-items:flex-start">
                <input type="checkbox" class="mt-1" data-sms-invite-member="${esc(m.id)}" ${checked}
                    style="width:18px;height:18px;accent-color:var(--color-primary,#13366E)">
                <div class="em-attendee-main" style="margin-left:8px">
                    <p class="em-attendee-name">${esc(name)}</p>
                    <p class="em-attendee-sub">${esc(maskPhone(m.phone))}</p>
                </div>
            </label>`;
    }).join('');

    list.querySelectorAll('[data-sms-invite-member]').forEach((cb) => {
        cb.addEventListener('change', () => {
            const id = cb.getAttribute('data-sms-invite-member');
            if (!id) return;
            if (cb.checked) inviteUi.selected.add(id);
            else inviteUi.selected.delete(id);
            updateSelectedCount();
        });
    });
    updateSelectedCount();
}

function updateSelectedCount() {
    const el = document.getElementById('emSmsInviteSelectedCount');
    if (el) el.textContent = String(inviteUi.selected.size);
}

function setStatus(msg, isError) {
    inviteUi.status = msg || '';
    const el = document.getElementById('emSmsInviteStatus');
    if (!el) return;
    el.textContent = inviteUi.status;
    el.className = isError ? 'text-xs text-red-600 mt-2' : 'text-xs text-gray-500 mt-2';
}

async function loadInviteMembers() {
    inviteUi.loading = true;
    inviteUi.loaded = false;
    renderMemberList();
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, phone')
            .eq('is_active', true)
            .not('phone', 'is', null)
            .neq('phone', '')
            .order('first_name', { ascending: true })
            .limit(500);
        if (error) throw error;
        inviteUi.members = (data || []).filter((r) => String(r.phone || '').trim());
        inviteUi.loaded = true;
    } catch (err) {
        console.error('SMS invite member load failed', err);
        inviteUi.members = [];
        inviteUi.loaded = true;
        setStatus(err.message || 'Could not load members with phones.', true);
    } finally {
        inviteUi.loading = false;
        renderMemberList();
    }
}

function parseExtraPhones(raw) {
    return String(raw || '')
        .split(/[\s,;]+/)
        .map((p) => p.trim())
        .filter(Boolean);
}

async function loadRecentInvites(eventId) {
    if (!eventId) {
        inviteUi.recentInvites = [];
        renderRecentInvites();
        return;
    }
    try {
        const { data, error } = await supabaseClient
            .from('sms_messages')
            .select('id, created_at, recipient_count, body')
            .eq('event_id', eventId)
            .eq('message_type', 'event_invite')
            .order('created_at', { ascending: false })
            .limit(5);
        if (error) throw error;
        inviteUi.recentInvites = data || [];
    } catch (err) {
        console.error('Recent invite log load failed', err);
        inviteUi.recentInvites = [];
    }
    renderRecentInvites();
}

function renderRecentInvites() {
    const el = document.getElementById('emSmsInviteRecent');
    if (!el) return;
    const rows = inviteUi.recentInvites || [];
    if (!rows.length) {
        el.innerHTML = `<p class="text-xs text-gray-400 italic py-1">No invite SMS sent yet for this event.</p>`;
        return;
    }
    el.innerHTML = rows.map((m) => {
        const when = m.created_at
            ? new Date(m.created_at).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })
            : '—';
        const n = Number(m.recipient_count) || 0;
        return `<p class="text-xs text-gray-600" style="margin:4px 0">${esc(when)} · ${n} recipient${n === 1 ? '' : 's'}</p>`;
    }).join('');
}

function smsInvitesHtml(event) {
    if (!event?.slug) return '';
    const preview = invitePreviewBody(event);
    return `
        <div class="em-card mt-3" id="emSmsInvitesCard">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">SMS invites</h3>
                    <p class="em-section-sub">Pick members with phones and/or add numbers. Sends the event name + public link (not a payment link).</p>
                </div>
            </div>
            <p class="text-xs text-gray-500 mb-2">Message preview</p>
            <p class="text-sm text-gray-800 mb-3" style="background:var(--color-surface,#EEF2F6);border:1px solid var(--color-border,#D5DFEC);border-radius:10px;padding:10px 12px;line-height:1.4">${esc(preview)}</p>
            <div class="flex flex-wrap items-center gap-2 mb-2">
                <input type="search" id="emSmsInviteSearch" placeholder="Search members…"
                    class="em-input" style="flex:1;min-width:160px;font-size:16px">
                <span class="text-xs text-gray-500"><span id="emSmsInviteSelectedCount">0</span> selected</span>
            </div>
            <div id="emSmsInviteList" style="max-height:220px;overflow:auto;margin-bottom:12px"></div>
            <label class="text-xs text-gray-500 block mb-1" for="emSmsInvitePhones">Extra phone numbers</label>
            <textarea id="emSmsInvitePhones" rows="2" placeholder="+15551234567, +15559876543"
                class="em-textarea w-full mb-3" style="font-size:16px"></textarea>
            <div class="flex flex-wrap gap-2">
                <button type="button" class="em-btn-primary" id="emSmsInviteSend">Send SMS invites</button>
                <button type="button" class="em-btn-ghost" id="emSmsInviteClear">Clear selection</button>
            </div>
            <p id="emSmsInviteStatus" class="text-xs text-gray-500 mt-2"></p>
            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--color-border,#D5DFEC)">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <p class="text-xs font-semibold text-gray-700" style="margin:0">Recent invites</p>
                    <button type="button" class="em-btn-ghost" style="font-size:11px;padding:4px 8px" data-overview-tab="notifications">See all SMS history</button>
                </div>
                <div id="emSmsInviteRecent"><p class="text-xs text-gray-400 italic py-1">Loading…</p></div>
            </div>
        </div>`;
}

function wireSmsInvites(event) {
    if (!event?.slug) return;
    inviteUi.selected = new Set();
    inviteUi.search = '';
    inviteUi.status = '';
    setStatus('');

    const search = document.getElementById('emSmsInviteSearch');
    search?.addEventListener('input', () => {
        inviteUi.search = search.value || '';
        renderMemberList();
    });

    document.getElementById('emSmsInviteClear')?.addEventListener('click', () => {
        inviteUi.selected.clear();
        const phones = document.getElementById('emSmsInvitePhones');
        if (phones) phones.value = '';
        renderMemberList();
        setStatus('Selection cleared.');
    });

    document.getElementById('emSmsInviteSend')?.addEventListener('click', async () => {
        const btn = document.getElementById('emSmsInviteSend');
        const phonesEl = document.getElementById('emSmsInvitePhones');
        const member_ids = [...inviteUi.selected];
        const phones = parseExtraPhones(phonesEl?.value || '');
        if (!member_ids.length && !phones.length) {
            setStatus('Select at least one member or add a phone number.', true);
            return;
        }
        if (typeof callEdgeFunction !== 'function') {
            setStatus('SMS send is unavailable right now.', true);
            return;
        }
        const prev = btn?.textContent;
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Sending…';
        }
        setStatus('Sending invites…');
        try {
            const result = await callEdgeFunction('send-event-invites', {
                event_id: event.id,
                member_ids,
                phones,
            });
            if (result?.error) throw new Error(result.error);
            const dry = result?.dry_run ? ' (dry run — SMS_SEND_ENABLED off)' : '';
            const parts = [
                `Sent ${result?.sent ?? 0}${dry}`,
                result?.skipped_suppressed ? `${result.skipped_suppressed} suppressed` : null,
                result?.skipped_invalid ? `${result.skipped_invalid} invalid` : null,
                result?.failed ? `${result.failed} failed` : null,
            ].filter(Boolean);
            setStatus(parts.join(' · '));
            await loadRecentInvites(event.id);
        } catch (err) {
            setStatus(err.message || 'Could not send invites.', true);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = prev || 'Send SMS invites';
            }
        }
    });

    loadInviteMembers();
    loadRecentInvites(event.id);
}

export { smsInvitesHtml, wireSmsInvites };
