// Smoke test — §13.14 Portal events list/detail Theme parity (line 476)
// Run: node test/_smoke-event-portal-list-detail-theme.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.14 portal events.html Theme stack ────────────────────────────────');
const html = read('pages/portal/events.html');
html.includes('Theme_JMLLC001/Theme_JMLLC001.css')
    && html.includes('tailwind.Theme_JMLLC001.css')
    ? pass('loads Theme_JMLLC001 + Theme Tailwind')
    : fail('missing Theme stack');
!html.includes('tailwind.portal.css')
    ? pass('no legacy tailwind.portal.css')
    : fail('still links tailwind.portal.css');
!html.includes('fonts.googleapis.com')
    && !html.includes('family=Inter')
    ? pass('no Inter Google Fonts')
    : fail('still loads Inter');
!html.includes('brand-')
    && html.includes('bg-primary')
    ? pass('brand-* swapped to primary utilities')
    : fail('brand-* or missing bg-primary remain');
html.includes('events.bundle.js?v=190')
    && html.includes('index.css?v=190')
    ? pass('bundle + list CSS ?v=190')
    : fail('cache bump not at 190');

console.log('\n── list/detail CSS off indigo ───────────────────────────────────────────');
const cssFiles = [
    'css/pages/portal/events/detail.css',
    'css/pages/portal/events/filters.css',
    'css/pages/portal/events/calendar.css',
    'css/pages/portal/events/cards.css',
    'css/pages/portal/events/layout.css',
    'css/pages/portal/events/rail.css',
    'css/pages/portal/events/hero.css',
    'css/pages/portal/events/base.css',
];
let cssIndigo = 0;
for (const rel of cssFiles) {
    const css = read(rel);
    if (css.includes('#4f46e5') || css.includes('#6366f1') || css.includes('#4338ca') || css.includes('#eef2ff')) {
        cssIndigo++;
        fail(`${rel} still has indigo/lavender hex`);
    }
}
if (!cssIndigo) pass('no #4f46e5 / #6366f1 / #4338ca / #eef2ff in list/detail CSS');

const detail = read('css/pages/portal/events/detail.css');
detail.includes('var(--color-primary')
    && detail.includes('.ed-primary-btn')
    ? pass('detail primary CTA uses Theme token')
    : fail('detail primary CTA not tokenized');

console.log('\n── JS fallbacks ─────────────────────────────────────────────────────────');
const constants = read('js/components/events/constants.js');
!constants.includes('#6366f1')
    && constants.includes('#13366E')
    ? pass('category gradients use navy primary')
    : fail('constants still indigo');

const card = read('js/components/events/card.js');
!card.includes('brand-')
    ? pass('card.js off brand-*')
    : fail('card.js still brand-*');

const uiTw = read('js/portal/events/team/ui-tw.js');
!uiTw.includes('indigo-')
    && uiTw.includes('bg-primary')
    ? pass('team ui-tw CTAs use primary')
    : fail('team ui-tw still indigo');

console.log('\n── SW + docs ────────────────────────────────────────────────────────────');
const sw = read('sw.js');
sw.includes("CACHE_NAME = 'jm-portal-v139'")
    && sw.includes('events.bundle.js?v=190')
    && sw.includes('events/index.css?v=190')
    && sw.includes('Theme_JMLLC001.css?v=190')
    ? pass('SW v139 + precache Theme/events @190')
    : fail('SW not bumped for v190');

const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Portal events list/detail visual parity with dashboard reference where applicable')
    ? pass('brainstorm line 476 checked')
    : fail('brainstorm 476 not checked');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ portal list/detail theme smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
