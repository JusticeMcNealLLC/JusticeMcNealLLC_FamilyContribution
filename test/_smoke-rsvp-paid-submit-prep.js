// Smoke test — §13.8 MVP paid submit creates RSVP + seats + payment stub
// Run: node test/_smoke-rsvp-paid-submit-prep.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.8 paid submit prep shared ─────────────────────────────────────────');
const prepTs = read('supabase/functions/_shared/paid-rsvp-prep.ts');

fs.existsSync(path.join(root, 'supabase/functions/_shared/paid-rsvp-prep.ts'))
    ? pass('paid-rsvp-prep.ts exists')
    : fail('paid-rsvp-prep.ts missing');
prepTs.includes('preparePaidRsvpForCheckout')
    ? pass('preparePaidRsvpForCheckout exported')
    : fail('preparePaidRsvpForCheckout missing');
prepTs.includes('completePaidRsvpAfterCheckout')
    ? pass('completePaidRsvpAfterCheckout exported')
    : fail('completePaidRsvpAfterCheckout missing');
prepTs.includes("partyStatus: 'pending_payment'")
    ? pass('prep uses pending_payment party status')
    : fail('prep missing pending_payment');
prepTs.includes('event_payment_plans')
    && prepTs.includes('event_payment_installments')
    ? pass('prep writes payment plan + installment stub')
    : fail('prep missing plan/installment writes');

console.log('\n── §13.8 create-event-checkout wiring ───────────────────────────────────');
const checkout = read('supabase/functions/create-event-checkout/index.ts');

checkout.includes('preparePaidRsvpForCheckout')
    ? pass('checkout calls preparePaidRsvpForCheckout')
    : fail('checkout missing preparePaidRsvpForCheckout');
checkout.includes('metadata.party_id')
    && checkout.includes('metadata.plan_id')
    && checkout.includes('metadata.installment_id')
    && checkout.includes("metadata.jm_type = 'event_party_plan'")
    ? pass('checkout stores party/plan metadata')
    : fail('checkout missing party/plan metadata');
!checkout.includes('upsertPendingPartyAmenityVote')
    ? pass('amenity-only pre-checkout stub removed from checkout')
    : fail('checkout still calls upsertPendingPartyAmenityVote');
checkout.includes(".eq('status', 'going')")
    && !checkout.includes(".eq('paid', true)")
    ? pass('guest capacity counts going RSVPs')
    : fail('guest capacity still paid-only');

console.log('\n── §13.8 stripe-webhook completion ──────────────────────────────────────');
const webhook = read('supabase/functions/stripe-webhook/index.ts');

webhook.includes('completePaidRsvpAfterCheckout')
    ? pass('webhook calls completePaidRsvpAfterCheckout')
    : fail('webhook missing completePaidRsvpAfterCheckout');
webhook.includes('prepCompletion.usedPrepPath')
    ? pass('webhook branches on prep path')
    : fail('webhook missing prep path branch');

console.log('\n── §13.8 cache bump v=164 ───────────────────────────────────────────────');
read('events/index.html').includes('?v=164')
    ? pass('public events at v=164')
    : fail('public events not at v=164');
read('pages/portal/events.html').includes('?v=164')
    ? pass('portal events at v=164')
    : fail('portal events not at v=164');
read('sw.js').includes('jm-portal-v125')
    ? pass('sw.js CACHE_NAME jm-portal-v125')
    : fail('sw.js missing jm-portal-v125');

console.log(`\n${failed === 0 ? 'rsvp paid submit prep smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
