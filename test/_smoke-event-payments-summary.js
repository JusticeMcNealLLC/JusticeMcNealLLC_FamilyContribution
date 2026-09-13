// Smoke test — §13.11 payments summary fields on public page
// Run: node test/_smoke-event-payments-summary.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.11 payments summary UI ───────────────────────────────────────────');
const page = read('js/events/payments.js');
page.includes('formatDebitAt')
    && page.includes('planKindLabel')
    && page.includes('>Total<')
    && page.includes('>Next debit<')
    && page.includes('>Plan<')
    && page.includes('total_due_cents')
    && page.includes('next_debit_at')
    && page.includes('plan_kind')
    ? pass('payments.js shows total, next debit, plan type')
    : fail('summary rows missing');

const orderOk = page.indexOf('>Total<') < page.indexOf('>Paid<')
    && page.indexOf('>Paid<') < page.indexOf('>Remaining<')
    && page.indexOf('>Remaining<') < page.indexOf('>Next debit<')
    && page.indexOf('>Next debit<') < page.indexOf('>Plan<')
    && page.indexOf('>Plan<') < page.indexOf('>Method<')
    && page.indexOf('>Method<') < page.indexOf('>Status<');
orderOk ? pass('row order Total→Paid→Remaining→Next→Plan→Method→Status') : fail('row order wrong');

const html = read('events/payments/index.html');
html.includes('payments.js?v=179')
    ? pass('payments.js cache bump')
    : fail('?v= not bumped');

console.log('\n── §13.11 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Show total, paid, remaining, next debit, plan type, method (ACH/card)')
    ? pass('brainstorm line 446 checked')
    : fail('brainstorm 446 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Payments summary fields')
    ? pass('004 notes summary fields')
    : fail('004 missing summary note');

console.log(`\n${failed === 0 ? 'event payments summary smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
