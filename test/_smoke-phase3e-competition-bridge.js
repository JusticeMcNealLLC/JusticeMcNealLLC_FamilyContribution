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
const events = read('portal/events.html');
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
check('No portal/events/* scripts use type="module" yet (correct)', !events.match(/<script[^>]+js\/portal\/events\/[^>]+type="module"/));

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
const createSheet = read('js/portal/events/create/sheet.js');
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
