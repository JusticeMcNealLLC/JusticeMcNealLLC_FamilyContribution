// Smoke test — §13.10 webhook schedule status handlers
// Run: node test/_smoke-event-webhook-schedule-status.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.10 shared rollup helpers ─────────────────────────────────────────');
const helpers = read('supabase/functions/_shared/payment-schedule-webhook.ts');
['applyInstallmentSucceeded', 'applyInstallmentFailed', 'applyInstallmentProcessing', 'applyCheckoutSessionExpired']
    .forEach((fn) => {
        helpers.includes(`export async function ${fn}`)
            ? pass(`${fn} exported`)
            : fail(`${fn} missing`);
    });
helpers.includes("status: 'past_due'")
    ? pass('failed path sets plan past_due')
    : fail('past_due missing');
helpers.includes("status: 'processing'")
    ? pass('processing status supported')
    : fail('processing missing');
helpers.includes('alreadySucceeded')
    ? pass('succeeded path is idempotent')
    : fail('idempotent succeeded guard missing');

console.log('\n── §13.10 stripe-webhook wiring ─────────────────────────────────────────');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
webhook.includes("case 'payment_intent.succeeded'")
    && webhook.includes('applyInstallmentSucceeded')
    ? pass('PI.succeeded uses applyInstallmentSucceeded')
    : fail('PI.succeeded wiring missing');
webhook.includes("case 'payment_intent.payment_failed'")
    && webhook.includes('applyInstallmentFailed')
    ? pass('PI.payment_failed wired')
    : fail('PI.payment_failed missing');
webhook.includes("case 'payment_intent.processing'")
    && webhook.includes('applyInstallmentProcessing')
    ? pass('PI.processing wired')
    : fail('PI.processing missing');
webhook.includes("case 'checkout.session.expired'")
    && webhook.includes('applyCheckoutSessionExpired')
    ? pass('checkout.session.expired wired')
    : fail('checkout.session.expired missing');
webhook.includes('resolvePartyInstallmentFromPi')
    ? pass('resolves installment from PI/session')
    : fail('resolvePartyInstallmentFromPi missing');

console.log('\n── §13.10 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Webhook handlers: succeeded / failed / updated')
    ? pass('brainstorm line 438 checked')
    : fail('brainstorm 438 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Schedule status webhooks')
    && contracts.includes('payment-schedule-webhook.ts')
    ? pass('004 notes schedule status webhooks')
    : fail('004 missing webhook note');

console.log(`\n${failed === 0 ? 'event webhook schedule status smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
