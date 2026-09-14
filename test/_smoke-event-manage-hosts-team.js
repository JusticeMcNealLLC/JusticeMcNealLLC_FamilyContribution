// Smoke test — §13.12 Team hosts / coordinator alignment (line 461)
// Run: node test/_smoke-event-manage-hosts-team.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.12 Team hosts UI ─────────────────────────────────────────────────');
exists('js/portal/events/manage/hosts.js')
    ? pass('hosts.js exists')
    : fail('hosts.js missing');

const hosts = read('js/portal/events/manage/hosts.js');
hosts.includes("role: 'co_host'")
    && hosts.includes(".from('event_hosts')")
    && hosts.includes('hostsHtml')
    && hosts.includes('wireHosts')
    && hosts.includes('Team hosts')
    && hosts.includes('emHostsSearch')
    && !hosts.includes("role: 'checkin_staff'")
    ? pass('hosts list/add/remove co_host only')
    : fail('hosts.js missing co_host CRUD or exposes checkin_staff');

const people = read('js/portal/events/manage/people.js');
people.includes("from './hosts.js'")
    && people.includes('hostsHtml')
    && people.includes('wireHosts')
    ? pass('People tab wires Team hosts strip')
    : fail('People tab missing hosts wiring');

console.log('\n── Manage notifications gate still host/coordinator ─────────────────────');
const sheet = read('js/portal/events/manage/sheet.js');
sheet.includes('canManageEvents')
    && sheet.includes("from('event_hosts')")
    && sheet.includes('_canManageNotificationsForEvent')
    ? pass('sheet notifications gate uses event_hosts + canManageEvents')
    : fail('sheet notifications gate missing host/coordinator checks');

console.log('\n── Bundle + cache bump ──────────────────────────────────────────────────');
const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('Team hosts')
    && bundle.includes('emHostsSearch')
    && (bundle.includes("role: 'co_host'") || bundle.includes('role: "co_host"'))
    ? pass('events.bundle includes Team hosts')
    : fail('bundle missing Team hosts');

const html = read('pages/portal/events.html');
html.includes('events.bundle.js?v=237')
    ? pass('events.bundle cache bump v=237')
    : fail('bundle ?v= not bumped to 237');

console.log('\n── Docs ─────────────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Team/coordinator tools aligned with moderation plans')
    ? pass('brainstorm line 461 checked')
    : fail('brainstorm 461 not checked');

const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Team hosts')
    && (contracts.includes('§13.12 line 461') || contracts.includes('hosts.js'))
    ? pass('004 notes Team hosts strip')
    : fail('004 missing Team hosts note');

const moderation = read('docs/product/improvements/pages/events/moderation/003_event_coordinator_completion_status.md');
moderation.includes('Team hosts')
    && moderation.includes('461')
    ? pass('moderation 003 notes overhaul Hosts alignment')
    : fail('moderation 003 missing Hosts alignment note');

console.log(`\n${failed === 0 ? 'event manage hosts team smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
