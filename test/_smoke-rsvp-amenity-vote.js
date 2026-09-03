// Smoke test — §13.8 MVP amenity vote step before payment
// Run: node test/_smoke-rsvp-amenity-vote.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.8 amenity casting helpers ────────────────────────────────────────');
const amenityJs = read('js/components/events/amenity-voting.js');
const amenityTs = read('supabase/functions/_shared/amenity-voting.ts');

['needsVote', 'formFieldsHtml', 'validateVote', 'readVoteFromRoot', 'voteStatusForRsvp', 'scrollToVoteField'].forEach((fn) => {
    amenityJs.includes(`function ${fn}(`)
        ? pass(`EventsAmenityVoting.${fn} present`)
        : fail(`${fn} missing from amenity-voting.js`);
});

fs.existsSync(path.join(root, 'supabase/functions/_shared/amenity-voting.ts'))
    ? pass('amenity-voting.ts exists')
    : fail('amenity-voting.ts missing');
amenityTs.includes('resolveVoteStatus')
    ? pass('resolveVoteStatus in Deno helper')
    : fail('resolveVoteStatus missing from amenity-voting.ts');

console.log('\n── §13.8 client routing ─────────────────────────────────────────────────');
const engagement = read('js/portal/events/engagement/rsvp.js');
const rsvpJs = read('js/events/rsvp.js');
const sections = read('js/portal/events/detail/sections.js');
const bodyJs = read('js/events/body.js');

engagement.includes('needsAmenityVote')
    && engagement.includes('showSeatPicker || needsAmenityVote')
    ? pass('portal needsPartyEdge includes needsAmenityVote')
    : fail('portal needsPartyEdge missing needsAmenityVote');
engagement.includes('amenity_vote_option_id')
    ? pass('portal sends amenity_vote_option_id')
    : fail('portal missing amenity_vote_option_id payload');
engagement.includes("status === 'going' && needsAmenityVote")
    && engagement.includes('rsvp-member-party')
    ? pass('portal blocks direct upsert when amenity vote required')
    : fail('portal direct upsert guard for amenity vote missing');

rsvpJs.includes('pubNeedsAmenityVote')
    ? pass('public pubNeedsAmenityVote helper')
    : fail('pubNeedsAmenityVote missing');
rsvpJs.includes('needsAmenityVote')
    && rsvpJs.includes('showSeatPicker || needsAmenityVote')
    ? pass('public needsPartyEdge includes needsAmenityVote')
    : fail('public needsPartyEdge missing needsAmenityVote');
rsvpJs.includes("status === 'going' && needsAmenityVote")
    && rsvpJs.includes('rsvp-member-party')
    ? pass('public blocks direct upsert when amenity vote required')
    : fail('public direct upsert guard for amenity vote missing');

console.log('\n── §13.8 prep UI ────────────────────────────────────────────────────────');
sections.includes('portalAmenityWrap-')
    ? pass('portal prep renders amenity wrapper')
    : fail('portalAmenityWrap missing from sections.js');
rsvpJs.includes('pubMemberAmenityWrap')
    ? pass('public member prep amenity wrapper')
    : fail('pubMemberAmenityWrap missing');
rsvpJs.includes('guestAmenityVote')
    ? pass('public guest prep amenity wrapper')
    : fail('guestAmenityVote missing');
bodyJs.includes('ctaGuestAmenityVote')
    ? pass('public CTA amenity wrapper')
    : fail('ctaGuestAmenityVote missing');

const publicHtml = read('events/index.html');
publicHtml.includes('amenity-voting.js?v=163')
    ? pass('public events loads amenity-voting.js')
    : fail('events/index.html missing amenity-voting.js');

console.log('\n── §13.8 edge persistence ───────────────────────────────────────────────');
const included = read('supabase/functions/_shared/included-items.ts');
const memberParty = read('supabase/functions/rsvp-member-party/index.ts');
const guestFree = read('supabase/functions/rsvp-guest-free/index.ts');
const checkout = read('supabase/functions/create-event-checkout/index.ts');
const webhook = read('supabase/functions/stripe-webhook/index.ts');

included.includes('amenityVoteOptionId')
    && included.includes('amenity_vote_option_id')
    ? pass('ensurePartyAndSeat writes amenity vote columns')
    : fail('ensurePartyAndSeat missing amenity vote columns');

memberParty.includes('amenity_vote_option_id')
    ? pass('rsvp-member-party accepts amenity_vote_option_id')
    : fail('rsvp-member-party missing amenity_vote_option_id');
guestFree.includes('amenity_vote_option_id')
    ? pass('rsvp-guest-free accepts amenity_vote_option_id')
    : fail('rsvp-guest-free missing amenity_vote_option_id');
checkout.includes('amenity_vote_option_id')
    ? pass('create-event-checkout accepts amenity_vote_option_id')
    : fail('create-event-checkout missing amenity_vote_option_id');
webhook.includes('amenity_vote_option_id')
    ? pass('stripe-webhook reads amenity_vote_option_id')
    : fail('stripe-webhook missing amenity_vote_option_id');

const guestFreeCalls = (guestFree.match(/maybeAttachPartySeat\(/g) || []).length;
const guestFreeWithVote = (guestFree.match(/amenity_vote_option_id,\s*\)/g) || []).length;
guestFreeCalls >= 3 && guestFreeWithVote >= 3
    ? pass('rsvp-guest-free passes amenity vote to all party attach calls')
    : fail(`rsvp-guest-free maybeAttachPartySeat vote args (${guestFreeWithVote}/${guestFreeCalls})`);

console.log('\n── §13.8 cache bump v=163 ───────────────────────────────────────────────');
read('events/index.html').includes('?v=163')
    ? pass('public events at v=163')
    : fail('public events not at v=163');
read('pages/portal/events.html').includes('?v=163')
    ? pass('portal events at v=163')
    : fail('portal events not at v=163');
read('sw.js').includes('?v=163')
    ? pass('sw.js precache at v=163')
    : fail('sw.js not at v=163');
read('sw.js').includes('jm-portal-v124')
    ? pass('sw.js CACHE_NAME jm-portal-v124')
    : fail('sw.js missing jm-portal-v124');

console.log(`\n${failed === 0 ? 'rsvp amenity vote smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
