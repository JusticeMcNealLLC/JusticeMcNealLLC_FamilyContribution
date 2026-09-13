// Smoke — create sheet text fields must not remount on each keystroke
// Run: node test/_smoke-event-create-input-focus.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Create sheet input focus ─────────────────────────────────────────────');

const llc = read('js/portal/events/create/step-llc.js');
/ecLlcMin[\s\S]{0,220}render\(\)/.test(llc)
    ? fail('LLC min participants still calls render() on input')
    : pass('LLC min participants updates without remounting');
/ecLlcCut[\s\S]{0,220}render\(\)/.test(llc)
    ? fail('LLC cut % still calls render() on input')
    : pass('LLC cut % updates without remounting');
llc.includes('_refreshLlcDerived')
    ? pass('LLC refreshes totals in place')
    : fail('LLC missing in-place totals refresh');

const pricing = read('js/portal/events/create/step-pricing.js');
/ecAdultPrice[\s\S]{0,180}render\(\)/.test(pricing)
    ? fail('Adult price still calls render() on input')
    : pass('Adult price updates without remounting');
/ecFundDeadline[\s\S]{0,180}render\(\)/.test(pricing)
    ? fail('Fund deadline still calls render() on input')
    : pass('Fund deadline updates without remounting');
pricing.includes('_refreshMonthlyEstimate')
    ? pass('Pricing refreshes monthly estimate in place')
    : fail('Pricing missing in-place monthly estimate');

const voting = read('js/portal/events/create/step-voting.js');
/enabled:\s*cfg\.enabled\s*&&\s*norm\.options\.length\s*>=\s*2/.test(voting)
    || /enabled:\s*cfg\.enabled === true && norm\.options\.length >= 2/.test(voting)
    ? fail('Amenity Enable still turns off when fewer than 2 options')
    : pass('Amenity Enable stays on while options are added');
voting.includes("cfg.options.push({ id: _newOptionId(), label: '', description: '' })")
    ? pass('Enable seeds blank amenity options')
    : fail('Enable does not seed amenity options');
/\.filter\(\(o\) => o\.label\)/.test(voting)
    ? fail('Amenity sync still drops blank options')
    : pass('Amenity sync keeps blank option rows');

console.log(failed ? `\n${failed} check(s) failed\n` : '\nAll checks passed\n');
process.exit(failed ? 1 : 0);
