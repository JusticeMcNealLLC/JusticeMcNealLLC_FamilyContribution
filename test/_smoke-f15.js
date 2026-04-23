// Smoke for F15 — Event card refresh (vlift).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const css  = read('css/pages/portal-events.css');
const card = read('js/components/events/card.js');
const sw   = read('sw.js');

const checks = {
    css_header:           /F15 -- Event card refresh/.test(css),
    css_dow_visible:      /\.evt-card-date-dow \{[\s\S]{0,200}display: block/.test(css),
    css_legacy_meta_hide: /\[data-evt-legacy-meta\][\s\S]{0,60}display: none/.test(css),
    css_legacy_stack_hide:/\[data-evt-legacy-stack\][\s\S]{0,60}display: none/.test(css),
    css_f7_rsvp_hide:     /\.p-4 > \.evt-card-rsvp \{ display: none/.test(css),
    css_f15_body:         /\.evt-card-f15 \{[\s\S]{0,300}flex-direction: column/.test(css),
    css_f15_row:          /\.evt-card-f15-row \{[\s\S]{0,300}display: inline-flex/.test(css),
    css_f15_foot:         /\.evt-card-f15-foot \{[\s\S]{0,300}justify-content: space-between/.test(css),
    css_f15_pill:         /\.evt-card-f15-rsvp \{[\s\S]{0,400}border-radius: 9999px/.test(css),
    css_create_tile_trim: /\.evt-create-tile \{[\s\S]{0,200}min-height: 0/.test(css),

    js_dow_emit:          /data-f15-dow/.test(card) && /toLocaleDateString\(['"]en-US['"], \{ weekday: ['"]short['"]/.test(card),
    js_f15_type:          /data-f15-type/.test(card),
    js_f15_loc:           /data-f15-loc/.test(card),
    js_f15_time:          /data-f15-time/.test(card),
    js_f15_foot:          /data-f15-foot/.test(card) && /evt-card-f15-going/.test(card),
    js_f15_pill:          /data-f15-rsvp/.test(card) && /evt-card-f15-rsvp/.test(card),
    js_legacy_marks:      /data-evt-legacy-meta/.test(card) && /data-evt-legacy-stack/.test(card),

    sw_v83_or_higher:     /jm-portal-v(8[3-9]|9\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF15 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
