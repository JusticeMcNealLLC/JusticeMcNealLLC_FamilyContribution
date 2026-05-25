/**
 * Static smoke: Phase 5C Event Team / Tools (team sheet + tools-list + cta-bar).
 * Run: node test/_smoke-event-team-tools-ui.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const { parseClassicChain, isProductionLoaded, chainOrderOk } = require('./_portal-events-classic-chain.js');
const uiTw = fs.readFileSync(path.join(root, 'js/portal/events/team/ui-tw.js'), 'utf8');
const sheet = fs.readFileSync(path.join(root, 'js/portal/events/team/sheet.js'), 'utf8');
const toolsList = fs.readFileSync(path.join(root, 'js/portal/events/team/tools-list.js'), 'utf8');
const ctaBar = fs.readFileSync(path.join(root, 'js/portal/events/team/cta-bar.js'), 'utf8');
const detail = fs.readFileSync(path.join(root, 'js/portal/events/detail.js'), 'utf8');
const detailData = fs.readFileSync(path.join(root, 'js/portal/events/detail/data.js'), 'utf8');
const detailSections = fs.readFileSync(path.join(root, 'js/portal/events/detail/sections.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');
const detailRender = detail + '\n' + detailSections;

function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('event team tools UI smoke\n');

assert(/globalThis\.evtOpenTeamToolsPanel/.test(sheet), 'evtOpenTeamToolsPanel on globalThis via sheet.js');
assert(/globalThis\.EventsTeam\s*=/.test(sheet), 'EventsTeam orchestrator in sheet.js');
assert(/evt-cta-team|Open event team tools/.test(ctaBar), 'Team button with accessible label');
assert(/Team Chat/.test(toolsList) && /EventsTeam\.open/.test(toolsList), 'Team Chat opens via EventsTeam sheet');
assert(/RSVP as Myself/.test(toolsList), 'RSVP as Myself in team tools');
assert(/Enter Raffle/.test(toolsList), 'Enter Raffle in team tools');
assert(!/RSVP for Raffle/.test(toolsList), 'no legacy RSVP for Raffle sticky CTA');
assert(/View Ticket/.test(toolsList), 'View Ticket in team tools');
assert(/Manage Event/.test(toolsList), 'Manage Event remains available');
assert(/em-op-grid/.test(toolsList) && /em-op-card/.test(toolsList), 'manage-style op cards');
assert(/export const teamToolsListApi/.test(toolsList), 'teamToolsListApi export');
assert(/function initBottomNav/.test(ctaBar) && /globalThis\.evtInitBottomNav/.test(ctaBar), 'bottom nav in cta-bar.js');

assert(/canManageEvent/.test(detail), 'canManageEvent in detail render path');
assert(/canAccessTeamHub/.test(detail), 'canAccessTeamHub for team tools access');
assert(/isHost = canManageEvent/.test(detail) || /isHost = canManageEvent/.test(detailData),
    'isHost still maps to canManageEvent (detail.js or detail/data.js)');
assert(/evtOpenTeamToolsPanel/.test(detailRender),
    'detail render still calls evtOpenTeamToolsPanel (detail.js or detail/sections.js after 5H.2)');
assert(/detail\.openTeamToolsPanel\s*=\s*globalThis\.evtOpenTeamToolsPanel/.test(detail)
    || /detail\.openTeamToolsPanel\s*=\s*window\.evtOpenTeamToolsPanel/.test(detail),
    'detail bridges openTeamToolsPanel');
assert(/detail\.initBottomNav\s*=\s*globalThis\.evtInitBottomNav/.test(detail)
    || /detail\.initBottomNav\s*=\s*window\.evtInitBottomNav/.test(detail),
    'detail bridges initBottomNav');
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

const classicChain = parseClassicChain(root);
assert(isProductionLoaded(portalHtml, classicChain, '../js/portal/events/detail/presentation.js'),
    'production must load detail/presentation.js (HTML or classic-chain-loader)');
assert(chainOrderOk(classicChain, 'team/chat.js', 'detail/presentation.js', 'detail.js'),
    'chat → presentation → detail load order');
assert(!/evtOpenTeamToolsPanel/.test(portalHtml), 'portal/events.html must not inline team tools handlers');

assert(/canManageEvents\(\)/.test(detailSections),
    'canManageEvents() still used for host/manage (Phase 5H.2: host controls in detail/sections.js)');
assert(!/canManageEvents\(\)/.test(detail) || /evtBuildDetailHostControlsHtml/.test(detail),
    'canManageEvents() not orphaned — host controls delegated to sections.js');
assert(!/evtCurrentUserRole === 'admin'/.test(detail), 'no legacy admin role checks in detail');
assert(!/detail\.register\('teamChat'/.test(detail), 'no teamChat module registration');
assert(!/PortalEvents\.loadModule/.test(detail), 'no dynamic module loader in detail');

pass('Team/Tools split across sheet.js, tools-list.js, cta-bar.js');
pass('detail.js bridges Team Tools + bottom nav');
pass('HTML load order: chat → presentation → detail');
pass('Host permission model preserved in detail render (data.js + sections.js)');

console.log('\nevent team tools UI smoke: all pass');
