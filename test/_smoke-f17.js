// Smoke for F17 — Rectangular event cards (vlift).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css = read('css/pages/portal-events.css');
const sw  = read('sw.js');

const checks = {
    css_header:         /F17 -- Rectangular event cards/.test(css),
    css_grid_2col_lg:   /@media \(min-width: 1024px\)[\s\S]{0,300}\.evt-card-grid \{[\s\S]{0,200}grid-template-columns:\s*repeat\(2,/.test(css),
    css_grid_3col_xl:   /@media \(min-width: 1440px\)[\s\S]{0,300}grid-template-columns:\s*repeat\(3,/.test(css),
    css_banner_21_9:    /\.evt-card-banner \{[\s\S]{0,200}aspect-ratio:\s*21 \/ 9 !important/.test(css),
    css_body_tighter:   /\[data-evt-card\] > \.p-4 \{[\s\S]{0,200}padding-top:\s*\.75rem !important/.test(css),
    css_create_tile_tr: /\.evt-create-tile \{[\s\S]{0,200}min-height:\s*160px !important/.test(css),
    sw_v85_or_higher:   /jm-portal-v(8[5-9]|9\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF17 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
