// Smoke test — §13.12 Manage Money tab payment plans MVP
// Run: node test/_smoke-event-manage-money-plans.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.12 manage Money load ─────────────────────────────────────────────');
const money = read('js/portal/events/manage/money.js');
money.includes("from('event_payment_plans')")
    && money.includes("from('event_parties')")
    && money.includes("from('event_payment_installments')")
    && money.includes('failedPlanIds')
    && money.includes('remaining_cents')
    && money.includes('next_debit_at')
    ? pass('loadMoney queries plans + parties + failed installments')
    : fail('loadMoney missing plan/party/failed queries');

console.log('\n── §13.12 manage Money UI ───────────────────────────────────────────────');
money.includes('Payment plans')
    && money.includes('Remaining')
    && money.includes('Next debit')
    && money.includes('past_due')
    && money.includes('Past due')
    && money.includes('Remaining due')
    && money.includes('data-money-copy-pay-link')
    && money.includes('wireMoney')
    ? pass('moneyHtml Remaining / Next debit / past_due + copy link')
    : fail('money UI enrichment missing');

const bundle = read('js/portal/events/events.bundle.js');
(bundle.includes('event_payment_plans')
    && bundle.includes('Payment plans')
    && bundle.includes('data-money-copy-pay-link'))
    ? pass('events.bundle includes Money plans MVP')
    : fail('bundle missing Money plans MVP');

const html = read('pages/portal/events.html');
html.includes('events.bundle.js?v=179')
    ? pass('events.bundle cache bump v=179')
    : fail('bundle ?v= not bumped to 179');

console.log('\n── §13.12 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Money tab: per-payer paid/remaining/next/failed (Stripe-backed)')
    ? pass('brainstorm line 456 checked')
    : fail('brainstorm 456 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Manage Money tab')
    || contracts.includes('Money tab MVP')
    || contracts.includes('per-payer paid/remaining')
    ? pass('004 notes manage Money tab')
    : fail('004 missing Money tab note');

console.log(`\n${failed === 0 ? 'event manage Money plans smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
