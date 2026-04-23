// Smoke for F10 — Mini calendar (right rail, vlift).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = require('./_events-css');
const sw   = read('sw.js');

const checks = {
    js_state_month:       /let _miniCalMonth = null/.test(list),
    js_state_day:         /let _activeDay = ''/.test(list),
    js_render_fn:         /function _renderMiniCalendar\(\) \{/.test(list),
    js_called_in_render:  /_renderMiniCalendar\(\); \/\/ F10/.test(list),
    js_active_day_filter: /if \(_activeDay\)/.test(list),
    js_reveal_rail:       /rail\.classList\.remove\('hidden'\)/.test(list),
    js_prev_next_clear:   /data-mcal-prev/.test(list) && /data-mcal-next/.test(list) && /data-mcal-clear/.test(list),
    js_day_button:        /data-mcal-day/.test(list),

    css_mcal_root:        /body\.evt-vlift \.evt-mcal \{/.test(css),
    css_today:            /body\.evt-vlift \.evt-mcal-day--today \{[\s\S]{0,150}background: #4f46e5/.test(css),
    css_has_dot:          /body\.evt-vlift \.evt-mcal-day--has::after/.test(css),
    css_grid:             /body\.evt-vlift \.evt-mcal-grid[\s\S]{0,200}grid-template-columns: repeat\(7, 1fr\)/.test(css),

    sw_v78_or_higher:     /jm-portal-v(7[8-9]|[8-9]\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF10 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
