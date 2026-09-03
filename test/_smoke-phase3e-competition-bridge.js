// ══════════════════════════════════════════════════════════════════
// Phase 3E static smoke test — competition.js PortalEvents bridge
//
// Run: node test/_smoke-phase3e-competition-bridge.js
// ══════════════════════════════════════════════════════════════════
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

let passed = 0;
let failed = 0;
const failures = [];

function check(label, ok, detail) {
    if (ok) {
        console.log(`  ✓ ${label}`);
        passed++;
    } else {
        console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
        failed++;
        failures.push(label);
    }
}

const competition = read('js/portal/events/detail/competition.js');
const events = read('pages/portal/events.html');
const loader = read('js/portal/events/main.js');

console.log('\n── js/portal/events/detail/competition.js — file structure ──────────────');
check('detail/competition.js exists', exists('js/portal/events/detail/competition.js'));
check('root competition.js removed', !exists('js/portal/events/competition.js'));
check('Loose classic script: no IIFE wrapper introduced', !competition.includes('(function () {'));
check('No native export statement (stays classic-script safe)', !(/^\s*export\s+(default|const|function|class|let|var|\{)/m.test(competition)));
check('File size reasonable (no accidental truncation)', competition.length > 30000, `${competition.length} chars`);

console.log('\n── competition.js — legacy public/bare globals preserved ────────────────');
const legacyFunctions = [
    ['async function evtBuildCompetitionHtml(', 'evtBuildCompetitionHtml'],
    ['function evtBuildSubmitFormHtml(', 'evtBuildSubmitFormHtml'],
    ['async function evtJoinCompetition(', 'evtJoinCompetition'],
    ['async function evtSubmitEntry(', 'evtSubmitEntry'],
    ['async function evtCastVote(', 'evtCastVote'],
    ['async function evtModerateEntry(', 'evtModerateEntry'],
    ['async function evtContributeToPrizePool(', 'evtContributeToPrizePool'],
    ['async function evtStartPhase(', 'evtStartPhase'],
    ['async function evtAdvancePhase(', 'evtAdvancePhase'],
    ['async function evtExtendPhase(', 'evtExtendPhase'],
    ['async function evtFinalizeCompetition(', 'evtFinalizeCompetition'],
    ['function evtRecalcCompTiers(', 'evtRecalcCompTiers'],
];
legacyFunctions.forEach(([pattern, label]) => check(`${label} function declaration present`, competition.includes(pattern)));

console.log('\n── competition.js — inline handler compatibility preserved ──────────────');
const inlineCalls = [
    "evtContributeToPrizePool('",
    "evtJoinCompetition('",
    "evtCastVote('",
    "evtModerateEntry('",
    "evtFinalizeCompetition('",
    "evtAdvancePhase('",
    "evtExtendPhase('",
    "evtStartPhase('",
    "evtSubmitEntry('",
];
inlineCalls.forEach(call => check(`inline onclick references ${call}`, competition.includes(call)));

console.log('\n── competition.js — window.PortalEvents.competition bridge (Phase 3E) ────');
check('window.PortalEvents safe seed guard present', competition.includes('window.PortalEvents = window.PortalEvents || {}'));
check('window.PortalEvents.competition safe-init guard present', competition.includes('window.PortalEvents.competition = window.PortalEvents.competition || {}'));
const bridgeEntries = [
    ['buildHtml', 'evtBuildCompetitionHtml'],
    ['buildSubmitFormHtml', 'evtBuildSubmitFormHtml'],
    ['join', 'evtJoinCompetition'],
    ['submitEntry', 'evtSubmitEntry'],
    ['castVote', 'evtCastVote'],
    ['moderateEntry', 'evtModerateEntry'],
    ['contributeToPrizePool', 'evtContributeToPrizePool'],
    ['startPhase', 'evtStartPhase'],
    ['advancePhase', 'evtAdvancePhase'],
    ['extendPhase', 'evtExtendPhase'],
    ['finalize', 'evtFinalizeCompetition'],
    ['recalcTiers', 'evtRecalcCompTiers'],
];
bridgeEntries.forEach(([key, fn]) => {
    check(`window.PortalEvents.competition.${key} assigned`, competition.includes(`window.PortalEvents.competition.${key} = ${fn}`));
});
check('Bridge appears after evtRecalcCompTiers declaration', competition.indexOf('window.PortalEvents.competition = window.PortalEvents.competition || {}') > competition.indexOf('function evtRecalcCompTiers('));

console.log('\n── competition.js — external dependencies and data surfaces ──────────────');
const dependencyPatterns = [
    ['supabaseClient', 'supabaseClient dependency present'],
    ['callEdgeFunction', 'callEdgeFunction dependency present'],
    ['evtCurrentUser', 'evtCurrentUser dependency present'],
    ['evtOpenDetail', 'evtOpenDetail dependency present'],
    ['evtLoadEvents', 'evtLoadEvents dependency present'],
    ['evtAllEvents', 'evtAllEvents dependency present'],
];
dependencyPatterns.forEach(([pattern, label]) => check(label, competition.includes(pattern)));
const tablePatterns = [
    ["from('competition_phases')", 'competition_phases table touched'],
    ["from('competition_entries')", 'competition_entries table touched'],
    ["from('competition_votes')", 'competition_votes table touched'],
    ["from('competition_winners')", 'competition_winners table touched'],
    ["from('prize_pool_contributions')", 'prize_pool_contributions table touched'],
    ["from('events')", 'events table touched'],
    ["from('competition-entries')", 'competition-entries storage bucket touched'],
];
tablePatterns.forEach(([pattern, label]) => check(label, competition.includes(pattern)));

console.log('\n── production load (main.js manifest) ─────────────────────────────────');
check('detail/competition.js in main.js imports', loader.includes('./detail/competition.js'));
check('competition-phases.js in main.js imports', loader.includes('../../components/events/competition-phases.js'));
check('No portal/events/* scripts use type="module" yet (correct)', !events.match(/<script[^>]+js\/portal\/events\/[^>]+type="module"/));

console.log('\n── §13.6.395 submission window + GFX upload ─────────────────────────────');
const compPhases = read('js/components/events/competition-phases.js');
const manageComp = read('js/portal/events/manage/competition.js');
check('EventsCompetitionPhases global export present', compPhases.includes('globalThis.EventsCompetitionPhases'));
check('isSubmissionOpen helper present', compPhases.includes('function isSubmissionOpen('));
check('resolveCompEntryFileUrl signed URL helper present', compPhases.includes('function resolveCompEntryFileUrl('));
check('detail uses EventsCompetitionPhases', competition.includes('EventsCompetitionPhases'));
check('detail submission window closed copy', competition.includes('Submission window closed'));
check('detail re-checks isSubmissionOpen on submit', competition.includes('isSubmissionOpen(phases, new Date())'));
check('detail stores storage path not public URL', competition.includes('fileUrl = path'));
check('manage submission window card present', manageComp.includes('Submission window'));
check('manage phase 2 upsert save handler', manageComp.includes("onConflict: 'event_id,phase_num'"));
check('host RLS migration 103 present', exists('supabase/migrations/20260901120000_103_competition_phases_host_write.sql'));

console.log('\n── §13.6.394 competition create sheet ───────────────────────────────────');
const stepComp = read('js/portal/events/create/step-competition.js');
const createSheet = read('js/portal/events/create/sheet.js');
const createSubmit = read('js/portal/events/create/submit.js');
const ctaBar = read('js/portal/events/team/cta-bar.js');
check('step-competition.js in main.js imports', loader.includes('./create/step-competition.js'));
check('step-competition exports validateCompetition', stepComp.includes('export function validateCompetition('));
check('step-competition builds competition_config', stepComp.includes('export function buildCompetitionConfig('));
check('basics enables competition type', read('js/portal/events/create/step-basics.js').includes("enabled:true"));
check('sheet inserts competition step', createSheet.includes("{ key: 'competition', label: 'Competition' }"));
check('sheet removed competition edit block', !createSheet.includes('Competition events cannot be edited'));
check('submit persists competition_config', createSubmit.includes('competition_config'));
check('submit inserts competition phases on create', createSubmit.includes('insertCompetitionPhases'));
check('cta-bar competition join branch', ctaBar.includes('showCompJoin'));
check('cta-bar Join as Competitor copy', ctaBar.includes('Join as Competitor'));

console.log('\n── §13.6.396 voting window + winner by votes ─────────────────────────────');
const detailData = read('js/portal/events/detail/data.js');
const postRender = read('js/portal/events/detail/post-render.js');
check('isVotingOpen helper present', compPhases.includes('function isVotingOpen('));
check('isVotingClosed helper present', compPhases.includes('function isVotingClosed('));
check('isVoterEligible helper present', compPhases.includes('function isVoterEligible('));
check('votingWindowLabel helper present', compPhases.includes('function votingWindowLabel('));
check('detail uses isVotingOpen for vote buttons', competition.includes('votingOpen && voterEligible'));
check('detail voting window closed copy', competition.includes('Voting window closed'));
check('detail competition-section anchor', competition.includes('id="competition-section"'));
check('evtCastVote re-checks isVotingOpen', competition.includes('isVotingOpen(phases, new Date())'));
check('evtCastVote checks isVoterEligible', competition.includes('isVoterEligible(config'));
check('evtFinalizeCompetition checks isVotingClosed', competition.includes('isVotingClosed(phases, new Date())'));
check('evtFinalizeCompetition zero-vote confirm', competition.includes('No votes were cast'));
check('manage voting window card present', manageComp.includes('Voting window'));
check('manage vote count pills on entries', manageComp.includes('vote${(entry.vote_count'));
check('data.js fetches myCompVote', detailData.includes("from('competition_votes')") && detailData.includes('myCompVote'));
check('post-render passes myCompVote to CTA bar', postRender.includes('myCompVote'));
check('cta-bar Cast your vote copy', ctaBar.includes('Cast your vote'));
check('host RLS migration 104 present', exists('supabase/migrations/20260901130000_104_competition_winners_host_write.sql'));
check('migration 104 uses can_manage_event_competition', read('supabase/migrations/20260901130000_104_competition_winners_host_write.sql').includes('can_manage_event_competition'));

console.log('\n── §13.6.397 manage/detail production-complete ────────────────────────────');
const overview = read('js/portal/events/manage/overview.js');
const mig105 = read('supabase/migrations/20260901140000_105_competition_winners_tie_support.sql');
check('isRegistrationOpen helper present', compPhases.includes('function isRegistrationOpen('));
check('migration 105 tie support present', exists('supabase/migrations/20260901140000_105_competition_winners_tie_support.sql'));
check('migration 105 drops place unique', mig105.includes('competition_winners_event_id_place_key'));
check('migration 105 adds entry unique index', mig105.includes('competition_winners_event_entry_unique'));
check('manage pool uses single source (no double-sum)', manageComp.includes('total_prize_pool_cents || 0) > 0') && !manageComp.includes('total_prize_pool_cents || 0) + d.contribs'));
check('loadComp throws on query errors', manageComp.includes('throw new Error(errors[0].message'));
check('manage moderated entries section', manageComp.includes('Moderated entries'));
check('overview competition edit button', overview.includes("e.event_type === 'competition'") && overview.includes('emEditEventBtn'));
check('evtJoinCompetition checks isRegistrationOpen', competition.includes('isRegistrationOpen(phases, new Date())'));
check('evtFinalizeCompetition duplicate guard', competition.includes('already been finalized'));
check('evtAdvancePhase min entries warn', competition.includes('minimum ${minEntries}'));
check('detail empty phase timeline message', competition.includes('Competition phases not configured'));
check('detail hidden entries message', competition.includes('Entries hidden until voting'));
check('detail load error card', competition.includes('Could not load competition'));
check('submit button upload loading state', competition.includes('compSubmitBtn') && competition.includes('Uploading…'));
check('cta-bar Submit your entry copy', ctaBar.includes('Submit your entry'));
check('cta-bar showCompSubmit branch', ctaBar.includes('showCompSubmit'));

console.log('\n── File split safety — no orphaned new competition/ subfiles ─────────────');
const competitionDir = path.join(ROOT, 'js/portal/events/competition');
check('js/portal/events/competition/ directory does not exist (no premature split)', !fs.existsSync(competitionDir));

console.log('\n── Phase 1 bridge (init.js) — regression check ───────────────────────────');
const init = read('js/portal/events/init.js');
check('window.PortalEvents.initEventsPage still present', init.includes('window.PortalEvents.initEventsPage'));
check('Phase 1 duplicate-init guard still present', init.includes('_eventsPageInitialized'));

console.log('\n── Phase 2 bridges — regression check ────────────────────────────────────');
const indexJs = read('js/portal/events/index.js');
const raffleModel = read('js/portal/events/core/raffle-model.js');
check('window.PortalEvents.constants bridged in index.js', indexJs.includes('window.PortalEvents.constants'));
check('portal events/constants.js removed', !exists('js/portal/events/constants.js'));
check('root.PortalEvents.raffleModel still present', raffleModel.includes('root.PortalEvents.raffleModel'));
check('root.EventsRaffleModel still present', raffleModel.includes('root.EventsRaffleModel'));

console.log('\n── Phase 3A bridge (list.js) — regression check ──────────────────────────');
const list = read('js/portal/events/list/shell.js');
check('window.PortalEvents.list namespace still present', list.includes('window.PortalEvents.list'));
check('list/shell.js still IIFE', list.includes('(function () {'));

console.log('\n── Phase 3B bridge (detail.js) — regression check ────────────────────────');
const detail = read('js/portal/events/detail.js');
check('window.PortalEvents.detail safe-init still present', detail.includes('window.PortalEvents.detail'));
check('detail.register function still present', detail.includes('detail.register = function'));
check("detail.register('competition') still present", detail.includes("detail.register('competition'"));

console.log('\n── Phase 3C bridge (manage/sheet.js) — regression check ──────────────────');
const manage = read('js/portal/events/manage/sheet.js');
check('window.PortalEvents.manage safe-init still present', manage.includes('window.PortalEvents.manage = window.PortalEvents.manage || {}'));
check('window.EventsManage still preserved', manage.includes('window.EventsManage = { open, close, refreshRaffle }'));

console.log('\n── Phase 3D bridge (create/sheet.js) — regression check ──────────────────');
check('window.PortalEvents.create safe-init still present', createSheet.includes('window.PortalEvents.create = window.PortalEvents.create || {}'));
check('window.EventsCreate still preserved', createSheet.includes('window.EventsCreate = { open, close, isFlagOn }'));

const total = passed + failed;
console.log(`\n${'═'.repeat(54)}`);
console.log(`Phase 3E static smoke: ${total} checks — ${passed} pass, ${failed} fail`);
console.log('═'.repeat(54));

if (failed > 0) {
    console.log('\nFailed checks:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    console.log('\nPhase 3E static smoke: NEEDS REVIEW');
    process.exit(1);
}

console.log('\nPhase 3E static smoke: ALL PASS');
