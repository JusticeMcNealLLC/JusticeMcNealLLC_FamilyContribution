// Smoke — events list clears iPhone notch when #mobileHeader is hidden
// Run: node test/_smoke-event-list-safe-area.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Events list safe-area (notch / Dynamic Island) ───────────────────────');
const html = read('pages/portal/events.html');
html.includes('viewport-fit=cover')
    ? pass('events.html has viewport-fit=cover')
    : fail('events.html missing viewport-fit=cover');

const base = read('css/pages/portal/events/base.css');
/body\[data-active-page="events"\] #mobileHeader\s*\{\s*display:\s*none/.test(base)
    ? pass('phone events list still hides #mobileHeader')
    : fail('#mobileHeader hide rule missing');
/#evtShell[\s\S]{0,80}safe-area-inset-top/.test(base)
    ? pass('hidden-header list pads #evtShell with safe-area-inset-top')
    : fail('#evtShell missing safe-area-inset-top pad');

const shared = read('css/shared.css');
/#mobileHeader\s*\{[\s\S]{0,80}safe-area-inset-top/.test(shared)
    ? pass('#mobileHeader uses safe-area-inset-top when shown')
    : fail('#mobileHeader missing safe-area-inset-top');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ event list safe-area smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
