// Smoke test — §13.11 FINAL payments theme/mobile polish
// Run: node test/_smoke-event-payments-theme.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.11 payments theme / safe-area ────────────────────────────────────');
const html = read('events/payments/index.html');
html.includes('viewport-fit=cover')
    ? pass('viewport-fit=cover')
    : fail('missing viewport-fit=cover');
html.includes('safe-area-inset-top')
    && html.includes('safe-area-inset-bottom')
    && html.includes('safe-area-inset-left')
    && html.includes('safe-area-inset-right')
    ? pass('safe-area insets top/bottom/left/right')
    : fail('incomplete safe-area insets');
html.includes('--color-text-muted')
    && html.includes('--color-accent-soft')
    && html.includes('--radius-md')
    ? pass('theme tokens for muted/accent/radius')
    : fail('theme tokens missing');
html.includes(':focus-visible')
    && html.includes('--color-focus-ring')
    ? pass('focus-visible rings')
    : fail('focus-visible missing');
html.includes('flex-wrap: wrap')
    && html.includes('min-width: 768px')
    ? pass('row wrap + desktop media query')
    : fail('layout polish missing');
html.includes('payments.js?v=179')
    ? pass('payments.js cache bump v=179')
    : fail('?v= not bumped to 179');

console.log('\n── §13.11 no portal tab-bar embed ───────────────────────────────────────');
!html.includes('has-bottom-bar')
    && !html.includes('tabs-placeholder')
    && !html.includes('nav-placeholder')
    ? pass('standalone page (no portal shell / tab bar)')
    : fail('unexpected portal shell markup');

console.log('\n── §13.11 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Theme/mobile polish; safe-area; no tab-bar collision on portal embeds if any')
    ? pass('brainstorm line 451 checked')
    : fail('brainstorm 451 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Theme/mobile polish')
    || contracts.includes('payments theme')
    || contracts.includes('safe-area')
    ? pass('004 notes theme/mobile polish')
    : fail('004 missing theme note');

console.log(`\n${failed === 0 ? 'event payments theme smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
