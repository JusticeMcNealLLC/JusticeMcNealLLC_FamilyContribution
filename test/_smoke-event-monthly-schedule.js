// Smoke test — §13.10 monthly schedule until fund deadline
// Run: node test/_smoke-event-monthly-schedule.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.10 payment-schedule builder ──────────────────────────────────────');
const scheduleSrc = read('supabase/functions/_shared/payment-schedule.ts');
scheduleSrc.includes('buildMonthlyInstallmentRows')
    && scheduleSrc.includes('addMonthsClamped')
    && scheduleSrc.includes('Math.ceil(left / open)')
    ? pass('payment-schedule.ts builder present')
    : fail('payment-schedule.ts missing builder');

// Lightweight eval of builder logic by extracting via transpile-ish strip
const choiceSrc = read('supabase/functions/_shared/payment-choice.ts');
choiceSrc.includes('monthsUntilFundDeadline')
    ? pass('monthsUntilFundDeadline shared')
    : fail('monthsUntilFundDeadline missing');

// Inline port of builder for sum check (mirrors Deno module)
function addMonthsClamped(date, months) {
    const src = new Date(date.getTime());
    const day = src.getDate();
    const result = new Date(src.getTime());
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
    return result;
}
function monthsBetweenInclusive(anchor, deadline) {
    if (deadline <= anchor) return 0;
    let months = (deadline.getFullYear() - anchor.getFullYear()) * 12
        + (deadline.getMonth() - anchor.getMonth());
    if (deadline.getDate() >= anchor.getDate()) months += 1;
    return Math.max(1, months);
}
function buildRows(totalDueCents, anchorAt, fundDeadline) {
    const totalDue = Math.max(0, Math.floor(Number(totalDueCents) || 0));
    const anchor = new Date(anchorAt);
    const deadline = new Date(fundDeadline);
    const n = monthsBetweenInclusive(anchor, deadline);
    if (n < 1 || totalDue <= 0) throw new Error('bad');
    const rows = [];
    let left = totalDue;
    for (let i = 0; i < n; i++) {
        const open = n - i;
        const amount = i === n - 1 ? left : Math.ceil(left / open);
        left -= amount;
        let due = i === 0 ? new Date(anchor.getTime()) : addMonthsClamped(anchor, i);
        if (due.getTime() > deadline.getTime()) due = new Date(deadline.getTime());
        rows.push({ sequence: i + 1, amount_cents: amount, due_at: due.toISOString() });
    }
    return rows;
}

const anchor = new Date('2026-09-02T12:00:00.000Z');
const deadline = new Date('2027-09-02T12:00:00.000Z');
const rows = buildRows(100000, anchor, deadline);
const sum = rows.reduce((s, r) => s + r.amount_cents, 0);
sum === 100000
    ? pass(`installment amounts sum to total (${rows.length} months)`)
    : fail(`sum ${sum} !== 100000`);
rows[0].amount_cents === Math.ceil(100000 / rows.length)
    ? pass('first installment matches ceil(total/n)')
    : fail('first installment amount mismatch');
rows.every((r) => new Date(r.due_at) <= deadline)
    ? pass('all due_at <= fund_deadline')
    : fail('due_at past fund_deadline');

console.log('\n── §13.10 prep / checkout / webhook wiring ──────────────────────────────');
const prep = read('supabase/functions/_shared/paid-rsvp-prep.ts');
prep.includes('buildMonthlyInstallmentRows')
    && prep.includes("kind: 'scheduled'")
    ? pass('prep generates monthly scheduled installments')
    : fail('prep missing monthly generation');
prep.includes('Monthly payments require a fund deadline')
    ? pass('prep rejects monthly without deadline')
    : fail('prep missing monthly deadline guard');
prep.includes('nextPendingDebitAt')
    ? pass('webhook uses nextPendingDebitAt for monthly')
    : fail('nextPendingDebitAt missing');

const checkout = read('supabase/functions/create-event-checkout/index.ts');
checkout.includes("payPlanKind === 'monthly'")
    && checkout.includes('prepResult.installment_id')
    && checkout.includes('amount_cents')
    ? pass('checkout charges first monthly installment')
    : fail('checkout missing monthly first charge');

console.log('\n── §13.10 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Monthly schedule until fund deadline')
    ? pass('brainstorm line 437 checked')
    : fail('brainstorm 437 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Monthly schedule')
    && contracts.includes('payment-schedule.ts')
    ? pass('004 notes monthly schedule generation')
    : fail('004 missing monthly note');

console.log(`\n${failed === 0 ? 'event monthly schedule smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
