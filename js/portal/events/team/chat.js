/* ════════════════════════════════════════════════════════════
   Portal Events — Team Chat (Phase 5B)
   Classic IIFE; loads before detail.js.
   Preserves window.evtOpenTeamChat / evtSendTeamChatMessage / evtCleanupTeamChat.
   ════════════════════════════════════════════════════════════ */

'use strict';

const EVT_TEAM_CHAT_MAX_LEN = 4000;

function injectTeamChatStyles() {
    if (document.getElementById('evtTeamChatStyles')) return;
    const style = document.createElement('style');
    style.id = 'evtTeamChatStyles';
    style.textContent = `
    .evt-team-chat { display: flex; flex-direction: column; gap: 10px; min-height: 200px; }
    .evt-team-chat-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .evt-team-chat-back {
        border: 1px solid #e5e7eb; background: #fff; color: #374151; border-radius: 8px;
        padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .evt-team-chat-head strong { display: block; font-size: 15px; color: #111827; line-height: 1.25; }
    .evt-team-chat-head span { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; }
    .evt-team-chat-messages {
        display: flex; flex-direction: column; gap: 10px; max-height: min(42vh, 320px);
        overflow-y: auto; padding: 8px 4px; border: 1px solid #f3f4f6; border-radius: 12px; background: #f9fafb;
    }
    .evt-team-chat-empty, .evt-team-chat-status, .evt-team-chat-unavailable {
        font-size: 13px; color: #6b7280; text-align: center; padding: 16px 8px; line-height: 1.4;
    }
    .evt-team-chat-unavailable { color: #b45309; background: #fffbeb; border-radius: 10px; border: 1px solid #fde68a; }
    .evt-team-chat-msg { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; }
    .evt-team-chat-msg-meta { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .evt-team-chat-msg-name { font-size: 12px; font-weight: 700; color: #111827; }
    .evt-team-chat-msg-time { font-size: 11px; color: #9ca3af; white-space: nowrap; }
    .evt-team-chat-msg-body { font-size: 14px; color: #374151; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
    .evt-team-chat-composer { display: flex; flex-direction: column; gap: 8px; }
    .evt-team-chat-composer textarea {
        width: 100%; resize: vertical; min-height: 56px; max-height: 120px; padding: 10px 12px;
        border: 1px solid #d1d5db; border-radius: 10px; font-size: 14px; font-family: inherit;
    }
    .evt-team-chat-composer textarea:disabled { background: #f3f4f6; }
    .evt-team-chat-send {
        align-self: flex-end; padding: 10px 16px; border-radius: 10px; border: none;
        background: #4f46e5; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .evt-team-chat-send:disabled { opacity: .55; cursor: not-allowed; }
    `;
    document.head.appendChild(style);
}

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

function formatTime(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (_) {
        return '';
    }
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
            .select('id, first_name, last_name')
            .in('id', senderIds);
        (profiles || []).forEach(p => { profilesById[p.id] = p; });
    }
    return { messages, profilesById, error: null };
}

function messagesHtml(state) {
    if (!state?.messages?.length) {
        return '<p class="evt-team-chat-empty">No messages yet. Start the team conversation.</p>';
    }
    return state.messages.map(m => {
        const profile = state.profilesById[m.sender_id];
        const name = evtEscapeHtml(displayName(profile));
        const time = evtEscapeHtml(formatTime(m.created_at));
        const body = evtEscapeHtml(m.body || '');
        return `<article class="evt-team-chat-msg" data-msg-id="${m.id}">
        <div class="evt-team-chat-msg-meta">
            <span class="evt-team-chat-msg-name">${name}</span>
            <time class="evt-team-chat-msg-time">${time}</time>
        </div>
        <div class="evt-team-chat-msg-body">${body}</div>
    </article>`;
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
                .select('id, first_name, last_name')
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

function renderPanel(eventId, opts) {
    const { loading, unavailable, notStarted, canCompose } = opts;
    const backClick = `evtOpenTeamToolsPanel('${eventId}')`;
    let body = '';

    if (loading) {
        body = '<p class="evt-team-chat-status">Loading team chat…</p>';
    } else if (unavailable) {
        body = `<p class="evt-team-chat-unavailable">${evtEscapeHtml(unavailable)}</p>
        <button type="button" class="evt-team-chat-back" onclick="${backClick}">← Back to Team tools</button>`;
    } else if (notStarted) {
        body = `<p class="evt-team-chat-unavailable">Team chat has not been started yet. Ask the event creator or a coordinator to open Team Chat first.</p>
        <button type="button" class="evt-team-chat-back" onclick="${backClick}">← Back to Team tools</button>`;
    } else {
        const state = window.__evtTeamChatState;
        body = `
        <div id="evtTeamChatMessages" class="evt-team-chat-messages">${messagesHtml(state)}</div>
        <div id="evtTeamChatStatus" class="evt-team-chat-status" aria-live="polite"></div>
        ${canCompose ? `
        <div class="evt-team-chat-composer">
            <textarea id="evtTeamChatInput" maxlength="${EVT_TEAM_CHAT_MAX_LEN}" rows="3" placeholder="Message the team…" aria-label="Team chat message"></textarea>
            <button type="button" id="evtTeamChatSendBtn" class="evt-team-chat-send" onclick="evtSendTeamChatMessage('${eventId}')">Send</button>
        </div>` : ''}`;
    }

    return `
    <div class="evt-team-chat">
        <div class="evt-team-chat-toolbar">
            <button type="button" class="evt-team-chat-back" onclick="${backClick}">← Tools</button>
        </div>
        <div class="evt-team-chat-head">
            <strong>Team Chat</strong>
            <span>Private chat for this event team</span>
        </div>
        ${body}
    </div>`;
}

async function open(eventId) {
    if (typeof globalThis.evtInjectTeamToolsStyles === 'function') window.evtInjectTeamToolsStyles();
    injectTeamChatStyles();
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

    const closeBtn = '<button type="button" class="evt-cta-panel-close" onclick="evtCloseCtaPanel()" aria-label="Close">×</button>';
    bar.classList.add('evt-cta-bar-expanded');
    panel.classList.remove('hidden');
    panel.classList.add('evt-team-chat-panel');
    panel.innerHTML = `${closeBtn}${renderPanel(eventId, { loading: true })}`;

    const ensure = await ensureChat(event, eventId);
    if (ensure.error) {
        panel.innerHTML = `${closeBtn}${renderPanel(eventId, {
            unavailable: friendlyError(ensure.error),
        })}`;
        return;
    }
    if (ensure.notStarted || !ensure.chat) {
        panel.innerHTML = `${closeBtn}${renderPanel(eventId, { notStarted: true })}`;
        return;
    }

    const chatId = ensure.chat.id;
    const loaded = await loadMessages(chatId, eventId);
    if (loaded.error) {
        panel.innerHTML = `${closeBtn}${renderPanel(eventId, {
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

    panel.innerHTML = `${closeBtn}${renderPanel(eventId, { canCompose: true })}`;
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
