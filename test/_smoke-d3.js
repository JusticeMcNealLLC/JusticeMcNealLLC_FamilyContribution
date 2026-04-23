// Smoke test for events_004 D3 search history + suggestions
const fs = require('fs');
const path = 'd:/SMOJO/Online/Buisness/JusticeMcNealLLC_02';

const listJs  = fs.readFileSync(path + '/js/portal/events/list.js', 'utf8');
const cssText = fs.readFileSync(path + '/css/pages/portal-events.css', 'utf8');
const swText  = fs.readFileSync(path + '/sw.js', 'utf8');

const results = {
    // History storage
    d3_history_key:            listJs.includes("'evt_search_hist_v1'"),
    d3_history_max_8:          /SEARCH_HIST_MAX\s*=\s*8/.test(listJs),
    d3_push_history_fn:        /function\s+_pushHistory/.test(listJs),
    d3_remove_history_fn:      /function\s+_removeHistory/.test(listJs),
    d3_clear_history_fn:       /function\s+_clearHistory/.test(listJs),
    d3_case_insensitive_dedupe: /toLowerCase\(\)[\s\S]{0,200}filter/.test(listJs),

    // Suggest UI
    d3_render_suggest_fn:      /function\s+_renderSearchSuggest/.test(listJs),
    d3_hide_suggest_fn:        /function\s+_hideSearchSuggest/.test(listJs),
    d3_wire_suggest_fn:        /function\s+_wireSuggestClicks/.test(listJs),
    d3_host_id_suggest:        listJs.includes('evtSearchSuggest'),
    d3_quick_cats_defined:     /QUICK_CATS\s*=\s*\[/.test(listJs),
    d3_data_suggest_q:         listJs.includes('data-suggest-q'),
    d3_data_suggest_rm:        listJs.includes('data-suggest-rm'),
    d3_data_suggest_clear:     listJs.includes('data-suggest-clear'),
    d3_data_suggest_cat:       listJs.includes('data-suggest-cat'),

    // Wiring
    d3_enter_commits:          /e\.key === 'Enter'/.test(listJs) && /\_pushHistory\(q\)/.test(listJs),
    d3_toggle_opens_suggest:   /willOpen[\s\S]{0,200}_renderSearchSuggest/.test(listJs),
    d3_clear_reopens_suggest:  /clear\?\.addEventListener[\s\S]{0,400}_renderSearchSuggest/.test(listJs),
    d3_wire_called_in_setup:   /_wireSuggestClicks\(\)/.test(listJs),
    d3_min_length_2:           /length\s*<\s*2/.test(listJs),

    // CSS
    d3_suggest_css:            cssText.includes('.evt-search-suggest'),
    d3_suggest_keyframes:      cssText.includes('@keyframes evtSuggestIn'),
    d3_reduced_motion_guard:   /prefers-reduced-motion[\s\S]*?evt-search-suggest/.test(cssText),
    d3_no_duplicate_block:     (cssText.match(/events_004 Phase D additions/g) || []).length === 1,

    // SW
    sw_bumped_to_v54:          swText.includes("'jm-portal-v54'"),
    sw_no_leftover_v53:        !swText.includes("'jm-portal-v53'"),
};

console.log(JSON.stringify(results, null, 2));
const allPass = Object.values(results).every(Boolean);
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ FAIL');
process.exit(allPass ? 0 : 1);
