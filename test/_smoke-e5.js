// Smoke for E5 — Top Picks rail (vlift only; conditional on >=2 pinned-LLC future).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('portal/events.html');
const list = read('js/portal/events/list.js');
const sw   = read('sw.js');

const checks = {
    // HTML — section + scroller + see-all button
    html_section: /id="evtTopPicks"[^>]*class="hidden mt-6"[^>]*data-evt-section="top-picks"/.test(html),
    html_label_with_emoji: /id="evtTopPicks"[\s\S]{0,400}🔥 Top Picks/.test(html),
    html_seeall_btn: /id="evtTopPicksSeeAll"/.test(html),
    html_scroll_container: /id="evtTopPicksScroll"[^>]*snap-x snap-mandatory/.test(html),

    // JS — renderer + gates
    js_render_fn: /function _renderTopPicks\(events, attendees, heroId, eventsById\)/.test(list),
    js_lookup_section: /getElementById\('evtTopPicks'\)/.test(list),
    js_lookup_scroll: /getElementById\('evtTopPicksScroll'\)/.test(list),
    js_vlift_gate: /_renderTopPicks[\s\S]{0,800}body\.classList\.contains\('evt-vlift'\)/.test(list),
    js_search_gate: /inSearch[\s\S]{0,200}rail\.classList\.add\('hidden'\)/.test(list),
    js_tab_gate: /tab !== 'upcoming'/.test(list),
    js_threshold_min2: /picks\.length < 2/.test(list),
    js_filter_pinned_llc: /e\.is_pinned &&\s*e\.event_type === 'llc'/.test(list),
    js_filter_excludes_hero: /e\.id !== heroId/.test(list),
    js_filter_future: /new Date\(e\.start_date\) >= now/.test(list),
    js_uses_minicard: /picks\.map\(ev => _miniCard\(ev/.test(list),
    js_wires_clicks: /scroll\.querySelectorAll\('a\[data-evt-mini\]'\)/.test(list),
    js_seeall_sets_llc: /_activeType = 'llc';\s*_syncTypeChips\('llc'\)/.test(list),
    js_seeall_idempotent: /seeAll\.dataset\.wired/.test(list),
    js_seeall_persists: /_persistState\(\);\s*renderEvents\(\);\s*\}\);\s*\}\s*\}/.test(list),

    // Wiring in renderEvents
    js_called_in_upcoming: /_renderGoingRail\([^)]*\);\s*\/\/ E5[\s\S]{0,200}_renderTopPicks\(/.test(list),
    js_hidden_in_other_tabs: /const picks = document\.getElementById\('evtTopPicks'\);\s*if \(picks\) picks\.classList\.add\('hidden'\);/.test(list),
    js_hidden_in_search: /_searchQuery[\s\S]{0,800}getElementById\('evtTopPicks'\)/.test(list),

    // SW
    sw_v64: /jm-portal-v64/.test(sw),
    sw_no_v63: !sw.includes("'jm-portal-v63'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`E5 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS');
