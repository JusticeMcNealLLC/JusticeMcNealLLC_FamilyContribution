// Smoke for F9 — Bucket header refresh (vlift only): proper heading + count pill.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = require('./_events-css');
const sw   = read('sw.js');

const checks = {
    js_no_emoji_prefix:   /const displayLabel = useVlift \? String\(label\) : label;/.test(list),
    js_count_pill:        /evt-bucket-count/.test(list),
    js_title_class:       /'evt-bucket-title'/.test(list),
    js_header_layout:     /items-baseline gap-2/.test(list),

    css_title_style:      /body\.evt-vlift \.evt-bucket-title \{[\s\S]{0,400}font-size: 1\.25rem/.test(css),
    css_count_style:      /body\.evt-vlift \.evt-bucket-count \{/.test(css),

    sw_v77_or_higher:     /jm-portal-v(7[7-9]|[8-9]\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF9 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
