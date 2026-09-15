// Smoke — About Overview pill + one-row scrollable tablist
// Run: node test/_smoke-event-about-overview-pills.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

const helper = read('js/components/events/about-tabs.js');
const detail = read('js/portal/events/detail.js');
const template = read('js/portal/events/detail/template.js');
const pub = read('js/events/index.js');
const css = read('css/pages/portal/events/detail.css');

console.log('\n── About helper ─────────────────────────────────────────────────────────');
helper.includes('overview')
    && helper.includes("title: 'Overview'")
    && helper.includes('isOverviewTitle')
    && helper.includes('if (!extra.length) return')
    ? pass('Overview prepended only when extra tabs exist')
    : fail('about-tabs.js missing Overview prepend');

helper.includes("inline: 'center'")
    ? pass('active pill scrolls into view')
    : fail('tab click does not scroll the pill row');

console.log('\n── Portal + public ──────────────────────────────────────────────────────');
detail.includes('overview: rawDesc')
    && detail.includes('hasAboutTabs')
    && /descHtml = hasAboutTabs/.test(detail)
    ? pass('portal folds description into Overview when tabs exist')
    : fail('portal still renders standalone desc above pills');

template.includes('descHtml ? `<div class="ed-desc')
    ? pass('template omits empty description wrap')
    : fail('template always renders evtDescWrap');

pub.includes('overview: rawDesc')
    && pub.includes("descEl.style.display = 'none'")
    ? pass('public page hides standalone desc when tabs exist')
    : fail('public page still shows description above pills');

template.includes('includedCatalogHtml || \'\'')
    && !helper.includes('included_items')
    ? pass('Included catalog stays outside About pills')
    : fail('Included catalog accidentally folded into pills');

console.log('\n── Pill row ─────────────────────────────────────────────────────────────');
css.includes('flex-wrap:nowrap')
    && css.includes('overflow-x:auto')
    && css.includes('min-height:44px')
    && css.includes('white-space:nowrap')
    ? pass('tablist is one scrollable row')
    : fail('tablist still wraps or is not scrollable');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ about overview pills smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
