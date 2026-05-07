// Smoke checks for events_009 raffle model helper.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');
const model = require('../js/portal/events/raffle-model.js');

const html = read('portal/events.html');
const publicHtml = read('events/index.html');
const createSheet = read('js/portal/events/create/sheet.js');
const detail = read('js/portal/events/detail.js');
const detailCss = read('css/pages/portal/events/detail.css');
const publicCss = read('css/pages/public-event.css');
const publicRaffle = read('js/events/raffle.js');
const list = read('js/portal/events/list.js');
const utils = read('js/portal/events/utils.js');
const manageSheet = read('js/portal/events/manage/sheet.js');
const portalRaffle = read('js/portal/events/raffle.js');
const winnerMigration = read('supabase/migrations/086_event_raffle_winner_metadata.sql');
const winnerChoiceMigration = read('supabase/migrations/087_event_raffle_winner_choice_update.sql');

const legacy = model.normalizeConfig([
    { place: 2, description: 'Large basket' },
    { place: 1, description: 'Gift card' },
]);
assert.equal(legacy.version, 2, 'legacy config should normalize to v2');
assert.equal(legacy.categories.length, 1, 'legacy config should create one category');
assert.equal(legacy.items.length, 2, 'legacy config should create one item per prize');
assert.equal(legacy.items[0].name, 'Gift card', 'legacy items should sort by place');

const v2 = model.normalizeConfig({
    version: 2,
    categories: [
        { id: 'grand', label: 'Grand Prize', sort_order: 30, winner_count: 1, draw_mode: 'specific_item' },
        { id: 'medium', label: 'Medium Items', sort_order: 10, winner_count: 2, draw_mode: 'specific_item' },
    ],
    items: [
        { id: 'speaker', category_id: 'medium', name: 'Speaker', emoji: '🔊', quantity: 2, sort_order: 20 },
        { id: 'card', category_id: 'medium', name: 'Gift Card', quantity: 1, sort_order: 10 },
        { id: 'trip', category_id: 'grand', name: 'Weekend Trip', emoji: '✈️', quantity: 1, sort_order: 10 },
    ],
});

assert.equal(v2.categories[0].id, 'medium', 'categories should sort by sort_order');
assert.equal(v2.items.find(item => item.id === 'card').emoji, model.DEFAULT_EMOJI, 'missing emoji should default');
assert.equal(model.getTotalWinnerCount(v2), 3, 'winner count should sum category counts');

const queue = model.getDrawQueue(v2);
assert.equal(queue.length, 3, 'queue should follow configured category winner counts');
assert.deepEqual(queue.map(slot => slot.category_id), ['medium', 'medium', 'grand'], 'queue should follow category order');
assert.equal(queue[0].prize_id, 'card', 'item order should decide first specific prize slot');
assert.equal(model.getDrawQueue(v2, [{ place: 1, prize_id: 'card', category_id: 'medium' }]).length, 2, 'existing winner should remove one drawn slot');

const invalid = model.validateConfig({
    version: 2,
    categories: [{ id: 'tiny', label: 'Tiny', winner_count: 2, draw_mode: 'random_item' }],
    items: [{ id: 'only', category_id: 'tiny', name: 'Only prize', quantity: 1 }],
});
assert.equal(invalid.valid, false, 'validation should catch too many random winners for item quantity');

const modelScriptIndex = html.indexOf('../js/portal/events/raffle-model.js');
assert(modelScriptIndex > -1, 'portal events page should load raffle model helper');
assert(modelScriptIndex < html.indexOf('../js/portal/events/list.js'), 'raffle model should load before event feature scripts');
assert(modelScriptIndex < html.indexOf('../js/portal/events/create/sheet.js'), 'raffle model should load before create sheet');
assert(modelScriptIndex < html.indexOf('../js/portal/events/manage/sheet.js'), 'raffle model should load before manage sheet');
const publicModelScriptIndex = publicHtml.indexOf('../js/portal/events/raffle-model.js');
assert(publicModelScriptIndex > -1, 'public event page should load raffle model helper');
assert(publicModelScriptIndex < publicHtml.indexOf('../js/events/raffle.js'), 'public event page should load raffle model before public raffle script');

assert(/raffle_config: null/.test(createSheet), 'create sheet should track raffle_config state');
assert(/function _raffleBuilderHtml\(\)/.test(createSheet), 'create sheet should render raffle builder');
assert(/data-ec-raffle-add-category/.test(createSheet), 'create sheet should support adding categories');
assert(/data-ec-raffle-add-item/.test(createSheet), 'create sheet should support adding items');
assert(/_raffleModel\(\)\.validateConfig\(_ensureRaffleConfig\(\)\)/.test(createSheet), 'create sheet should validate raffle config');
assert(/Number\(f\.raffle_entry_cost_dollars \|\| 0\) < 0/.test(createSheet), 'create sheet should allow zero-dollar raffle entries');
assert(/raffle_prizes: raffleConfig/.test(createSheet), 'create sheet should store v2 raffle prizes');
assert(/raffle_winner_count: raffleWinnerCount/.test(createSheet), 'create sheet should store raffle winner count');

[
    'prize_id',
    'category_id',
    'category_label',
    'draw_mode',
    'prize_image_url',
    'prize_emoji',
    'selection_status',
].forEach((column) => {
    assert(winnerMigration.includes(`ADD COLUMN IF NOT EXISTS ${column}`), `migration should add ${column}`);
    assert(portalRaffle.includes(`${column}:`), `draw code should populate ${column}`);
});

assert(/function evtResolvePrizeSlot\(/.test(portalRaffle), 'draw code should resolve prize slots from model queue');
assert(/function evtAssignRandomPrizeSlot\(/.test(portalRaffle), 'draw code should assign random category items');
assert(/function evtInsertRaffleWinner\(/.test(portalRaffle), 'draw code should use insert wrapper with legacy fallback');
assert(/event_raffle_winners'\)\.insert\(legacyRecord\)/.test(portalRaffle), 'draw insert should retry without metadata columns if needed');
assert(/function evtLoadRaffleWinnersForDraw\(/.test(portalRaffle), 'draw code should retry winner reads without metadata columns');
assert(/select\('user_id, guest_token, place, prize_description'\)/.test(portalRaffle), 'draw code should have a legacy winner read fallback');
assert(/EventsManage\.open/.test(detail), 'detail page should reference EventsManage.open for host raffle navigation');
assert(!/Draw Raffle Winners/.test(detail), 'detail page should not expose inline draw winners button');
assert(/id="emRaffleDrawBtn"/.test(manageSheet), 'manage raffle tab should render draw button');
assert(/evtOpenRaffleDraw\?\.\(STATE\.eventId, STATE\.event\)/.test(manageSheet), 'manage raffle tab should open draw modal with sheet event context');
assert(/Raffle command/.test(manageSheet), 'manage raffle tab should use command-center copy');
assert(/eligibleEntries\.length/.test(manageSheet), 'manage raffle tab should count eligible entries');
assert(/guestByToken/.test(manageSheet), 'manage raffle tab should resolve guest winner names');
assert(/Document handoff/.test(manageSheet), 'manage docs tab should use command-center copy');
assert(/Attendance command/.test(manageSheet), 'manage RSVPs tab should use command-center copy');
assert(/Money command/.test(manageSheet), 'manage money tab should use command-center copy');
assert(/Danger zone/.test(manageSheet), 'manage danger tab should use command-center copy');
assert(/STATE\.event\?\.event_type !== 'competition'/.test(manageSheet), 'manage comp tab should skip competition queries for non-competition events');
assert(/events:raffle:drawn/.test(portalRaffle), 'draw modal should notify manage sheet after winner draw');
assert(/refreshRaffle/.test(manageSheet), 'manage sheet should expose raffle refresh after draws');
assert(/_winnerBelongsToCategory/.test(manageSheet), 'manage sheet should count legacy winners by category fallback');
assert(/function _winnerChoiceHtml\(/.test(manageSheet), 'manage sheet should render winner-choice assignment controls');
assert(/function _assignWinnerChoice\(/.test(manageSheet), 'manage sheet should assign pending-choice winners');
assert(/selection_status: 'assigned'/.test(manageSheet), 'winner-choice assignment should mark winners assigned');
assert(/FOR UPDATE/.test(winnerChoiceMigration), 'winner-choice migration should add an update policy');
assert(/function evtDetailRafflePrizesHtml\(/.test(detail), 'detail page should render v2 raffle prize categories');
assert(/function evtDetailRaffleWinnersHtml\(/.test(detail), 'detail page should render compact raffle winners');
assert(/ed-raffle-prize-rail/.test(detailCss), 'detail CSS should style compact prize rails');
assert(/ed-raffle-prize-media/.test(detailCss), 'detail CSS should provide stable prize media slots');
assert(/ed-winner-avatar/.test(detailCss), 'detail CSS should style winner avatar place badges');
assert(/function pubRafflePrizesHtml\(/.test(publicRaffle), 'public event page should render v2 raffle prize categories');
assert(/function pubRaffleWinnersHtml\(/.test(publicRaffle), 'public event page should render compact raffle winners');
assert(/pubLoadRaffleWinners/.test(publicRaffle), 'public raffle should load winner metadata with legacy fallback');
assert(!/evtOpenRaffleDraw/.test(publicRaffle), 'public raffle should not expose host draw controls');
assert(/public-raffle-head/.test(publicCss), 'public CSS should style the public raffle header');
assert(/id="raffleSection" class="ed-card event-detail-card"/.test(read('js/events/index.js')), 'public raffle should mount in the main content flow');
assert(/id="raffleDrawModal" class="fixed inset-0 z-\[75\] hidden"/.test(html), 'raffle draw modal should stack above manage sheet');
assert(/footer details button opens detail/.test(list), 'card footer Details click should navigate without changing RSVP');
assert(/typeof slug === 'object'/.test(utils), 'event navigation should tolerate event objects');

console.log('events_009 raffle model smoke: all pass');