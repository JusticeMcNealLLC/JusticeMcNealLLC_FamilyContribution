// Smoke checks for Manage Event command-center tabs.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const manageSheet = fs.readFileSync(path.join(root, 'js/portal/events/manage/sheet.js'), 'utf8');

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
assert(/https:\/\/justicemcneal\.com/.test(manageSheet), 'invitation QR should use the production public domain');

console.log('events_010 manage command tabs smoke: all pass');
