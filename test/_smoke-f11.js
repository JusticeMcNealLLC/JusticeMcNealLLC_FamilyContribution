// Smoke for F11 — "Your Upcoming RSVPs" rail card (vlift).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = require('./_events-css');
const sw   = read('sw.js');

const checks = {
    js_render_fn:         /function _renderMyRsvps\(\) \{/.test(list),
    js_called_in_render:  /_renderMyRsvps\(\); +\/\/ F11/.test(list),
    js_filter_going:      /r\.status !== 'going'/.test(list),
    js_slice_3:           /mine\.slice\(0, 3\)/.test(list),
    js_row_data:          /data-evt-myrsvp="/.test(list),
    js_all_button:        /data-evt-myrsvps-all/.test(list),

    css_myrsvps_root:     /body\.evt-vlift \.evt-myrsvps \{/.test(css),
    css_row_hover:        /body\.evt-vlift \.evt-myrsvp-row:hover/.test(css),
    css_thumb:            /body\.evt-vlift \.evt-myrsvp-thumb \{/.test(css),
    css_all_btn:          /body\.evt-vlift \.evt-myrsvps-all \{/.test(css),

    sw_v79_or_higher:     /jm-portal-v(79|[8-9]\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF11 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
