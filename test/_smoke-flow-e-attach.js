// Smoke test — §13.9 Flow E attach-later guest → payer Add guest
// Run: node test/_smoke-flow-e-attach.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.9 Flow E migration ───────────────────────────────────────────────');
const mig = read('supabase/migrations/20260902200000_109_event_party_awaiting_attach.sql');
mig.includes('awaiting_attach')
    ? pass('awaiting_attach party status')
    : fail('awaiting_attach missing');
mig.includes('attach_requested')
    ? pass('attach_requested on guest RSVPs')
    : fail('attach_requested missing');

console.log('\n── §13.9 Flow E edges ───────────────────────────────────────────────────');
const guestFree = read('supabase/functions/rsvp-guest-free/index.ts');
guestFree.includes('attach_later') && guestFree.includes('payment_intent')
    ? pass('rsvp-guest-free payment_intent attach_later')
    : fail('rsvp-guest-free missing attach_later');
guestFree.includes('awaiting_attach')
    ? pass('rsvp-guest-free sets awaiting_attach')
    : fail('rsvp-guest-free missing awaiting_attach status');

fs.existsSync(path.join(root, 'supabase/functions/event-party-attach/index.ts'))
    ? pass('event-party-attach function exists')
    : fail('event-party-attach missing');
const attachEdge = read('supabase/functions/event-party-attach/index.ts');
['list_pending', 'attach'].forEach((a) => {
    attachEdge.includes(a) ? pass(`edge action ${a}`) : fail(`edge missing ${a}`);
});

const partyTs = read('supabase/functions/_shared/party-seats.ts');
partyTs.includes('listPendingAttachGuests')
    ? pass('listPendingAttachGuests helper')
    : fail('listPendingAttachGuests missing');
partyTs.includes('attachPendingGuestToMemberParty')
    ? pass('attachPendingGuestToMemberParty helper')
    : fail('attachPendingGuestToMemberParty missing');
partyTs.includes('awaiting_attach')
    ? pass('party-seats PartyStatus includes awaiting_attach')
    : fail('party-seats missing awaiting_attach');

console.log('\n── §13.9 Flow E client ──────────────────────────────────────────────────');
const attachJs = read('js/components/events/attach-guests.js');
attachJs.includes('EventsAttachGuests') && attachJs.includes('guestIntentHtml')
    ? pass('EventsAttachGuests guestIntentHtml')
    : fail('EventsAttachGuests missing');
attachJs.includes('loadAndWire')
    ? pass('EventsAttachGuests loadAndWire')
    : fail('loadAndWire missing');

const rsvp = read('js/events/rsvp.js');
rsvp.includes('payment_intent') && rsvp.includes('attach_later')
    ? pass('public guest sends payment_intent')
    : fail('public guest missing payment_intent');
rsvp.includes('pubMemberAttachGuests') && rsvp.includes('pubLoadPublicMemberAttachGuests')
    ? pass('public member Add guest panel')
    : fail('public member Add guest missing');
rsvp.includes('Request to join')
    ? pass('attach_later CTA copy')
    : fail('attach_later CTA missing');

const sections = read('js/portal/events/detail/sections.js');
sections.includes('portalAttachGuests') && sections.includes('evtLoadAttachGuests')
    ? pass('portal Add guest panel')
    : fail('portal Add guest missing');

read('js/portal/events/main.js').includes('attach-guests.js')
    ? pass('portal main imports attach-guests.js')
    : fail('main.js missing attach-guests import');
read('events/index.html').includes('attach-guests.js?v=169')
    ? pass('events/index.html loads attach-guests v=169')
    : fail('events/index.html missing attach-guests v=169');

console.log('\n── §13.9 ship ───────────────────────────────────────────────────────────');
read('events/index.html').includes('rsvp.js?v=169')
    ? pass('public rsvp.js at v=169')
    : fail('public rsvp not at v=169');
read('pages/portal/events.html').includes('?v=169')
    ? pass('portal events at v=169')
    : fail('portal not at v=169');
read('sw.js').includes('jm-portal-v130')
    ? pass('sw.js jm-portal-v130')
    : fail('sw.js missing jm-portal-v130');
read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md')
    .includes('- [x] **FINAL** — **E** Guest completes form first')
    ? pass('brainstorm line 424 checked')
    : fail('brainstorm line 424 not checked');

console.log(failed ? `\n${failed} check(s) failed.\n` : '\nAll Flow E smoke checks passed.\n');
process.exit(failed ? 1 : 0);
