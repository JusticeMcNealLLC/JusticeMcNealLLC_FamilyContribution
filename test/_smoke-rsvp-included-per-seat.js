// Smoke test — §13.8 MVP included options per seat
// Run: node test/_smoke-rsvp-included-per-seat.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.8 included helpers ───────────────────────────────────────────────');
const included = read('js/components/events/included-items.js');
included.includes('function hasCatalog(')
    ? pass('EventsIncludedItems.hasCatalog present')
    : fail('hasCatalog missing');
included.includes('function seatOptionsTitle(')
    ? pass('EventsIncludedItems.seatOptionsTitle present')
    : fail('seatOptionsTitle missing');
included.includes('function defaultSeatRoleForCatalog(')
    ? pass('EventsIncludedItems.defaultSeatRoleForCatalog present')
    : fail('defaultSeatRoleForCatalog missing');
included.includes('seatOptionsTitle(role)')
    ? pass('formFieldsHtml uses seatOptionsTitle')
    : fail('formFieldsHtml not using seatOptionsTitle');
included.includes('ed-inc-chip')
    && included.includes('wireChoiceControls')
    ? pass('size/color chips + wireChoiceControls')
    : fail('chips/swatches UX missing');

const party = read('js/components/events/party-seats.js');
party.includes('hidePayerName')
    ? pass('party-seats hidePayerName for guest contact sync')
    : fail('hidePayerName missing');

console.log('\n── §13.8 client routing (event-level catalog gate) ───────────────────────');
const engagement = read('js/portal/events/engagement/rsvp.js');
const rsvpJs = read('js/events/rsvp.js');
const sections = read('js/portal/events/detail/sections.js');

engagement.includes('hasIncludedCatalog')
    ? pass('portal engagement uses hasIncludedCatalog')
    : fail('portal engagement missing hasIncludedCatalog');
engagement.includes('hasIncludedCatalog || hasRequiredDisclaimers || showSeatPicker')
    ? pass('portal needsPartyEdge uses event-level catalog')
    : fail('portal needsPartyEdge not event-level');
rsvpJs.includes('function pubHasIncludedCatalog(')
    ? pass('public pubHasIncludedCatalog helper')
    : fail('pubHasIncludedCatalog missing');
rsvpJs.includes('hasIncludedCatalog || hasRequiredDisclaimers || showSeatPicker')
    ? pass('public pubHandleRsvp needsPartyEdge uses event-level catalog')
    : fail('public needsPartyEdge not event-level');
rsvpJs.includes('hasIncludedCatalog ? { seat_options }')
    ? pass('public payloads send seat_options when catalog exists')
    : fail('public payloads missing hasIncludedCatalog seat_options spread');

console.log('\n── §13.8 public going update (no delete-on-going) ─────────────────────────');
const goingUpdateBlock = rsvpJs.match(
    /if \(pubCurrentRsvp\?\.status === 'going'\)\s*\{[\s\S]*?\}/
);
if (goingUpdateBlock && goingUpdateBlock[0].includes("callEdgeFunction('rsvp-member-party'")
    && !goingUpdateBlock[0].includes(".delete()")) {
    pass('pubHandleRsvp going update calls rsvp-member-party (no delete)');
} else {
    fail('pubHandleRsvp going update should call rsvp-member-party without delete');
}

console.log('\n── §13.8 prep UI (show wrapper when catalog exists) ───────────────────────');
sections.includes('hasIncludedCatalog')
    ? pass('sections.js uses hasIncludedCatalog for prep UI')
    : fail('sections.js missing hasIncludedCatalog');
sections.includes('defaultSeatRoleForCatalog')
    ? pass('sections.js defaultSeatRoleForCatalog for initial seat role')
    : fail('sections.js missing defaultSeatRoleForCatalog');
sections.includes('portalIncWrap-')
    ? pass('sections.js renders portalIncWrap when catalog exists')
    : fail('sections.js missing portalIncWrap');
rsvpJs.includes('pubMemberIncWrap')
    ? pass('public member included options wrapper')
    : fail('public missing pubMemberIncWrap');

console.log('\n── §13.8 edge validation ──────────────────────────────────────────────────');
const memberParty = read('supabase/functions/rsvp-member-party/index.ts');
const guestFree = read('supabase/functions/rsvp-guest-free/index.ts');
const checkout = read('supabase/functions/create-event-checkout/index.ts');

memberParty.includes('sanitizeAnswers')
    ? pass('rsvp-member-party sanitizes seat_options')
    : fail('rsvp-member-party missing sanitizeAnswers');
memberParty.includes('validateAnswers(catalog, seat_options')
    ? pass('rsvp-member-party validates seat_options for role')
    : fail('rsvp-member-party missing validateAnswers');
guestFree.includes('sanitizeAnswers')
    ? pass('rsvp-guest-free sanitizes seat_options')
    : fail('rsvp-guest-free missing sanitizeAnswers');
checkout.includes('validateAnswers(catalog, seat_options')
    ? pass('create-event-checkout validates seat_options for role')
    : fail('create-event-checkout missing validateAnswers');
checkout.includes('metadata.seat_options')
    ? pass('create-event-checkout carries seat_options in metadata')
    : fail('checkout missing metadata.seat_options');

console.log('\n── §13.8 cache bump (name/choices UX) ───────────────────────────────────');
read('events/index.html').includes('included-items.js?v=193')
    ? pass('public included-items at v=193')
    : fail('public included-items not at v=193');
read('pages/portal/events.html').includes('?v=193')
    || read('pages/portal/events.html').includes('events.bundle.js?v=191')
    ? pass('portal events cache bumped')
    : fail('portal events cache not bumped');
read('sw.js').includes('jm-portal-v141')
    ? pass('sw.js CACHE_NAME v141')
    : fail('sw.js not at v141');

console.log('\n── §13.8 brainstorm checklist ───────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('- [x] **MVP** — Included options per seat')
    ? pass('brainstorm line 412 checked off')
    : fail('brainstorm line 412 not checked');

console.log(`\n${failed === 0 ? 'rsvp included per seat smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
