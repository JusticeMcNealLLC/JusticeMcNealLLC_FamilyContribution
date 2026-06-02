/**
 * Static smoke: Event SMS Phase 5.2 — 24-hour reminders.
 * Run: node test/_smoke-event-sms-reminders.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const schedule = read('supabase/functions/schedule-event-sms-reminders/index.ts');
const sms = read('supabase/functions/_shared/sms.ts');
const config = read('supabase/config.toml');

assert(fs.existsSync(path.join(root, 'supabase/functions/schedule-event-sms-reminders/index.ts')), 'schedule-event-sms-reminders exists');

assert(/isSmsRemindersEnabled/.test(schedule), 'checks SMS_REMINDERS_ENABLED via shared helper');
assert(/SMS_REMINDERS_ENABLED/.test(sms), 'shared sms defines reminder flag');
assert(/REMINDER_24H_WINDOW|hoursMin:\s*23|hoursMax:\s*25/.test(sms), '24-hour window constants');
assert(/reminder24hWindowBounds/.test(sms), 'window bounds helper');
assert(/\.lt\('start_date'/.test(schedule), 'upper bound uses lt (25h window)');
assert(/reminder_24h/.test(schedule), 'message_type reminder_24h');
assert(/executeSendSms/.test(schedule), 'uses shared send helper');
assert(/hasReminder24hBeenSent/.test(schedule), 'duplicate prevention per event');
assert(/buildReminder24hBody/.test(schedule), 'shared reminder body builder');
assert(/Reply STOP to opt out/.test(sms), 'STOP language in reminder body');
assert(/resolveOptedInSmsTargets/.test(schedule), 'resolves opted-in recipients');

assert(!/sendEventRsvpConfirmation|trySendEventRsvpConfirmation/.test(schedule), 'no RSVP confirmation in reminder cron');
assert(!/message_type:\s*'cancellation'/.test(schedule), 'no cancellation automation');
assert(!/message_type:\s*'update'/.test(schedule), 'no update automation');
assert(!/rsvp_confirmation/.test(schedule), 'no rsvp_confirmation sends');

assert(/events_checked/.test(schedule) && /recipients_sent/.test(schedule), 'safe JSON summary fields');
assert(!/phone_e164.*jsonResponse|full phone/i.test(schedule), 'response should not expose full phones');

assert(/schedule-event-sms-reminders/.test(config), 'function registered in config');

console.log('event SMS 24h reminders smoke: all pass');
