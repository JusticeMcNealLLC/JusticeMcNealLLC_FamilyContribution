// Smoke — portal Your RSVP card: single stacked CTA, no Message Host / Continue / guest hint
// Run: node test/_smoke-event-portal-rsvp-card.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Portal RSVP card CTA ─────────────────────────────────────────────────');
const sections = read('js/portal/events/detail/sections.js');

sections.includes('function evtMemberRsvpStackBtnHtml')
    && sections.includes('ed-rsvp-stack-btn')
    && sections.includes('ed-rsvp-stack-label')
    && sections.includes('ed-rsvp-stack-price')
    ? pass('stacked RSVP button helper present')
    : fail('missing evtMemberRsvpStackBtnHtml / stack classes');

!sections.includes('Message Host')
    ? pass('no Message Host in sections.js')
    : fail('Message Host still in sections.js');

!sections.includes('Continue RSVP')
    && !sections.includes('er-wizard-prompt')
    ? pass('no Continue RSVP / wizard prompt block')
    : fail('Continue RSVP or er-wizard-prompt still present');

/function evtBuildDetailGuestRsvpHintHtml\(\) \{\s*\/\/[^\n]*\s*return '';\s*\}/.test(sections)
    && !sections.includes('Guests RSVP on the')
    && !sections.includes('ed-rsvp-guest-hint')
    ? pass('guest public-link hint is a no-op')
    : fail('guest hint still renders copy');

/labelEl\.textContent = unpaidGoing \? 'Complete payment' : 'RSVP'/.test(sections)
    ? pass('evtUpdateMemberRsvpBtnLabels updates stack spans')
    : fail('label helper does not update stack spans');

console.log('\n── Styles + ship ────────────────────────────────────────────────────────');
const css = read('css/pages/portal/events/detail.css');
css.includes('.ed-rsvp-stack-btn')
    && css.includes('.ed-rsvp-stack-label')
    && css.includes('.ed-rsvp-stack-price')
    ? pass('detail.css stack button styles')
    : fail('missing stack button CSS');

const html = read('pages/portal/events.html');
html.includes('index.css?v=195')
    && html.includes('events.bundle.js?v=195')
    ? pass('portal events.html ?v=195')
    : fail('portal cache bump not 195');

const sw = read('sw.js');
sw.includes("CACHE_NAME = 'jm-portal-v143'")
    ? pass('SW CACHE_NAME jm-portal-v143')
    : fail('SW not bumped to v143');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('ed-rsvp-stack-btn')
    && !bundle.includes('Message Host')
    && !bundle.includes('Continue RSVP')
    ? pass('events.bundle.js rebuilt with stacked CTA')
    : fail('bundle missing stack CTA or still has old strings');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ portal RSVP card smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
