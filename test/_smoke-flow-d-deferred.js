// Smoke test — §13.9 Flow D deferred note (no verify-code bank share)
// Run: node test/_smoke-flow-d-deferred.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.9 Flow D docs ────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('### Flow D — explicitly deferred')
    ? pass('brainstorm Flow D deferred callout')
    : fail('brainstorm missing Flow D callout');
brainstorm.includes('- [x] **FINAL** — Explicit **D deferred** note in UI/docs')
    ? pass('brainstorm line 425 checked')
    : fail('brainstorm line 425 not checked');
read('docs/product/improvements/pages/events/002_event_seat_party_model_migration_draft.md')
    .includes('not on roadmap for Colorado')
    ? pass('002 schema draft D deferred note')
    : fail('002 missing D deferred reinforcement');

console.log('\n── §13.9 Flow D UI ──────────────────────────────────────────────────────');
const attach = read('js/components/events/attach-guests.js');
attach.includes('verification code') && attach.includes('not available')
    ? pass('Who pays? deferred hint in attach-guests.js')
    : fail('attach-guests.js missing deferred hint');

console.log('\n── §13.9 ship ───────────────────────────────────────────────────────────');
read('events/index.html').includes('attach-guests.js?v=170')
    ? pass('public attach-guests at v=170')
    : fail('public attach-guests not at v=170');
read('pages/portal/events.html').includes('?v=170')
    ? pass('portal events at v=170')
    : fail('portal not at v=170');
read('sw.js').includes('jm-portal-v131')
    ? pass('sw.js jm-portal-v131')
    : fail('sw.js missing jm-portal-v131');

console.log(failed ? `\n${failed} check(s) failed.\n` : '\nAll Flow D deferred smoke checks passed.\n');
process.exit(failed ? 1 : 0);
