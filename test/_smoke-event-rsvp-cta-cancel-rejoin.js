// Smoke — RSVP CTA states, self-cancel, rejoin credit
// Run: node test/_smoke-event-rsvp-cta-cancel-rejoin.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── CTA state helper ─────────────────────────────────────────────────────');
const helpers = read('js/components/events/helpers.js');
helpers.includes('function rsvpCtaState(')
    && helpers.includes("kind: 'continue'")
    && helpers.includes('Paid in full')
    && helpers.includes('rsvpCtaState')
    ? pass('rsvpCtaState with RSVP / Continue / Going + paid sub')
    : fail('rsvpCtaState missing');

const wiz = read('js/components/events/rsvp-wizard.js');
wiz.includes('function hasDraft(')
    && wiz.includes('hasDraft,')
    ? pass('EventsRsvpWizard.hasDraft')
    : fail('hasDraft missing');

console.log('\n── Portal wire-up ───────────────────────────────────────────────────────');
const sections = read('js/portal/events/detail/sections.js');
sections.includes('evtResolveRsvpCtaState')
    && sections.includes('evtMemberRsvpCancelBtnHtml')
    && sections.includes('Continue RSVP')
    ? pass('detail RSVP card uses CTA state + cancel btn')
    : fail('detail sections incomplete');

const ctaBar = read('js/portal/events/team/cta-bar.js');
ctaBar.includes('rsvpCtaState')
    && ctaBar.includes('Continue RSVP')
    && ctaBar.includes('evtCancelMyParticipation')
    ? pass('sticky CTA bar Continue / Cancel')
    : fail('cta-bar incomplete');

const eng = read('js/portal/events/engagement/rsvp.js');
eng.includes('async function evtCancelMyParticipation')
    && eng.includes('cancel-my-event-participation')
    && eng.includes('confirmDialog')
    && eng.includes('non-refundable')
    ? pass('self-cancel handler + confirm')
    : fail('self-cancel UI missing');

console.log('\n── Edge + rejoin credit ─────────────────────────────────────────────────');
const edge = read('supabase/functions/cancel-my-event-participation/index.ts');
edge.includes('cancelPartyParticipation')
    && edge.includes('event_rsvps')
    ? pass('cancel-my-event-participation edge')
    : fail('cancel edge missing');

const prep = read('supabase/functions/_shared/paid-rsvp-prep.ts');
prep.includes('sumPriorPaymentCredit')
    && prep.includes('fully_credited')
    && prep.includes('creditedCents')
    ? pass('paid-rsvp-prep prior credit')
    : fail('rejoin credit missing in prep');

const checkout = read('supabase/functions/create-event-checkout/index.ts');
checkout.includes('fully_credited')
    ? pass('create-event-checkout fully_credited short-circuit')
    : fail('checkout credit short-circuit missing');

read('supabase/config.toml').includes('cancel-my-event-participation')
    ? pass('config.toml registers cancel function')
    : fail('config.toml missing cancel function');

console.log('\n── Ship bumps ───────────────────────────────────────────────────────────');
read('pages/portal/events.html').includes('events.bundle.js?v=221')
    ? pass('portal bundle ?v=221')
    : fail('portal bundle not bumped');

read('sw.js').includes('jm-portal-v170')
    ? pass('SW CACHE_NAME v170')
    : fail('SW not bumped');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('rsvpCtaState')
    && bundle.includes('evtCancelMyParticipation')
    ? pass('events.bundle includes CTA + cancel')
    : fail('bundle missing CTA/cancel (run build:events)');

console.log(failed ? `\n${failed} failed\n` : '\nRSVP CTA cancel/rejoin smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
