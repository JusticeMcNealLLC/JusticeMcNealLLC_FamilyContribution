// Smoke checks for Manage Event command-center tabs.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const manageSheet = fs.readFileSync(path.join(root, 'js/portal/events/manage/sheet.js'), 'utf8');
const rsvpPolicy = fs.readFileSync(path.join(root, 'supabase/migrations/090_event_rsvps_admin_delete.sql'), 'utf8');
const participationFn = fs.readFileSync(path.join(root, 'supabase/functions/manage-event-participation/index.ts'), 'utf8');

[
    'Attendance command',
    'Money command',
    'Document handoff',
    'Raffle command',
    'Danger zone',
    'Competition command',
].forEach((marker) => {
    assert(manageSheet.includes(marker), `manage sheet should include ${marker}`);
});

[
    'em-command-card',
    'em-metric-grid',
    'em-section-head',
    'em-attendee-card',
    'em-money-layout',
].forEach((className) => {
    assert(manageSheet.includes(className), `manage sheet should define/use ${className}`);
});

assert(/guestRsvps:\s*\[\]/.test(manageSheet), 'manage state should track guest RSVPs');
assert(/from\('event_guest_rsvps'\)/.test(manageSheet), 'manage sheet should load guest RSVPs');
assert(/guestByToken/.test(manageSheet), 'raffle command view should resolve guest winner names');
assert(/STATE\.event\?\.event_type !== 'competition'/.test(manageSheet), 'non-competition events should skip competition data queries');
assert(/thresholdCopy/.test(manageSheet), 'overview should use normalized threshold copy');
assert(!/9 of 4 required RSVPs/.test(manageSheet), 'manage threshold copy should avoid exceeded-minimum phrasing');
assert(/Invitation QR/.test(manageSheet), 'overview should render a public invitation QR card');
assert(/data-download-invite-qr/.test(manageSheet), 'overview should expose invite QR download action');
assert(/data-share-invite-url/.test(manageSheet), 'overview should expose native invite sharing action');
assert(/navigator\.share/.test(manageSheet), 'invite sharing should use native share when available');
assert(/QR_CODE_SRC/.test(manageSheet) && /_ensureQrCode/.test(manageSheet), 'manage sheet should lazy-load QRCode when the host page does not include it');
assert(/https:\/\/justicemcneal\.com/.test(manageSheet), 'invitation QR should use the production public domain');
assert(/em-sheet-hidden/.test(manageSheet), 'manage sheet should use a dedicated hidden class so responsive display utilities cannot keep it mounted');
assert(/panel\.classList\.add\('pointer-events-auto'/.test(manageSheet), 'manage sheet panel should restore pointer events on open');
assert(/panel\.classList\.add\('pointer-events-none'/.test(manageSheet), 'manage sheet panel should disable pointer events on close');
assert(/Reset test participation/.test(manageSheet), 'danger zone should expose participation reset');
assert(/_resetParticipation/.test(manageSheet), 'manage sheet should implement participation reset action');
assert(participationFn.indexOf("deleteByEvent(supabase, 'event_raffle_winners', eventId)") < participationFn.indexOf("deleteByEvent(supabase, 'event_rsvps', eventId)"), 'participation reset should delete dependent records before RSVPs');
assert(/data-remove-rsvp/.test(manageSheet), 'RSVP tab should expose per-person removal controls');
assert(/data-remove-raffle-entry/.test(manageSheet), 'raffle tab should expose per-entry removal controls');
assert(/does not refund Stripe payments/.test(manageSheet), 'destructive paid cleanup should warn about Stripe refunds');
assert(/rsvps_delete_managed_events/.test(rsvpPolicy), 'member RSVP admin cleanup policy should exist');
assert(/public\.has_permission\('events\.manage_all'\)/.test(rsvpPolicy), 'member RSVP admin cleanup policy should allow event admins');
assert(/event_hosts/.test(rsvpPolicy), 'member RSVP cleanup policy should allow event hosts');
assert(/manage-event-participation/.test(manageSheet), 'cleanup UI should call participation Edge Function');
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(participationFn), 'participation cleanup function should use service-role client');
assert(/remove_rsvp/.test(participationFn), 'participation cleanup function should remove RSVP records');
assert(/deleteByEventColumn\(supabase, 'event_rsvps', eventId, 'user_id', userId\)/.test(participationFn), 'member RSVP cleanup should delete by event/user pair');

console.log('events_010 manage command tabs smoke: all pass');
