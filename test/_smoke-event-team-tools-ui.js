/**
 * Static smoke: Phase 5C Event Team / Tools (team/tools.js + detail bridge).
 * Run: node test/_smoke-event-team-tools-ui.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const tools = fs.readFileSync(path.join(root, 'js/portal/events/team/tools.js'), 'utf8');
const detail = fs.readFileSync(path.join(root, 'js/portal/events/detail.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');

function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('event team tools UI smoke\n');

assert(/window\.evtOpenTeamToolsPanel\s*=\s*openTeamToolsPanel/.test(tools), 'evtOpenTeamToolsPanel on window');
assert(/evt-cta-floating-shell.*evt-team-tools-overlay/.test(tools), 'desktop team overlay classes');
assert(/window\.evtApplyDesktopTeamToolsOverlay/.test(tools), 'evtApplyDesktopTeamToolsOverlay on window');
assert(/window\.evtInjectTeamToolsStyles/.test(tools), 'evtInjectTeamToolsStyles on window');
assert(/window\.evtEnsureCtaBarShell/.test(tools), 'evtEnsureCtaBarShell on window');
assert(/evt-cta-team|Open event team tools/.test(tools), 'Team button with accessible label');
assert(/Team Chat/.test(tools) && /evtOpenTeamChat/.test(tools), 'Team Chat opens real chat UI');
assert(/RSVP as Myself/.test(tools), 'RSVP as Myself in team tools');
assert(/Enter Raffle/.test(tools), 'Enter Raffle in team tools');
assert(!/RSVP for Raffle/.test(tools), 'no legacy RSVP for Raffle sticky CTA');
assert(/View Ticket/.test(tools), 'View Ticket in team tools');
assert(/Manage Event/.test(tools), 'Manage Event remains available');
assert(/PortalEvents\.team\.tools/.test(tools), 'PortalEvents.team.tools namespace');
assert(/function initBottomNav/.test(tools) && /window\.evtInitBottomNav/.test(tools), 'bottom nav in tools.js');

assert(/canManageEvent/.test(detail), 'canManageEvent in detail render path');
assert(/canAccessTeamHub/.test(detail), 'canAccessTeamHub for team tools access');
assert(/isHost = canManageEvent/.test(detail), 'isHost still maps to canManageEvent');
assert(/evtOpenTeamToolsPanel/.test(detail), 'detail render still calls evtOpenTeamToolsPanel');
assert(/detail\.openTeamToolsPanel\s*=\s*window\.evtOpenTeamToolsPanel/.test(detail), 'detail bridges openTeamToolsPanel');
assert(/detail\.initBottomNav\s*=\s*window\.evtInitBottomNav/.test(detail), 'detail bridges initBottomNav');
assert(!/function evtOpenTeamToolsPanel/.test(detail), 'implementation not in detail.js');
assert(!/function evtBuildTeamToolsPanelHtml/.test(detail), 'panel builder not in detail.js');

const migrationDir = path.join(root, 'supabase/migrations');
if (fs.existsSync(migrationDir)) {
    for (const file of fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'))) {
        if (file === '093_event_team_chat.sql') continue;
        const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
        assert(!/event_chats/.test(sql), `migration ${file} must not add event_chats`);
    }
}

const chatTag = 'src="../js/portal/events/team/chat.js"';
const toolsTag = 'src="../js/portal/events/team/tools.js"';
const detailTag = 'src="../js/portal/events/detail.js"';
const chatIdx = portalHtml.indexOf(chatTag);
const toolsIdx = portalHtml.indexOf(toolsTag);
const detailIdx = portalHtml.indexOf(detailTag);
assert(toolsIdx >= 0, 'portal/events.html must load team/tools.js');
assert(chatIdx < toolsIdx && toolsIdx < detailIdx, 'chat → tools → detail load order');
assert(!/evtOpenTeamToolsPanel/.test(portalHtml), 'portal/events.html must not inline team tools handlers');

assert(/canManageEvents\(\)/.test(detail), 'canManageEvents() still used for host/manage');
assert(!/evtCurrentUserRole === 'admin'/.test(detail), 'no legacy admin role checks in detail');
assert(!/detail\.register\('teamChat'/.test(detail), 'no teamChat module registration');
assert(!/PortalEvents\.loadModule/.test(detail), 'no dynamic module loader in detail');

pass('Team/Tools implementation in team/tools.js');
pass('detail.js bridges Team Tools + bottom nav');
pass('HTML load order: chat → tools → detail');
pass('Host permission model preserved in detail render');

console.log('\nevent team tools UI smoke: all pass');
