// Smoke — §13.15 Colorado E2E dry-run package (line 482)
// Run: node test/_smoke-event-colorado-dry-run.js
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.15 Colorado dry-run prep + runbook ───────────────────────────────');
const sql = read('scripts/prep-colorado-dry-run-2028.sql');
sql.includes("status = 'open'")
    && sql.includes('amenity_voting')
    && sql.includes('co-am-dinner')
    && sql.includes('colorado-snowboarding-2028')
    ? pass('prep SQL opens event + amenity options')
    : fail('prep SQL incomplete');

const runbook = read('docs/product/improvements/pages/events/colorado_launch_dry_run.md');
[
    'SMS invite',
    'guest RSVP',
    'vote',
    'ACH',
    'magic-link',
    'roster',
    'SMS_DRY_RUN',
    'verify-colorado-dry-run-2028.js --pre',
    'verify-colorado-dry-run-2028.js --post',
].forEach((needle) => {
    runbook.toLowerCase().includes(needle.toLowerCase())
        ? pass(`runbook mentions ${needle}`)
        : fail(`runbook missing ${needle}`);
});

const createRb = read('docs/product/improvements/pages/events/colorado_launch_create.md');
createRb.includes('colorado_launch_dry_run.md')
    ? pass('create runbook links dry-run doc')
    : fail('create runbook missing dry-run link');

const verify = read('scripts/verify-colorado-dry-run-2028.js');
verify.includes('--post')
    && verify.includes('event_parties')
    && verify.includes('event_payment_plans')
    && verify.includes('event_invite')
    ? pass('verify script has --pre/--post checks')
    : fail('verify script incomplete');

console.log('\n── Preflight verify ────────────────────────────────────────────────────');
const pre = spawnSync(process.execPath, ['scripts/verify-colorado-dry-run-2028.js', '--pre'], {
    cwd: root,
    encoding: 'utf8',
});
pre.status === 0
    ? pass('verify --pre ALL PASS')
    : fail(`verify --pre failed:\n${pre.stdout || ''}${pre.stderr || ''}`);

console.log('\n── Docs (482 only if --post green) ──────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
const post = spawnSync(process.execPath, ['scripts/verify-colorado-dry-run-2028.js', '--post'], {
    cwd: root,
    encoding: 'utf8',
});
const postOk = post.status === 0;
if (postOk) {
    pass('verify --post ALL PASS');
    brainstorm.includes('[x] **MVP** — End-to-end dry run: SMS invite → guest RSVP → vote → ACH/card setup → magic-link SMS → host roster/money')
        ? pass('brainstorm line 482 checked')
        : fail('brainstorm 482 not checked after --post green');
} else {
    pass('verify --post not green yet (walkthrough pending — OK)');
    brainstorm.includes('[ ] **MVP** — End-to-end dry run: SMS invite → guest RSVP → vote → ACH/card setup → magic-link SMS → host roster/money')
        ? pass('brainstorm 482 correctly still open')
        : fail('brainstorm 482 should stay open until --post green');
}
brainstorm.includes('[ ] **MVP** — Host sends real SMS invites to family; cache/SW bump')
    ? pass('brainstorm 483 still open')
    : fail('brainstorm 483 should stay open');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ Colorado dry-run smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
