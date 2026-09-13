// Smoke — unpaid Checkout must not count as going on paid events
// Run: node test/_smoke-event-going-count-paid.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Unpaid Checkout ≠ going (paid events) ───────────────────────────────');

const mig = read('supabase/migrations/20260904010000_116_public_event_going_count_paid_only.sql');
mig.includes("pricing_mode")
    && mig.includes("= 'paid'")
    && mig.includes('paid = TRUE')
    && mig.includes("status = 'going'")
    && mig.includes('public_event_going_count')
    ? pass('migration 116 paid-only branch')
    : fail('migration 116 paid-only branch missing');

const paidBranch = mig.indexOf("= 'paid' THEN");
const freeBranch = mig.indexOf('ELSE (');
const guestPaidOnly = mig.indexOf('FROM public.event_guest_rsvps', paidBranch);
const guestOrGoing = mig.indexOf('(status = \'going\' OR paid = TRUE)', freeBranch);
paidBranch >= 0
    && freeBranch > paidBranch
    && guestPaidOnly > paidBranch
    && guestPaidOnly < freeBranch
    && mig.slice(guestPaidOnly, freeBranch).includes('paid = TRUE')
    && !mig.slice(guestPaidOnly, freeBranch).includes('status = \'going\' OR')
    && guestOrGoing > freeBranch
    ? pass('paid branch guests paid-only; free keeps going OR paid')
    : fail('paid vs free guest count logic wrong');

const client = read('js/events/index.js');
client.includes('async function pubFetchGoingCount(eventId, event)')
    && client.includes("pricing_mode === 'paid'")
    && client.includes('.eq(\'paid\', true)')
    && client.includes("pubFetchGoingCount(event.id, event)")
    ? pass('client fallback paid filter + event arg')
    : fail('client pubFetchGoingCount fallback missing');

const schedule = read('supabase/functions/_shared/payment-schedule-webhook.ts');
schedule.includes('cancelPartyParticipation')
    && schedule.includes('neverCommitted')
    && schedule.includes("status: 'not_going'")
    && schedule.includes('removePartyAmenityVoteIfUncommitted')
    ? pass('checkout.expired cancels unpaid prep + clears unpaid going')
    : fail('expire unpaid cleanup missing');

const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('paid=true only')
    || contracts.includes('unpaid Checkout')
    || contracts.includes('does not count as going')
    ? pass('contracts note covers unpaid Checkout going')
    : fail('contracts note missing');

console.log(failed ? `\n${failed} failed\n` : '\nAll checks passed\n');
process.exit(failed ? 1 : 0);
