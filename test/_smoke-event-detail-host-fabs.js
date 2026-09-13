// Smoke — event detail host/team tools are circle FABs (not the RSVP bar)
// Run: node test/_smoke-event-detail-host-fabs.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Detail host/team FABs ────────────────────────────────────────────────');
const cta = read('js/portal/events/team/cta-bar.js');
cta.includes('function mountDetailFabs')
    && cta.includes('evt-detail-fab--manage')
    && cta.includes('evt-detail-fab--team')
    && cta.includes('evt-cta-team')
    ? pass('cta-bar mounts Manage/Team circle FABs')
    : fail('mountDetailFabs missing');
cta.includes('if (isHost || teamHubAccess)')
    && cta.includes('mountDetailFabs(eventId')
    ? pass('hosts/team skip the full-width RSVP bar')
    : fail('host/team still build the RSVP bar');
cta.includes('cleanupDetailFabs')
    && /cleanupBottomNav[\s\S]{0,200}cleanupDetailFabs/.test(cta)
    ? pass('leaving detail removes FABs')
    : fail('cleanup does not remove FABs');

const css = read('css/pages/portal/events/layout.css');
css.includes('.evt-detail-fabs')
    && css.includes('safe-area-inset-bottom')
    && css.includes('.evt-detail-fab--manage')
    && css.includes('.evt-detail-fab--team')
    ? pass('FAB stack matches Create corner + safe area')
    : fail('detail FAB CSS missing');
css.includes('body:has(#emSheet.em-open)')
    && css.includes('body:has(#etSheet.et-open)')
    ? pass('FABs hide while manage/team sheets are open')
    : fail('sheet-open hide rule missing');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ event detail host FABs smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
