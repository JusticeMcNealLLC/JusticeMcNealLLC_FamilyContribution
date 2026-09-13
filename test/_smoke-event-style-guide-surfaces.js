// Smoke test — §13.14 Style-guide checklist pass for new surfaces (line 475)
// Run: node test/_smoke-event-style-guide-surfaces.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

function noIndigoBrand(src, label) {
    const bad = src.includes('#4f46e5')
        || src.includes('#4338ca')
        || src.includes('bg-brand-600')
        || src.includes('text-brand-600')
        || src.includes('brand-600');
    !bad ? pass(`${label}: no #4f46e5 / brand-600`) : fail(`${label}: indigo or brand-600 remain`);
}

console.log('\n── §13.14 create / manage / team shells ─────────────────────────────────');
noIndigoBrand(read('js/portal/events/create/sheet.js'), 'create sheet');
noIndigoBrand(read('js/portal/events/manage/shell.js'), 'manage shell');
const team = read('js/portal/events/team/shell.js');
team.includes('var(--color-primary')
    && !team.includes('#4f46e5')
    && !team.includes('#4338ca')
    ? pass('team shell primary uses Theme tokens')
    : fail('team shell still indigo primary');

const notify = read('js/portal/events/manage/notifications.js');
!notify.includes('#eef2ff')
    && !notify.includes('#4338ca')
    ? pass('manage notifications chips off indigo')
    : fail('notifications still use indigo chips');

const images = read('js/portal/events/manage/images.js');
!images.includes('#818cf8')
    && !images.includes('#f5f3ff')
    ? pass('manage images dropzone off indigo')
    : fail('images dropzone still indigo');

const raffle = read('js/portal/events/manage/raffle.js');
!raffle.includes('#818cf8')
    && !raffle.includes('#4f46e5')
    ? pass('manage raffle dropzone off indigo')
    : fail('raffle still indigo');

console.log('\n── seat-info + portal theme-color ───────────────────────────────────────');
const seat = read('events/seat-info/index.html');
seat.includes('Theme_JMLLC001/Theme_JMLLC001.css')
    && seat.includes('.ec-input')
    && seat.includes('.ec-label')
    && seat.includes('var(--color-text-muted')
    && !seat.includes('portal/events/detail.css')
    ? pass('seat-info Theme + ec-input/label + muted tokens; no detail.css')
    : fail('seat-info hygiene incomplete');

const portal = read('pages/portal/events.html');
portal.includes('theme-color" content="#13366E"')
    && portal.includes('events.bundle.js?v=190')
    && portal.includes('Theme_JMLLC001')
    ? pass('portal theme-color #13366E + Theme stack + bundle ?v=190')
    : fail('portal theme-color, Theme stack, or bundle version wrong');

console.log('\n── regression: public + payments theme ──────────────────────────────────');
const publicHtml = read('events/index.html');
publicHtml.includes('Theme_JMLLC001')
    && !publicHtml.includes('#4f46e5')
    ? pass('public event still Theme (no indigo hex in HTML)')
    : fail('public event theme regression');

const pay = read('events/payments/index.html');
pay.includes('Theme_JMLLC001')
    && pay.includes('viewport-fit=cover')
    ? pass('payments still Theme_JMLLC001 + viewport-fit')
    : fail('payments theme regression');

console.log('\n── SW + docs ────────────────────────────────────────────────────────────');
const sw = read('sw.js');
sw.includes('events.bundle.js?v=190')
    && sw.includes("CACHE_NAME = 'jm-portal-v139'")
    ? pass('SW precache bundle ?v=190 + CACHE_NAME jm-portal-v139')
    : fail('SW not bumped for v=190 / v139');

const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Style-guide checklist pass for all new surfaces')
    ? pass('brainstorm line 475 checked')
    : fail('brainstorm 475 not checked');
brainstorm.includes('[x] **FINAL** — Portal events list/detail visual parity with dashboard reference where applicable')
    ? pass('brainstorm 476 checked')
    : fail('brainstorm 476 not checked');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ all checks passed\n');
process.exit(failed ? 1 : 0);
