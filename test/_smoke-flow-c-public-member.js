// Smoke test — §13.9 Flow C public member + guest polish
// Run: node test/_smoke-flow-c-public-member.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.9 Flow C public member prep UI ───────────────────────────────────');
const rsvp = read('js/events/rsvp.js');
rsvp.includes('EventsPartySeats') && rsvp.includes('pubMemberParty')
    ? pass('public member uses EventsPartySeats (pubMemberParty)')
    : fail('public member PartySeats missing');
rsvp.includes('pubMemberPhoneInput') && rsvp.includes('pubEnsureMemberPhoneForPublicRsvp')
    ? pass('public member phone + ensure helper')
    : fail('public member phone missing');
rsvp.includes('EventsInvestAck') && rsvp.includes('pubMemberInvest')
    ? pass('public member invest ack wiring')
    : fail('public member invest ack missing');
rsvp.includes('pubMemberNoRefundCheck')
    ? pass('public member no-refund checkbox')
    : fail('public member no-refund missing');
rsvp.includes('pubWirePublicMemberPartyPrep')
    ? pass('pubWirePublicMemberPartyPrep')
    : fail('party prep wire missing');

console.log('\n── §13.9 Flow C public member submit ────────────────────────────────────');
['seats,', 'allowIncompleteGuests: true', 'invest_eligible_acknowledged', 'rsvp-member-party', 'create-event-checkout']
    .forEach((s) => {
        rsvp.includes(s) ? pass(`submit has ${s}`) : fail(`submit missing ${s}`);
    });
rsvp.includes('seat_info_tokens') && rsvp.includes('pubLoadMemberSeatInfoInvites')
    ? pass('seat-info invites after RSVP')
    : fail('member seat-info invites missing');
rsvp.includes('Complete Payment')
    ? pass('Complete Payment label present')
    : fail('Complete Payment label missing');

console.log('\n── §13.9 Flow C guest polish ────────────────────────────────────────────');
rsvp.includes('pubLoadGuestSeatInfoInvites')
    ? pass('pubLoadGuestSeatInfoInvites')
    : fail('guest invite load missing');
rsvp.includes('pubGuestSeatInfoInvites') || rsvp.includes('guest_token')
    ? pass('guest confirmation + guest_token path symbols')
    : fail('guest confirmation symbols missing');
rsvp.includes('audience: \'guest\'') || rsvp.includes("audience: 'guest'")
    ? pass('guest party-total CTA labels via rsvpPayButtonLabel')
    : fail('guest Complete Payment / party-total labels missing');

console.log('\n── §13.9 assets + brainstorm ────────────────────────────────────────────');
const eventsHtml = read('events/index.html');
eventsHtml.includes('invest-ack.js?v=168')
    ? pass('events/index.html loads invest-ack.js v=168')
    : fail('invest-ack.js not loaded at v=168');
eventsHtml.includes('rsvp.js?v=168')
    ? pass('public rsvp.js at v=168')
    : fail('public rsvp not at v=168');
read('pages/portal/events.html').includes('?v=168')
    ? pass('portal events at v=168')
    : fail('portal not at v=168');
read('sw.js').includes('jm-portal-v129')
    ? pass('sw.js jm-portal-v129')
    : fail('sw.js missing jm-portal-v129');
read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md')
    .includes('- [x] **FINAL** — **C** Self-pay guest/member independent RSVP polish')
    ? pass('brainstorm line 423 checked')
    : fail('brainstorm line 423 not checked');

console.log(failed ? `\n${failed} check(s) failed.\n` : '\nAll Flow C smoke checks passed.\n');
process.exit(failed ? 1 : 0);
