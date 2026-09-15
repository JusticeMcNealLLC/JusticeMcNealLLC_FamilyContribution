// Smoke — Event discussion pane + sheet
// Run: node test/_smoke-event-discussion-pane.js
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── EventsDiscussion ─────────────────────────────────────────────────────');
const js = read('js/components/events/discussion.js');
js.includes('EventsDiscussion')
    && js.includes('scrollToLatest')
    && js.includes('edDiscussSheetMount')
    && js.includes('ed-discuss-open')
    ? pass('discussion helper API + sheet mount')
    : fail('discussion helper incomplete');

const css = read('css/pages/portal/events/detail.css');
css.includes('.ed-discuss-card')
    && css.includes('height:240px')
    && css.includes('height:92dvh')
    && css.includes('.ed-discuss-panel')
    ? pass('fixed pane + 92dvh sheet CSS')
    : fail('discussion CSS missing');

const portal = read('js/portal/events/detail/template.js');
portal.includes('ed-discuss-card')
    && portal.includes('data-discuss-open')
    && portal.includes('ed-discuss-body')
    ? pass('portal discussion markup')
    : fail('portal discussion markup missing');

const pub = read('js/events/index.js');
pub.includes('ed-discuss-card')
    && pub.includes('data-discuss-open')
    ? pass('public discussion markup')
    : fail('public discussion markup missing');

read('js/portal/events/main.js').includes('discussion.js')
    ? pass('portal main imports discussion.js')
    : fail('main.js missing discussion import');

read('events/index.html').includes('discussion.js')
    ? pass('public page loads discussion.js')
    : fail('public page missing discussion.js');

read('js/portal/events/detail/comments.js').includes('EventsDiscussion')
    && read('js/events/body.js').includes('EventsDiscussion')
    ? pass('load/post wires pane + latest scroll')
    : fail('comment render missing EventsDiscussion hook');

console.log(failed ? `\n${failed} failed\n` : '\nDiscussion pane smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
