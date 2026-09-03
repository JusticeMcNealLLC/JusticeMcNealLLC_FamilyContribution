// Smoke test — §13.8 MVP require phone on RSVP
// Run: node test/_smoke-rsvp-phone-required.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.8 shared helpers ─────────────────────────────────────────────────');
const helpers = read('js/components/events/helpers.js');
helpers.includes('function validatePhone(')
    ? pass('EventsHelpers.validatePhone present')
    : fail('validatePhone missing from helpers.js');
fs.existsSync(path.join(root, 'supabase/functions/_shared/rsvp-contact.ts'))
    ? pass('rsvp-contact.ts exists')
    : fail('rsvp-contact.ts missing');
fs.existsSync(path.join(root, 'supabase/migrations/20260901160000_107_event_guest_rsvps_phone.sql'))
    ? pass('migration 107 exists')
    : fail('migration 107 missing');

console.log('\n── §13.8 public guest ───────────────────────────────────────────────────');
const rsvpJs = read('js/events/rsvp.js');
const indexJs = read('js/events/index.js');
const bodyJs = read('js/events/body.js');
const publicHtml = read('events/index.html');

indexJs.includes('guestPhoneInput') && !indexJs.includes('Phone number (optional)')
    ? pass('index.js guest phone required (no optional label)')
    : fail('index.js still has optional phone copy');
publicHtml.includes('id="guestPhoneInput"') && !publicHtml.includes('optional')
    ? pass('events/index.html has required guest phone field')
    : fail('events/index.html missing required guest phone');
rsvpJs.includes('pubValidateGuestPhone')
    ? pass('rsvp.js validates guest phone')
    : fail('pubValidateGuestPhone missing');
bodyJs.includes('placeholder="Phone number"') && !bodyJs.includes('optional')
    ? pass('body.js CTA phone required')
    : fail('body.js CTA phone still optional');

console.log('\n── §13.8 portal member ──────────────────────────────────────────────────');
const sections = read('js/portal/events/detail/sections.js');
const engagement = read('js/portal/events/engagement/rsvp.js');

sections.includes('evtMemberPhoneInput')
    ? pass('sections.js member phone input')
    : fail('evtMemberPhoneInput missing from sections.js');
engagement.includes('evtEnsureMemberPhoneForRsvp')
    ? pass('engagement/rsvp.js ensures member phone')
    : fail('evtEnsureMemberPhoneForRsvp missing');

console.log('\n── §13.8 edge enforcement ───────────────────────────────────────────────');
const guestFree = read('supabase/functions/rsvp-guest-free/index.ts');
const checkout = read('supabase/functions/create-event-checkout/index.ts');
const memberParty = read('supabase/functions/rsvp-member-party/index.ts');
const included = read('supabase/functions/_shared/included-items.ts');

guestFree.includes('requirePhone')
    ? pass('rsvp-guest-free requires phone')
    : fail('rsvp-guest-free missing requirePhone');
checkout.includes('requireMemberPhone')
    ? pass('create-event-checkout requires member phone')
    : fail('create-event-checkout missing requireMemberPhone');
memberParty.includes('requireMemberPhone')
    ? pass('rsvp-member-party requires member phone')
    : fail('rsvp-member-party missing requireMemberPhone');
included.includes('phone?:')
    ? pass('ensurePartyAndSeat accepts phone')
    : fail('included-items missing phone on seat');

console.log(`\n${failed === 0 ? 'rsvp phone required smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
