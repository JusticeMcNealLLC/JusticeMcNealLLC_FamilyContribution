// Smoke — portal event detail uses shell mobile header slots (no dual bar)
// Run: node test/_smoke-event-detail-mobile-nav.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Detail → shell slots ─────────────────────────────────────────────────');
const utils = read('js/portal/events/core/utils.js');
utils.includes("classList.add('evt-detail-open')")
    && utils.includes('evtApplyDetailMobileHeader')
    && utils.includes('evtResetDetailMobileHeader')
    ? pass('detail open toggles class + shell slots')
    : fail('detail mobile header wiring incomplete');

const template = read('js/portal/events/detail/template.js');
!template.includes('ed-page-header-logo')
    ? pass('no duplicate logo in ed-page-header')
    : fail('ed-page-header-logo still present');

const css = read('css/pages/portal/events/detail.css');
css.includes('body.evt-detail-open .ed-page-header { display:none')
    && !/body\.evt-detail-open #mobileHeader\s*\{\s*display:\s*none/.test(css)
    ? pass('hides page header on phone; shell stays')
    : fail('phone detail CSS incorrect');

console.log('\n── Ship ─────────────────────────────────────────────────────────────────');
const html = read('pages/portal/events.html');
html.includes('index.css?v=197') && html.includes('events.bundle.js?v=197')
    ? pass('portal events.html ?v=197')
    : fail('cache bump not 197');

const sw = read('sw.js');
sw.includes("CACHE_NAME = 'jm-portal-v145'")
    ? pass('SW CACHE_NAME jm-portal-v145')
    : fail('SW not bumped');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ event detail mobile nav smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
