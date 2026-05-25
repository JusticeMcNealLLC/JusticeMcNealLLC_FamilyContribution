'use strict';
/**
 * Phase 7 — ESM export migration progress (static).
 * Run: node test/_smoke-phase7-esm-progress.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const eventsDir = path.join(root, 'js/portal/events');
let passed = 0;
let failed = 0;

function check(label, ok, detail) {
    if (ok) { console.log(`  ✓ ${label}`); passed++; }
    else { console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); failed++; }
}

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

check('engagement/rsvp.js exports', /\bexport\s*\{/.test(read('js/portal/events/engagement/rsvp.js')));
check('engagement/raffle.js exports', /\bexport\s*\{/.test(read('js/portal/events/engagement/raffle.js')));
check('core/vendor-loader.js exports', read('js/portal/events/core/vendor-loader.js').includes('export async function ensureLeaflet'));
check('core/state.js exports EventsState', read('js/portal/events/core/state.js').includes('export const EventsState'));
check('core/utils.js exports', read('js/portal/events/core/utils.js').includes('export {'));
const listEsm = ['header.js', 'search.js', 'filters.js', 'buckets.js'].every((f) =>
    /export const PortalEventsList/.test(read(`js/portal/events/list/${f}`)));
check('list modules export (7/8, shell still IIFE)', listEsm);
check('list/shell.js still IIFE orchestrator', read('js/portal/events/list/shell.js').includes('(function () {'));
check('team/chat.js exports', read('js/portal/events/team/chat.js').includes('export const teamChatApi'));
check('team/tools.js exports', read('js/portal/events/team/tools.js').includes('export const teamToolsApi'));
check('team modules not IIFE', !read('js/portal/events/team/chat.js').includes('(function () {'));
const bundle = read('js/portal/events/events.bundle.js');
check('bundle uses EventsState', bundle.includes('EventsState'));
check('classic-chain-loader removed', !fs.existsSync(path.join(eventsDir, 'classic-chain-loader.js')));
check('verify-events-main script', fs.existsSync(path.join(root, 'scripts/verify-events-main.js')));
check('CI workflow present', fs.existsSync(path.join(root, '.github/workflows/events-bundle.yml')));

check('bundle includes evtEnsureLeaflet', bundle.includes('evtEnsureLeaflet'));

console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 7 ESM progress smoke: ${passed + failed} checks — ${passed} pass, ${failed} fail`);
process.exit(failed > 0 ? 1 : 0);
