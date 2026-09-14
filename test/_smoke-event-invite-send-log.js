// Smoke test — §13.12 Invite send log / resent history thin FINAL
// Run: node test/_smoke-event-invite-send-log.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.12 Notifications history labels + filters ────────────────────────');
const notif = read('js/portal/events/manage/notifications.js');
notif.includes('TYPE_LABELS')
    && notif.includes('event_invite')
    && notif.includes('event_payment_link')
    && notif.includes('messageTypeLabel')
    ? pass('TYPE_LABELS for invite / payment link')
    : fail('TYPE_LABELS missing');

notif.includes('historyFilter')
    && notif.includes('data-history-filter')
    && notif.includes('getFilteredHistoryMessages')
    && notif.includes('Invites')
    && notif.includes('Payment links')
    ? pass('history filter chips All/Invites/Payment/Manual')
    : fail('history filters missing');

console.log('\n── §13.12 Overview recent invites ───────────────────────────────────────');
const invites = read('js/portal/events/manage/sms-invites.js');
invites.includes("message_type', 'event_invite'")
    || invites.includes('message_type", "event_invite"')
    || invites.includes(".eq('message_type', 'event_invite')")
    ? pass('loads recent event_invite sms_messages')
    : fail('recent invite query missing');

invites.includes('emSmsInviteRecent')
    && invites.includes('data-scroll-people-reach')
    && invites.includes('See all SMS history')
    ? pass('People peek + scroll to SMS history')
    : fail('People invite peek missing');

const html = read('pages/portal/events.html');
html.includes('events.bundle.js?v=238')
    ? pass('bundle ?v=238')
    : fail('bundle not bumped to 238');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('TYPE_LABELS')
    && bundle.includes('emSmsInviteRecent')
    && bundle.includes('data-history-filter')
    ? pass('events.bundle includes invite send log UI')
    : fail('bundle missing invite send log');

console.log('\n── §13.12 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Invite send log / resent history (thin)')
    ? pass('brainstorm line 460 checked')
    : fail('brainstorm 460 not checked');

const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Invite send log')
    || contracts.includes('§13.12 line 460')
    ? pass('004 notes invite send log')
    : fail('004 missing invite send log note');

console.log(`\n${failed === 0 ? 'event invite send log smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
