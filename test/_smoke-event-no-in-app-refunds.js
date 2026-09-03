// Smoke test — §13.10 no in-app refunds
// Run: node test/_smoke-event-no-in-app-refunds.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.10 process-event-cancellation status-only ────────────────────────');
const edge = read('supabase/functions/process-event-cancellation/index.ts');
edge.includes('single_user_refund')
    && edge.includes('In-app refunds are disabled')
    && !/\.refunds\.create\s*\(/.test(edge)
    && !/from ['"]https:\/\/esm\.sh\/stripe/.test(edge)
    ? pass('edge refuses single_user_refund; no Stripe refunds')
    : fail('edge still refunds or missing reject');
edge.includes("status: 'cancelled'")
    && edge.includes('refunds: false')
    ? pass('cancel path is status-only')
    : fail('status-only cancel missing');

console.log('\n── §13.10 portal UI ─────────────────────────────────────────────────────');
const rsvp = read('js/portal/events/engagement/rsvp.js');
!rsvp.includes('All paid attendees will receive a full refund')
    && !rsvp.includes('non_refundable_expenses_cents')
    && rsvp.includes('NOT be auto-refunded')
    ? pass('cancel UI has no full-refund prompt')
    : fail('cancel UI still promises refunds');
!rsvp.includes('grace_refund_eligible: true')
    && rsvp.includes('grace_window_end: null')
    ? pass('reschedule does not open grace refunds')
    : fail('reschedule still enables grace refunds');
rsvp.includes('In-app refunds are disabled')
    && !rsvp.includes("single_user_refund: true")
    ? pass('grace refund helper does not call edge refund')
    : fail('grace refund still calls edge');

const sections = read('js/portal/events/detail/sections.js');
!sections.includes('Request Full Refund')
    ? pass('no Request Full Refund button')
    : fail('grace refund CTA still present');

const danger = read('js/portal/events/manage/danger.js');
danger.includes('Stripe Dashboard')
    && !danger.includes("M3b's Money tab")
    ? pass('danger copy points to Stripe out-of-band')
    : fail('danger copy incomplete');

const comp = read('js/portal/events/detail/competition.js');
!comp.includes('cancelled with full refund')
    ? pass('competition copy no longer promises full refund')
    : fail('competition still promises full refund');

const bundle = read('js/portal/events/events.bundle.js');
!bundle.includes('Request Full Refund')
    && bundle.includes('NOT be auto-refunded')
    ? pass('events.bundle rebuilt without grace refund CTA')
    : fail('bundle stale');

console.log('\n── §13.10 docs ──────────────────────────────────────────────────────────');
exists('docs/product/improvements/pages/events/007_host_out_of_band_refunds.md')
    ? pass('host out-of-band refunds doc exists')
    : fail('host doc missing');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Confirm **no in-app refund** flows (host docs only for out-of-band)')
    ? pass('brainstorm line 442 checked')
    : fail('brainstorm 442 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('No in-app refunds')
    && contracts.includes('007_host_out_of_band_refunds')
    ? pass('004 notes status-only cancel + host doc')
    : fail('004 missing note');

console.log(`\n${failed === 0 ? 'event no in-app refunds smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
