// Smoke — RSVP stepped sheet (conditional wizard)
// Run: node test/_smoke-event-rsvp-wizard.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── EventsRsvpWizard core ────────────────────────────────────────────────');
const wiz = read('js/components/events/rsvp-wizard.js');
wiz.includes('function needsPrep(')
    && wiz.includes('function getSteps(')
    && wiz.includes('function open(')
    && wiz.includes('openIfNeeded')
    && wiz.includes('EventsRsvpWizard')
    ? pass('needsPrep + getSteps + open API')
    : fail('wizard core missing');

['contact', 'party', 'legal', 'pay', 'review'].forEach((k) => {
    wiz.includes(`key: '${k}'`) || wiz.includes(`contact:`) || true;
});
wiz.includes("key: 'contact'")
    && wiz.includes("key: 'party'")
    && wiz.includes("key: 'legal'")
    && wiz.includes("key: 'pay'")
    && wiz.includes("key: 'review'")
    ? pass('conditional step keys present')
    : fail('step keys missing');

wiz.includes("pricing_mode === 'paid'")
    && wiz.includes('hasRequiredDisclaimers')
    && wiz.includes('needsAmenityVote')
    && wiz.includes('hasIncludedCatalog')
    ? pass('needsPrep gates include paid/legal/options')
    : fail('needsPrep gates incomplete');

wiz.includes('erSheetRoot')
    && wiz.includes('create-event-checkout')
    && wiz.includes('erSheetTotal')
    && wiz.includes('_refreshPartyTotalBar')
    && wiz.includes('er-receipt')
    && read('css/pages/portal/events/detail.css').includes('safe-area-inset-bottom')
    ? pass('sheet shell + checkout submit + safe-area CSS')
    : fail('shell/submit incomplete');

console.log('\n── Public + portal wiring ───────────────────────────────────────────────');
const rsvp = read('js/events/rsvp.js');
rsvp.includes('pubOpenGuestRsvpWizard')
    && rsvp.includes('pubMaybeOpenRsvpDeepLink')
    && rsvp.includes('er-wizard-prompt')
    ? pass('public guest wizard + deep link + prompt')
    : fail('public rsvp wiring missing');

const body = read('js/events/body.js');
body.includes('pubOpenGuestRsvpWizard')
    && body.includes('needsPrep')
    ? pass('CTA panel redirects to wizard when prep')
    : fail('CTA panel wiring missing');

const hero = read('js/events/hero.js');
hero.includes('pubOpenGuestRsvpWizard() || pubOpenCtaPanel')
    ? pass('sticky CTA opens wizard first')
    : fail('hero CTA wiring missing');

const engagement = read('js/portal/events/engagement/rsvp.js');
engagement.includes('EventsRsvpWizard.needsPrep')
    && engagement.includes("mode: 'member'")
    ? pass('portal evtHandleRsvp opens wizard when prep')
    : fail('portal engagement wiring missing');

const sections = read('js/portal/events/detail/sections.js');
sections.includes('er-wizard-prompt')
    && sections.includes('EventsRsvpWizard.needsPrep')
    ? pass('portal detail strips inline prep for wizard')
    : fail('portal sections prep strip missing');

const detail = read('js/portal/events/detail.js');
detail.includes("params.get('rsvp') === '1'")
    ? pass('portal deep-link ?rsvp=1')
    : fail('portal deep-link missing');

const main = read('js/portal/events/main.js');
main.includes('rsvp-wizard.js')
    ? pass('portal main imports rsvp-wizard')
    : fail('main.js missing rsvp-wizard import');

console.log('\n── Assets ───────────────────────────────────────────────────────────────');
const html = read('events/index.html');
html.includes('rsvp-wizard.js?v=194')
    && html.includes('detail.css?v=194')
    ? pass('public page loads wizard + CSS v194')
    : fail('public asset bump incomplete');

read('pages/portal/events.html').includes('events.bundle.js?v=194')
    ? pass('portal bundle ?v=194')
    : fail('portal bundle not bumped');

read('sw.js').includes('jm-portal-v142')
    ? pass('SW CACHE_NAME v142')
    : fail('SW not bumped');

const css = read('css/pages/portal/events/detail.css');
css.includes('.er-panel')
    && css.includes('.er-dot.is-active')
    && css.includes('.er-total-bar')
    && css.includes('.er-receipt')
    && css.includes('height:92dvh')
    && css.includes('safe-area-inset-bottom')
    ? pass('wizard CSS present')
    : fail('wizard CSS missing');

console.log(failed ? `\n${failed} failed\n` : '\nRSVP wizard smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
