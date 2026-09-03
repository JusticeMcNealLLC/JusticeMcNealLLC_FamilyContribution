// Smoke test — §13.9 host roster party links
// Run: node test/_smoke-flow-host-roster-party.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.9 manage load parties/seats ──────────────────────────────────────');
const sheet = read('js/portal/events/manage/sheet.js');
sheet.includes('event_parties') && sheet.includes('STATE.parties')
    ? pass('sheet.js loads event_parties')
    : fail('sheet.js missing parties load');
sheet.includes('event_seats') && sheet.includes('STATE.seats')
    ? pass('sheet.js loads event_seats')
    : fail('sheet.js missing seats load');
sheet.includes('party_id') && sheet.includes('attach_requested')
    ? pass('RSVP selects include party_id / attach_requested')
    : fail('RSVP selects missing party fields');

console.log('\n── §13.9 roster UI ──────────────────────────────────────────────────────');
const rsvps = read('js/portal/events/manage/rsvps.js');
['Paid by:', 'Sizes pending', 'Pays for party', 'Waiting for payer', 'seatInfoInvitesHtml', 'wireSeatInfoInviteCopy', 'Party seats']
    .forEach((s) => {
        rsvps.includes(s) ? pass(`rsvps.js has ${s}`) : fail(`rsvps.js missing ${s}`);
    });

console.log('\n── §13.9 ship ───────────────────────────────────────────────────────────');
read('pages/portal/events.html').includes('?v=171')
    ? pass('portal events at v=171')
    : fail('portal not at v=171');
read('sw.js').includes('jm-portal-v132')
    ? pass('sw.js jm-portal-v132')
    : fail('sw.js missing jm-portal-v132');
read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md')
    .includes('- [x] **FINAL** — Host roster shows party links')
    ? pass('brainstorm line 430 checked')
    : fail('brainstorm line 430 not checked');

console.log(failed ? `\n${failed} check(s) failed.\n` : '\nAll host roster party-link smoke checks passed.\n');
process.exit(failed ? 1 : 0);
