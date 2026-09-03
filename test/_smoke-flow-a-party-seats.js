// Smoke test — §13.9 Flow A payer-owned multi-guest RSVP
// Run: node test/_smoke-flow-a-party-seats.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.9 shared party-seats ───────────────────────────────────────────');
fs.existsSync(path.join(root, 'supabase/functions/_shared/party-seats.ts'))
    ? pass('party-seats.ts exists')
    : fail('party-seats.ts missing');
const partySeatsTs = read('supabase/functions/_shared/party-seats.ts');
partySeatsTs.includes('ensurePartyAndSeats')
    ? pass('ensurePartyAndSeats in Deno module')
    : fail('ensurePartyAndSeats missing');
partySeatsTs.includes('partyBaseTotalCents')
    ? pass('partyBaseTotalCents in Deno module')
    : fail('partyBaseTotalCents missing');

const partySeatsJs = read('js/components/events/party-seats.js');
partySeatsJs.includes('EventsPartySeats')
    ? pass('EventsPartySeats browser component')
    : fail('EventsPartySeats missing');
partySeatsJs.includes('readSeatsFromRoot')
    ? pass('readSeatsFromRoot')
    : fail('readSeatsFromRoot missing');

const helpers = read('js/components/events/helpers.js');
helpers.includes('partyBaseTotalCents')
    ? pass('EventsHelpers.partyBaseTotalCents')
    : fail('partyBaseTotalCents missing from helpers');

console.log('\n── §13.9 edge seats[] ───────────────────────────────────────────────────');
const memberParty = read('supabase/functions/rsvp-member-party/index.ts');
memberParty.includes('seats: rawSeats') || memberParty.includes('normalizePartySeats')
    ? pass('rsvp-member-party accepts seats')
    : fail('rsvp-member-party missing seats');
const guestFree = read('supabase/functions/rsvp-guest-free/index.ts');
guestFree.includes('maybeAttachPartySeats')
    ? pass('rsvp-guest-free multi-seat attach')
    : fail('rsvp-guest-free missing party seats');
const paidPrep = read('supabase/functions/_shared/paid-rsvp-prep.ts');
paidPrep.includes('ensurePartyAndSeats')
    ? pass('paid-rsvp-prep uses ensurePartyAndSeats')
    : fail('paid-rsvp-prep missing ensurePartyAndSeats');
const checkout = read('supabase/functions/create-event-checkout/index.ts');
checkout.includes('partyBaseTotalCents')
    ? pass('create-event-checkout party rollup')
    : fail('create-event-checkout missing party rollup');

console.log('\n── §13.9 portal + public wiring ─────────────────────────────────────────');
const sections = read('js/portal/events/detail/sections.js');
sections.includes('EventsPartySeats')
    ? pass('portal sections.js uses EventsPartySeats')
    : fail('portal sections missing EventsPartySeats');
const engagement = read('js/portal/events/engagement/rsvp.js');
engagement.includes('seats,')
    ? pass('portal engagement sends seats[]')
    : fail('portal engagement missing seats payload');
const rsvpJs = read('js/events/rsvp.js');
rsvpJs.includes('pubReadPartySeats')
    ? pass('public guest pubReadPartySeats')
    : fail('pubReadPartySeats missing');
rsvpJs.includes('seats,')
    ? pass('public guest sends seats[]')
    : fail('public guest missing seats payload');
read('js/portal/events/main.js').includes('party-seats.js')
    ? pass('portal bundle imports party-seats.js')
    : fail('main.js missing party-seats import');
read('events/index.html').includes('party-seats.js?v=166')
    ? pass('public events loads party-seats.js v=166')
    : fail('events/index.html missing party-seats v=166');

console.log('\n── §13.9 cache bump v=166 ───────────────────────────────────────────────');
read('pages/portal/events.html').includes('?v=166')
    ? pass('portal events at v=166')
    : fail('portal events not at v=166');
read('sw.js').includes('jm-portal-v127')
    ? pass('sw.js CACHE_NAME jm-portal-v127')
    : fail('sw.js missing jm-portal-v127');

console.log(failed ? `\n${failed} check(s) failed.\n` : '\nAll Flow A smoke checks passed.\n');
process.exit(failed ? 1 : 0);
