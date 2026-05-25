/* ════════════════════════════════════════════════════════════
   Portal Events — Team Chat (Phase 5B)
   Tailwind-first iMessage-style UI via ui-tw.js.
   ════════════════════════════════════════════════════════════ */

'use strict';

import { evtDataAction } from '../core/actions.js';
import {
    TW_CLOSE_BTN,
    TW_CHAT_ROOT,
    TW_CHAT_NAV,
    TW_CHAT_BACK,
    TW_CHAT_NAV_CENTER,
    TW_CHAT_NAV_TITLE,
    TW_CHAT_NAV_SUB,
    TW_CHAT_THREAD,
    TW_CHAT_EMPTY,
    TW_CHAT_ALERT,
    TW_CHAT_ROW_SENT,
    TW_CHAT_ROW_RECV,
    TW_CHAT_RECV_COL,
    TW_CHAT_AVATAR,
    TW_CHAT_AVATAR_HIDDEN,
    TW_CHAT_SENDER,
    TW_CHAT_BUBBLE,
    TW_CHAT_BUBBLE_SENT,
    TW_CHAT_BUBBLE_RECV,
    TW_CHAT_TIME,
    TW_CHAT_COMPOSER,
    TW_CHAT_INPUT_WRAP,
    TW_CHAT_TEXTAREA,
    TW_CHAT_SEND,
    twPanelClasses,
    expandCtaSheet,
} from './ui-tw.js';


const EVT_TEAM_CHAT_MAX_LEN = 4000;
const EVT_TEAM_CHAT_TIME_GAP_MS = 60 * 60 * 1000;

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
    const spacerCls = spacer ? ` ${TW_CHAT_AVATAR_HIDDEN}` : '';
    return `<div class="${TW_CHAT_AVATAR}${spacerCls}" aria-hidden="${spacer ? 'true' : 'false'}" title="${name}">${inner}</div>`;
}

function formatBubbleTime(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (_) {
        return '';
    }
}

/** Show under-bubble time only when ≥1 hour since the previous message. */
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
        return `<p class="${TW_CHAT_EMPTY}">No messages yet.<br>Send the first message to the team.</p>`;
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
            ? `<time class="${TW_CHAT_TIME}">${evtEscapeHtml(formatBubbleTime(m.created_at))}</time>`
            : '';
        const body = evtEscapeHtml(m.body || '');
        if (isMine) {
            prevSenderId = m.sender_id;
            const bubbleCls = `${TW_CHAT_BUBBLE} ${TW_CHAT_BUBBLE_SENT}`;
            return `<div class="${TW_CHAT_ROW_SENT}" data-msg-id="${m.id}">
        <div class="${bubbleCls}">${body}</div>
        ${timeHtml}
    </div>`;
        }
        const showAvatar = m.sender_id !== prevSenderId;
        prevSenderId = m.sender_id;
        const bubbleCls = `${TW_CHAT_BUBBLE} ${TW_CHAT_BUBBLE_RECV}`;
        return `<div class="${TW_CHAT_ROW_RECV}" data-msg-id="${m.id}">
        ${avatarHtml(profile, { spacer: !showAvatar })}
        <div class="${TW_CHAT_RECV_COL}">
            ${showAvatar ? `<span class="${TW_CHAT_SENDER}">${name}</span>` : ''}
            <div class="${bubbleCls}">${body}</div>
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

const IM_SEND_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6"/></svg>';

function renderPanel(eventId, event, opts) {
    const { loading, unavailable, notStarted, canCompose } = opts;
    const eventTitle = evtEscapeHtml(event?.title || 'Event');
    const backBtn = `<button type="button" class="${TW_CHAT_BACK}" ${evtDataAction('evtOpenTeamToolsPanel', eventId)} aria-label="Back to Event Tools">‹ Tools</button>`;
    const nav = `
    <header class="${TW_CHAT_NAV}">
        ${backBtn}
        <div class="${TW_CHAT_NAV_CENTER}">
            <strong class="${TW_CHAT_NAV_TITLE}">Team Chat</strong>
            <span class="${TW_CHAT_NAV_SUB}">${eventTitle}</span>
        </div>
        <div aria-hidden="true"></div>
    </header>`;

    let body = '';

    if (loading) {
        body = `<p class="${TW_CHAT_EMPTY}">Loading…</p>`;
    } else if (unavailable) {
        body = `<p class="${TW_CHAT_ALERT}">${evtEscapeHtml(unavailable)}</p>`;
    } else if (notStarted) {
        body = `<p class="${TW_CHAT_ALERT}">Team chat has not been started yet. Ask the event creator or a coordinator to open Team Chat first.</p>`;
    } else {
        const state = window.__evtTeamChatState;
        body = `
        <div id="evtTeamChatMessages" class="${TW_CHAT_THREAD}" role="log" aria-live="polite">${messagesHtml(state)}</div>
        <div id="evtTeamChatStatus" class="${TW_CHAT_EMPTY} px-2 pb-1" aria-live="polite"></div>
        ${canCompose ? `
        <div class="${TW_CHAT_COMPOSER}">
            <div class="${TW_CHAT_INPUT_WRAP}">
                <textarea id="evtTeamChatInput" class="${TW_CHAT_TEXTAREA}" maxlength="${EVT_TEAM_CHAT_MAX_LEN}" rows="1" placeholder="Message" aria-label="Team chat message"></textarea>
            </div>
            <button type="button" id="evtTeamChatSendBtn" class="${TW_CHAT_SEND}" ${evtDataAction('evtSendTeamChatMessage', eventId)} aria-label="Send message">${IM_SEND_SVG}</button>
        </div>` : ''}`;
    }

    return `<div class="${TW_CHAT_ROOT}">${nav}${body}</div>`;
}

function configureChatPanel(panel, visible) {
    panel.className = twPanelClasses('chat', { expanded: true });
    panel.classList.toggle('hidden', !visible);
}

async function open(eventId) {
    cleanup();

    const event = (window.evtAllEvents || globalThis.evtAllEvents).find(e => e.id === eventId);
    if (!event) return;

    let bar = document.getElementById('evtCtaBar');
    if (!bar && typeof globalThis.evtEnsureCtaBarShell === 'function') {
        bar = window.evtEnsureCtaBarShell();
    }
    if (!bar) return;
    if (typeof globalThis.evtApplyDesktopTeamToolsOverlay === 'function') {
        window.evtApplyDesktopTeamToolsOverlay(bar);
    }
    const panel = document.getElementById('evtCtaPanel');
    if (!panel) return;

    const closeBtn = `<button type="button" class="${TW_CLOSE_BTN} max-lg:hidden" ${evtDataAction('evtCloseCtaPanel')} aria-label="Close">×</button>`;
    expandCtaSheet(bar, { chat: true });
    configureChatPanel(panel, true);
    panel.innerHTML = `${closeBtn}${renderPanel(eventId, event, { loading: true })}`;

    const ensure = await ensureChat(event, eventId);
    if (ensure.error) {
        panel.innerHTML = `${closeBtn}${renderPanel(eventId, event, {
            unavailable: friendlyError(ensure.error),
        })}`;
        return;
    }
    if (ensure.notStarted || !ensure.chat) {
        panel.innerHTML = `${closeBtn}${renderPanel(eventId, event, { notStarted: true })}`;
        return;
    }

    const chatId = ensure.chat.id;
    const loaded = await loadMessages(chatId, eventId);
    if (loaded.error) {
        panel.innerHTML = `${closeBtn}${renderPanel(eventId, event, {
            unavailable: friendlyError(loaded.error),
        })}`;
        return;
    }

    window.__evtTeamChatState = {
        eventId,
        chatId,
        messages: loaded.messages,
        profilesById: loaded.profilesById,
        channel: null,
    };

    panel.innerHTML = `${closeBtn}${renderPanel(eventId, event, { canCompose: true })}`;
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
