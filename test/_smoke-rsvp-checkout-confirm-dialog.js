// Smoke — branded RSVP → Stripe confirm (EventsHelpers.confirmDialog)
// Run: node test/_smoke-rsvp-checkout-confirm-dialog.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── RSVP checkout confirmDialog ─────────────────────────────────────────');

const helpers = read('js/components/events/helpers.js');
helpers.includes('function confirmDialog(')
    ? pass('EventsHelpers.confirmDialog defined')
    : fail('confirmDialog missing from helpers.js');
helpers.includes('confirmDialog,')
    ? pass('confirmDialog exported on EventsHelpers')
    : fail('confirmDialog not exported');
helpers.includes('function alertDialog(')
    ? pass('EventsHelpers.alertDialog defined')
    : fail('alertDialog missing from helpers.js');
helpers.includes('alertDialog,')
    ? pass('alertDialog exported on EventsHelpers')
    : fail('alertDialog not exported');
helpers.includes('showCancel')
    ? pass('confirmDialog supports showCancel for one-button alerts')
    : fail('confirmDialog missing showCancel');
helpers.includes('evtConfirmDialog')
    ? pass('uses #evtConfirmDialog root')
    : fail('missing evtConfirmDialog id');

const wizard = read('js/components/events/rsvp-wizard.js');
wizard.includes('EventsHelpers.confirmDialog')
    ? pass('rsvp-wizard awaits confirmDialog')
    : fail('rsvp-wizard missing confirmDialog');
/confirmMessage[\s\S]{0,220}!confirm\(msg\)/.test(wizard)
    ? fail('rsvp-wizard still uses bare confirm(msg) for payment')
    : pass('rsvp-wizard no longer uses bare confirm(msg) for payment');

const engagement = read('js/portal/events/engagement/rsvp.js');
engagement.includes('EventsHelpers.confirmDialog')
    ? pass('engagement/rsvp uses confirmDialog')
    : fail('engagement/rsvp missing confirmDialog');
/confirmMsg && !confirm\(confirmMsg\)/.test(engagement)
    ? fail('engagement still uses confirm(confirmMsg) for paid RSVP')
    : pass('engagement paid RSVP uses dialog');
/waitlistConfirm && !confirm\(waitlistConfirm\)/.test(engagement)
    ? fail('engagement still uses confirm(waitlistConfirm)')
    : pass('engagement waitlist claim uses dialog');

const pubRsvp = read('js/events/rsvp.js');
pubRsvp.includes('EventsHelpers.confirmDialog')
    ? pass('public rsvp.js uses confirmDialog')
    : fail('public rsvp.js missing confirmDialog');

const portalCss = read('css/pages/portal/events/base.css');
portalCss.includes('.evt-confirm-dialog')
    ? pass('portal base.css has confirm dialog styles')
    : fail('portal CSS missing .evt-confirm-dialog');
portalCss.includes('.evt-confirm-dialog__actions--single')
    ? pass('portal CSS has single-button alert layout')
    : fail('portal CSS missing single-button alert layout');

const publicCss = read('css/pages/public-event.css');
publicCss.includes('.evt-confirm-dialog')
    ? pass('public-event.css has confirm dialog styles')
    : fail('public CSS missing .evt-confirm-dialog');

const sheet = read('js/portal/events/create/sheet.js');
sheet.includes('alertDialog')
    ? pass('create sheet uses alertDialog')
    : fail('create sheet missing alertDialog');
/if \(err\) return alert\(err\)/.test(sheet)
    ? fail('create sheet still uses bare alert(err) on Next')
    : pass('create Next no longer uses bare alert(err)');

const submit = read('js/portal/events/create/submit.js');
submit.includes('alertDialog')
    ? pass('create submit uses alertDialog')
    : fail('create submit missing alertDialog');
/return alert\(/.test(submit)
    ? fail('create submit still returns bare alert()')
    : pass('create submit no longer returns bare alert()');

console.log(failed ? `\n${failed} check(s) failed\n` : '\nAll checks passed\n');
process.exit(failed ? 1 : 0);
