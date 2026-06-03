/**
 * Static smoke: Event SMS Phase 5.1 RSVP confirmation automation.
 * Run: node test/_smoke-event-sms-rsvp-confirmation.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const sms = read('supabase/functions/_shared/sms.ts');
const rsvp = read('supabase/functions/rsvp-guest-free/index.ts');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
const upsert = read('supabase/functions/upsert-event-sms-recipient/index.ts');
const confirmFn = read('supabase/functions/send-event-rsvp-confirmation/index.ts');
const config = read('supabase/config.toml');

assert(/SMS_RSVP_CONFIRMATIONS_ENABLED/.test(sms), 'shared sms uses SMS_RSVP_CONFIRMATIONS_ENABLED');
assert(/function sendEventRsvpConfirmation/.test(sms), 'sendEventRsvpConfirmation helper');
assert(/function trySendEventRsvpConfirmation/.test(sms), 'trySendEventRsvpConfirmation non-blocking wrapper');
assert(/hasRsvpConfirmationBeenSent/.test(sms), 'duplicate prevention helper');
assert(/message_type:\s*'rsvp_confirmation'/.test(sms), 'creates rsvp_confirmation sms_messages');
assert(/Reply STOP to opt out/.test(sms), 'STOP language in body builder');
assert(/SMS_OUTBOUND_PREFIX = 'JMLLC: '/.test(sms), 'outbound SMS brand prefix constant');
assert(/formatOutboundSmsBody/.test(sms), 'formatOutboundSmsBody helper');
assert(/formatSmsLocationLine/.test(sms), 'formatSmsLocationLine prefers address for SMS');
assert(/shouldIncludeSmsLocation/.test(sms), 'shouldIncludeSmsLocation gate helper');
assert(/form\.set\('Body', formatOutboundSmsBody\(body\)\)/.test(sms), 'Twilio send applies brand prefix');
assert(!/buildReminder24hBody|hasReminder24hBeenSent/.test(rsvp), 'RSVP functions do not send 24h reminders');

assert(/trySendEventRsvpConfirmation/.test(rsvp), 'rsvp-guest-free triggers confirmation');
assert(/trySendEventRsvpConfirmation/.test(webhook), 'stripe-webhook triggers confirmation');
assert(/trySendEventRsvpConfirmation/.test(upsert), 'upsert-event-sms-recipient triggers confirmation');
assert(/assertServiceRole/.test(confirmFn), 'send-event-rsvp-confirmation requires service role');

assert(/send-event-rsvp-confirmation/.test(config), 'config registers send-event-rsvp-confirmation');

console.log('event SMS RSVP confirmation smoke: all pass');
