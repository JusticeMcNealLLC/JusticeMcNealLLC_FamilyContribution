/**
 * Static smoke: Phase 5B Event Team Chat UI (team/chat.js + detail bridge).
 * Run: node test/_smoke-event-team-chat-ui.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const chat = fs.readFileSync(path.join(root, 'js/portal/events/team/chat.js'), 'utf8');
const detail = fs.readFileSync(path.join(root, 'js/portal/events/detail.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');

function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('event team chat UI smoke\n');

assert(/event_chats/.test(chat), 'team/chat.js should use event_chats');
assert(/event_chat_messages/.test(chat), 'team/chat.js should use event_chat_messages');
assert(/ensureChat/.test(chat), 'ensure-chat logic required');
assert(/loadMessages/.test(chat), 'load messages logic required');
assert(/async function send/.test(chat), 'send message logic required');
assert(/\.is\('deleted_at', null\)/.test(chat), 'must filter deleted_at on load');
assert(/function subscribe/.test(chat), 'realtime subscribe required');
assert(/function cleanup/.test(chat), 'realtime cleanup required');
assert(/async function open/.test(chat), 'open entry required');
assert(/window\.evtOpenTeamChat\s*=\s*open/.test(chat), 'evtOpenTeamChat exported on window');
assert(/window\.evtSendTeamChatMessage\s*=\s*send/.test(chat), 'evtSendTeamChatMessage exported on window');
assert(/window\.evtCleanupTeamChat\s*=\s*cleanup/.test(chat), 'evtCleanupTeamChat exported on window');
assert(/PortalEvents\.team\.chat/.test(chat), 'PortalEvents.team.chat namespace required');

assert(/evtOpenTeamChat/.test(detail) && !/Team Chat', 'Coming soon'/.test(detail),
    'Team Chat must not be Coming soon placeholder only');
assert(/not been started yet/i.test(chat), 'host-only not-started message');
assert(/detail\.openTeamChat\s*=\s*window\.evtOpenTeamChat/.test(detail),
    'detail.js must bridge openTeamChat to team/chat.js');
assert(/evtOpenTeamChat\('/.test(detail), 'detail.js Team Tools row still calls evtOpenTeamChat');

assert(!/event_volunteers/.test(chat), 'no volunteers table yet');
assert(!/event_tasks/.test(chat), 'no tasks table yet');

const migrationDir = path.join(root, 'supabase/migrations');
if (fs.existsSync(migrationDir)) {
    for (const file of fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'))) {
        if (file === '093_event_team_chat.sql') continue;
        const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
        assert(!/event_chats/.test(sql), `migration ${file} must not be modified for chat UI`);
    }
}

const chatTag = 'src="../js/portal/events/team/chat.js"';
const detailTag = 'src="../js/portal/events/detail.js"';
const chatIdx = portalHtml.indexOf(chatTag);
const detailIdx = portalHtml.indexOf(detailTag);
assert(chatIdx >= 0, 'portal/events.html must load team/chat.js');
assert(detailIdx >= 0, 'portal/events.html must load detail.js');
assert(chatIdx < detailIdx, 'team/chat.js must load before detail.js');
assert(!/type="module"/.test(portalHtml.match(/team\/chat\.js[^>]*/)?.[0] || ''),
    'team/chat.js must not use type=module');

const initIdx = portalHtml.indexOf('src="../js/portal/events/init.js"');
const chatScriptIdx = portalHtml.lastIndexOf(chatTag);
assert(initIdx > chatScriptIdx, 'init.js must remain after team/chat.js');

pass('Team Chat UI wired in team/chat.js');
pass('ensure / load / send / deleted_at filter / realtime');
pass('detail.js bridges openTeamChat; HTML load order correct');
pass('no migration changes; no volunteers/tasks');

console.log('\nevent team chat UI smoke: all pass');
