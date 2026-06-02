/**
 * Static smoke: Event SMS Manage Notifications tab (Phase 4).
 * Run: node test/_smoke-event-sms-notifications-ui.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const shell = read('js/portal/events/manage/shell.js');
const sheet = read('js/portal/events/manage/sheet.js');
const notifications = read('js/portal/events/manage/notifications.js');
const shared = read('js/auth/shared.js');
const main = read('js/portal/events/main.js');
const portalHtml = read('portal/events.html');
const danger = read('js/portal/events/manage/danger.js');

function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('event SMS notifications UI smoke\n');

assert(fs.existsSync(path.join(root, 'js/portal/events/manage/notifications.js')), 'notifications.js exists');
pass('manage/notifications.js exists');

assert(/key:\s*'notifications',\s*label:\s*'Notifications'/.test(shell), 'M3A_TABS includes Notifications after RSVPs');
assert(shell.indexOf("key: 'rsvps'") < shell.indexOf("key: 'notifications'"), 'Notifications tab follows RSVPs');
pass('shell tabs include Notifications in order');

assert(/tab === 'notifications'/.test(sheet), 'sheet routes notifications tab');
assert(/Notifications\.loadNotifications/.test(sheet), 'sheet lazy-loads notifications data');
assert(!/\bM3A_TABS\b/.test(sheet), 'sheet must not reference module-local M3A_TABS');
assert(/Shell\.getVisibleTabs/.test(sheet) && /canManageNotifications/.test(sheet), 'sheet uses shell tab API and permission gate');
assert(/getVisibleTabs/.test(shell) && /tabs:\s*M3A_TABS/.test(shell), 'shell owns tabs and exports getVisibleTabs');
pass('sheet router supports notifications tab');

assert(/send-event-sms/.test(notifications), 'notifications uses send-event-sms Edge Function');
assert(!/send-sms/.test(notifications.replace(/send-event-sms/g, '')), 'notifications does not call send-sms directly');
assert(/loadNotifications/.test(notifications) && /notificationsHtml/.test(notifications) && /wireNotifications/.test(notifications), 'notifications module exports load/render/wire');
assert(/function _smsSchemaMissingMessage/.test(notifications) && /function _throwIfDbError/.test(notifications), 'notifications schema-missing fallback helpers');
assert(/094_event_sms_notifications/.test(notifications), 'schema-missing message references migration 094');
assert(/getFilteredRecipients/.test(notifications), 'recipient filters exist');
assert(/Select all opted-in/.test(notifications), 'select all opted-in control exists');
assert(/Message history/.test(notifications), 'message history section exists');
assert(/function maskPhone/.test(notifications) && /slice\(-4\)/.test(notifications), 'phone masking helper');
pass('notifications module structure');

assert(/rsvp_confirmation/.test(notifications) === false || !/message_type:\s*'rsvp_confirmation'/.test(notifications), 'no automated RSVP confirmation send in UI');
assert(!/schedule-event-sms-reminders/.test(notifications), 'no reminder cron from UI');
assert(!/SMS_REMINDERS_ENABLED/.test(notifications), 'reminders not enabled from UI');
pass('no automated SMS sends from manage UI');

assert(/function canManageEventNotifications/.test(shared), 'canManageEventNotifications helper');
pass('auth helper for notifications permission');

assert(/manage\/notifications\.js/.test(main), 'main.js imports notifications module');
pass('portal bundle entry imports notifications');

const portalBefore = portalHtml;
assert(!/manage\/notifications\.js/.test(portalHtml), 'portal/events.html unchanged (no direct script tag)');
pass('portal/events.html unchanged');

assert(/notificationsPrefill/.test(sheet), 'sheet supports notifications prefill open option');
assert(/offerCancellationSmsPrompt/.test(danger), 'danger zone offers cancellation SMS modal');
assert(/message_type:\s*'cancellation'/.test(danger), 'cancellation prompt uses cancellation message type');
assert(/select_all_opted_in:\s*true/.test(danger), 'cancellation prompt sends to all opted-in');
assert(/Reply STOP to opt out/.test(danger), 'cancellation default body includes STOP language');
assert(/emNotifMessageType/.test(notifications), 'compose has message type selector');
assert(/value:\s*'cancellation'/.test(notifications) && /value:\s*'update'/.test(notifications), 'manual/cancellation/update types in compose');
assert(/message_type:\s*messageType/.test(notifications), 'send uses selected message type');
assert(/sendSmsAllOptedIn/.test(notifications), 'shared send-all-opted-in helper for coordinators');
pass('cancellation SMS prompt and compose message types');

console.log('\nevent SMS notifications UI smoke: all pass');
