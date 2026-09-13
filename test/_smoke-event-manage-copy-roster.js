// Smoke test — §13.12 Resend payment SMS + Copy roster MVP
// Run: node test/_smoke-event-manage-copy-roster.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.12 resend payment SMS (already shipped) ──────────────────────────');
const rsvps = read('js/portal/events/manage/rsvps.js');
rsvps.includes('data-resend-pay-sms')
    && rsvps.includes('resend-event-party-payment-link')
    ? pass('manage RSVPs Resend SMS still present')
    : fail('Resend SMS missing from rsvps.js');

console.log('\n── §13.12 copy roster ───────────────────────────────────────────────────');
const sheet = read('js/portal/events/manage/sheet.js');
sheet.includes('profile_picture_url, phone')
    && sheet.includes('guest_phone')
    ? pass('sheet loads profiles.phone + guest_phone')
    : fail('sheet phone selects missing');

rsvps.includes('function buildRosterTsv')
    && rsvps.includes('data-copy-roster')
    && rsvps.includes('Copy roster')
    && rsvps.includes("cols.join('\\t')")
    ? pass('buildRosterTsv + Copy roster UI')
    : fail('copy roster missing');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('buildRosterTsv')
    && bundle.includes('data-copy-roster')
    && bundle.includes('resend-event-party-payment-link')
    ? pass('events.bundle includes copy roster + resend')
    : fail('bundle missing copy roster / resend');

const html = read('pages/portal/events.html');
html.includes('events.bundle.js?v=181')
    ? pass('events.bundle cache bump v=181')
    : fail('bundle ?v= not bumped to 181');

console.log('\n── §13.12 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Resend payment magic-link SMS; basic export or copy roster')
    ? pass('brainstorm line 458 checked')
    : fail('brainstorm 458 not checked');

const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
(contracts.includes('Copy roster') || contracts.includes('copy roster'))
    && (contracts.includes('§13.12 line 458') || contracts.includes('Resend payment'))
    ? pass('004 notes copy roster / 458')
    : fail('004 missing copy roster note');

console.log(`\n${failed === 0 ? 'event manage copy roster smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
