// Smoke — §13.15 Colorado About + clothing + disclaimers (line 481)
// Run: node test/_smoke-event-colorado-content.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.15 Colorado content SQL ──────────────────────────────────────────');
const sql = read('scripts/fill-colorado-event-content-2028.sql');
[
    ['Itinerary tab', 'co-tab-itinerary'],
    ["What's covered tab", 'co-tab-covered'],
    ['What to bring tab', 'co-tab-bring'],
    ['Lodging tab', 'co-tab-lodging'],
    ['Clothing size', 'co-inc-size'],
    ['Clothing color', 'co-inc-color'],
    ['Clothing size photo', 'photo-1556821840-3a63f95609a7'],
    ['Clothing color photo', 'photo-1489987707025-afc232f7ea0f'],
    ['default-no-refunds', 'default-no-refunds'],
    ['default-flyers', 'default-flyers'],
    ['no in-app refunds policy', 'non-refundable for any reason via the event system'],
    ['target slug', "colorado-snowboarding-2028"],
].forEach(([label, needle]) => {
    sql.includes(needle) ? pass(`SQL has ${label}`) : fail(`SQL missing ${label}`);
});

console.log('\n── Runbook + apply script ───────────────────────────────────────────────');
const runbook = read('docs/product/improvements/pages/events/colorado_launch_create.md');
runbook.includes('fill-colorado-event-content-2028')
    && runbook.includes('about_tabs')
    && runbook.includes('default-no-refunds')
    && runbook.includes('482')
    ? pass('runbook 481 section + defer RSVP to 482')
    : fail('runbook 481 incomplete');

const apply = read('scripts/fill-colorado-event-content-2028.js');
apply.includes('load-env')
    && apply.includes('fill-colorado-event-content-2028.sql')
    ? pass('apply script uses load-env + SQL')
    : fail('apply script incomplete');

console.log('\n── Create sheet persistence paths still present ─────────────────────────');
const submit = read('js/portal/events/create/submit.js');
submit.includes('about_tabs')
    && submit.includes('included_items')
    && submit.includes('disclaimers')
    ? pass('submit.js still writes about_tabs / included_items / disclaimers')
    : fail('submit.js missing JSON column writes');

const included = read('js/portal/events/create/step-included.js');
included.includes('Clothing size')
    && included.includes('Clothing color')
    ? pass('step-included Trip clothing preset intact')
    : fail('step-included clothing preset missing');

console.log('\n── Docs ─────────────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — About tabs + included clothing options + no-refund disclaimers filled')
    ? pass('brainstorm line 481 checked')
    : fail('brainstorm 481 not checked');
brainstorm.includes('[ ] **MVP** — End-to-end dry run: SMS invite → guest RSVP → vote → ACH/card setup → magic-link SMS → host roster/money')
    ? pass('brainstorm 482 still open')
    : fail('brainstorm 482 should stay open');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ Colorado content smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
