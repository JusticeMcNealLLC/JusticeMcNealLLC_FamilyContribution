// Smoke for F7 — 3-col card grid (date overlay + RSVP footer button, vlift).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const card = read('js/components/events/card.js');
const list = read('js/portal/events/list.js');
const css  = read('css/pages/portal-events.css');
const sw   = read('sw.js');

const checks = {
    card_date_overlay:    /evt-card-date-chip/.test(card),
    card_data_date:       /data-evt-day="\$\{_day\}" data-evt-mon="\$\{_mon\}"/.test(card),
    card_header_class:    /evt-card-header-row/.test(card),
    card_banner_class:    /evt-card-banner/.test(card),
    card_rsvp_button:     /data-evt-card-rsvp="\$\{event\.id\}"/.test(card),

    list_rsvp_wiring:     /data-evt-card-rsvp/.test(list) && /evtHandleRsvp\(ev\.id, 'going'\)/.test(list),

    css_hide_header:      /body\.evt-vlift \.evt-card-header-row \{ display: none !important; \}/.test(css),
    css_date_overlay:     /body\.evt-vlift \.evt-card-date-chip \{[\s\S]{0,200}position: absolute/.test(css),
    css_rsvp_button:      /body\.evt-vlift \.evt-card-rsvp \{[\s\S]{0,400}border: 1px solid/.test(css),
    css_non_vlift_hide:   /body:not\(\.evt-vlift\) \.evt-card-date-chip/.test(css),

    sw_v75_or_higher:     /jm-portal-v(7[5-9]|[8-9]\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF7 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
