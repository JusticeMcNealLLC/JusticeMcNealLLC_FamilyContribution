// Smoke test — §13.10 card fee-inclusive path + ACH vs card CTAs
// Run: node test/_smoke-event-card-fee-path.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.10 create-event-checkout card collect ────────────────────────────');
const checkout = read('supabase/functions/create-event-checkout/index.ts');

checkout.includes('isCardRsvp')
    && checkout.includes("setup_future_usage: 'off_session'")
    ? pass('card RSVP sets setup_future_usage off_session')
    : fail('card missing setup_future_usage');
checkout.includes("payMethod === 'ach' || payMethod === 'card'")
    || (checkout.includes("payMethod === 'card'") && checkout.includes('stripe.customers.create'))
    ? pass('guest card creates Stripe Customer')
    : fail('guest card customer create missing');
checkout.includes('checkoutTotals.checkoutTotalCents')
    && checkout.includes('resolveCheckoutTotals')
    ? pass('checkout charges fee-inclusive checkoutTotalCents')
    : fail('checkout missing fee-inclusive amount');
checkout.includes("['us_bank_account']")
    && checkout.includes("['card']")
    ? pass('ACH vs card payment_method_types both present')
    : fail('missing ACH/card payment_method_types');

console.log('\n── §13.10 payment-choice display helpers ────────────────────────────────');
const choice = read('js/components/events/payment-choice.js');
choice.includes('function displayTotalCents(')
    ? pass('displayTotalCents helper')
    : fail('displayTotalCents missing');
choice.includes('function payButtonAmountLabel(')
    ? pass('payButtonAmountLabel helper')
    : fail('payButtonAmountLabel missing');
choice.includes('onChange')
    && choice.includes('[data-payment-method]')
    ? pass('wireForm refreshes on method change + onChange')
    : fail('wireForm missing method/onChange wiring');
choice.includes('Bank account (ACH)')
    && choice.includes('includes processing fee')
    ? pass('ACH vs card radio labels present')
    : fail('method labels missing');

console.log('\n── §13.10 public/portal CTA fee-aware ───────────────────────────────────');
const rsvp = read('js/events/rsvp.js');
const sections = read('js/portal/events/detail/sections.js');
rsvp.includes('pubFeeAwarePartyTotal')
    && rsvp.includes('displayTotalCents')
    ? pass('public RSVP CTA uses fee-aware total')
    : fail('public missing fee-aware CTA');
sections.includes('evtFeeAwarePartyTotal')
    && sections.includes('displayTotalCents')
    ? pass('portal RSVP CTA uses fee-aware total')
    : fail('portal missing fee-aware CTA');

console.log('\n── §13.10 docs + cache ──────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Card path with fee-inclusive total')
    ? pass('brainstorm line 435 checked')
    : fail('brainstorm 435 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Card fee path')
    && contracts.includes('fee-inclusive')
    ? pass('004 notes card fee path via create-event-checkout')
    : fail('004 missing card fee path note');
read('events/index.html').includes('?v=172')
    ? pass('public events at v=172')
    : fail('public events not at v=172');
read('pages/portal/events.html').includes('?v=172')
    ? pass('portal events at v=172')
    : fail('portal events not at v=172');
read('sw.js').includes('jm-portal-v133')
    ? pass('sw.js CACHE_NAME jm-portal-v133')
    : fail('sw.js missing jm-portal-v133');

console.log(`\n${failed === 0 ? 'event card fee path smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
