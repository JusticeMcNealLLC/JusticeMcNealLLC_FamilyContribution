// Smoke — public paid-member sticky CTA opens RSVP flow (clothing walkthrough)
// Run: node test/_smoke-event-public-rsvp-member-cta.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Public hero paid-member CTA ──────────────────────────────────────────');
const hero = read('js/events/hero.js');
hero.includes('pubOpenMemberRsvpFlow()')
    && !/pricing_mode === 'paid'[\s\S]*?onclick="pubHandlePaidRsvp\(\)"/.test(hero)
    ? pass('paid-member sticky CTA uses pubOpenMemberRsvpFlow')
    : fail('paid-member CTA still calls pubHandlePaidRsvp directly');
hero.includes('pubEventPaidCents')
    ? pass('hero paid gate uses pubEventPaidCents')
    : fail('hero missing pubEventPaidCents gate');

console.log('\n── pubOpenMemberRsvpFlow + validate scroll ──────────────────────────────');
const rsvp = read('js/events/rsvp.js');
rsvp.includes('function pubOpenMemberRsvpFlow')
    && rsvp.includes('memberRsvpCard')
    && rsvp.includes('scrollIntoView')
    && rsvp.includes('data-inc-answer')
    ? pass('pubOpenMemberRsvpFlow reveals card + scrolls + focuses clothing')
    : fail('pubOpenMemberRsvpFlow incomplete');
rsvp.includes('function pubEventPaidCents')
    ? pass('pubEventPaidCents helper defined')
    : fail('pubEventPaidCents missing');

const seatsFailOpens = /seatsErr\) \{\s*pubOpenMemberRsvpFlow\(\);/;
seatsFailOpens.test(rsvp)
    ? pass('seats validation failure opens member RSVP flow')
    : fail('seatsErr path missing pubOpenMemberRsvpFlow');

console.log('\n── Globals + cache bump ─────────────────────────────────────────────────');
const index = read('js/events/index.js');
index.includes("'pubOpenMemberRsvpFlow'")
    ? pass('index.js defers pubOpenMemberRsvpFlow for onclick')
    : fail('pubOpenMemberRsvpFlow not in deferred onclick list');

const html = read('events/index.html');
html.includes('hero.js?v=191')
    && html.includes('rsvp.js?v=191')
    && html.includes('index.js?v=191')
    ? pass('events/index.html cache bump ?v=191')
    : fail('public JS ?v= not 191');

const sw = read('sw.js');
sw.includes("CACHE_NAME = 'jm-portal-v139'")
    ? pass('SW CACHE_NAME jm-portal-v139')
    : fail('SW not bumped');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ public RSVP member CTA smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
