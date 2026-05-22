/**
 * Static smoke: Phase 2 Event Team / Tools action surface (portal detail).
 * Run: node test/_smoke-event-team-tools-ui.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const detail = fs.readFileSync(path.join(root, 'js/portal/events/detail.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');

function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { throw new Error(msg); }

console.log('event team tools UI smoke\n');

// Team / Tools surface in detail.js
assert(/evtOpenTeamToolsPanel/.test(detail), 'detail.js should define evtOpenTeamToolsPanel');
assert(/evtApplyDesktopTeamToolsOverlay/.test(detail), 'detail.js should upgrade desktop CTA bar for team overlay');
assert(/evt-cta-floating-shell.*evt-team-tools-overlay/.test(detail), 'desktop team open should apply overlay classes');
assert(/window\.evtOpenTeamToolsPanel/.test(detail), 'evtOpenTeamToolsPanel should be exported on window');
assert(/evt-cta-team|Open event team tools/.test(detail), 'Team button with accessible label');
assert(/Team Chat/.test(detail) && /evtOpenTeamChat/.test(detail), 'Team Chat opens real chat UI');
assert(/RSVP as Myself/.test(detail), 'RSVP as Myself in team tools');
assert(/Enter Raffle/.test(detail), 'Enter Raffle in team tools');
assert(!/RSVP for Raffle/.test(detail), 'no legacy RSVP for Raffle sticky CTA');
assert(/View Ticket/.test(detail), 'View Ticket in team tools');
assert(/Manage Event/.test(detail), 'Manage Event remains available');

// Split manage vs personal paths
assert(/canManageEvent/.test(detail), 'canManageEvent separates manage permissions');
assert(/canAccessTeamHub/.test(detail), 'canAccessTeamHub for team tools access');
assert(/isHost = canManageEvent/.test(detail), 'isHost still maps to canManageEvent');

// Host mobile: Manage + Team
assert(/evt-cta-manage/.test(detail) && /evt-cta-team/.test(detail), 'mobile CTA: Manage and Team for hosts');
assert(/secondaryBtn = teamBtn/.test(detail), 'Team is secondary when host has Manage primary');

// Chat tables only in 093 migration + detail.js UI (Phase 4)
const migrationDir = path.join(root, 'supabase/migrations');
if (fs.existsSync(migrationDir)) {
    const migrations = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
    for (const file of migrations) {
        if (file === '093_event_team_chat.sql') continue;
        const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
        assert(!/event_chats/.test(sql), `migration ${file} must not add event_chats`);
    }
}
assert(!/evtOpenTeamToolsPanel/.test(portalHtml), 'portal/events.html unchanged for team tools');
assert(!/canAccessTeamHub/.test(portalHtml), 'portal/events.html should not embed team hub logic');

// Coordinator / manage permissions preserved
assert(/canManageEvents\(\)/.test(detail), 'canManageEvents() still used for host/manage');
assert(!/evtCurrentUserRole === 'admin'/.test(detail), 'no legacy admin role checks in detail');

// Phase 5 module-entry not started
assert(!/detail\.register\('teamChat'/.test(detail), 'no teamChat module registration');
assert(!/PortalEvents\.loadModule/.test(detail), 'no dynamic module loader in detail');

pass('Team/Tools panel logic present in detail.js');
pass('Team Chat opens from Team tools');
pass('Manage Event + personal actions reachable via team tools');
pass('Portal HTML unchanged; chat schema only in 093 + detail.js');
pass('Host permission model preserved');

console.log('\nevent team tools UI smoke: all pass');
