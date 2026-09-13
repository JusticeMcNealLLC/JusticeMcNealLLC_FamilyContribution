// Smoke — portal mobile header slot contract + event detail migration
// Run: node test/_smoke-page-shell-mobile-slots.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── pageShell slotted header ─────────────────────────────────────────────');
const mh = read('js/components/pageShell/render/mobileHeader.js');
mh.includes('mhSlotLeft')
    && mh.includes('mhSlotCenter')
    && mh.includes('mhSlotRight')
    && mh.includes('resolveMobileHeaderSlots')
    ? pass('mobileHeader.js uses left/center/right slots')
    : fail('slotted markup missing');

mh.includes('newPostBtn')
    && mh.includes('notifBtn')
    && mh.includes("active === 'feed'")
    ? pass('feed preset keeps newPostBtn + notifBtn')
    : fail('feed preset ids missing');

const api = read('js/components/pageShell/ui/mobileHeaderSlots.js');
api.includes('export function setMobileHeader')
    && api.includes('export function resetMobileHeader')
    && api.includes('captureMobileHeaderSnapshot')
    ? pass('setMobileHeader / resetMobileHeader API present')
    : fail('mobileHeaderSlots API incomplete');

const index = read('js/components/pageShell/index.js');
index.includes('window.PageShell')
    && index.includes('captureMobileHeaderSnapshot')
    && index.includes('evtApplyDetailMobileHeader')
    ? pass('pageShell index wires PageShell + detail re-apply')
    : fail('pageShell index wiring incomplete');

const readme = read('js/components/pageShell/README.md');
readme.includes('setMobileHeader')
    && readme.includes('mhSlotLeft')
    ? pass('README documents mobile header slots')
    : fail('README missing slot docs');

console.log('\n── Events detail uses shell slots ───────────────────────────────────────');
const utils = read('js/portal/events/core/utils.js');
utils.includes('evtApplyDetailMobileHeader')
    && utils.includes('evtResetDetailMobileHeader')
    && utils.includes('setMobileHeader')
    && utils.includes('resetMobileHeader')
    ? pass('evtRouteByUrl applies/resets shell slots')
    : fail('events detail slot wiring missing');

const template = read('js/portal/events/detail/template.js');
!template.includes('ed-page-header-logo')
    ? pass('detail template no duplicate mobile logo')
    : fail('ed-page-header-logo still in template');

const detailCss = read('css/pages/portal/events/detail.css');
detailCss.includes('body.evt-detail-open .ed-page-header { display:none')
    && !detailCss.includes('body.evt-detail-open #mobileHeader { display:none')
    ? pass('phone detail hides ed-page-header; keeps #mobileHeader')
    : fail('detail.css phone rules wrong');

const shared = read('css/shared.css');
shared.includes('#mobileHeader .mh-slot')
    && shared.includes('mh-slot--center')
    ? pass('shared.css slot layout styles')
    : fail('mh-slot CSS missing from shared.css');

console.log('\n── Ship ─────────────────────────────────────────────────────────────────');
const html = read('pages/portal/events.html');
html.includes('index.css?v=197')
    && html.includes('events.bundle.js?v=197')
    ? pass('portal events.html ?v=197')
    : fail('cache bump not 197');

const sw = read('sw.js');
sw.includes("CACHE_NAME = 'jm-portal-v145'")
    ? pass('SW CACHE_NAME jm-portal-v145')
    : fail('SW not bumped to v145');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('evtApplyDetailMobileHeader')
    && bundle.includes('PageShell')
    ? pass('events.bundle.js includes detail slot helpers')
    : fail('bundle missing detail slot helpers');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ pageShell mobile slots smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
