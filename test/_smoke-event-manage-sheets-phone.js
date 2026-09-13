// Smoke test — §13.14 Create/manage sheets phone announce (line 474)
// Run: node test/_smoke-event-manage-sheets-phone.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.14 create sheet phone ────────────────────────────────────────────');
const basics = read('js/portal/events/create/step-basics.js');
basics.includes('ec-grid-3')
    && !basics.includes('grid-template-columns:1fr 1fr 1fr')
    ? pass('event type uses ec-grid-3 (no inline 3-col)')
    : fail('event type still forced 3-col');

const createSheet = read('js/portal/events/create/sheet.js');
createSheet.includes('safe-area-inset-top')
    && createSheet.includes('min-height:44px')
    && createSheet.includes('@media(max-width:639px)')
    && createSheet.includes('.ec-grid-3')
    ? pass('create header safe-area + footer 44px + grid @639px')
    : fail('create sheet phone chrome incomplete');

console.log('\n── §13.14 manage sheet phone ────────────────────────────────────────────');
const manageShell = read('js/portal/events/manage/shell.js');
manageShell.includes('safe-area-inset-top')
    && manageShell.includes('@media (max-width:639px)')
    && manageShell.includes('min-height:44px')
    && manageShell.includes('font-size:16px')
    && manageShell.includes('var(--color-primary')
    ? pass('manage header safe-area + phone touch/16px + primary token')
    : fail('manage shell phone chrome incomplete');

const sms = read('js/portal/events/manage/sms-invites.js');
sms.includes('font-size:16px')
    && sms.includes('em-input')
    ? pass('SMS invite search uses 16px / em-input')
    : fail('SMS invite search missing 16px');

const hosts = read('js/portal/events/manage/hosts.js');
hosts.includes('font-size:16px')
    && hosts.includes('em-input')
    ? pass('Hosts search uses 16px / em-input')
    : fail('Hosts search missing 16px');

console.log('\n── Overview announce before Full event editor ───────────────────────────');
const overview = read('js/portal/events/manage/overview.js');
const smsIdx = overview.indexOf('smsInvitesHtml');
const editorIdx = overview.indexOf('Full event editor');
smsIdx > -1 && editorIdx > -1 && smsIdx < editorIdx
    ? pass('SMS invites HTML before Full event editor')
    : fail('SMS invites still below Full event editor');
overview.includes('emAnnounceCard')
    || overview.includes('Announce')
    ? pass('announce QR block present near top')
    : fail('announce QR block missing');

console.log('\n── Bundle + SW ──────────────────────────────────────────────────────────');
const html = read('pages/portal/events.html');
html.includes('events.bundle.js?v=190')
    ? pass('portal bundle ?v=190')
    : fail('bundle not bumped to 190');

const sw = read('sw.js');
sw.includes("CACHE_NAME = 'jm-portal-v139'")
    && sw.includes('events.bundle.js?v=190')
    ? pass('SW CACHE_NAME v139 + precache ?v=190')
    : fail('SW cache/precache not bumped');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('ec-grid-3')
    && bundle.includes('emAnnounceCard')
    && (bundle.includes('safe-area-inset-top') || bundle.includes('safe-area-inset-top, 0px'))
    ? pass('events.bundle includes phone announce fixes')
    : fail('bundle missing phone announce fixes');

console.log('\n── Docs ─────────────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Create/manage sheets usable on phone for host tasks needed at announce (incl. SMS invite)')
    ? pass('brainstorm line 474 checked')
    : fail('brainstorm 474 not checked');

console.log(`\n${failed === 0 ? 'event manage sheets phone smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
