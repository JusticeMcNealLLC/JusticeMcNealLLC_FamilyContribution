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
assert(/cancellation SMS/.test(danger) || /Phase 5/.test(danger), 'danger zone documents or offers cancellation SMS');
pass('cancellation SMS hook or Phase 5 note in danger');

console.log('\nevent SMS notifications UI smoke: all pass');
