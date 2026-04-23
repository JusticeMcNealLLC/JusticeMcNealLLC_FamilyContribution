// Smoke for F13 — Filter row reflow (vlift, >=640px).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css = read('css/pages/portal-events.css');
const sw  = read('sw.js');

const checks = {
    css_header:           /F13 -- Filter row reflow/.test(css),
    css_strip_flex:       /body\.evt-vlift #evtFilterStrip \{[\s\S]{0,200}display: flex;[\s\S]{0,120}flex-wrap: wrap/.test(css),
    css_inner_contents:   /body\.evt-vlift #evtFilterStrip > \.flex\.items-center\.gap-2:not\(#evtTypeChips\) \{[\s\S]{0,80}display: contents/.test(css),
    css_lifecycle_row:    /#evtLifecycleSeg \{[\s\S]{0,100}flex: 0 0 100%;[\s\S]{0,60}order: -30/.test(css),
    css_search_grow:      /#evtSearchExpand \{[\s\S]{0,120}flex: 1 1 240px;[\s\S]{0,60}order: -20/.test(css),
    css_filters_order:    /\.relative\.shrink-0:has\(#evtTypeMenuBtn\) \{ order: -12/.test(css),
    css_date_order:       /\[data-f4-date-wrap\] +\{ order: -11/.test(css),
    css_view_order:       /#evtViewToggle +\{ order: -10/.test(css),
    css_chips_row:        /#evtTypeChips \{[\s\S]{0,120}flex: 0 0 100%;[\s\S]{0,60}order: 10/.test(css),

    sw_v81_or_higher:     /jm-portal-v(8[1-9]|9\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF13 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
