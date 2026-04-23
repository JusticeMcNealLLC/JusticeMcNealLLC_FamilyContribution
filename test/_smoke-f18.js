// Smoke for F18 — Hero polish to match target mockup.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css  = require('./_events-css');
const sw  = read('sw.js');

const checks = {
    css_header:        /F18 -- Featured hero polish/.test(css),
    css_hero_height:   /\.evt-hero-vlift > a \{[\s\S]{0,300}height:\s*240px !important/.test(css),
    css_hero_overlay:  /\.evt-hero-vlift > a::before \{[\s\S]{0,500}rgba\(20, 18, 60, 0\.85\)/.test(css),
    css_hero_220_lg:   /@media \(min-width: 1024px\)[\s\S]{0,400}height:\s*220px !important/.test(css),
    css_kicker_pill:   /\[data-f14-kicker\] \{[\s\S]{0,400}background:\s*rgba\(0, 0, 0, 0\.35\)/.test(css),
    css_meta_flex:     /\.evt-hero-meta \{[\s\S]{0,300}display:\s*flex !important[\s\S]{0,200}flex-direction:\s*column !important/.test(css),
    css_meta_order:    /\.evt-hero-meta > h2\s*\{ order: 1/.test(css) && /\[data-f14-host\] \{ order: 2/.test(css) && /\[data-f14-dtrow\] \{ order: 3/.test(css),
    css_dtrow_date_hide:/\[data-f14-dtrow\] > span:first-child \{ display: none !important/.test(css),
    css_side_centered: /\.evt-hero-side \{[\s\S]{0,500}justify-content:\s*center !important/.test(css),
    css_no_pos_rel:    /\.evt-hero-vlift > a > \* \{ z-index: 2; \}/.test(css) && !/\.evt-hero-vlift > a > \* \{ position: relative/.test(css),
    sw_v86_or_higher:  /jm-portal-v(8[6-9]|9\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF18 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
