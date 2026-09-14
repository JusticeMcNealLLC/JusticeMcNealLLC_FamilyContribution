// Smoke test — §13.12 Danger-zone safe for payment-linked RSVPs (line 462)
// Run: node test/_smoke-event-manage-danger-zone.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.12 cancel-party-participation helper ─────────────────────────────');
exists('supabase/functions/_shared/cancel-party-participation.ts')
    ? pass('cancel-party-participation.ts exists')
    : fail('cancel-party-participation.ts missing');

const helper = read('supabase/functions/_shared/cancel-party-participation.ts');
helper.includes("status: 'cancelled'")
    && helper.includes('event_payment_plans')
    && helper.includes('event_payment_installments')
    && helper.includes('removePartyAmenityVoteIfUncommitted')
    && !helper.includes('refunds.create')
    && !/from ['"]https:\/\/esm\.sh\/stripe/.test(helper)
    ? pass('helper cancels party/plans; no Stripe refunds')
    : fail('helper missing cancel path or imports Stripe');

console.log('\n── manage-event-participation wires cancel ──────────────────────────────');
const edge = read('supabase/functions/manage-event-participation/index.ts');
edge.includes('cancelPartyParticipation')
    && edge.includes('allForEvent: true')
    && edge.includes('payerUserId')
    && edge.includes('payerGuestRsvpId')
    && edge.includes('refunds: false')
    && !/\.refunds\.create\s*\(/.test(edge)
    ? pass('remove/reset cancel parties before RSVP delete')
    : fail('participation edge missing party cancel');

console.log('\n── Danger UI — no refund CTA; cancel via edge ───────────────────────────');
const danger = read('js/portal/events/manage/danger.js');
danger.includes('process-event-cancellation')
    && danger.includes('Paid records (no in-app refund)')
    && !danger.includes('Refund review')
    && !/Request\s+(Full\s+)?Refund/i.test(danger)
    && !danger.includes('data-action="refund"')
    ? pass('danger cancel uses process-event-cancellation; no refund button')
    : fail('danger UI still refunds or bypasses cancel edge');

const participation = read('js/portal/events/manage/participation.js');
participation.includes('Cancel participation')
    && participation.includes('NOT refunded')
    && participation.includes('open payment plan')
    ? pass('participation confirm copy is cancel-only')
    : fail('participation copy missing cancel/no-refund');

const rsvps = read('js/portal/events/manage/rsvps.js');
rsvps.includes('Cancel participation')
    && rsvps.includes('data-has-party')
    ? pass('rsvps labels Cancel participation when paid/party')
    : fail('rsvps missing Cancel participation label');

const money = read('js/portal/events/manage/money.js');
!/Request\s+(Full\s+)?Refund/i.test(money)
    && !money.includes('data-action="refund"')
    ? pass('money tab has no refund CTA')
    : fail('money tab has refund CTA');

console.log('\n── Bundle + cache bump ──────────────────────────────────────────────────');
const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('process-event-cancellation')
    && bundle.includes('Paid records (no in-app refund)')
    && bundle.includes('Cancel participation')
    ? pass('events.bundle includes danger-zone safe copy')
    : fail('bundle missing danger-zone updates');

const html = read('pages/portal/events.html');
html.includes('events.bundle.js?v=237')
    ? pass('events.bundle cache bump v=237')
    : fail('bundle ?v= not bumped to 237');

console.log('\n── Docs ─────────────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Danger-zone safe for payment-linked RSVPs (**no refund button**; cancel participation only as product allows)')
    ? pass('brainstorm line 462 checked')
    : fail('brainstorm 462 not checked');

const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Danger-zone')
    && contracts.includes('§13.12 line 462')
    ? pass('004 notes danger-zone payment-linked FINAL')
    : fail('004 missing danger-zone note');

const runbook = read('docs/product/improvements/pages/events/007_host_out_of_band_refunds.md');
runbook.includes('Cancel participation')
    && runbook.includes('manage-event-participation')
    ? pass('007 notes cancel participation without refund')
    : fail('007 missing cancel participation note');

console.log(`\n${failed === 0 ? 'event manage danger-zone smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
