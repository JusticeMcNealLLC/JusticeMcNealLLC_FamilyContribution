// Smoke test — §13.11 SMS payment magic link + on-screen show/copy + manage resend
// Run: node test/_smoke-event-payment-magic-link.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.11 migration + shared SMS ────────────────────────────────────────');
exists('supabase/migrations/20260903130000_113_event_party_payment_link_sent.sql')
    ? pass('payment_link_sent_at migration exists')
    : fail('migration missing');
const sms = read('supabase/functions/_shared/event-payment-sms.ts');
sms.includes('notifyPartyPaymentLink')
    && sms.includes('buildPaymentLinkSmsBody')
    && sms.includes("message_type: 'event_payment_link'")
    && sms.includes('force')
    ? pass('shared payment-link SMS helpers')
    : fail('shared helpers missing');

console.log('\n── §13.11 webhook + edges ───────────────────────────────────────────────');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
webhook.includes('notifyPartyPaymentLink')
    && webhook.includes('party_id')
    ? pass('webhook sends payment link on first commit')
    : fail('webhook missing payment link notify');
exists('supabase/functions/resend-event-party-payment-link/index.ts')
    ? pass('resend-event-party-payment-link edge exists')
    : fail('resend edge missing');
const resend = read('supabase/functions/resend-event-party-payment-link/index.ts');
resend.includes('userCanManageEventNotifications')
    && resend.includes('invite_token')
    && resend.includes('force: true')
    ? pass('resend auth host JWT or invite_token')
    : fail('resend auth incomplete');
const checkout = read('supabase/functions/create-event-checkout/index.ts');
checkout.includes('invite_token')
    && checkout.includes('&t=')
    && checkout.includes('inviteTokenForUrl')
    ? pass('checkout returns invite_token and success t=')
    : fail('checkout invite_token / t= missing');

console.log('\n── §13.11 UI show/copy + manage ─────────────────────────────────────────');
const helpers = read('js/components/events/helpers.js');
helpers.includes('paymentMagicLinkHtml')
    && helpers.includes('wirePaymentMagicLinkCopy')
    && helpers.includes('stashPaymentInviteToken')
    ? pass('helpers payment magic link UI')
    : fail('helpers missing payment link UI');
const pubRsvp = read('js/events/rsvp.js');
pubRsvp.includes('stashPaymentInviteToken')
    && pubRsvp.includes('paymentMagicLinkHtml')
    ? pass('public RSVP stash + show')
    : fail('public RSVP payment link missing');
const manage = read('js/portal/events/manage/rsvps.js');
manage.includes('data-copy-pay-link')
    && manage.includes('data-resend-pay-sms')
    && manage.includes('resend-event-party-payment-link')
    ? pass('manage Copy + Resend SMS')
    : fail('manage resend/copy missing');
const sheet = read('js/portal/events/manage/sheet.js');
sheet.includes('invite_token')
    ? pass('manage loads party invite_token')
    : fail('sheet missing invite_token select');
const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('data-resend-pay-sms')
    && bundle.includes('paymentMagicLinkHtml')
    ? pass('events.bundle includes payment link UI')
    : fail('bundle missing payment link');

console.log('\n── §13.11 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — **SMS** magic link on RSVP/pay setup + resend from manage; **on-screen show/copy**')
    ? pass('brainstorm line 448 checked')
    : fail('brainstorm 448 not checked');
const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Payment magic-link SMS')
    || contracts.includes('payment magic-link SMS')
    || contracts.includes('event_payment_link')
    ? pass('004 notes payment magic-link SMS')
    : fail('004 missing payment link note');

console.log(`\n${failed === 0 ? 'event payment magic link smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
