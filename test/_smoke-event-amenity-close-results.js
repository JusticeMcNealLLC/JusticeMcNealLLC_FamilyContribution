// Smoke test — §13.13 Close voting + results (line 469)
// Run: node test/_smoke-event-amenity-close-results.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.13 tallies RPC migration ─────────────────────────────────────────');
exists('supabase/migrations/20260903200000_115_event_amenity_vote_tallies.sql')
    ? pass('migration 115 exists')
    : fail('migration 115 missing');

const mig = read('supabase/migrations/20260903200000_115_event_amenity_vote_tallies.sql');
mig.includes('get_event_amenity_vote_tallies')
    && mig.includes('can_manage_event_party_data')
    && mig.includes('GRANT EXECUTE')
    && mig.includes('anon')
    && mig.includes("amenity_vote_status = 'counted'")
    ? pass('RPC aggregates counted votes; grants anon+authenticated')
    : fail('RPC migration incomplete');

console.log('\n── Manage Amenity voting card ───────────────────────────────────────────');
exists('js/portal/events/manage/amenity-voting.js')
    ? pass('amenity-voting.js manage module exists')
    : fail('manage amenity-voting.js missing');

const manage = read('js/portal/events/manage/amenity-voting.js');
manage.includes('Close voting now')
    && manage.includes('emAmenityCloseNow')
    && manage.includes('emAmenityResultsVisible')
    && manage.includes('emAmenityClosesAt')
    && manage.includes('resultsHtml')
    && !manage.includes('ec-amenity-label')
    ? pass('manage card close + settings; no option-list edit')
    : fail('manage amenity card incomplete');

const overview = read('js/portal/events/manage/overview.js');
const eventTab = read('js/portal/events/manage/event.js');
overview.includes("from './amenity-voting.js'")
    && overview.includes('amenityVotingStatusHtml')
    && overview.includes('wireAmenityVotingStatus')
    && eventTab.includes('amenityVotingSettingsHtml')
    && eventTab.includes('wireAmenityVotingSettings')
    ? pass('Overview wires amenity status; Event tab wires settings')
    : fail('amenity voting split missing from Overview / Event');

console.log('\n── Portal + public results via RPC ──────────────────────────────────────');
const detailData = read('js/portal/events/detail/data.js');
detailData.includes("rpc('get_event_amenity_vote_tallies'")
    && !detailData.includes(".from('event_parties')\n                .select('amenity_vote_option_id, amenity_vote_status')")
    ? pass('portal detail uses tallies RPC')
    : fail('portal detail still selects event_parties for tallies');

const sections = read('js/portal/events/detail/sections.js');
sections.includes('isVotingClosed')
    && sections.includes('ed-amenity-rsvp-hint')
    ? pass('detail sections polish cast hint when closed')
    : fail('detail sections hint polish missing');

const helper = read('js/components/events/amenity-voting.js');
helper.includes('Results are visible to hosts only')
    ? pass('pendingMessageHtml host_only copy')
    : fail('host_only pending copy missing');

const pub = read('js/events/index.js');
pub.includes('pubRenderAmenityResults')
    && pub.includes('amenityResultsSection')
    && pub.includes("rpc('get_event_amenity_vote_tallies'")
    ? pass('public event page renders amenity results via RPC')
    : fail('public amenity results missing');

console.log('\n── Bundle + cache bumps ─────────────────────────────────────────────────');
const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('Close voting now')
    && bundle.includes('emAmenityCloseNow')
    && (bundle.includes("rpc('get_event_amenity_vote_tallies'")
        || bundle.includes('rpc("get_event_amenity_vote_tallies"'))
    ? pass('events.bundle includes close voting + RPC')
    : fail('bundle missing amenity close/results');

const portalHtml = read('pages/portal/events.html');
portalHtml.includes('events.bundle.js?v=237')
    ? pass('portal bundle ?v=237')
    : fail('portal bundle not bumped to 237');

const eventsHtml = read('events/index.html');
/amenity-voting\.js\?v=\d+/.test(eventsHtml)
    && /index\.js\?v=\d+/.test(eventsHtml)
    ? pass('public amenity-voting + index are cache-busted')
    : fail('public amenity scripts missing ?v=');

console.log('\n── Docs ─────────────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **FINAL** — Close voting; show results to attendees as configured; host results view polished')
    ? pass('brainstorm line 469 checked')
    : fail('brainstorm 469 not checked');

const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('Amenity close + results')
    && contracts.includes('§13.13 line 469')
    && contracts.includes('get_event_amenity_vote_tallies')
    ? pass('004 notes amenity close + results FINAL')
    : fail('004 missing amenity close note');

console.log(`\n${failed === 0 ? 'event amenity close-results smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
