// Smoke test — §13.12 capacity_mode runtime MVP
// Run: node test/_smoke-event-capacity-mode.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.12 capacity helpers (edge) ───────────────────────────────────────');
const pricing = read('supabase/functions/_shared/event-pricing.ts');
pricing.includes('eventHasCapacityLimit')
    && pricing.includes('eventCapacityMode')
    && pricing.includes("mode === 'soft'")
    ? pass('event-pricing capacity mode helpers')
    : fail('edge pricing helpers missing');

const seats = read('supabase/functions/_shared/party-seats.ts');
seats.includes('countOccupiedCapacity')
    && seats.includes('assertCapacityForIncomingSeats')
    && seats.includes('eventHasCapacityLimit')
    ? pass('party-seats occupied + assert helpers')
    : fail('party-seats capacity helpers missing');

console.log('\n── §13.12 edge enforcement ──────────────────────────────────────────────');
const checkout = read('supabase/functions/create-event-checkout/index.ts');
checkout.includes('assertCapacityForIncomingSeats')
    && !checkout.includes('if (event.max_participants)')
    ? pass('create-event-checkout uses mode-aware assert')
    : fail('create-event-checkout still max-only');

const guestFree = read('supabase/functions/rsvp-guest-free/index.ts');
guestFree.includes('assertCapacityForIncomingSeats')
    ? pass('rsvp-guest-free uses assertCapacityForIncomingSeats')
    : fail('rsvp-guest-free missing assert');

const memberParty = read('supabase/functions/rsvp-member-party/index.ts');
memberParty.includes('assertCapacityForIncomingSeats')
    ? pass('rsvp-member-party asserts capacity')
    : fail('rsvp-member-party missing capacity assert');

const waitlist = read('supabase/functions/manage-event-waitlist/index.ts');
waitlist.includes("capacity_mode', 'soft'")
    || waitlist.includes("eq('capacity_mode', 'soft')")
    ? pass('manage-event-waitlist soft-only advance')
    : fail('waitlist not soft-gated');
waitlist.includes("eventCapacityMode(event) !== 'soft'")
    || waitlist.includes("!== 'soft'")
    ? pass('offerNextSpot requires soft capacity')
    : fail('offerNextSpot soft check missing');

console.log('\n── §13.12 client UI ─────────────────────────────────────────────────────');
const capJs = read('js/components/events/capacity.js');
capJs.includes('eventHasCapacityLimit')
    && capJs.includes('EventsCapacity')
    ? pass('EventsCapacity client helper')
    : fail('capacity.js missing');

const data = read('js/portal/events/detail/data.js');
data.includes('EventsCapacity')
    && data.includes('eventIsAtCapacity')
    ? pass('detail eventIsFull uses EventsCapacity')
    : fail('detail data still LLC+max only');

const sections = read('js/portal/events/detail/sections.js');
sections.includes("mode !== 'soft'")
    || sections.includes("!== 'soft'")
    ? pass('waitlist UI soft-only')
    : fail('waitlist UI not soft-gated');

const pub = read('js/events/index.js');
pub.includes('eventHasCapacityLimit')
    ? pass('public spots left gated by capacity mode')
    : fail('public index still max-only');

const html = read('pages/portal/events.html');
html.includes('events.bundle.js?v=182')
    ? pass('bundle ?v=182')
    : fail('bundle not bumped to 182');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('EventsCapacity')
    && bundle.includes('eventHasCapacityLimit')
    ? pass('events.bundle includes EventsCapacity')
    : fail('bundle missing EventsCapacity');

console.log('\n── §13.12 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Capacity behavior matches create setting (Colorado: none)')
    ? pass('brainstorm line 459 checked')
    : fail('brainstorm 459 not checked');

const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
(contracts.includes('capacity_mode') && contracts.includes('§13.12 line 459'))
    || contracts.includes('Capacity behavior')
    ? pass('004 notes capacity mode runtime')
    : fail('004 missing capacity note');

console.log(`\n${failed === 0 ? 'event capacity mode smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
