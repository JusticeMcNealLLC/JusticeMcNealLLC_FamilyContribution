// Smoke — unpaid Stripe bail-out is Continue, not Going (committed everywhere)
// Run: node test/_smoke-event-rsvp-committed-going.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Helper ───────────────────────────────────────────────────────────────');
const helpers = read('js/components/events/helpers.js');
helpers.includes('function rsvpIsCommittedGoing(')
    && helpers.includes("planStatus === 'active'")
    && helpers.includes('rsvpIsCommittedGoing')
    ? pass('rsvpIsCommittedGoing defined')
    : fail('rsvpIsCommittedGoing missing');

helpers.includes('const committed = rsvpIsCommittedGoing(event, rsvp, plan)')
    || helpers.includes('rsvpIsCommittedGoing(event, rsvp, plan)')
    ? pass('rsvpCtaState uses committed going')
    : fail('rsvpCtaState not aligned');

const eng = read('js/portal/events/engagement/rsvp.js');
eng.includes('function evtIsCommittedGoing(')
    && eng.includes('evtCanEnterMemberRaffle')
    && eng.includes('evtIsCommittedGoing(event, rsvp)')
    ? pass('evtIsCommittedGoing + raffle gate')
    : fail('engagement committed/raffle gate incomplete');

console.log('\n── Central lists ────────────────────────────────────────────────────────');
const detailData = read('js/portal/events/detail/data.js');
detailData.includes('evtIsCommittedGoing')
    && detailData.includes('guestGoingList')
    && detailData.includes('rsvpIsCommittedGoing')
    ? pass('detail goingList/guestGoingList committed')
    : fail('detail data still raw going');

const shell = read('js/portal/events/list/shell.js');
shell.includes('pricingById')
    && shell.includes('Committed Going only')
    && shell.includes("row.paid === true")
    ? pass('list evtAttendeeCounts committed')
    : fail('list attendee counts still raw status=going');

console.log('\n── Manage metrics ───────────────────────────────────────────────────────');
const manageRsvps = read('js/portal/events/manage/rsvps.js');
manageRsvps.includes('isCommittedGoingRow')
    && manageRsvps.includes('Payment pending')
    && manageRsvps.includes('totalPending')
    ? pass('manage RSVPs committed + pending group')
    : fail('manage RSVPs totals incomplete');

const overview = read('js/portal/events/manage/overview.js');
overview.includes('rsvpIsCommittedGoing') || overview.includes('isCommitted')
    ? pass('manage overview Going committed')
    : fail('manage overview still raw going');

const money = read('js/portal/events/manage/money.js');
money.includes('rsvpIsCommittedGoing')
    ? pass('manage money projected going committed')
    : fail('manage money projected still raw');

const handoff = read('js/portal/events/manage/ticket-handoff.js');
handoff.includes('rsvpIsCommittedGoing')
    ? pass('ticket handoff committed filter')
    : fail('ticket handoff still status=going only');

const docs = read('js/portal/events/manage/docs.js');
docs.includes('rsvpIsCommittedGoing')
    ? pass('docs member picker committed')
    : fail('docs picker still raw going');

console.log('\n── List / card / eligibility ────────────────────────────────────────────');
const rail = read('js/portal/events/list/hero-rails.js');
rail.includes('evtIsCommittedGoing') || rail.includes('rsvpIsCommittedGoing')
    ? pass('hero ribbon / going rail committed')
    : fail('hero/rail still raw status=going');

if (rail.includes("if (!r || r.status !== 'going') return false")) {
    fail('going rail still uses raw status === going');
} else {
    pass('going rail raw status check removed');
}

const card = read('js/components/events/card.js');
card.includes('rsvpIsCommittedGoing')
    && card.includes('_goingRibbon(event, opts.rsvp)')
    ? pass('card ribbon uses committed going')
    : fail('card ribbon incomplete');

const filters = read('js/portal/events/list/filters.js');
filters.includes('evtIsCommittedGoing') || filters.includes('rsvpIsCommittedGoing')
    ? pass('Going tab uses committed going')
    : fail('Going tab still raw status');

const header = read('js/portal/events/list/header.js');
header.includes('evtIsCommittedGoing') || header.includes('rsvpIsCommittedGoing')
    ? pass('header going count committed')
    : fail('header going count raw');

const right = read('js/portal/events/list/right-rail.js');
right.includes('evtIsCommittedGoing') || right.includes('rsvpIsCommittedGoing')
    ? pass('right-rail going count committed')
    : fail('right-rail going count raw');

const panels = read('js/portal/events/team/panels.js');
panels.includes('memberCommittedGoing')
    && panels.includes('Continue RSVP')
    ? pass('team ticket committed / Continue copy')
    : fail('team ticket panel incomplete');

const cta = read('js/portal/events/team/cta-bar.js');
cta.includes('evtIsCommittedGoing')
    ? pass('team CTA voter/raffle committed')
    : fail('team CTA still evtIsGoingRsvp');

const comp = read('js/portal/events/detail/competition.js');
comp.includes('evtIsCommittedGoing')
    ? pass('competition voter eligibility committed')
    : fail('competition voter still raw going');

const pubBody = read('js/events/body.js');
pubBody.includes('rsvpIsCommittedGoing')
    ? pass('public raffle eligibility committed')
    : fail('public body raffle eligibility raw');

console.log('\n── Server capacity ──────────────────────────────────────────────────────');
const seats = read('supabase/functions/_shared/party-seats.ts');
seats.includes("pricing_mode || '') === 'paid'")
    && seats.includes(".eq('paid', true)")
    ? pass('party-seats paid fallback counts paid only')
    : fail('party-seats legacy fallback still all going');

console.log('\n── Ship ─────────────────────────────────────────────────────────────────');
read('pages/portal/events.html').includes('events.bundle.js?v=224')
    ? pass('portal bundle ?v=224')
    : fail('portal bundle not bumped');

read('sw.js').includes('jm-portal-v173')
    ? pass('SW CACHE_NAME v173')
    : fail('SW not bumped');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('rsvpIsCommittedGoing')
    && bundle.includes('evtIsCommittedGoing')
    && bundle.includes('pricingById')
    && bundle.includes('isCommittedGoingRow')
    ? pass('bundle includes committed-going filters')
    : fail('bundle missing committed filters (run build:events)');

console.log(failed ? `\n${failed} failed\n` : '\nCommitted-going smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
