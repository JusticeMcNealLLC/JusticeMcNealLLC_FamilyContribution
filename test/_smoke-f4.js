// Smoke for F4 — Full filter row (search always-visible + Filters + Date) (vlift only).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('portal/events.html');
const css  = require('./_events-css');
const list = read('js/portal/events/list.js');
const sw   = read('sw.js');

const checks = {
    html_date_wrap:       /data-f4-date-wrap/.test(html),
    html_date_button:     /<button id="evtDateMenuBtn"[^>]*data-date="any"/.test(html),
    html_date_menu:       /<div id="evtDateMenu"[^>]*>[\s\S]{0,1500}data-date="today"[\s\S]{0,600}data-date="week"[\s\S]{0,600}data-date="weekend"[\s\S]{0,600}data-date="month"/.test(html),
    html_filters_icon:    /data-f4-filters-icon/.test(html),
    html_search_ph:       /placeholder="Search events, hosts, or locations…"/.test(html),

    css_date_wrap_shown:  /body\.evt-vlift \[data-f4-date-wrap\] \{ display: block !important; \}/.test(css),
    css_search_always:    /body\.evt-vlift #evtSearchExpand \{ display: block !important;/.test(css),
    css_filters_label:    /body\.evt-vlift #evtTypeMenuBtn::after \{[\s\S]{0,200}content: "Filters";/.test(css),
    css_date_opt:         /\.evt-date-opt \{/.test(css),

    js_init_date_menu:    /function _initDateMenu\(\) \{/.test(list),
    js_date_state:        /let _activeDate = 'any'/.test(list),
    js_matches_date:      /function _matchesDate\(ev\) \{/.test(list),
    js_in_pipeline:       /_matchesLifecycle\(e\) && _matchesDate\(e\)/.test(list),

    sw_v72_or_higher:     /jm-portal-v(7[2-9]|[8-9]\d|\d{3,})/.test(sw),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`F4 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) { console.log('FAILED:', failed.join(', ')); process.exit(1); }
console.log('✅ ALL PASS');
