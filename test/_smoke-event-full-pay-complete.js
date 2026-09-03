// Smoke test — §13.10 one-time full pay; mark schedule complete
// Run: node test/_smoke-event-full-pay-complete.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.10 full plan stub ────────────────────────────────────────────────');
const prep = read('supabase/functions/_shared/paid-rsvp-prep.ts');

prep.includes("kind: installmentKind")
    && prep.includes("planKind === 'full' ? 'full' : 'scheduled'")
    ? pass('full plan creates kind=full installment')
    : fail('full installment kind missing');
prep.includes("next_debit_at: planKind === 'monthly' ? anchorAt : null")
    ? pass('full plan next_debit_at null at setup')
    : fail('full plan next_debit_at not null at setup');
prep.includes("planKind === 'full'")
    && prep.includes(".neq('id', installmentId)")
    ? pass('full prep cancels leftover pending installments')
    : fail('full prep missing leftover cancel');

console.log('\n── §13.10 checkout aligns to plan total_due ─────────────────────────────');
const checkout = read('supabase/functions/create-event-checkout/index.ts');
checkout.includes("payPlanKind === 'full'")
    && checkout.includes('total_due_cents')
    && checkout.includes('amountCents = planDue')
    ? pass('full checkout charges plan total_due_cents')
    : fail('full checkout missing plan total_due align');

console.log('\n── §13.10 completion invariants ─────────────────────────────────────────');
prep.includes('enforceFullPlanCompleted')
    ? pass('enforceFullPlanCompleted helper')
    : fail('enforceFullPlanCompleted missing');
prep.includes("status: 'completed'")
    && prep.includes('remaining_cents: 0')
    && prep.includes('next_debit_at: null')
    ? pass('full completion forces completed / remaining 0 / next_debit null')
    : fail('full completion invariants missing');
prep.includes('cancelLeftoverPendingInstallments')
    ? pass('cancels leftover pending on full success')
    : fail('cancel leftover pending missing');

console.log('\n── §13.10 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — One-time full pay path; mark schedule complete')
    ? pass('brainstorm line 436 checked')
    : fail('brainstorm 436 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Full pay completion')
    && contracts.includes('enforceFullPlanCompleted')
    ? pass('004 notes full-pay completion')
    : fail('004 missing full-pay note');

console.log(`\n${failed === 0 ? 'event full pay complete smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
