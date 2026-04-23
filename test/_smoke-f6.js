// Smoke for F6 — Horizontal hero (vlift, desktop ≥1024).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css  = read('css/pages/portal-events.css');
const sw   = read('sw.js');

const checks = {
    css_has_f6_header:    /F6 -- Horizontal hero/.test(css),
    css_lg_mediaquery:    /@media \(min-width: 1024px\) \{[\s\S]{0,800}\.evt-hero-vlift > a \{[\s\S]{0,200}aspect-ratio: 16 \/ 6/.test(css),
    css_hero_fade_h:      /@media \(min-width: 1024px\)[\s\S]{0,1200}\.evt-hero-fade \{[\s\S]{0,400}linear-gradient\(90deg/.test(css),
    css_hero_meta_max:    /\.evt-hero-meta \{[\s\S]{0,200}max-width: 62%/.test(css),
    css_hide_cta:         /@media \(min-width: 1024px\)[\s\S]{0,2000}\.evt-hero-cta \{ display: none !important; \}/.test(css),
    css_view_details:     /content: "View Details \\2192";/.test(css),

    sw_v74_or_higher:     /jm-portal-v(7[4-9]|[8-9]\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF6 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
