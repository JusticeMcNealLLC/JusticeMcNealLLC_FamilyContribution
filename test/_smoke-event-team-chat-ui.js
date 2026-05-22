/**
 * Static smoke: Phase 4 Event Team Chat UI (portal detail).
 * Run: node test/_smoke-event-team-chat-ui.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const detail = fs.readFileSync(path.join(root, 'js/portal/events/detail.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');

function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('event team chat UI smoke\n');

assert(/event_chats/.test(detail), 'detail.js should use event_chats');
assert(/event_chat_messages/.test(detail), 'detail.js should use event_chat_messages');
assert(/evtEnsureTeamChat/.test(detail), 'ensure-chat logic required');
assert(/evtLoadTeamChatMessages/.test(detail), 'load messages logic required');
assert(/evtSendTeamChatMessage/.test(detail), 'send message logic required');
assert(/\.is\('deleted_at', null\)/.test(detail), 'must filter deleted_at on load');
assert(/evtSubscribeTeamChat/.test(detail), 'realtime subscribe required');
assert(/evtCleanupTeamChat/.test(detail), 'realtime cleanup required');
assert(/evtOpenTeamChat/.test(detail), 'evtOpenTeamChat entry required');
assert(/window\.evtOpenTeamChat/.test(detail), 'evtOpenTeamChat exported on window');

assert(/evtOpenTeamChat/.test(detail) && !/Team Chat', 'Coming soon'/.test(detail),
    'Team Chat must not be Coming soon placeholder only');
assert(/not been started yet/i.test(detail), 'host-only not-started message');

assert(!/event_volunteers/.test(detail), 'no volunteers table yet');
assert(!/event_tasks/.test(detail), 'no tasks table yet');

const migrationDir = path.join(root, 'supabase/migrations');
if (fs.existsSync(migrationDir)) {
    for (const file of fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'))) {
        if (file === '093_event_team_chat.sql') continue;
        const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
        assert(!/event_chats/.test(sql), `migration ${file} must not be modified for chat UI`);
    }
}

assert(!/evtOpenTeamChat/.test(portalHtml), 'portal/events.html unchanged');
assert(!/event_chats/.test(portalHtml), 'portal/events.html must not reference event_chats');

pass('Team Chat UI wired in detail.js');
pass('ensure / load / send / deleted_at filter / realtime');
pass('no migration or portal HTML changes');
pass('no volunteers/tasks');

console.log('\nevent team chat UI smoke: all pass');
