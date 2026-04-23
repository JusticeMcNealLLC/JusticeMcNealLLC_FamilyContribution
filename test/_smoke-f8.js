// Smoke for F8 — Create-event tile (vlift upcoming bucket only).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = read('css/pages/portal-events.css');
const sw   = read('sw.js');

const checks = {
    js_flag_decl:         /let _createTileInjected = false/.test(list),
    js_flag_reset:        /_createTileInjected = false;/.test(list),
    js_inject_logic:      /!_createTileInjected/.test(list) && /data-evt-create-tile/.test(list),
    js_gate_upcoming:     /\(window\.evtActiveTab \|\| 'upcoming'\) === 'upcoming'/.test(list),
    js_gate_canCreate:    /hasPermission\('events\.create'\)/.test(list),
    js_click_wiring:      /button\[data-evt-create-tile\]/.test(list),
    js_click_fires_btn:   /getElementById\('createEventBtn'\)\?\.click\(\)/.test(list),
    js_prepend_to_grid:   /createTile \+ cards/.test(list),

    css_tile_dashed:      /\.evt-create-tile \{[\s\S]{0,400}border: 2px dashed/.test(css),
    css_tile_plus:        /\.evt-create-tile__plus \{/.test(css),

    sw_v76_or_higher:     /jm-portal-v(7[6-9]|[8-9]\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF8 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
