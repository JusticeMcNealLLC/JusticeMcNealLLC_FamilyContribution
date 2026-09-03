// Smoke test — §13.11 magic-link payments route auth
// Run: node test/_smoke-event-payments-magic-auth.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.11 event-party-token guest + JWT ──────────────────────────────────');
exists('supabase/functions/_shared/event-party-token.ts')
    ? pass('event-party-token.ts exists')
    : fail('helper missing');
const helper = read('supabase/functions/_shared/event-party-token.ts');
helper.includes('guest_token')
    && helper.includes('payer_guest_rsvp_id')
    && helper.includes('event_guest_rsvps')
    ? pass('guest_token resolves via guest RSVP → party')
    : fail('guest_token path missing');
helper.includes('party_id or event_id required')
    && helper.includes('event_slug')
    ? pass('JWT multi-party requires party/event; supports slug')
    : fail('JWT single/multi party logic missing');

console.log('\n── §13.11 get-event-party-payments ──────────────────────────────────────');
const getEdge = read('supabase/functions/get-event-party-payments/index.ts');
getEdge.includes('guest_token')
    && getEdge.includes('invite_token, guest_token, or Authorization')
    ? pass('get edge accepts invite | guest | JWT')
    : fail('get edge guard incomplete');

console.log('\n── §13.11 public payments page ──────────────────────────────────────────');
exists('events/payments/index.html') && exists('js/events/payments.js')
    ? pass('payments page assets exist')
    : fail('payments page missing');
const page = read('js/events/payments.js');
page.includes('guest_token')
    && page.includes("get('g')")
    && page.includes('replaceState')
    && page.includes('canonicalizeInviteUrl')
    ? pass('page reads guest_token and canonicalizes to ?t=')
    : fail('page guest canonicalize missing');
page.includes('callEdgeFunction')
    && page.includes('My trip payments')
    ? pass('member JWT path + My trip payments title')
    : fail('member path or title missing');
const html = read('events/payments/index.html');
html.includes('My trip payments')
    && html.includes('payments.js?v=174')
    ? pass('HTML title + asset bump')
    : fail('HTML incomplete');

console.log('\n── §13.11 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Public page route auth’d by `guest_token` (and member equivalent)')
    ? pass('brainstorm line 445 checked')
    : fail('brainstorm 445 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Magic-link payments auth')
    && contracts.includes('guest_token')
    ? pass('004 notes magic-link auth')
    : fail('004 missing auth note');

console.log(`\n${failed === 0 ? 'event payments magic auth smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
