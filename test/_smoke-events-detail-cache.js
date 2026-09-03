// Smoke test — §13.7 FINAL detail asset cache bust (portal + public + SW)
// Run: node test/_smoke-events-detail-cache.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const V = '163';
const SW_V = '124';

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) {
    console.log(`  ✗ ${msg}`);
    failed++;
}

console.log('\n── §13.7 detail asset cache (portal) ────────────────────────────────────');
const portalHtml = read('pages/portal/events.html');
const indexCss = read('css/pages/portal/events/index.css');

portalHtml.includes(`index.css?v=${V}`)
    ? pass(`portal events.html loads index.css?v=${V}`)
    : fail(`portal events.html missing index.css?v=${V}`);
portalHtml.includes(`events.bundle.js?v=${V}`)
    ? pass(`portal events.html loads events.bundle.js?v=${V}`)
    : fail(`portal events.html missing events.bundle.js?v=${V}`);
indexCss.includes(`detail.css?v=${V}`)
    ? pass(`index.css @imports detail.css?v=${V}`)
    : fail(`index.css missing versioned detail.css @import`);

console.log('\n── §13.7 detail asset cache (public) ─────────────────────────────────────');
const publicHtml = read('events/index.html');

publicHtml.includes(`pages/events/detail.css?v=${V}`)
    ? pass('public events loads events/detail.css?v=157')
    : fail('public events missing events/detail.css?v=157');
publicHtml.includes(`portal/events/detail.css?v=${V}`)
    ? pass('public events loads portal/events/detail.css?v=157')
    : fail('public events missing portal/events/detail.css?v=157');
publicHtml.includes(`public-event.css?v=${V}`)
    ? pass('public events loads public-event.css?v=157')
    : fail('public events missing public-event.css?v=157');

const publicJs = [
    'helpers.js',
    'seat-picker.js',
    'included-items.js',
    'disclaimers.js',
    'amenity-voting.js',
    'payment-choice.js',
    'about-tabs.js',
    'index.js',
    'hero.js',
    'body.js',
    'rsvp.js',
    'raffle.js',
    'ticket.js',
];
for (const file of publicJs) {
    publicHtml.includes(`${file}?v=${V}`)
        ? pass(`public events loads ${file}?v=${V}`)
        : fail(`public events missing ${file}?v=${V}`);
}
!publicHtml.includes('?v=143')
    ? pass('public events has no stale ?v=143 tags')
    : fail('public events still references ?v=143');

console.log('\n── §13.7 service worker cache bump ───────────────────────────────────────');
const sw = read('sw.js');
const swRegister = read('js/sw-register.js');

sw.includes(`jm-portal-v${SW_V}`)
    ? pass(`sw.js CACHE_NAME jm-portal-v${SW_V}`)
    : fail(`sw.js missing jm-portal-v${SW_V}`);
!sw.includes("'jm-portal-v123'")
    ? pass('sw.js no longer uses jm-portal-v123')
    : fail('sw.js still has jm-portal-v123');
sw.includes(`/pages/portal/events.html`)
    ? pass('sw.js precaches events.html')
    : fail('sw.js missing events.html in SHELL_ASSETS');
sw.includes(`/css/pages/portal/events/index.css?v=${V}`)
    ? pass('sw.js precaches versioned events index.css')
    : fail('sw.js missing versioned events index.css in SHELL_ASSETS');
sw.includes(`/js/portal/events/events.bundle.js?v=${V}`)
    ? pass('sw.js precaches versioned events.bundle.js')
    : fail('sw.js missing versioned events.bundle.js in SHELL_ASSETS');
swRegister.includes(`sw.js?v=${SW_V}`)
    ? pass(`sw-register.js loads sw.js?v=${SW_V}`)
    : fail(`sw-register.js missing sw.js?v=${SW_V}`);

console.log(`\n${failed === 0 ? 'events detail cache smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
