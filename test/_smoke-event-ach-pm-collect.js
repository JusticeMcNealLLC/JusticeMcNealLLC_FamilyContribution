// Smoke test — §13.10 Stripe Customer + ACH PaymentMethod collect
// Run: node test/_smoke-event-ach-pm-collect.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.10 create-event-checkout ACH session ─────────────────────────────');
const checkout = read('supabase/functions/create-event-checkout/index.ts');

checkout.includes("['us_bank_account']")
    ? pass('ACH uses payment_method_types us_bank_account')
    : fail('missing us_bank_account payment_method_types');
checkout.includes("setup_future_usage: 'off_session'")
    ? pass('ACH sets setup_future_usage off_session')
    : fail('missing setup_future_usage off_session');
checkout.includes('isAchRsvp')
    && checkout.includes("['card']")
    ? pass('card path still uses payment_method_types card')
    : fail('card path payment_method_types missing');
checkout.includes("guest: 'true'")
    && checkout.includes('stripe.customers.create')
    ? pass('guest ACH creates Stripe Customer')
    : fail('guest ACH customer create missing');
checkout.includes('stripe_customer_id: customerConfig.customer')
    || checkout.includes('stripe_customer_id: customerConfig.customer')
    ? pass('checkout persists stripe_customer_id on plan')
    : fail('checkout missing plan stripe_customer_id write');

console.log('\n── §13.10 webhook / prep PM persist ─────────────────────────────────────');
const prep = read('supabase/functions/_shared/paid-rsvp-prep.ts');
const webhook = read('supabase/functions/stripe-webhook/index.ts');

prep.includes('persistPlanStripeIds')
    && prep.includes('stripe_payment_method_id')
    ? pass('prep persists stripe_payment_method_id')
    : fail('prep missing stripe_payment_method_id write');
webhook.includes('resolveCheckoutPaymentMethodId')
    && webhook.includes('paymentMethodId')
    ? pass('webhook resolves PaymentMethod for RSVP complete')
    : fail('webhook missing PaymentMethod resolve');
webhook.includes("case 'payment_intent.succeeded'")
    && webhook.includes('handlePaymentIntentSucceeded')
    ? pass('webhook handles payment_intent.succeeded for PM fallback')
    : fail('webhook missing payment_intent.succeeded handler');

console.log('\n── §13.10 client / docs ─────────────────────────────────────────────────');
const choice = read('js/components/events/payment-choice.js');
!choice.includes('stubbed until §13.10')
    ? pass('payment-choice stub comment cleared')
    : fail('payment-choice still says stubbed until §13.10');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('create-event-checkout')
    && contracts.includes('ACH collect')
    ? pass('004 notes ACH collect via create-event-checkout')
    : fail('004 missing ACH collect implementation note');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Stripe Customer + ACH PaymentMethod collect')
    ? pass('brainstorm line 434 checked')
    : fail('brainstorm line 434 not checked');

console.log(`\n${failed === 0 ? 'event ACH PM collect smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
