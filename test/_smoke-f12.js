// Smoke for F12 — "Events Overview" stats rail card (vlift).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = require('./_events-css');
const sw   = read('sw.js');

const checks = {
    js_render_fn:         /function _renderStatsCard\(\) \{/.test(list),
    js_called_in_render:  /_renderStatsCard\(\); +\/\/ F12/.test(list),
    js_this_month:        /This Month/.test(list),
    js_going_count:       /r\.status === 'going'/.test(list),
    js_communities_set:   /communities\.size/.test(list),
    js_view_full:         /View Full Calendar/.test(list),

    css_stats_root:       /body\.evt-vlift \.evt-stats \{/.test(css),
    css_stats_row:        /body\.evt-vlift \.evt-stats-row \{/.test(css),
    css_stats_link:       /body\.evt-vlift \.evt-stats-link \{/.test(css),

    sw_v80_or_higher:     /jm-portal-v(8[0-9]|9\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF12 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
