// Smoke — Manage Event host-job tabs
// Run: node test/_smoke-event-manage-tabs-ia.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Manage Event tab IA ──────────────────────────────────────────────────');

const shell = read('js/portal/events/manage/shell.js');
const sheet = read('js/portal/events/manage/sheet.js');
const overview = read('js/portal/events/manage/overview.js');
const eventTab = read('js/portal/events/manage/event.js');
const people = read('js/portal/events/manage/people.js');
const main = read('js/portal/events/main.js');

/key:\s*'event',\s*label:\s*'Event'/.test(shell)
    && /key:\s*'people',\s*label:\s*'People'/.test(shell)
    && /label:\s*'Competition'/.test(shell)
    && /label:\s*'Danger'/.test(shell)
    ? pass('shell has Event, People, Competition, Danger labels')
    : fail('shell missing host-job tab labels');

!/key:\s*'images'/.test(shell) && !/key:\s*'rsvps'/.test(shell) && !/key:\s*'notifications'/.test(shell)
    ? pass('Images / RSVPs / Notifications removed from tab bar')
    : fail('old feature tabs still in M3A_TABS');

/images:\s*'event'/.test(shell)
    && /rsvps:\s*'people'/.test(shell)
    && /notifications:\s*'people'/.test(shell)
    ? pass('legacy tab aliases defined')
    : fail('tab aliases missing');

/raffle_enabled/.test(shell) && /event_type === 'competition'/.test(shell)
    ? pass('Raffle / Competition visibility is conditional')
    : fail('unused feature tabs still always visible');

sheet.includes('EventsManageEvent') && sheet.includes("key === 'event'")
    ? pass('sheet routes Event tab')
    : fail('sheet missing Event route');
sheet.includes('EventsManagePeople') && sheet.includes("key === 'people'")
    ? pass('sheet routes People tab')
    : fail('sheet missing People route');

overview.includes('amenityVotingStatusHtml')
    && !overview.includes('pricingEditorHtml')
    && !overview.includes('emCopyForm')
    && !overview.includes('hostsHtml')
    && !overview.includes('smsInvitesHtml')
    ? pass('Overview is pulse-only (no editors / hosts / SMS)')
    : fail('Overview still mounts editor or SMS blocks');

eventTab.includes('emCopyForm')
    && eventTab.includes('imagesHtml')
    && eventTab.includes('pricingEditorHtml')
    && eventTab.includes('disclaimersEditorHtml')
    && eventTab.includes('amenityVotingSettingsHtml')
    ? pass('Event tab mounts copy, images, pricing, disclaimers, amenity settings')
    : fail('Event tab missing editors');

people.includes('rsvpsHtml')
    && people.includes('hostsHtml')
    && people.includes('smsInvitesHtml')
    && people.includes('notificationsHtml')
    ? pass('People tab mounts roster, hosts, SMS')
    : fail('People tab missing roster or messaging');

main.includes("manage/event.js") && main.includes("manage/people.js")
    && main.includes("manage/amenity-voting.js")
    && main.includes("manage/hosts.js")
    && main.includes("manage/sms-invites.js")
    ? pass('main.js imports Event, People, and host-job helpers')
    : fail('main.js missing Event/People/helper imports');

console.log(failed ? `\n${failed} check(s) failed\n` : '\nAll checks passed\n');
process.exit(failed ? 1 : 0);
