// Smoke for F14 — Featured-event hero refresh (vlift).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css  = read('css/pages/portal-events.css');
const list = read('js/portal/events/list.js');
const sw   = read('sw.js');

const checks = {
    css_header:           /F14 -- Featured-event hero refresh/.test(css),
    css_kicker:           /\[data-f14-kicker\][\s\S]{0,400}letter-spacing:\s*\.18em/.test(css),
    css_datechip:         /\.evt-hero-datechip \{[\s\S]{0,400}background:\s*#ffffff/.test(css),
    css_datechip_parts:   /\.evt-hero-datechip__mon[\s\S]{0,200}\.evt-hero-datechip__day[\s\S]{0,200}\.evt-hero-datechip__dow/.test(css),
    css_host_line:        /\.evt-hero-host \{[\s\S]{0,200}font-weight: 600/.test(css),
    css_side_desktop:     /@media \(min-width: 1024px\)[\s\S]{0,2000}\.evt-hero-side \{[\s\S]{0,400}display: flex/.test(css),
    css_side_cta:         /\.evt-hero-side__cta \{[\s\S]{0,400}background:\s*#ffffff/.test(css),
    css_f6_pill_disabled: /\.evt-hero-vlift::after \{ content: none/.test(css),

    js_kicker_emit:       /data-f14-kicker>FEATURED EVENT/.test(list),
    js_datechip_emit:     /data-f14-datechip/.test(list) && /evt-hero-datechip__mon/.test(list) && /evt-hero-datechip__day/.test(list) && /evt-hero-datechip__dow/.test(list),
    js_host_emit:         /data-f14-host/.test(list) && /Hosted by/.test(list),
    js_side_emit:         /data-f14-side/.test(list) && /evt-hero-side__desc/.test(list) && /evt-hero-side__cta/.test(list),
    js_cta_label:         /data-f14-cta[\s\S]{0,120}View Details/.test(list),

    sw_v82_or_higher:     /jm-portal-v(8[2-9]|9\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF14 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
