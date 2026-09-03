// Smoke test — §13.8 FINAL portal member RSVP parity with public guest
// Run: node test/_smoke-portal-rsvp-guest-parity.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.8 shared pay label helper ────────────────────────────────────────');
const helpers = read('js/components/events/helpers.js');
helpers.includes('rsvpPayButtonLabel')
    ? pass('EventsHelpers.rsvpPayButtonLabel present')
    : fail('rsvpPayButtonLabel missing');

console.log('\n── §13.8 portal detail parity ───────────────────────────────────────────');
const sections = read('js/portal/events/detail/sections.js');
sections.includes('evtUpdateMemberRsvpBtnLabels')
    && sections.includes('evtMemberRsvpPayBtn-')
    && sections.includes('evtWaitlistClaimBtn-')
    ? pass('dynamic member RSVP + waitlist claim labels')
    : fail('missing label updater or button ids');
sections.includes('Payment pending')
    && sections.includes('Complete checkout to confirm')
    ? pass('unpaid going payment-pending detail CTA')
    : fail('missing unpaid going detail state');
sections.includes('evtMemberNoRefundCheck')
    && sections.includes('evtWireMemberPrepPhoneSms')
    ? pass('no-refund checkbox + prep SMS wiring')
    : fail('missing no-refund or prep SMS');

console.log('\n── §13.8 portal submit + mobile CTA ─────────────────────────────────────');
const rsvpJs = read('js/portal/events/engagement/rsvp.js');
rsvpJs.includes('evtValidateMemberNoRefund')
    ? pass('no-refund validation in engagement/rsvp.js')
    : fail('missing no-refund validation');
const ctaBar = read('js/portal/events/team/cta-bar.js');
ctaBar.includes("rsvp?.status === 'going' && event.pricing_mode === 'paid'")
    && ctaBar.includes("mode: 'complete'")
    ? pass('cta-bar unpaid paid going shows complete payment')
    : fail('cta-bar missing unpaid going guard');

console.log('\n── §13.8 cache bump v=165 ───────────────────────────────────────────────');
read('pages/portal/events.html').includes('?v=165')
    ? pass('portal events at v=165')
    : fail('portal events not at v=165');
read('sw.js').includes('jm-portal-v126')
    ? pass('sw.js CACHE_NAME jm-portal-v126')
    : fail('sw.js missing jm-portal-v126');

console.log(`\n${failed === 0 ? 'portal rsvp guest parity smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
