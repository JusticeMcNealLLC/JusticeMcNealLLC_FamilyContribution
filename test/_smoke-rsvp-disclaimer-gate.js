// Smoke test — §13.8 MVP disclaimer acknowledgments gate
// Run: node test/_smoke-rsvp-disclaimer-gate.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.8 disclaimer helpers ─────────────────────────────────────────────');
const disclaimers = read('js/components/events/disclaimers.js');
disclaimers.includes('function hasDisclaimers(')
    ? pass('EventsDisclaimers.hasDisclaimers present')
    : fail('hasDisclaimers missing');
disclaimers.includes('function effectiveDisclaimers(')
    ? pass('EventsDisclaimers.effectiveDisclaimers present')
    : fail('effectiveDisclaimers missing');
disclaimers.includes('function scrollToAckField(')
    ? pass('EventsDisclaimers.scrollToAckField present')
    : fail('scrollToAckField missing');
disclaimers.includes('default-no-refunds')
    ? pass('default no-refunds clause in helper')
    : fail('default no-refunds missing');

console.log('\n── §13.8 client routing ─────────────────────────────────────────────────');
const engagement = read('js/portal/events/engagement/rsvp.js');
const rsvpJs = read('js/events/rsvp.js');
const sections = read('js/portal/events/detail/sections.js');

engagement.includes('effectiveDisclaimers')
    ? pass('portal uses effectiveDisclaimers')
    : fail('portal missing effectiveDisclaimers');
engagement.includes('hasRequiredDisclaimers || showSeatPicker')
    ? pass('portal needsPartyEdge includes hasRequiredDisclaimers')
    : fail('portal needsPartyEdge missing disclaimer gate');
engagement.includes('hasRequiredDisclaimers ? { disclaimer_acks }')
    ? pass('portal sends disclaimer_acks when required')
    : fail('portal missing hasRequiredDisclaimers payload spread');
engagement.includes('status === \'going\' && hasRequiredDisclaimers')
    && engagement.includes('rsvp-member-party')
    ? pass('portal blocks direct upsert when required disclaimers')
    : fail('portal direct upsert guard missing');

engagement.includes('evtClaimWaitlistSpot')
    && engagement.match(/async function evtClaimWaitlistSpot[\s\S]*disclaimer_acks/)
    ? pass('waitlist claim sends disclaimer_acks')
    : fail('waitlist claim missing disclaimer_acks');
engagement.includes('scrollToAckField')
    ? pass('portal scrolls to ack field on validation failure')
    : fail('portal missing scrollToAckField on ack failure');

rsvpJs.includes('function pubHasRequiredDisclaimers(')
    ? pass('public pubHasRequiredDisclaimers helper')
    : fail('pubHasRequiredDisclaimers missing');
rsvpJs.includes('effectiveDisclaimers')
    ? pass('public uses effectiveDisclaimers')
    : fail('public missing effectiveDisclaimers');
rsvpJs.includes('status === \'going\' && hasRequiredDisclaimers')
    && rsvpJs.includes('rsvp-member-party')
    ? pass('public blocks direct upsert when required disclaimers')
    : fail('public direct upsert guard missing');

const goingUpdateBlock = rsvpJs.match(
    /if \(pubCurrentRsvp\?\.status === 'going'\)\s*\{[\s\S]*?\}/
);
if (goingUpdateBlock && goingUpdateBlock[0].includes("callEdgeFunction('rsvp-member-party'")
    && !goingUpdateBlock[0].includes('.delete()')) {
    pass('public going update uses rsvp-member-party (no delete)');
} else {
    fail('public going update should use rsvp-member-party without delete');
}

sections.includes('effectiveDisclaimers')
    ? pass('sections.js uses effectiveDisclaimers for prep UI')
    : fail('sections.js missing effectiveDisclaimers');
sections.includes('hasDisclaimers')
    ? pass('sections.js uses hasDisclaimers for show rule')
    : fail('sections.js missing hasDisclaimers');

console.log('\n── §13.8 backfill migration ──────────────────────────────────────────────');
fs.existsSync(path.join(root, 'supabase/migrations/20260901170000_108_backfill_event_disclaimer_defaults.sql'))
    ? pass('migration 108_backfill_event_disclaimer_defaults.sql exists')
    : fail('migration 108 missing');
read('supabase/migrations/20260901170000_108_backfill_event_disclaimer_defaults.sql').includes('default-no-refunds')
    ? pass('migration seeds default-no-refunds')
    : fail('migration missing default-no-refunds');

console.log('\n── §13.8 cache bump v=163 ───────────────────────────────────────────────');
read('events/index.html').includes('?v=163')
    ? pass('public events at v=163')
    : fail('public events not at v=163');
read('pages/portal/events.html').includes('?v=163')
    ? pass('portal events at v=163')
    : fail('portal events not at v=163');

console.log('\n── §13.8 brainstorm checklist ───────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('- [x] **MVP** — Disclaimer acknowledgments gate (incl. no-refunds)')
    ? pass('brainstorm line 413 checked off')
    : fail('brainstorm line 413 not checked');

console.log(`\n${failed === 0 ? 'rsvp disclaimer gate smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
