// Smoke test — §13.12 Host SMS invites MVP
// Run: node test/_smoke-event-manage-host-sms-invites.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.12 host SMS invites edge + migration ─────────────────────────────');
exists('supabase/functions/send-event-invites/index.ts')
    ? pass('send-event-invites edge exists')
    : fail('send-event-invites edge missing');

const edge = read('supabase/functions/send-event-invites/index.ts');
edge.includes('event_invite')
    && edge.includes('member_ids')
    && edge.includes('You\'re invited')
    && edge.includes('/events/?e=')
    ? pass('edge resolves members/phones + invite template')
    : fail('edge missing invite contract pieces');

const config = read('supabase/config.toml');
config.includes('send-event-invites')
    ? pass('config.toml registers send-event-invites')
    : fail('config.toml missing send-event-invites');

const mig = read('supabase/migrations/20260903140000_114_sms_messages_event_invite.sql');
mig.includes('event_invite')
    && mig.includes('event_payment_link')
    ? pass('migration allows event_invite (+ event_payment_link)')
    : fail('migration missing event_invite types');

console.log('\n── §13.12 Overview SMS invites UI ───────────────────────────────────────');
const invites = read('js/portal/events/manage/sms-invites.js');
invites.includes('send-event-invites')
    && invites.includes('SMS invites')
    && invites.includes('emSmsInviteSend')
    ? pass('sms-invites.js picker + send')
    : fail('sms-invites UI missing');

const overview = read('js/portal/events/manage/overview.js');
overview.includes('smsInvitesHtml')
    && overview.includes('wireSmsInvites')
    ? pass('overview wires SMS invites below QR')
    : fail('overview missing SMS invites wiring');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('send-event-invites')
    && bundle.includes('SMS invites')
    && bundle.includes('emSmsInviteSend')
    ? pass('events.bundle includes host SMS invites')
    : fail('bundle missing host SMS invites');

const html = read('pages/portal/events.html');
html.includes('events.bundle.js?v=180')
    ? pass('events.bundle cache bump v=180')
    : fail('bundle ?v= not bumped to 180');

console.log('\n── §13.12 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — **Host SMS invites:** pick members with phones and/or add numbers; send event name + public link')
    ? pass('brainstorm line 457 checked')
    : fail('brainstorm 457 not checked');

const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Host SMS invites')
    && (contracts.includes('send-event-invites') || contracts.includes('§13.12 line 457'))
    ? pass('004 notes host SMS invites')
    : fail('004 missing host SMS invites note');

console.log(`\n${failed === 0 ? 'event manage host SMS invites smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
