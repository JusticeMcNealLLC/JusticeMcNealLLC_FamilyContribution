// Smoke test for events_003 Phase C (C2 category chip + C4 stagger hook)
const fs = require('fs');
const path = 'd:/SMOJO/Online/Buisness/JusticeMcNealLLC_02';
const window = {};
global.window = window;
global.document = {
    createElement: () => {
        let t = '';
        return {
            set textContent(v) { t = String(v); },
            get textContent() { return t; },
            get innerHTML() {
                const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
                return t.replace(/[&<>"']/g, c => map[c]);
            }
        };
    }
};
[
    'js/components/events/constants.js',
    'js/components/events/helpers.js',
    'js/components/events/pills.js',
    'js/components/events/card.js',
].forEach(f => { eval(fs.readFileSync(path + '/' + f, 'utf8')); });

const EventsCard = window.EventsCard;
const now = new Date();
const inH = h => new Date(now.getTime() + h * 3600_000).toISOString();

const cookout  = { id: '1', slug: 'x', title: 'Juneteenth Cookout', event_type: 'llc', category: 'cookout', start_date: inH(72), status: 'open' };
const birthday = { id: '2', slug: 'y', title: 'Bday',               event_type: 'member', category: 'birthday', start_date: inH(72), status: 'open' };
const noCat    = { id: '3', slug: 'z', title: 'Plain',              event_type: 'llc',                         start_date: inH(72), status: 'open' };

const h1 = EventsCard.render(cookout, {});
const h2 = EventsCard.render(birthday, {});
const h3 = EventsCard.render(noCat, {});

// Read list.js + portal-events.css to verify integration points
const listJs  = fs.readFileSync(path + '/js/portal/events/list.js', 'utf8');
const cssText = fs.readFileSync(path + '/css/pages/portal-events.css', 'utf8');
const swText  = fs.readFileSync(path + '/sw.js', 'utf8');

const results = {
    // C2 card.js
    c2_cookout_has_data_evt_cat:        h1.includes('data-evt-cat="cookout"'),
    c2_cookout_has_chip_class:          h1.includes('evt-cat-chip'),
    c2_birthday_has_data_evt_cat:       h2.includes('data-evt-cat="birthday"'),
    c2_no_category_has_no_chip:         !h3.includes('data-evt-cat'),
    // C2 list.js integration
    c2_active_category_state:           listJs.includes("let _activeCategory = ''"),
    c2_matches_category_fn:             /function\s+_matchesCategory/.test(listJs),
    c2_wire_intercepts_button:          listJs.includes("button[data-evt-cat]"),
    c2_render_active_filter_pill:       /function\s+_renderActiveFilterPill/.test(listJs),
    // C3 sessionStorage
    c3_state_key:                       listJs.includes("'evt_list_state_v1'"),
    c3_persist_fn:                      /function\s+_persistState/.test(listJs),
    c3_restore_fn:                      /function\s+_restoreState/.test(listJs),
    c3_apply_restored_ui:               /function\s+_applyRestoredUi/.test(listJs),
    // C4 stagger
    c4_grid_class:                      listJs.includes('evt-card-grid'),
    c4_keyframes_in_css:                cssText.includes('@keyframes evtCardEnter'),
    c4_nth_child_delays:                cssText.includes('.evt-card-grid > *:nth-child(6)'),
    c4_reduced_motion_guard:            /prefers-reduced-motion[\s\S]*?evt-card-grid/.test(cssText),
    // C1 pull-to-refresh
    c1_init_fn:                         /function\s+_initPullToRefresh/.test(listJs),
    c1_indicator_css:                   cssText.includes('.evt-ptr'),
    c1_spin_keyframe:                   cssText.includes('@keyframes evtPtrSpin'),
    // SW bump
    sw_bumped_to_v53:                   swText.includes("'jm-portal-v53'"),
    sw_no_leftover_v52:                 !swText.includes("'jm-portal-v52'"),
};

console.log(JSON.stringify(results, null, 2));
const allPass = Object.values(results).every(Boolean);
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ FAIL');
process.exit(allPass ? 0 : 1);
