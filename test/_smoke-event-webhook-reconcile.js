// Smoke test — §13.10 webhook idempotency + reconcile
// Run: node test/_smoke-event-webhook-reconcile.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.10 stripe_webhook_events migration ───────────────────────────────');
exists('supabase/migrations/20260903120000_111_stripe_webhook_events.sql')
    ? pass('migration 111 exists')
    : fail('migration 111 missing');
const mig = read('supabase/migrations/20260903120000_111_stripe_webhook_events.sql');
mig.includes('stripe_webhook_events')
    && mig.includes('stripe_event_id')
    && mig.includes("'received'")
    && mig.includes('service_role')
    ? pass('dedupe table + RLS')
    : fail('migration 111 incomplete');

console.log('\n── §13.10 claim/finalize helper ─────────────────────────────────────────');
exists('supabase/functions/_shared/stripe-webhook-events.ts')
    ? pass('stripe-webhook-events.ts exists')
    : fail('helper missing');
const helper = read('supabase/functions/_shared/stripe-webhook-events.ts');
helper.includes('claimStripeWebhookEvent')
    && helper.includes('finalizeStripeWebhookEvent')
    && helper.includes('23505')
    ? pass('claim + finalize + unique conflict')
    : fail('helper incomplete');

console.log('\n── §13.10 webhook wiring ────────────────────────────────────────────────');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
webhook.includes('claimStripeWebhookEvent')
    && webhook.includes('duplicate: true')
    && webhook.includes('finalizeStripeWebhookEvent')
    && webhook.includes("status: 'error'")
    ? pass('webhook claims, skips dupes, finalizes')
    : fail('webhook wiring incomplete');

console.log('\n── §13.10 reconcile edge + cron ─────────────────────────────────────────');
exists('supabase/functions/_shared/event-party-reconcile.ts')
    ? pass('event-party-reconcile.ts exists')
    : fail('reconcile shared missing');
const rec = read('supabase/functions/_shared/event-party-reconcile.ts');
rec.includes('reconcileStuckProcessingInstallments')
    && rec.includes("'processing'")
    && rec.includes('applyInstallmentSucceeded')
    && rec.includes('applyInstallmentFailed')
    && !rec.includes('await notifyPartyPaymentFailed')
    ? pass('reconcile fixes processing; no failure SMS')
    : fail('reconcile shared incomplete');

exists('supabase/functions/reconcile-event-party-payments/index.ts')
    ? pass('reconcile edge exists')
    : fail('reconcile edge missing');
const edge = read('supabase/functions/reconcile-event-party-payments/index.ts');
edge.includes('assertServiceRole')
    || edge.includes('service role required')
    ? pass('reconcile requires service role')
    : fail('reconcile auth missing');

exists('supabase/migrations/20260903121000_112_reconcile_event_payments_cron.sql')
    ? pass('cron migration 112 exists')
    : fail('cron migration missing');
const cron = read('supabase/migrations/20260903121000_112_reconcile_event_payments_cron.sql');
cron.includes('hourly-reconcile-event-party-payments')
    && cron.includes('reconcile-event-party-payments')
    && cron.includes('15 * * * *')
    ? pass('hourly cron scheduled')
    : fail('cron incomplete');

console.log('\n── §13.10 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Idempotency, audit log, reconcile job for missed webhooks')
    ? pass('brainstorm line 441 checked')
    : fail('brainstorm 441 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Webhook idempotency + reconcile')
    && contracts.includes('reconcile-event-party-payments')
    && contracts.includes('stripe_webhook_events')
    ? pass('004 notes dedupe + reconcile')
    : fail('004 missing reconcile note');

console.log(`\n${failed === 0 ? 'event webhook reconcile smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
