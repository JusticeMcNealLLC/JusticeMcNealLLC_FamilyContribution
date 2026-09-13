// Smoke — RSVP one name + size/color chips (guest UX)
// Run: node test/_smoke-rsvp-name-choices-ux.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Party seats: hide payer name ─────────────────────────────────────────');
const party = read('js/components/events/party-seats.js');
party.includes('hidePayerName')
    && party.includes('type="hidden"')
    && party.includes('syncPayerNameFromContact')
    && party.includes('data-hide-payer-name')
    ? pass('hidePayerName + hidden payer input + sync helper')
    : fail('party-seats hidePayerName missing');

const body = read('js/events/body.js');
const rsvp = read('js/events/rsvp.js');
body.includes('hidePayerName: true')
    && rsvp.includes('hidePayerName: true')
    && rsvp.includes('pubSyncGuestContactToPayerName')
    ? pass('guest CTA + desktop pass hidePayerName and sync')
    : fail('guest forms missing hidePayerName wiring');

console.log('\n── Included items: chips + swatches ─────────────────────────────────────');
const included = read('js/components/events/included-items.js');
included.includes('ed-inc-chip')
    && included.includes('ed-inc-swatch')
    && included.includes('choiceChipsHtml')
    && included.includes('choiceSwatchesHtml')
    && included.includes('wireChoiceControls')
    && !/needsChoices\(item\.option_type\)[\s\S]{0,80}<select/.test(included)
    ? pass('size/select chips + color swatches; no select for choice types')
    : fail('chips/swatches missing or select still used for choices');

included.includes("item.option_type === 'color'")
    && included.includes("item.option_type === 'size' || item.option_type === 'select'")
    ? pass('color→swatches; size/select→chips')
    : fail('option_type branching wrong');

const css = read('css/pages/portal/events/detail.css');
css.includes('.ed-inc-chip')
    && css.includes('.ed-inc-swatch')
    && css.includes('.ed-inc-chip.is-selected')
    ? pass('detail.css chip/swatch styles')
    : fail('CSS missing chip/swatch rules');

console.log('\n── Cache bump ───────────────────────────────────────────────────────────');
const html = read('events/index.html');
html.includes('included-items.js?v=193')
    && html.includes('party-seats.js?v=193')
    && html.includes('body.js?v=193')
    && html.includes('rsvp.js?v=193')
    && html.includes('detail.css?v=193')
    ? pass('public events assets at v=193')
    : fail('public cache bump incomplete');

read('sw.js').includes('jm-portal-v141')
    ? pass('SW CACHE_NAME jm-portal-v141')
    : fail('SW not bumped');

console.log(failed ? `\n${failed} failed\n` : '\nrsvp name/choices UX smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
