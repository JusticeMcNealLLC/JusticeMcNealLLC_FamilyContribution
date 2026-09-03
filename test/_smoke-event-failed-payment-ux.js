// Smoke test — §13.10 failed payment UX (SMS + retry / update method)
// Run: node test/_smoke-event-failed-payment-ux.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.10 migration failure_notified_at ─────────────────────────────────');
exists('supabase/migrations/20260902210000_110_event_installment_failure_notified.sql')
    ? pass('migration 110 exists')
    : fail('migration 110 missing');
const mig = read('supabase/migrations/20260902210000_110_event_installment_failure_notified.sql');
mig.includes('failure_notified_at')
    && mig.includes('event_payment_failed')
    ? pass('adds failure_notified_at + sms message_type')
    : fail('migration incomplete');

console.log('\n── §13.10 payment failure SMS ───────────────────────────────────────────');
exists('supabase/functions/_shared/event-payment-sms.ts')
    ? pass('event-payment-sms.ts exists')
    : fail('event-payment-sms.ts missing');
const sms = read('supabase/functions/_shared/event-payment-sms.ts');
sms.includes('notifyPartyPaymentFailed')
    && sms.includes('isPaymentFailureSmsEnabled')
    && sms.includes('SMS_PAYMENT_FAILURES_ENABLED')
    && sms.includes('failure_notified_at')
    && sms.includes('/events/payments/')
    ? pass('SMS notify + payments URL + idempotency')
    : fail('SMS helper incomplete');

console.log('\n── §13.10 edges ─────────────────────────────────────────────────────────');
;[
    'supabase/functions/get-event-party-payments/index.ts',
    'supabase/functions/retry-event-party-payment/index.ts',
    'supabase/functions/update-event-party-payment-method/index.ts',
].forEach((rel) => {
    exists(rel) ? pass(`${path.basename(path.dirname(rel))} exists`) : fail(`${rel} missing`);
});
const getEdge = read('supabase/functions/get-event-party-payments/index.ts');
getEdge.includes('invite_token')
    && getEdge.includes('remaining_cents')
    && getEdge.includes('has_failed_installment')
    ? pass('get-event-party-payments returns plan + failed flag')
    : fail('get edge incomplete');

const retry = read('supabase/functions/retry-event-party-payment/index.ts');
retry.includes("kind: 'retry'")
    && retry.includes('preparePartyRetryInstallment')
    && retry.includes('checkout.sessions.create')
    ? pass('retry edge charges failed installment')
    : fail('retry edge incomplete');

const updatePm = read('supabase/functions/update-event-party-payment-method/index.ts');
updatePm.includes("mode: 'setup'")
    && updatePm.includes("kind: 'pm_update'")
    && updatePm.includes('us_bank_account')
    ? pass('update-pm edge uses setup mode')
    : fail('update-pm edge incomplete');

exists('supabase/functions/_shared/event-party-retry.ts')
    && read('supabase/functions/_shared/event-party-retry.ts').includes("status', 'failed'")
    ? pass('retry prep targets latest failed installment')
    : fail('retry prep missing');

console.log('\n── §13.10 webhook + page ────────────────────────────────────────────────');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
webhook.includes('notifyPartyPaymentFailed')
    && webhook.includes('handleEventRetryCheckout')
    && webhook.includes('handleEventPmUpdateCheckout')
    && webhook.includes("kind === 'retry'")
    && webhook.includes("kind === 'pm_update'")
    ? pass('webhook: SMS on fail + retry/pm_update handlers')
    : fail('webhook handlers incomplete');

// Expired setup must not SMS — only PI failed path
webhook.includes('handleCheckoutExpired')
    && !read('supabase/functions/_shared/payment-schedule-webhook.ts').includes('notifyPartyPaymentFailed')
    ? pass('SMS not wired from checkout.expired path')
    : fail('SMS leak into expired path');

exists('events/payments/index.html')
    && exists('js/events/payments.js')
    ? pass('public /events/payments page assets exist')
    : fail('payments page missing');
const pageJs = read('js/events/payments.js');
pageJs.includes('retry-event-party-payment')
    && pageJs.includes('update-event-party-payment-method')
    && pageJs.includes('get-event-party-payments')
    ? pass('payments.js wires get/retry/update edges')
    : fail('payments.js incomplete');

console.log('\n── §13.10 docs + cache ──────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Failed payment UX: payer notified via SMS; retry / update method')
    ? pass('brainstorm line 440 checked')
    : fail('brainstorm 440 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Failed payment UX')
    && contracts.includes('retry-event-party-payment')
    && contracts.includes('update-event-party-payment-method')
    ? pass('004 notes failed payment edges')
    : fail('004 missing failed payment note');
const sw = read('sw.js');
sw.includes("CACHE_NAME = 'jm-portal-v134'")
    || /CACHE_NAME = 'jm-portal-v1(3[4-9]|[4-9]\d)'/.test(sw)
    ? pass('SW cache bumped (≥ v134)')
    : fail('SW cache not bumped');

console.log(`\n${failed === 0 ? 'event failed payment UX smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
