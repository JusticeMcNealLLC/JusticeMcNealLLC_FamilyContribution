// Smoke for F16 — Header refresh + full-width + side-section rail.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css  = require('./_events-css');
const sw  = read('sw.js');

const checks = {
    css_header_block:     /F16 -- Header refresh \+ full-width page/.test(css),
    css_header_white:     /body\.evt-vlift #evtPageHeader \{[\s\S]{0,300}background:\s*#ffffff !important/.test(css),
    css_header_dark_text: /#evtHeaderTitle \{[\s\S]{0,200}color:\s*#0f172a !important/.test(css),
    css_create_brand:    /#createEventBtn \{[\s\S]{0,300}background:\s*#4f46e5 !important/.test(css),
    css_kill_max_header:  /#evtPageHeader > div \{[\s\S]{0,200}max-width:\s*none !important/.test(css),
    css_kill_max_shell:   /body\.evt-vlift #evtShell \{[\s\S]{0,200}max-width:\s*none !important/.test(css),
    css_grid_override:    /grid-template-columns:\s*minmax\(0, 1fr\) 320px !important/.test(css),
    css_rail_card:        /#evtRightRail \.evt-mcal,[\s\S]{0,200}#evtRightRail \.evt-stats \{[\s\S]{0,300}border-radius:\s*1rem !important/.test(css),

    sw_v84_or_higher:     /jm-portal-v(8[4-9]|9\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF16 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
