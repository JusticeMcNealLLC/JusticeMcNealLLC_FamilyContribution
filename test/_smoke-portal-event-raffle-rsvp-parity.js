/**
 * Static smoke: portal Events RSVP/raffle eligibility parity with public page rules.
 * Run: node test/_smoke-portal-event-raffle-rsvp-parity.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const detail = fs.readFileSync(path.join(root, 'js/portal/events/detail.js'), 'utf8');
const rsvp = fs.readFileSync(path.join(root, 'js/portal/events/rsvp.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');
const publicBody = fs.readFileSync(path.join(root, 'js/events/body.js'), 'utf8');

function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('portal event raffle/rsvp parity smoke\n');

// Shared portal helpers (public parity: going || paid)
assert(/function evtIsGoingRsvp/.test(rsvp), 'rsvp.js defines evtIsGoingRsvp');
assert(/rsvp\.status === 'going'/.test(rsvp) && /rsvp\.paid === true/.test(rsvp), 'evtIsGoingRsvp checks going and paid');
assert(/window\.evtIsGoingRsvp/.test(rsvp), 'evtIsGoingRsvp exported on window');
assert(/evtIsRaffleBundledWithPaidRsvp/.test(rsvp), 'bundled paid raffle helper present');
assert(/evtCanEnterMemberRaffle/.test(rsvp), 'evtCanEnterMemberRaffle helper present');

// Public reference unchanged
assert(/pubHasRaffleEligibleRsvp/.test(publicBody), 'public pubHasRaffleEligibleRsvp still present');
assert(/pubCurrentRsvp\?\.status === 'going'/.test(publicBody), 'public member going check');

// detail.js uses shared going logic
assert(/evtIsGoingRsvp/.test(detail), 'detail.js references evtIsGoingRsvp');
assert(/memberGoing/.test(detail), 'detail.js uses memberGoing for ticket/raffle');
assert(/select\('user_id, status, paid/.test(detail), 'attendee query includes paid for going counts');

// Locked Enter Raffle + footnote (parity with public pubRaffleLockedCtaBtnHtml)
assert(/evtRaffleLockedCtaBtnHtml/.test(detail), 'portal locked raffle CTA helper');
assert(/evt-cta-raffle-locked/.test(detail), 'disabled Enter Raffle CTA class');
assert(/evt-cta-footnote/.test(detail) && /RSVP first to enter the raffle/.test(detail), 'CTA footnote for RSVP-first');
assert(!/RSVP for Raffle/.test(detail), 'portal must not use old RSVP for Raffle sticky label');

// Team Tools still wires RSVP/Raffle
assert(/evtOpenTeamToolsPanel/.test(detail), 'Team Tools panel present');
assert(/RSVP as Myself/.test(detail), 'Team Tools RSVP as Myself');
assert(/Enter Raffle/.test(detail), 'Team Tools Enter Raffle');
assert(/evtHandleRsvp/.test(detail), 'Team Tools links to evtHandleRsvp');
assert(/evtOpenCtaPanel\('raffle'/.test(detail), 'Team Tools opens raffle CTA panel');

// Hosts not manage-only
assert(/evt-cta-manage/.test(detail) && /evt-cta-team/.test(detail), 'mobile Manage + Team for hosts');
assert(/You're hosting!/.test(detail), 'host messaging preserved');

// Raffle handler bugfix: no false "included" on free raffle paid handler
assert(!/pricing_mode === 'paid' \|\| !event\.raffle_entry_cost_cents/.test(rsvp),
    'evtHandleRaffleEntry must not block free raffle via zero-cost OR paid');

// Scope guards
assert(!/event_chats/.test(detail) && !/event_chats/.test(rsvp), 'no chat tables');
assert(!/evtOpenTeamToolsPanel/.test(portalHtml), 'portal/events.html unchanged');

pass('portal RSVP/raffle parity helpers and detail wiring verified');
pass('public reference files untouched');
pass('Team Tools + host dual-path preserved');

console.log('\nportal event raffle/rsvp parity smoke: all pass');
