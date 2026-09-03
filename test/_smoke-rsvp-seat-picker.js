// Smoke test — §13.8 MVP adult/kid seat picker
// Run: node test/_smoke-rsvp-seat-picker.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.8 seat picker helpers ────────────────────────────────────────────');
const helpers = read('js/components/events/helpers.js');
helpers.includes('function seatPriceCents(')
    ? pass('EventsHelpers.seatPriceCents present')
    : fail('seatPriceCents missing from helpers.js');
fs.existsSync(path.join(root, 'js/components/events/seat-picker.js'))
    ? pass('seat-picker.js exists')
    : fail('seat-picker.js missing');
fs.existsSync(path.join(root, 'supabase/functions/_shared/event-pricing.ts'))
    ? pass('event-pricing.ts exists')
    : fail('event-pricing.ts missing');

const seatPicker = read('js/components/events/seat-picker.js');
seatPicker.includes('readRoleFromRoot')
    ? pass('EventsSeatPicker.readRoleFromRoot')
    : fail('readRoleFromRoot missing');

console.log('\n── §13.8 portal prep UI ─────────────────────────────────────────────────');
const sections = read('js/portal/events/detail/sections.js');
const engagement = read('js/portal/events/engagement/rsvp.js');

sections.includes('EventsSeatPicker')
    ? pass('sections.js renders seat picker')
    : fail('sections.js missing EventsSeatPicker');
sections.includes('evtWireSeatPickerPrep')
    ? pass('sections.js wires seat picker on role change')
    : fail('evtWireSeatPickerPrep missing');
engagement.includes('seat_role')
    ? pass('engagement/rsvp.js sends seat_role')
    : fail('engagement/rsvp.js missing seat_role');
engagement.includes('evtReadSeatRoleFromDetail')
    ? pass('engagement reads seat role from detail')
    : fail('evtReadSeatRoleFromDetail missing');

console.log('\n── §13.8 public guest/member ────────────────────────────────────────────');
const rsvpJs = read('js/events/rsvp.js');
const indexJs = read('js/events/index.js');
const bodyJs = read('js/events/body.js');
const publicHtml = read('events/index.html');

indexJs.includes('guestSeatPicker')
    ? pass('index.js guest seat picker placeholder')
    : fail('index.js missing guestSeatPicker');
publicHtml.includes('guestSeatPicker')
    ? pass('events/index.html guest seat picker placeholder')
    : fail('events/index.html missing guestSeatPicker');
publicHtml.includes('seat-picker.js?v=163')
    ? pass('events/index.html loads seat-picker.js')
    : fail('events/index.html missing seat-picker.js');
rsvpJs.includes('pubReadSeatRole')
    ? pass('rsvp.js pubReadSeatRole')
    : fail('pubReadSeatRole missing');
rsvpJs.includes('seat_role')
    ? pass('rsvp.js sends seat_role in payloads')
    : fail('rsvp.js missing seat_role');
bodyJs.includes('ctaGuestSeatPicker')
    ? pass('body.js CTA seat picker placeholder')
    : fail('body.js missing ctaGuestSeatPicker');

console.log('\n── §13.8 edge enforcement ─────────────────────────────────────────────────');
const guestFree = read('supabase/functions/rsvp-guest-free/index.ts');
const checkout = read('supabase/functions/create-event-checkout/index.ts');
const memberParty = read('supabase/functions/rsvp-member-party/index.ts');
const webhook = read('supabase/functions/stripe-webhook/index.ts');

guestFree.includes('seat_role')
    ? pass('rsvp-guest-free accepts seat_role')
    : fail('rsvp-guest-free missing seat_role');
guestFree.includes('seatRole')
    ? pass('rsvp-guest-free passes seatRole to ensurePartyAndSeat')
    : fail('rsvp-guest-free missing seatRole');
checkout.includes('seatPriceCents')
    ? pass('create-event-checkout uses seatPriceCents')
    : fail('create-event-checkout missing seatPriceCents');
checkout.includes('metadata.seat_role')
    ? pass('create-event-checkout metadata seat_role')
    : fail('checkout missing metadata.seat_role');
memberParty.includes('seat_role')
    ? pass('rsvp-member-party accepts seat_role')
    : fail('rsvp-member-party missing seat_role');
webhook.includes('seatRole')
    ? pass('stripe-webhook passes seatRole')
    : fail('stripe-webhook missing seatRole');

console.log('\n── §13.8 cache bump ─────────────────────────────────────────────────────');
publicHtml.includes('?v=163')
    ? pass('public events assets at v=161')
    : fail('public events not at v=161');
read('pages/portal/events.html').includes('?v=163')
    ? pass('portal events at v=161')
    : fail('portal events not at v=161');

console.log(`\n${failed === 0 ? 'rsvp seat picker smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
