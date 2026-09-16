// Smoke — §13.15 Colorado event create (line 480)
// Run: node test/_smoke-event-colorado-create.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.15 Colorado runbook + SQL locked values ──────────────────────────');
const runbook = read('docs/product/improvements/pages/events/colorado_launch_create.md');
const sql = read('scripts/create-colorado-event-2028.sql');

[
    ['slug colorado-snowboarding-2028', 'colorado-snowboarding-2028'],
    ['adult 100000', '100000'],
    ['kids_free true', 'kids_free'],
    ['capacity_mode none', "'none'"],
    ['fund_deadline 2027-11-01', '2027-11-01'],
    ['start_date 2028-01-25', '2028-01-25'],
    ['status draft', "'draft'"],
    ['event_type llc', "'llc'"],
    ['location_lat', '39.605'],
    ['location_lng', '-105.95417'],
].forEach(([label, needle]) => {
    sql.includes(needle) ? pass(`SQL has ${label}`) : fail(`SQL missing ${label}`);
});

runbook.includes('100000')
    && runbook.includes('2027-11-01')
    && runbook.includes('2028-01-25')
    && runbook.includes('capacity_mode')
    && runbook.includes('d92a898d-a6e8-4e11-a40f-32f2dd857b4c')
    && runbook.includes('39.605')
    ? pass('runbook locked table + staging id + map coords')
    : fail('runbook incomplete or missing staging id');

runbook.includes('481')
    && runbook.includes('About')
    ? pass('runbook defers About/disclaimers to 481')
    : fail('runbook missing 481 note');

console.log('\n── create sheet / submit still persist money + capacity ─────────────────');
const pricing = read('js/portal/events/create/step-pricing.js');
pricing.includes('kids_free')
    && pricing.includes('fund_deadline')
    && (pricing.includes('adult_price') || pricing.includes('ecAdultPrice'))
    ? pass('step-pricing has kids_free + fund_deadline + adult price')
    : fail('step-pricing missing locked fields');

const when = read('js/portal/events/create/step-when.js');
when.includes('capacity_mode')
    ? pass('step-when has capacity_mode')
    : fail('step-when missing capacity_mode');

const submit = read('js/portal/events/create/submit.js');
submit.includes('adult_price_cents')
    && submit.includes('kids_free')
    && submit.includes('capacity_mode')
    && submit.includes('fund_deadline')
    ? pass('submit.js persists adult_price_cents / kids_free / capacity_mode / fund_deadline')
    : fail('submit.js missing persistence fields');

const apply = read('scripts/create-colorado-event-2028.js');
apply.includes('load-env')
    && apply.includes('create-colorado-event-2028.sql')
    ? pass('apply script uses load-env + SQL file')
    : fail('apply script incomplete');

console.log('\n── Docs ─────────────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Create Colorado event with $1000 adult, kids free, no capacity cap, Oct/Nov 2027 deadline, Jan 2028 date')
    ? pass('brainstorm line 480 checked')
    : fail('brainstorm 480 not checked');
brainstorm.includes('[x] **MVP** — About tabs + included clothing options + no-refund disclaimers filled')
    ? pass('brainstorm 481 checked (content fill)')
    : fail('brainstorm 481 should be checked after content fill');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ Colorado create smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
