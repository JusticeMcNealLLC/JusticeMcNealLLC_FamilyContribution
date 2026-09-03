// Smoke test — §13.8 MVP payment choice UI
// Run: node test/_smoke-rsvp-payment-choice.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.8 payment choice helpers ─────────────────────────────────────────');
const paymentJs = read('js/components/events/payment-choice.js');
const paymentTs = read('supabase/functions/_shared/payment-choice.ts');

['needsChoice', 'formFieldsHtml', 'validateChoice', 'cardTotalCents', 'quote', 'confirmMessage'].forEach((fn) => {
    paymentJs.includes(`function ${fn}(`)
        ? pass(`EventsPaymentChoice.${fn} present`)
        : fail(`${fn} missing from payment-choice.js`);
});

fs.existsSync(path.join(root, 'supabase/functions/_shared/payment-choice.ts'))
    ? pass('payment-choice.ts exists')
    : fail('payment-choice.ts missing');
paymentTs.includes('resolveCheckoutTotals')
    ? pass('resolveCheckoutTotals in Deno helper')
    : fail('resolveCheckoutTotals missing');

console.log('\n── §13.8 prep UI ────────────────────────────────────────────────────────');
const sections = read('js/portal/events/detail/sections.js');
const rsvpJs = read('js/events/rsvp.js');
const bodyJs = read('js/events/body.js');

sections.includes('portalPaymentWrap-')
    ? pass('portal prep renders payment wrapper')
    : fail('portalPaymentWrap missing');
rsvpJs.includes('pubMemberPaymentWrap')
    ? pass('public member payment wrapper')
    : fail('pubMemberPaymentWrap missing');
rsvpJs.includes('guestPaymentChoice')
    ? pass('public guest payment wrapper')
    : fail('guestPaymentChoice missing');
bodyJs.includes('ctaGuestPaymentChoice')
    ? pass('public CTA payment wrapper')
    : fail('ctaGuestPaymentChoice missing');

const publicHtml = read('events/index.html');
publicHtml.includes('payment-choice.js')
    ? pass('public events loads payment-choice.js')
    : fail('events/index.html missing payment-choice.js');

console.log('\n── §13.8 client routing ─────────────────────────────────────────────────');
const engagement = read('js/portal/events/engagement/rsvp.js');
const checkout = read('supabase/functions/create-event-checkout/index.ts');

engagement.includes('plan_kind: paymentChoice.plan_kind')
    ? pass('portal sends plan_kind + method on paid checkout')
    : fail('portal missing payment choice payload');
rsvpJs.includes('plan_kind: paymentChoice.plan_kind')
    ? pass('public sends plan_kind + method on paid checkout')
    : fail('public missing payment choice payload');

console.log('\n── §13.8 edge stub ──────────────────────────────────────────────────────');
checkout.includes('plan_kind')
    && checkout.includes('validatePaymentChoice')
    && checkout.includes('metadata.plan_kind')
    && checkout.includes('checkout_total_cents')
    ? pass('create-event-checkout validates and stores payment metadata')
    : fail('create-event-checkout missing payment choice stub');

console.log('\n── §13.8 cache bump v=163 ───────────────────────────────────────────────');
read('events/index.html').includes('?v=163')
    ? pass('public events at v=163')
    : fail('public events not at v=163');
read('pages/portal/events.html').includes('?v=163')
    ? pass('portal events at v=163')
    : fail('portal events not at v=163');
read('sw.js').includes('jm-portal-v124')
    ? pass('sw.js CACHE_NAME jm-portal-v124')
    : fail('sw.js missing jm-portal-v124');

console.log(`\n${failed === 0 ? 'rsvp payment choice smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
