// Smoke test — §13.11 Pay off early CTA on public payments page
// Run: node test/_smoke-event-payments-payoff-cta.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.11 payoff CTA UI ─────────────────────────────────────────────────');
const page = read('js/events/payments.js');
page.includes('Pay off early')
    && page.includes('startPayoff')
    && page.includes('request-event-party-payoff')
    && page.includes('canPayoff')
    && page.includes("paid') === 'payoff'")
    ? pass('payments.js has Pay off early CTA + flash')
    : fail('payoff CTA missing in payments.js');

const html = read('events/payments/index.html');
html.includes('payments.js?v=179')
    ? pass('payments.js cache bump v=179')
    : fail('?v= not bumped to 179');

console.log('\n── §13.11 payoff Checkout return URLs ───────────────────────────────────');
const edge = read('supabase/functions/request-event-party-payoff/index.ts');
edge.includes('/events/payments/')
    && edge.includes('paid=payoff')
    && edge.includes('canceled=payoff')
    && !edge.includes('/events/?e=')
    ? pass('edge returns to /events/payments/')
    : fail('edge success/cancel URLs not on payments page');

console.log('\n── §13.11 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Pay off early CTA')
    ? pass('brainstorm line 447 checked')
    : fail('brainstorm 447 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Pay off early CTA')
    || contracts.includes('magic-link CTA is live')
    || contracts.includes('Early payoff CTA')
    ? pass('004 notes payoff CTA')
    : fail('004 missing payoff CTA note');

console.log(`\n${failed === 0 ? 'event payments payoff CTA smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
