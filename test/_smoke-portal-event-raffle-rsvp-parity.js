/**
 * Static smoke: portal Events RSVP/raffle eligibility parity with public page rules.
 * Run: node test/_smoke-portal-event-raffle-rsvp-parity.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const { parseClassicChain, isProductionLoaded, chainOrderOk } = require('./_portal-events-classic-chain.js');
const detail = fs.readFileSync(path.join(root, 'js/portal/events/detail.js'), 'utf8');
const detailData = fs.readFileSync(path.join(root, 'js/portal/events/detail/data.js'), 'utf8');
const detailSections = fs.readFileSync(path.join(root, 'js/portal/events/detail/sections.js'), 'utf8');
const detailRender = detail + '\n' + detailSections;
const raffleRender = fs.readFileSync(path.join(root, 'js/portal/events/detail/raffle-render.js'), 'utf8');
const teamTools = [
    'js/portal/events/team/tools-list.js',
    'js/portal/events/team/cta-bar.js',
    'js/portal/events/team/ui-tw.js',
].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
const rsvp = fs.readFileSync(path.join(root, 'js/portal/events/engagement/rsvp.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');
const publicBody = fs.readFileSync(path.join(root, 'js/events/body.js'), 'utf8');

function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('portal event raffle/rsvp parity smoke\n');

// Shared portal helpers (public parity: going || paid)
assert(/function evtIsGoingRsvp/.test(rsvp), 'rsvp.js defines evtIsGoingRsvp');
assert(/rsvp\.status === 'going'/.test(rsvp) && /rsvp\.paid === true/.test(rsvp), 'evtIsGoingRsvp checks going and paid');
assert(/window\.evtIsGoingRsvp/.test(rsvp), 'evtIsGoingRsvp exported on window');
assert(/evtIsRaffleBundledWithPaidRsvp/.test(rsvp), 'bundled paid raffle helper present');
assert(/evtCanEnterMemberRaffle/.test(rsvp), 'evtCanEnterMemberRaffle helper present');

// Public reference unchanged
assert(/pubHasRaffleEligibleRsvp/.test(publicBody), 'public pubHasRaffleEligibleRsvp still present');
assert(/pubCurrentRsvp\?\.status === 'going'/.test(publicBody), 'public member going check');

// detail.js uses shared going logic (Phase 5H.1: memberGoing computed in detail/data.js)
assert(/evtIsGoingRsvp/.test(detail) || /evtIsGoingRsvp/.test(detailData), 'detail path references evtIsGoingRsvp');
assert(/memberGoing/.test(detail), 'detail.js uses memberGoing for ticket/raffle');
assert(/select\('user_id, status, paid/.test(detail) || /select\('user_id, status, paid/.test(detailData),
    'attendee query includes paid for going counts');

// Locked Enter Raffle + footnote (parity with public pubRaffleLockedCtaBtnHtml)
assert(/raffleLockedCtaBtnHtml/.test(teamTools), 'portal locked raffle CTA helper (team/cta-bar.js)');
assert(/evt-cta-raffle-locked/.test(teamTools), 'disabled Enter Raffle CTA class');
assert(/evt-cta-footnote/.test(teamTools) && /RSVP first to enter the raffle/.test(teamTools), 'CTA footnote for RSVP-first');
assert(/evtRaffleLockedDesktopHtml/.test(raffleRender), 'desktop locked raffle block in raffle-render.js');
assert(/window\.evtRaffleLockedDesktopHtml/.test(raffleRender), 'locked desktop helper on window');
assert(/evtOpenTeamToolsPanel/.test(raffleRender), 'locked hint opens Team Tools');
assert(/evtDetailRafflePrizesHtml/.test(raffleRender), 'prize rail helper in raffle-render.js');
assert(/window\.evtDetailRaffleConfig/.test(detailRender), 'detail render path calls window.evtDetailRaffleConfig');
assert(!/RSVP for Raffle/.test(detailRender) && !/RSVP for Raffle/.test(teamTools), 'portal must not use old RSVP for Raffle sticky label');

// Team Tools still wires RSVP/Raffle (Phase 5C: team/tools.js)
assert(/evtOpenTeamToolsPanel/.test(detailRender), 'detail render still opens Team Tools');
assert(/RSVP as Myself/.test(teamTools), 'Team Tools RSVP as Myself');
assert(/Enter Raffle/.test(teamTools), 'Team Tools Enter Raffle');
assert(/evtHandleRsvp/.test(teamTools), 'Team Tools links to evtHandleRsvp');
assert(/openToolsView\('raffle'\)/.test(teamTools), 'Team Tools opens raffle sub-view');

// Hosts not manage-only
assert(/evt-cta-manage/.test(teamTools) && /evt-cta-team/.test(teamTools), 'mobile Manage + Team for hosts');
assert(/You're hosting!/.test(detailRender), 'host messaging preserved');

// Raffle handler bugfix: no false "included" on free raffle paid handler
assert(!/pricing_mode === 'paid' \|\| !event\.raffle_entry_cost_cents/.test(rsvp),
    'evtHandleRaffleEntry must not block free raffle via zero-cost OR paid');

// Scope guards
assert(!/event_chats/.test(detail) && !/event_chats/.test(rsvp), 'no chat tables');
assert(!/evtOpenTeamToolsPanel/.test(portalHtml), 'portal/events.html must not inline team tools handlers');
const classicChain = parseClassicChain(root);
assert(isProductionLoaded(portalHtml, classicChain, '../js/portal/events/detail/presentation.js'),
    'production loads detail/presentation.js');
assert(isProductionLoaded(portalHtml, classicChain, '../js/portal/events/detail/raffle-render.js'),
    'production loads detail/raffle-render.js');
assert(isProductionLoaded(portalHtml, classicChain, '../js/portal/events/detail/sections.js'),
    'production loads detail/sections.js');
assert(chainOrderOk(classicChain, 'detail/presentation.js', 'detail/raffle-render.js', 'detail/sections.js', 'detail.js'),
    'presentation → raffle-render → sections → detail load order');

pass('portal RSVP/raffle parity helpers and detail wiring verified');
pass('public reference files untouched');
pass('Team Tools + host dual-path preserved');

console.log('\nportal event raffle/rsvp parity smoke: all pass');
