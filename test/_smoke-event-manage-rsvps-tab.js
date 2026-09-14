// Smoke test — §13.12 Manage RSVPs tab MVP (adults/kids, options, disclaimer, vote)
// Run: node test/_smoke-event-manage-rsvps-tab.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.12 manage RSVPs data load ────────────────────────────────────────');
const sheet = read('js/portal/events/manage/sheet.js');
sheet.includes('disclaimer_acks')
    && sheet.includes('amenity_vote_option_id')
    && sheet.includes('amenity_vote_status')
    ? pass('parties select includes disclaimer + vote fields')
    : fail('sheet parties select missing fields');

console.log('\n── §13.12 manage RSVPs UI ───────────────────────────────────────────────');
const rsvps = read('js/portal/events/manage/rsvps.js');
rsvps.includes('adultKidSubExtra')
    && rsvps.includes('seatOptionsSummary')
    && rsvps.includes('Disclaimers acked')
    && rsvps.includes('No disclaimer ack')
    && rsvps.includes('Vote: counted')
    && rsvps.includes('Vote: provisional')
    && rsvps.includes('No vote')
    ? pass('rsvps.js adults/kids + options + disclaimer + vote pills')
    : fail('rsvps UI enrichment missing');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('seatOptionsSummary')
    && bundle.includes('Disclaimers acked')
    && bundle.includes('amenity_vote_status')
    ? pass('events.bundle includes RSVPs tab MVP')
    : fail('bundle missing RSVPs MVP');

const html = read('pages/portal/events.html');
html.includes('events.bundle.js?v=238')
    ? pass('events.bundle cache bump v=238')
    : fail('bundle ?v= not bumped');

console.log('\n── §13.12 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — RSVPs tab: adults/kids, options, disclaimer ack, payer links, vote status')
    ? pass('brainstorm line 455 checked')
    : fail('brainstorm 455 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Manage RSVPs tab')
    || contracts.includes('RSVPs tab MVP')
    ? pass('004 notes manage RSVPs tab')
    : fail('004 missing RSVPs tab note');

console.log(`\n${failed === 0 ? 'event manage RSVPs tab smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
