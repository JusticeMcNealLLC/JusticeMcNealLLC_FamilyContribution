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
assert(/window\.evtOpenTeamToolsPanel/.test(detail), 'evtOpenTeamToolsPanel should be exported on window');
assert(/evt-cta-team|Open event team tools/.test(detail), 'Team button with accessible label');
assert(/Team Chat/.test(detail) && /Coming soon/.test(detail), 'Team Chat placeholder');
assert(/RSVP as Myself/.test(detail), 'RSVP as Myself in team tools');
assert(/Enter Raffle/.test(detail), 'Enter Raffle in team tools');
assert(/View Ticket/.test(detail), 'View Ticket in team tools');
assert(/Manage Event/.test(detail), 'Manage Event remains available');

// Split manage vs personal paths
assert(/canManageEvent/.test(detail), 'canManageEvent separates manage permissions');
assert(/canAccessTeamHub/.test(detail), 'canAccessTeamHub for team tools access');
assert(/isHost = canManageEvent/.test(detail), 'isHost still maps to canManageEvent');

// Host mobile: Manage + Team
assert(/evt-cta-manage/.test(detail) && /evt-cta-team/.test(detail), 'mobile CTA: Manage and Team for hosts');
assert(/secondaryBtn = teamBtn/.test(detail), 'Team is secondary when host has Manage primary');

// No chat DB / migrations / portal HTML edits in this phase
assert(!/event_chats/.test(detail), 'detail.js must not reference event_chats');
const migrationDir = path.join(root, 'supabase/migrations');
if (fs.existsSync(migrationDir)) {
    const migrations = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
    for (const file of migrations) {
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
pass('Team Chat is placeholder only');
pass('Manage Event + personal actions reachable via team tools');
pass('No event_chats / migration / portal HTML changes');
pass('Host permission model preserved');

console.log('\nevent team tools UI smoke: all pass');
