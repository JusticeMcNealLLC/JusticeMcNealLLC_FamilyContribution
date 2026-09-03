// Smoke test — §13.10 early payoff edge
// Run: node test/_smoke-event-early-payoff.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.10 shared payoff prep ────────────────────────────────────────────');
exists('supabase/functions/_shared/event-party-payoff.ts')
    ? pass('event-party-payoff.ts exists')
    : fail('event-party-payoff.ts missing');
const prep = read('supabase/functions/_shared/event-party-payoff.ts');
prep.includes('preparePartyPayoffInstallment')
    && prep.includes("kind: 'payoff'")
    && prep.includes("kind', 'scheduled'")
    ? pass('prep creates payoff and cancels scheduled')
    : fail('prep missing cancel/payoff');

console.log('\n── §13.10 request-event-party-payoff edge ───────────────────────────────');
exists('supabase/functions/request-event-party-payoff/index.ts')
    ? pass('request-event-party-payoff edge exists')
    : fail('edge missing');
const edge = read('supabase/functions/request-event-party-payoff/index.ts');
edge.includes('invite_token')
    && edge.includes('auth.getUser')
    ? pass('auth via invite_token or JWT')
    : fail('auth paths missing');
edge.includes('off_session: true')
    && edge.includes('paymentIntents.create')
    ? pass('off-session PaymentIntent path')
    : fail('off-session path missing');
edge.includes('checkout.sessions.create')
    && edge.includes('checkout_url')
    ? pass('Checkout fallback path')
    : fail('Checkout fallback missing');
edge.includes("kind: 'payoff'")
    || edge.includes("kind: \"payoff\"")
    || edge.includes("kind: 'payoff'")
    ? pass('metadata kind=payoff')
    : fail('payoff metadata missing');

console.log('\n── §13.10 webhook payoff completion ─────────────────────────────────────');
const rollup = read('supabase/functions/_shared/payment-schedule-webhook.ts');
rollup.includes("instKind === 'payoff'")
    && rollup.includes('enforceFullPlanCompleted')
    ? pass('payoff success completes plan')
    : fail('payoff completion missing');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
webhook.includes('handleEventPayoffCheckout')
    && webhook.includes("kind === 'payoff'")
    ? pass('Checkout payoff bypasses RSVP complete')
    : fail('Checkout payoff handler missing');

console.log('\n── §13.10 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Early payoff: charge remaining, cancel future schedule')
    ? pass('brainstorm line 439 checked')
    : fail('brainstorm 439 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Early payoff')
    && contracts.includes('request-event-party-payoff')
    ? pass('004 notes early payoff edge')
    : fail('004 missing payoff note');

console.log(`\n${failed === 0 ? 'event early payoff smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
