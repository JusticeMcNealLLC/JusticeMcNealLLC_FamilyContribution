// Smoke test — §13.14 Public event + RSVP theme MVP (line 473)
// Run: node test/_smoke-event-public-theme.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.14 public event HTML theme ───────────────────────────────────────');
const html = read('events/index.html');
html.includes('viewport-fit=cover')
    ? pass('viewport-fit=cover')
    : fail('missing viewport-fit=cover');
html.includes('Theme_JMLLC001/Theme_JMLLC001.css')
    ? pass('loads Theme_JMLLC001.css')
    : fail('missing Theme_JMLLC001 link');
html.includes('theme-color" content="#13366E"')
    || html.includes("theme-color' content='#13366E'")
    || html.includes('content="#13366E"')
    ? pass('theme-color #13366E')
    : fail('theme-color not #13366E');
!html.includes('fonts.googleapis.com')
    && !html.includes('family=Inter')
    ? pass('no Inter Google Fonts link')
    : fail('still loads Inter from Google Fonts');
html.includes('public-event.css?v=187')
    && html.includes('index.js?v=191')
    ? pass('public CSS/JS cache bump (css v=187, index.js v=191)')
    : fail('public ?v= not bumped');

console.log('\n── public-event.css tokens + safe-area ──────────────────────────────────');
const css = read('css/pages/public-event.css');
!css.includes('#4f46e5')
    && !css.includes('#6d28d9')
    ? pass('no indigo #4f46e5 / #6d28d9')
    : fail('indigo accents remain in public-event.css');
!css.includes("font-family: 'Inter'")
    && !css.includes('font-family: "Inter"')
    && css.includes('--font-body')
    ? pass('body uses --font-body (no Inter)')
    : fail('Inter or missing --font-body');
css.includes('--color-primary')
    && css.includes('--font-headline')
    ? pass('uses --color-primary + --font-headline')
    : fail('missing theme token usage');
css.includes('body.public-event-detail .pub-nav')
    && css.includes('safe-area-inset-top')
    && /body\.public-event-detail\s+\.pub-nav[\s\S]*?safe-area-inset-top/.test(css)
    ? pass('sticky pub-nav uses safe-area-inset-top')
    : fail('pub-nav missing top safe-area');

console.log('\n── public index.js colors ───────────────────────────────────────────────');
const js = read('js/events/index.js');
!js.includes('#4f46e5')
    && !js.includes('#e0e7ff')
    && !js.includes('#6d28d9')
    && !js.includes('#a855f7')
    ? pass('no indigo/purple hardcodes in index.js')
    : fail('indigo/purple hardcodes remain in index.js');

console.log('\n── magic-link payments still themed ─────────────────────────────────────');
const pay = read('events/payments/index.html');
pay.includes('Theme_JMLLC001')
    && pay.includes('viewport-fit=cover')
    && pay.includes('safe-area-inset-top')
    ? pass('payments still Theme_JMLLC001 + safe areas')
    : fail('payments theme regression');

console.log('\n── Docs ─────────────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Public event + RSVP + magic-link: Theme_JMLLC001 tokens, mobile-first, `viewport-fit=cover`, safe areas')
    ? pass('brainstorm line 473 checked')
    : fail('brainstorm 473 not checked');

console.log(`\n${failed === 0 ? 'event public theme smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
