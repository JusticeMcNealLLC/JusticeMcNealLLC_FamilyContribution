/**
 * Static smoke: Phase 5C Event Team / Tools (team/tools.js + detail bridge).
 * Run: node test/_smoke-event-team-tools-ui.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const { parseClassicChain, isProductionLoaded, chainOrderOk } = require('./_portal-events-classic-chain.js');
const tools = fs.readFileSync(path.join(root, 'js/portal/events/team/tools.js'), 'utf8');
const detail = fs.readFileSync(path.join(root, 'js/portal/events/detail.js'), 'utf8');
const detailData = fs.readFileSync(path.join(root, 'js/portal/events/detail/data.js'), 'utf8');
const detailSections = fs.readFileSync(path.join(root, 'js/portal/events/detail/sections.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');
const detailRender = detail + '\n' + detailSections;

function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('event team tools UI smoke\n');

assert(/globalThis\.evtOpenTeamToolsPanel\s*=\s*openTeamToolsPanel/.test(tools), 'evtOpenTeamToolsPanel on globalThis');
assert(/evt-cta-floating-shell.*evt-team-tools-overlay/.test(tools), 'desktop team overlay classes');
assert(/globalThis\.evtApplyDesktopTeamToolsOverlay/.test(tools), 'evtApplyDesktopTeamToolsOverlay on globalThis');
assert(/globalThis\.evtInjectTeamToolsStyles/.test(tools), 'evtInjectTeamToolsStyles on globalThis');
assert(/globalThis\.evtEnsureCtaBarShell/.test(tools), 'evtEnsureCtaBarShell on globalThis');
assert(/evt-cta-team|Open event team tools/.test(tools), 'Team button with accessible label');
assert(/Team Chat/.test(tools) && /evtOpenTeamChat/.test(tools), 'Team Chat opens real chat UI');
assert(/RSVP as Myself/.test(tools), 'RSVP as Myself in team tools');
assert(/Enter Raffle/.test(tools), 'Enter Raffle in team tools');
assert(!/RSVP for Raffle/.test(tools), 'no legacy RSVP for Raffle sticky CTA');
assert(/View Ticket/.test(tools), 'View Ticket in team tools');
assert(/Manage Event/.test(tools), 'Manage Event remains available');
assert(/export const teamToolsApi/.test(tools) && /PortalEvents\.team\.tools\s*=\s*teamToolsApi/.test(tools),
    'PortalEvents.team.tools namespace via teamToolsApi');
assert(/function initBottomNav/.test(tools) && /globalThis\.evtInitBottomNav/.test(tools), 'bottom nav in tools.js');

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
assert(isProductionLoaded(portalHtml, classicChain, '../js/portal/events/team/tools.js'),
    'production must load team/tools.js (HTML or classic-chain-loader)');
assert(isProductionLoaded(portalHtml, classicChain, '../js/portal/events/detail/presentation.js'),
    'production must load detail/presentation.js (HTML or classic-chain-loader)');
assert(chainOrderOk(classicChain, 'team/chat.js', 'team/tools.js', 'detail/presentation.js', 'detail.js'),
    'chat → tools → presentation → detail load order');
assert(!/evtOpenTeamToolsPanel/.test(portalHtml), 'portal/events.html must not inline team tools handlers');

assert(/canManageEvents\(\)/.test(detailSections),
    'canManageEvents() still used for host/manage (Phase 5H.2: host controls in detail/sections.js)');
assert(!/canManageEvents\(\)/.test(detail) || /evtBuildDetailHostControlsHtml/.test(detail),
    'canManageEvents() not orphaned — host controls delegated to sections.js');
assert(!/evtCurrentUserRole === 'admin'/.test(detail), 'no legacy admin role checks in detail');
assert(!/detail\.register\('teamChat'/.test(detail), 'no teamChat module registration');
assert(!/PortalEvents\.loadModule/.test(detail), 'no dynamic module loader in detail');

pass('Team/Tools implementation in team/tools.js');
pass('detail.js bridges Team Tools + bottom nav');
pass('HTML load order: chat → tools → presentation → detail');
pass('Host permission model preserved in detail render (data.js + sections.js)');

console.log('\nevent team tools UI smoke: all pass');
