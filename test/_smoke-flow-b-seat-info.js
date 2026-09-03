// Smoke test — §13.9 Flow B seat info-invite
// Run: node test/_smoke-flow-b-seat-info.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.9 Flow B soft validation + mint ─────────────────────────────────');
const partyTs = read('supabase/functions/_shared/party-seats.ts');
partyTs.includes('allowIncompleteGuests')
    ? pass('validatePartySeats allowIncompleteGuests')
    : fail('allowIncompleteGuests missing');
partyTs.includes('mintInfoInviteToken')
    ? pass('mintInfoInviteToken')
    : fail('mintInfoInviteToken missing');
partyTs.includes('seat_info_tokens')
    ? pass('ensurePartyAndSeats returns seat_info_tokens')
    : fail('seat_info_tokens missing from ensure');

const partyJs = read('js/components/events/party-seats.js');
partyJs.includes('allowIncompleteGuests')
    ? pass('browser validate allowIncompleteGuests')
    : fail('browser allowIncompleteGuests missing');
partyJs.includes('Leave blank to send an invite link')
    ? pass('guest invite hint in party form')
    : fail('invite hint missing');

console.log('\n── §13.9 event-seat-info edge ───────────────────────────────────────────');
fs.existsSync(path.join(root, 'supabase/functions/event-seat-info/index.ts'))
    ? pass('event-seat-info function exists')
    : fail('event-seat-info missing');
const seatInfoEdge = read('supabase/functions/event-seat-info/index.ts');
['action === \'get\'', 'action === \'submit\'', 'action === \'list\''].forEach((s) => {
    seatInfoEdge.includes(s) ? pass(`edge ${s}`) : fail(`edge missing ${s}`);
});

read('supabase/functions/rsvp-member-party/index.ts').includes('seat_info_tokens')
    ? pass('rsvp-member-party returns seat_info_tokens')
    : fail('rsvp-member-party missing seat_info_tokens');
read('supabase/functions/rsvp-guest-free/index.ts').includes('seat_info_tokens')
    ? pass('rsvp-guest-free returns seat_info_tokens')
    : fail('rsvp-guest-free missing seat_info_tokens');
read('supabase/functions/create-event-checkout/index.ts').includes('allowIncompleteGuests')
    ? pass('checkout allowIncompleteGuests')
    : fail('checkout missing allowIncompleteGuests');

console.log('\n── §13.9 public page + payer UI ─────────────────────────────────────────');
fs.existsSync(path.join(root, 'events/seat-info/index.html'))
    ? pass('events/seat-info/index.html')
    : fail('seat-info page missing');
fs.existsSync(path.join(root, 'js/events/seat-info.js'))
    ? pass('js/events/seat-info.js')
    : fail('seat-info.js missing');
read('js/components/events/helpers.js').includes('seatInfoInvitesHtml')
    ? pass('EventsHelpers.seatInfoInvitesHtml')
    : fail('seatInfoInvitesHtml missing');
read('js/portal/events/detail/sections.js').includes('evtLoadSeatInfoInvites')
    ? pass('portal evtLoadSeatInfoInvites')
    : fail('portal load invites missing');
read('js/events/rsvp.js').includes('pubLoadGuestSeatInfoInvites')
    ? pass('public pubLoadGuestSeatInfoInvites')
    : fail('public load invites missing');

console.log('\n── §13.9 cache bump v=167 ───────────────────────────────────────────────');
read('pages/portal/events.html').includes('?v=167')
    ? pass('portal events at v=167')
    : fail('portal not at v=167');
read('sw.js').includes('jm-portal-v128')
    ? pass('sw.js jm-portal-v128')
    : fail('sw.js missing jm-portal-v128');
read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md')
    .includes('- [x] **MVP** — **B** Invite link')
    ? pass('brainstorm line 422 checked')
    : fail('brainstorm line 422 not checked');

console.log(failed ? `\n${failed} check(s) failed.\n` : '\nAll Flow B smoke checks passed.\n');
process.exit(failed ? 1 : 0);
