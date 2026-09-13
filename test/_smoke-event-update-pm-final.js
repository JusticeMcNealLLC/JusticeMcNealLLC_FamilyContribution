// Smoke test — §13.11 FINAL update payment method polish
// Run: node test/_smoke-event-update-pm-final.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.11 pm_update syncs plan.method ───────────────────────────────────');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
webhook.includes('handleEventPmUpdateCheckout')
    && webhook.includes('paymentMethods.retrieve')
    && webhook.includes("update.method = 'card'")
    && webhook.includes("update.method = 'ach'")
    ? pass('webhook sets method from Stripe PM type')
    : fail('webhook method sync missing');

console.log('\n── §13.11 get returns method display hints ──────────────────────────────');
const getEdge = read('supabase/functions/get-event-party-payments/index.ts');
getEdge.includes('stripe_payment_method_id')
    && getEdge.includes('method_last4')
    && getEdge.includes('method_brand')
    && getEdge.includes('methodDisplayHints')
    ? pass('get-event-party-payments returns last4/brand')
    : fail('get display hints missing');

console.log('\n── §13.11 payments UI ───────────────────────────────────────────────────');
const page = read('js/events/payments.js');
page.includes('formatMethodDisplay')
    && page.includes('method_last4')
    && page.includes('Update payment method')
    && page.includes('Change card or bank for future debits')
    && page.includes('Tap Retry payment')
    ? pass('payments.js method display + post-update copy')
    : fail('payments UI polish missing');
const html = read('events/payments/index.html');
html.includes('payments.js?v=179')
    && html.includes('payments-hint')
    ? pass('payments.js cache bump + hint style')
    : fail('?v= / hint style missing');

console.log('\n── §13.11 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Update payment method from this page')
    ? pass('brainstorm line 450 checked')
    : fail('brainstorm 450 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Update payment method FINAL')
    || contracts.includes('method_last4')
    ? pass('004 notes update PM FINAL')
    : fail('004 missing update PM note');

console.log(`\n${failed === 0 ? 'event update PM FINAL smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
