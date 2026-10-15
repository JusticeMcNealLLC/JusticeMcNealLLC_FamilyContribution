// Smoke test — EventsAmenityVoting helper (§13.7 FINAL middle ground)
// Run: node test/_smoke-amenity-voting.js
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

function loadAmenityVoting() {
    const helpersSrc = fs.readFileSync(path.join(root, 'js/components/events/helpers.js'), 'utf8');
    const src = fs.readFileSync(path.join(root, 'js/components/events/amenity-voting.js'), 'utf8');
    const ctx = { globalThis: {}, window: {} };
    ctx.window = ctx.globalThis;
    ctx.document = {
        createElement() {
            const node = { innerHTML: '' };
            Object.defineProperty(node, 'textContent', {
                set(v) { node.innerHTML = String(v); },
                get() { return node.innerHTML; },
            });
            return node;
        },
    };
    vm.createContext(ctx);
    vm.runInContext(helpersSrc, ctx);
    vm.runInContext(src, ctx);
    return ctx.globalThis.EventsAmenityVoting;
}

console.log('\n── EventsAmenityVoting helper ───────────────────────────────────────────');

const av = loadAmenityVoting();
if (!av) { fail('EventsAmenityVoting not exported'); process.exit(1); }
pass('EventsAmenityVoting exported');

const cfg = av.normalizeConfig({
    enabled: true,
    options: [
        { id: 'a', label: 'Hotel' },
        { id: 'b', label: 'Airbnb' },
    ],
    closes_at: '2099-01-01T12:00:00.000Z',
    results_visible: 'after_close',
});
cfg.enabled === true && cfg.options.length === 2
    ? pass('normalizeConfig enables with 2 options')
    : fail('normalizeConfig failed for valid config');

const multipleCfg = av.normalizeConfig({
    enabled: true,
    selection_mode: 'multiple',
    options: [
        { id: 'a', label: 'Hotel' },
        { id: 'b', label: 'Airbnb' },
        { id: 'c', label: 'Cabin' },
    ],
});
multipleCfg.selection_mode === 'multiple'
    ? pass('normalizeConfig preserves multiple selection mode')
    : fail('normalizeConfig missing multiple selection mode');

const multipleHtml = av.formFieldsHtml(multipleCfg, {
    idPrefix: 'multi',
    selectedOptionId: '["a","c"]',
});
multipleHtml.includes('type="checkbox"')
    && multipleHtml.includes('Select all that apply')
    ? pass('multiple amenity mode renders checkbox options')
    : fail('multiple amenity mode should render checkbox options');

const selectedMultiple = av.readVoteFromRoot({
    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
        return selector === '[data-amenity-vote]:checked'
            ? [{ type: 'checkbox', value: 'a', getAttribute: () => 'a' }, { type: 'checkbox', value: 'c', getAttribute: () => 'c' }]
            : [];
    },
});
selectedMultiple === '["a","c"]'
    ? pass('multiple amenity selections serialize as an ordered array')
    : fail(`multiple amenity selections serialized as ${selectedMultiple}`);

av.validateVote(multipleCfg, selectedMultiple) === null
    ? pass('multiple amenity vote validates')
    : fail('multiple amenity vote should validate');

const multipleTallies = av.tallyCounts([
    { amenity_vote_option_id: '["a","c"]', amenity_vote_status: 'counted' },
], ['a', 'b', 'c']);
multipleTallies.a === 1 && multipleTallies.b === 0 && multipleTallies.c === 1
    ? pass('multiple amenity votes tally each selected option')
    : fail(`multiple amenity tallies wrong: ${JSON.stringify(multipleTallies)}`);

const disabled = av.normalizeConfig({ enabled: true, options: [{ id: 'x', label: 'Only one' }] });
disabled.enabled === false
    ? pass('normalizeConfig disables when fewer than 2 options')
    : fail('normalizeConfig should disable with one option');

const tallies = av.tallyCounts([
    { amenity_vote_option_id: 'a', amenity_vote_status: 'counted' },
    { amenity_vote_option_id: 'a', amenity_vote_status: 'counted' },
    { amenity_vote_option_id: 'b', amenity_vote_status: 'counted' },
    { amenity_vote_option_id: 'a', amenity_vote_status: 'provisional' },
], ['a', 'b']);
tallies.a === 2 && tallies.b === 1
    ? pass('tallyCounts counts only counted status')
    : fail(`tallyCounts wrong: ${JSON.stringify(tallies)}`);

av.canShowResults(cfg, { isHost: true })
    ? pass('canShowResults true for host')
    : fail('canShowResults should be true for host');

const closedCfg = av.normalizeConfig({
    enabled: true,
    options: [{ id: 'a', label: 'Hotel' }, { id: 'b', label: 'Airbnb' }],
    closes_at: '2020-01-01T12:00:00.000Z',
    results_visible: 'after_close',
});
av.canShowResults(closedCfg, { isHost: false, now: new Date('2021-01-01') })
    ? pass('canShowResults true for attendee after close')
    : fail('canShowResults should be true after close');

!av.canShowResults(cfg, { isHost: false, now: new Date('2098-01-01') })
    ? pass('canShowResults false for attendee before close (after_close)')
    : fail('canShowResults should be false before close');

const hostOnly = av.normalizeConfig({ enabled: true, options: [{ id: 'a', label: 'X' }, { id: 'b', label: 'Y' }], results_visible: 'host_only' });
!av.canShowResults(hostOnly, { isHost: false })
    ? pass('canShowResults false for attendee on host_only')
    : fail('host_only should hide from attendees');

const html = av.resultsHtml(cfg, tallies, { isHost: false });
html.includes('ed-amenity-bar') && html.includes('Hotel')
    ? pass('resultsHtml renders bars and labels')
    : fail('resultsHtml missing expected markup');

const emptyHost = av.resultsHtml(cfg, { a: 0, b: 0 }, { isHost: true });
emptyHost.includes('No counted votes yet')
    ? pass('resultsHtml host empty state')
    : fail('resultsHtml host empty state missing');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
