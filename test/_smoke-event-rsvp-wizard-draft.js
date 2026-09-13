// Smoke — RSVP wizard draft persist + step hydrate opts
// Run: node test/_smoke-event-rsvp-wizard-draft.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Draft helpers (rsvp-wizard) ──────────────────────────────────────────');
const wiz = read('js/components/events/rsvp-wizard.js');
wiz.includes("jm:er-rsvp-draft:v1:")
    && wiz.includes('function saveDraft(')
    && wiz.includes('function loadDraft(')
    && wiz.includes('function clearDraft(')
    && wiz.includes('function flushCurrentStep(')
    && wiz.includes('scheduleSaveDraft')
    ? pass('draft save/load/clear + flushCurrentStep')
    : fail('draft helpers missing');

wiz.includes('flushCurrentStep()')
    && wiz.includes('initialSeats')
    && wiz.includes('ackedIds')
    && wiz.includes('selectedOptionId')
    && wiz.includes('choice: STATE.form.payment_choice')
    ? pass('Back/Next flush + step hydrate from STATE.form')
    : fail('hydrate wiring incomplete');

wiz.includes('STATE._draftCleared')
    && wiz.includes('clearDraft(event.id')
    ? pass('clear draft on successful submit/checkout')
    : fail('clear-on-submit missing');

console.log('\n── Component hydrate opts ───────────────────────────────────────────────');
const party = read('js/components/events/party-seats.js');
party.includes('initialSeats')
    ? pass('party-seats initialSeats')
    : fail('party-seats initialSeats missing');

const disc = read('js/components/events/disclaimers.js');
disc.includes('ackedIds')
    ? pass('disclaimers ackedIds')
    : fail('disclaimers ackedIds missing');

const amenity = read('js/components/events/amenity-voting.js');
amenity.includes('selectedOptionId')
    ? pass('amenity-voting selectedOptionId')
    : fail('amenity selectedOptionId missing');

const invest = read('js/components/events/invest-ack.js');
invest.includes('acknowledged')
    ? pass('invest-ack acknowledged')
    : fail('invest-ack acknowledged missing');

const pay = read('js/components/events/payment-choice.js');
pay.includes('opts?.choice')
    && (pay.includes('plan_kind') || pay.includes('planKind'))
    ? pass('payment-choice choice/planKind hydrate')
    : fail('payment-choice hydrate missing');

console.log('\n── Ship bumps ───────────────────────────────────────────────────────────');
read('pages/portal/events.html').includes('events.bundle.js?v=220')
    ? pass('portal bundle ?v=220')
    : fail('portal bundle not bumped to 220');

read('events/index.html').includes('rsvp-wizard.js?v=220')
    ? pass('public rsvp-wizard ?v=220')
    : fail('public wizard asset not bumped');

read('sw.js').includes('jm-portal-v169')
    ? pass('SW CACHE_NAME v169')
    : fail('SW not bumped to v169');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('jm:er-rsvp-draft:v1:')
    && bundle.includes('flushCurrentStep')
    ? pass('events.bundle includes draft helpers')
    : fail('bundle missing draft helpers (run build:events)');

console.log(failed ? `\n${failed} failed\n` : '\nRSVP wizard draft smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
