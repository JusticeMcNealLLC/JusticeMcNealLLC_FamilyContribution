/* Portal Events — Team Chat (sheet tab) */

'use strict';

import { evtDataAction } from '../core/actions.js';

const EVT_TEAM_CHAT_MAX_LEN = 4000;
const EVT_TEAM_CHAT_TIME_GAP_MS = 60 * 60 * 1000;

const CHAT_ROOT = 'flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white';
const CHAT_THREAD = 'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain bg-white px-3.5 py-3';
const CHAT_EMPTY = 'm-auto px-4 py-6 text-center text-[15px] leading-snug text-gray-400';
const CHAT_ALERT = 'mx-4 my-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3.5 text-center text-sm leading-snug text-amber-900';
const CHAT_ROW_SENT = 'mb-0.5 flex max-w-[78%] flex-col items-end self-end';
const CHAT_ROW_RECV = 'mb-1 flex max-w-[88%] items-end gap-1.5 self-start';
const CHAT_RECV_COL = 'flex min-w-0 flex-1 flex-col items-start';
const CHAT_AVATAR = 'evt-chat-avatar flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 [&_img]:h-full [&_img]:w-full [&_img]:object-cover';
const CHAT_AVATAR_HIDDEN = 'invisible pointer-events-none';
const CHAT_SENDER = 'mb-0.5 px-3 text-[11px] font-semibold leading-tight text-gray-400';
const CHAT_BUBBLE = 'break-words whitespace-pre-wrap px-3 py-2 text-base leading-snug rounded-[18px]';
const CHAT_BUBBLE_SENT = 'rounded-br-md bg-[#007AFF] text-white';
const CHAT_BUBBLE_RECV = 'rounded-bl-md bg-[#E9E9EB] text-gray-900';
const CHAT_TIME = 'mt-0.5 px-1 text-[11px] leading-tight text-gray-400';
const CHAT_COMPOSER = 'flex shrink-0 items-end gap-2 border-t border-gray-200/80 bg-gray-50/95 px-2.5 py-2 backdrop-blur-xl pb-[max(8px,env(safe-area-inset-bottom))]';
const CHAT_INPUT_WRAP = 'flex min-h-9 flex-1 items-end rounded-full border border-gray-300/80 bg-white px-3 py-1.5';
const CHAT_TEXTAREA = 'max-h-[100px] min-h-[22px] w-full resize-none border-0 bg-transparent text-base leading-snug outline-none placeholder:text-gray-400 disabled:opacity-55';
const CHAT_SEND = 'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-0 bg-[#007AFF] p-0 text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[2.5] [&_svg]:fill-none [&_svg]:stroke-current';

const IM_SEND_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6"/></svg>';

function canCreateTeamChat(event) {
    if (!event || !globalThis.evtCurrentUser?.id) return false;
    if (event.created_by === globalThis.evtCurrentUser.id) return true;
    return typeof canManageEvents === 'function' && canManageEvents();
}

function friendlyError(err) {
    if (!err) return 'Something went wrong. Please try again.';
    const msg = (err.message || '').toLowerCase();
    if (err.code === '42501' || msg.includes('permission') || msg.includes('row-level security') || msg.includes('policy')) {
        return 'Team chat is not available for your account on this event.';
    }
    if (msg.includes('jwt') || msg.includes('not authenticated')) return 'Please sign in again to use team chat.';
    return err.message || 'Unable to complete this action.';
}

function displayName(profile) {
    if (!profile) return 'Member';
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    return name || 'Member';
}

function profileInitials(profile) {
    const f = (profile?.first_name || '').trim();
    const l = (profile?.last_name || '').trim();
    const letters = `${f.charAt(0) || ''}${l.charAt(0) || ''}`.toUpperCase();
    return letters || 'M';
}

function avatarHtml(profile, { spacer = false } = {}) {
    const name = evtEscapeHtml(displayName(profile));
    const initials = evtEscapeHtml(profileInitials(profile));
    const url = profile?.profile_picture_url;
    const inner = url
        ? `<img src="${evtEscapeHtml(url)}" alt="" loading="lazy">`
        : `<span class="text-[11px] font-bold leading-none text-indigo-600">${initials}</span>`;
    const spacerCls = spacer ? ` ${CHAT_AVATAR_HIDDEN}` : '';
    return `<div class="${CHAT_AVATAR}${spacerCls}" aria-hidden="${spacer ? 'true' : 'false'}" title="${name}">${inner}</div>`;
}

function formatBubbleTime(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (_) {
        return '';
    }
}

function shouldShowMessageTime(prevCreatedAt, createdAt) {
    if (!prevCreatedAt || !createdAt) return true;
    const gap = new Date(createdAt).getTime() - new Date(prevCreatedAt).getTime();
    if (!Number.isFinite(gap)) return true;
    return gap >= EVT_TEAM_CHAT_TIME_GAP_MS;
}

function cleanup() {
    const state = window.__evtTeamChatState;
    if (state?.channel) {
        try { supabaseClient.removeChannel(state.channel); } catch (_) { /* ignore */ }
    }
    window.__evtTeamChatState = null;
}

async function ensureChat(event, eventId) {
    const { data: existing, error: selErr } = await supabaseClient
        .from('event_chats')
        .select('id, event_id, chat_type, created_at')
        .eq('event_id', eventId)
        .eq('chat_type', 'team')
        .maybeSingle();
    if (selErr) return { chat: null, error: selErr };
    if (existing) return { chat: existing, error: null };

    if (!canCreateTeamChat(event)) {
        return { chat: null, error: null, notStarted: true };
    }

    const { data: created, error: insErr } = await supabaseClient
        .from('event_chats')
        .insert({
            event_id: eventId,
            chat_type: 'team',
            created_by: globalThis.evtCurrentUser.id,
        })
        .select('id, event_id, chat_type, created_at')
        .single();

    if (insErr?.code === '23505') {
        const { data: again, error: againErr } = await supabaseClient
            .from('event_chats')
            .select('id, event_id, chat_type, created_at')
            .eq('event_id', eventId)
            .eq('chat_type', 'team')
            .maybeSingle();
        return { chat: again, error: againErr };
    }
    return { chat: created, error: insErr };
}

async function loadMessages(chatId, eventId) {
    const { data: rows, error } = await supabaseClient
        .from('event_chat_messages')
        .select('id, chat_id, event_id, sender_id, body, created_at, updated_at, deleted_at')
        .eq('chat_id', chatId)
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(200);
    if (error) return { messages: [], profilesById: {}, error };

    const messages = rows || [];
    const senderIds = [...new Set(messages.map(m => m.sender_id).filter(Boolean))];
    const profilesById = {};
    if (senderIds.length) {
        const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, profile_picture_url')
            .in('id', senderIds);
        (profiles || []).forEach(p => { profilesById[p.id] = p; });
    }
    return { messages, profilesById, error: null };
}

function messagesHtml(state) {
    if (!state?.messages?.length) {
        return `<p class="${CHAT_EMPTY}">No messages yet.<br>Send the first message to the team.</p>`;
    }
    const myId = globalThis.evtCurrentUser?.id;
    let prevSenderId = null;
    return state.messages.map((m, i) => {
        const isMine = myId && m.sender_id === myId;
        const profile = state.profilesById[m.sender_id];
        const name = evtEscapeHtml(displayName(profile));
        const prevMsg = i > 0 ? state.messages[i - 1] : null;
        const showTime = shouldShowMessageTime(prevMsg?.created_at, m.created_at);
        const timeHtml = showTime
            ? `<time class="${CHAT_TIME}">${evtEscapeHtml(formatBubbleTime(m.created_at))}</time>`
            : '';
        const body = evtEscapeHtml(m.body || '');
        if (isMine) {
            prevSenderId = m.sender_id;
            return `<div class="${CHAT_ROW_SENT}" data-msg-id="${m.id}"><div class="${CHAT_BUBBLE} ${CHAT_BUBBLE_SENT}">${body}</div>${timeHtml}</div>`;
        }
        const showAvatar = m.sender_id !== prevSenderId;
        prevSenderId = m.sender_id;
        return `<div class="${CHAT_ROW_RECV}" data-msg-id="${m.id}">
        ${avatarHtml(profile, { spacer: !showAvatar })}
        <div class="${CHAT_RECV_COL}">
            ${showAvatar ? `<span class="${CHAT_SENDER}">${name}</span>` : ''}
            <div class="${CHAT_BUBBLE} ${CHAT_BUBBLE_RECV}">${body}</div>
            ${timeHtml}
        </div>
    </div>`;
    }).join('');
}

function refreshMessageList() {
    const state = window.__evtTeamChatState;
    const el = document.getElementById('evtTeamChatMessages');
    if (!state || !el) return;
    el.innerHTML = messagesHtml(state);
    el.scrollTop = el.scrollHeight;
}

function handleRealtime(payload) {
    const state = window.__evtTeamChatState;
    if (!state || !payload?.new) return;
    const row = payload.new;
    if (row.event_id !== state.eventId || row.chat_id !== state.chatId) return;

    if (payload.eventType === 'INSERT') {
        if (row.deleted_at) return;
        if (state.messages.some(m => m.id === row.id)) return;
        state.messages.push(row);
        state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        refreshMessageList();
        if (row.sender_id && !state.profilesById[row.sender_id]) {
            supabaseClient
                .from('profiles')
                .select('id, first_name, last_name, profile_picture_url')
                .eq('id', row.sender_id)
                .maybeSingle()
                .then(({ data }) => {
                    if (data && window.__evtTeamChatState?.eventId === state.eventId) {
                        window.__evtTeamChatState.profilesById[data.id] = data;
                        refreshMessageList();
                    }
                });
        }
        return;
    }

    if (payload.eventType === 'UPDATE') {
        const idx = state.messages.findIndex(m => m.id === row.id);
        if (row.deleted_at) {
            if (idx >= 0) {
                state.messages.splice(idx, 1);
                refreshMessageList();
            }
            return;
        }
        if (idx >= 0) state.messages[idx] = row;
        else state.messages.push(row);
        state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        refreshMessageList();
    }
}

function subscribe(chatId, eventId) {
    const state = window.__evtTeamChatState;
    if (!state) return;
    if (state.channel) {
        try { supabaseClient.removeChannel(state.channel); } catch (_) { /* ignore */ }
        state.channel = null;
    }
    state.channel = supabaseClient
        .channel(`evt-team-chat-${eventId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'event_chat_messages',
            filter: `event_id=eq.${eventId}`,
        }, (payload) => handleRealtime({ eventType: 'INSERT', new: payload.new }))
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'event_chat_messages',
            filter: `event_id=eq.${eventId}`,
        }, (payload) => handleRealtime({ eventType: 'UPDATE', new: payload.new }))
        .subscribe();
}

function renderChatBody(eventId, opts) {
    const { loading, unavailable, notStarted, canCompose } = opts;
    if (loading) return `<p class="${CHAT_EMPTY}">Loading…</p>`;
    if (unavailable) return `<p class="${CHAT_ALERT}">${evtEscapeHtml(unavailable)}</p>`;
    if (notStarted) {
        return `<p class="${CHAT_ALERT}">Team chat has not been started yet. Ask the event creator or a coordinator to open Team Chat first.</p>`;
    }
    const state = window.__evtTeamChatState;
    return `
        <div id="evtTeamChatMessages" class="${CHAT_THREAD}" role="log" aria-live="polite">${messagesHtml(state)}</div>
        <div id="evtTeamChatStatus" class="${CHAT_EMPTY} px-2 pb-1" aria-live="polite"></div>
        ${canCompose ? `
        <div class="${CHAT_COMPOSER}">
            <div class="${CHAT_INPUT_WRAP}">
                <textarea id="evtTeamChatInput" class="${CHAT_TEXTAREA}" maxlength="${EVT_TEAM_CHAT_MAX_LEN}" rows="1" placeholder="Message" aria-label="Team chat message"></textarea>
            </div>
            <button type="button" id="evtTeamChatSendBtn" class="${CHAT_SEND}" ${evtDataAction('evtSendTeamChatMessage', eventId)} aria-label="Send message">${IM_SEND_SVG}</button>
        </div>` : ''}`;
}

async function initTab(eventId, event) {
    cleanup();
    const Shell = window.EventsTeamShell;
    if (!Shell) return;

    Shell.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId, { loading: true })}</div>`);

    const ensure = await ensureChat(event, eventId);
    if (ensure.error) {
        Shell.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId, { unavailable: friendlyError(ensure.error) })}</div>`);
        return;
    }
    if (ensure.notStarted || !ensure.chat) {
        Shell.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId, { notStarted: true })}</div>`);
        return;
    }

    const chatId = ensure.chat.id;
    const loaded = await loadMessages(chatId, eventId);
    if (loaded.error) {
        Shell.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId, { unavailable: friendlyError(loaded.error) })}</div>`);
        return;
    }

    window.__evtTeamChatState = {
        eventId,
        chatId,
        messages: loaded.messages,
        profilesById: loaded.profilesById,
        channel: null,
    };

    Shell.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId, { canCompose: true })}</div>`);
    refreshMessageList();
    subscribe(chatId, eventId);

    const input = document.getElementById('evtTeamChatInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(eventId);
            }
        });
    }
}

async function open(eventId) {
    return window.EventsTeam?.open?.(eventId, { tab: 'chat' });
}

async function send(eventId) {
    const state = window.__evtTeamChatState;
    if (!state || state.eventId !== eventId || !state.chatId) return;

    const input = document.getElementById('evtTeamChatInput');
    const sendBtn = document.getElementById('evtTeamChatSendBtn');
    const statusEl = document.getElementById('evtTeamChatStatus');
    if (!input) return;

    const body = (input.value || '').trim();
    if (!body) {
        if (statusEl) statusEl.textContent = 'Enter a message to send.';
        return;
    }
    if (body.length > EVT_TEAM_CHAT_MAX_LEN) {
        if (statusEl) statusEl.textContent = `Message must be ${EVT_TEAM_CHAT_MAX_LEN} characters or fewer.`;
        return;
    }

    if (sendBtn) sendBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Sending…';

    const { data, error } = await supabaseClient
        .from('event_chat_messages')
        .insert({
            chat_id: state.chatId,
            event_id: eventId,
            sender_id: globalThis.evtCurrentUser.id,
            body,
        })
        .select('id, chat_id, event_id, sender_id, body, created_at, updated_at, deleted_at')
        .single();

    if (sendBtn) sendBtn.disabled = false;

    if (error) {
        if (statusEl) statusEl.textContent = friendlyError(error);
        return;
    }

    input.value = '';
    if (statusEl) statusEl.textContent = '';

    if (data && !data.deleted_at && !state.messages.some(m => m.id === data.id)) {
        state.messages.push(data);
        if (!state.profilesById[globalThis.evtCurrentUser.id] && globalThis.evtCurrentUser) {
            state.profilesById[globalThis.evtCurrentUser.id] = {
                id: globalThis.evtCurrentUser.id,
                first_name: globalThis.evtCurrentUser.first_name,
                last_name: globalThis.evtCurrentUser.last_name,
                profile_picture_url: globalThis.evtCurrentUser.profile_picture_url || null,
            };
        }
        state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        refreshMessageList();
    }
}

export const teamChatApi = {
    open,
    initTab,
    send,
    cleanup,
    ensureChat,
    loadMessages,
    subscribe,
    maxLength: EVT_TEAM_CHAT_MAX_LEN,
};

globalThis.evtOpenTeamChat = open;
globalThis.evtSendTeamChatMessage = send;
globalThis.evtCleanupTeamChat = cleanup;

const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.team = PortalEvents.team || {};
PortalEvents.team.chat = teamChatApi;
